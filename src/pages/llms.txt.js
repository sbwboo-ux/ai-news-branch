import { allArticles } from '../lib';
import { SITE } from '../site';
// AI 검색엔진(GEO)용 사이트 안내 파일
export async function GET({ site }) {
  const list = (await allArticles()).slice(0, 50);
  const lines = [`# ${SITE.name}`, '', `> ${SITE.description}`, '', '모든 글은 공식 자료를 바탕으로 AI가 작성하며, 각 글 하단에 원문 출처를 표기합니다.', '', '## 최신 글', '',
    ...list.map((a) => `- [${a.data.title}](${new URL(`/articles/${a.id}/`, site)}): ${a.data.description}`), '', '## 안내', '', `- [발행 원칙](${new URL('/about/', site)})`];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
