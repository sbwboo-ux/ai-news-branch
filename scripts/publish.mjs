// 공식 AI 블로그 RSS를 모아 새 발표를 한국어 글 1편으로 정리해 src/content/articles 에 저장한다.
// 사용: node scripts/publish.mjs        (실제 발행)
//       node scripts/publish.mjs --dry  (수집·선정만 확인, LLM 호출 없음)
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';

const DRY = process.argv.includes('--dry');
const MAX_ITEMS = 3; // 글 1편에 묶는 발표 수
const MAX_AGE_DAYS = 4;
const FEEDS = [
  ['OpenAI', 'https://openai.com/news/rss.xml'],
  ['Google', 'https://blog.google/innovation-and-ai/technology/ai/rss/'],
  ['Google DeepMind', 'https://deepmind.google/blog/rss.xml'],
  ['NVIDIA', 'https://blogs.nvidia.com/feed/'],
  ['Hugging Face', 'https://huggingface.co/blog/feed.xml'],
  ['AWS', 'https://aws.amazon.com/blogs/machine-learning/feed/'],
];
const CATEGORIES = ['모델', '제품', '연구', '산업'];
const LLM = {
  base: process.env.LLM_BASE_URL || 'https://models.github.ai/inference',
  key: process.env.LLM_API_KEY || process.env.GITHUB_TOKEN,
  models: (process.env.LLM_MODEL || 'openai/gpt-4.1,openai/gpt-4.1-mini').split(','),
};
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ai-news-bot/1.0)' };
const SEEN_FILE = 'data/seen.json';

const seen = new Set(fs.existsSync(SEEN_FILE) ? JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')) : []);
const parser = new XMLParser({ ignoreAttributes: false });
const text = (v) => (typeof v === 'object' && v !== null ? v['#text'] ?? '' : v ?? '').toString().trim();

async function readFeed([publisher, url]) {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
    const x = parser.parse(await res.text());
    const items = x.rss?.channel?.item ?? x.feed?.entry ?? [];
    return [items].flat().map((it) => ({
      publisher,
      title: text(it.title),
      url: text(it.link?.['@_href'] ?? it.link),
      date: new Date(text(it.pubDate ?? it.published ?? it.updated)),
    }));
  } catch (e) {
    console.warn(`feed fail ${publisher}: ${e.message}`);
    return [];
  }
}

async function pageText(url) {
  try {
    const html = await (await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) })).text();
    return html
      .replace(/<(script|style|nav|footer|header|svg)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'")
      .replace(/\s+/g, ' ')
      .slice(0, 7000);
  } catch {
    return '';
  }
}

// 발행처가 겹치지 않게 최신순으로 고른다
function pick(items) {
  const out = [];
  for (const it of items) if (out.length < MAX_ITEMS && !out.some((o) => o.publisher === it.publisher)) out.push(it);
  return out;
}

const SYSTEM = `너는 한국어 AI 뉴스 블로그의 편집자다. 주어진 공식 발표 원문만 근거로 한국어 해설 기사 1편을 쓴다.
규칙:
- 원문에 없는 수치·날짜·사실·인용을 만들지 않는다. 불확실하면 "원문 기준 확인 필요"라고 쓴다.
- 원문 문장을 그대로 번역해 옮기지 말고, 핵심 사실을 요약한 뒤 의미를 해설한다.
- 독자는 AI에 관심 있는 일반인이다. 전문용어는 처음 나올 때 한 줄로 풀어준다.
- 과장·낚시 표현, "혁신적인", "게임 체인저" 같은 상투어를 쓰지 않는다.
- 본문은 마크다운, 1,500~2,500자. 구조:
  ## 한눈에 보기 (핵심 3줄 불릿)
  ## (발표별 소제목) 각 발표마다: 무엇이 발표됐나, 무엇이 달라지나
  ## 왜 중요한가 (발표들을 잇는 흐름과 이 블로그의 관점)
  ## 앞으로 지켜볼 점 (불릿 2~3개)
- 본문에 원문 링크 목록이나 FAQ는 넣지 않는다(따로 표시된다).
반드시 아래 JSON만 출력한다:
{"title":"여러 발표를 잇는 흐름을 담은 제목. 형식 예: 'AI 실행 경계가 바뀐다: A·B·C' (45자 이내)",
 "description":"검색 결과에 보일 요약 문장 1~2개 (80~140자)",
 "category":"모델|제품|연구|산업 중 하나",
 "topic":"2~6자 주제 태그",
 "body":"마크다운 본문",
 "faq":[{"q":"독자가 실제로 검색할 만한 질문","a":"원문 근거로 2~3문장 답"}]  (3개)}`;

async function writeArticle(sources) {
  const user = sources
    .map((s, i) => `### 발표 ${i + 1}\n발행처: ${s.publisher}\n제목: ${s.title}\n발표일: ${s.date.toISOString().slice(0, 10)}\nURL: ${s.url}\n원문 발췌:\n${s.body || '(본문을 가져오지 못함 — 제목만 근거로 짧게 다룰 것)'}`)
    .join('\n\n');
  let lastErr;
  for (const model of LLM.models) {
    try {
      const res = await fetch(`${LLM.base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM.key}` },
        body: JSON.stringify({ model, temperature: 0.4, response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
      });
      if (!res.ok) throw new Error(`${model} ${res.status} ${(await res.text()).slice(0, 300)}`);
      const j = JSON.parse((await res.json()).choices[0].message.content);
      if (!j.title || !j.body || !j.description) throw new Error('missing fields');
      if (!CATEGORIES.includes(j.category)) j.category = '산업';
      j.faq = (j.faq || []).filter((f) => f.q && f.a).slice(0, 3);
      return j;
    } catch (e) {
      lastErr = e;
      console.warn(`LLM fail: ${e.message}`);
    }
  }
  throw lastErr;
}

const COLORS = { 모델: ['#1f6f4a', '#2f9e6b'], 제품: ['#24507a', '#3a7bc0'], 연구: ['#5a3d8a', '#8a63c9'], 산업: ['#8a4b1f', '#c47a3a'] };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrap(s, n) {
  const lines = [];
  let cur = '';
  for (const w of s.split(' ')) {
    if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}
function cover({ title, category, topic }) {
  const [a, b] = COLORS[category] || COLORS['산업'];
  const lines = wrap(title, 17).map((l, i) => `<text x="80" y="${300 + i * 78}" font-size="62" font-weight="800" fill="#fff">${esc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" font-family="Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#g)"/><circle cx="1050" cy="120" r="220" fill="#fff" opacity=".07"/><circle cx="1120" cy="560" r="150" fill="#fff" opacity=".06"/>
<text x="80" y="170" font-size="34" font-weight="700" fill="#fff" opacity=".85">${esc(category)} · ${esc(topic)}</text>${lines}
<text x="80" y="620" font-size="26" fill="#fff" opacity=".7">AI 소식 정리 · 설명용 일러스트</text></svg>`;
}

const now = new Date();
const cutoff = now - MAX_AGE_DAYS * 864e5;
const all = (await Promise.all(FEEDS.map(readFeed))).flat()
  .filter((i) => i.url && i.title && !isNaN(i.date) && i.date >= cutoff && !seen.has(i.url))
  .sort((a, b) => b.date - a.date);
const chosen = pick(all);
console.log(`new items: ${all.length}, chosen: ${chosen.length}`);
chosen.forEach((c) => console.log(` - [${c.publisher}] ${c.title} (${c.date.toISOString().slice(0, 10)})`));
if (!chosen.length) { console.log('새 공식 발표가 없어 건너뜀'); process.exit(0); }

for (const c of chosen) c.body = await pageText(c.url);
if (DRY) { chosen.forEach((c) => console.log(`   body ${c.body.length}자: ${c.body.slice(0, 120)}`)); process.exit(0); }
if (!LLM.key) throw new Error('LLM_API_KEY 또는 GITHUB_TOKEN 이 필요합니다');

const art = await writeArticle(chosen);
const kst = new Date(now.getTime() + 9 * 36e5).toISOString();
const slug = `${kst.slice(0, 10)}-${kst.slice(11, 13)}${kst.slice(14, 16)}`;
fs.writeFileSync(`public/images/articles/${slug}.svg`, cover(art));
const fm = {
  title: art.title, description: art.description, date: now.toISOString(), category: art.category, topic: art.topic,
  image: `/images/articles/${slug}.svg`,
  sources: chosen.map((c) => ({ title: c.title, url: c.url, publisher: c.publisher, date: c.date.toISOString().slice(0, 10) })),
  faq: art.faq,
};
// JSON 값은 그대로 YAML로도 유효하다
const yaml = Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
fs.writeFileSync(`src/content/articles/${slug}.md`, `---\n${yaml}\n---\n\n${art.body.trim()}\n`);
chosen.forEach((c) => seen.add(c.url));
fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen].slice(-2000), null, 1));
console.log(`published ${slug}: ${art.title}`);
