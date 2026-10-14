# AI 소식 정리 (ai-news-branch)

공식 AI 블로그(OpenAI, Google, DeepMind, NVIDIA, Hugging Face, AWS)의 새 발표를 하루 3번 모아 한국어 해설 글 1편으로 자동 발행하는 정적 사이트입니다. 비용은 0원입니다.

- 사이트: Astro 정적 빌드 → Cloudflare Pages(무료)
- 자동 발행: GitHub Actions cron (KST 9시·15시·21시) → `scripts/publish.mjs`
- 글쓰기 AI: Google Gemini API 무료 키 (OpenAI 호환 주소로 호출)
- 글이 커밋되면 Cloudflare Pages가 자동으로 다시 빌드·배포합니다.

## 로컬 명령

```
npm run dev        # 개발 서버
npm run build      # dist/ 생성
node scripts/publish.mjs --dry   # 새 발표 수집만 확인 (AI 호출 없음)
```

## 처음 한 번 설정

1. GitHub에 이 폴더를 저장소로 올립니다.
2. Cloudflare 대시보드 → Workers & Pages → Pages → Git 연결 → 이 저장소 선택.
   - Build command: `npm run build`, Output: `dist`
   - 환경변수 `SITE_URL` = 배포된 주소 (예: `https://ai-news-branch.pages.dev`)
3. https://aistudio.google.com/apikey 에서 무료 API 키를 만들고, 저장소 Settings → Secrets → Actions 에 `LLM_API_KEY`로 넣습니다.
4. GitHub 저장소 → Actions 탭 → publish → Run workflow 로 첫 실행을 확인합니다.

## 애드센스 붙이기 (승인 후)

Cloudflare Pages 환경변수에 추가하고 재배포합니다.

- `PUBLIC_ADSENSE_CLIENT` = `ca-pub-xxxxxxxxxxxxxxxx` (ads.txt도 자동 생성)
- `PUBLIC_ADSENSE_SLOT` = 광고 단위 슬롯 번호

## 검색 노출

Google Search Console / 네이버 서치어드바이저에 사이트를 등록하고 `/sitemap-index.xml`, `/rss.xml`을 제출합니다.
AI 검색용 요약은 `/llms.txt`에 자동 생성됩니다.

## 선택 설정

- 다른 OpenAI 호환 API를 쓰려면 Variables에 `LLM_BASE_URL`, `LLM_MODEL`(쉼표로 여러 개, 앞에서부터 시도)을 넣습니다.
- 수집 피드·발행 규칙은 `scripts/publish.mjs` 위쪽 상수에서 바꿉니다.
