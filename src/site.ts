export const SITE = {
  name: 'AI 소식 정리',
  tagline: 'AI 뉴스를, 공식 출처와 함께.',
  description: 'OpenAI, Google DeepMind, NVIDIA, Hugging Face 등 공식 발표를 한국어로 정리하고 원문 출처를 함께 제공하는 AI 뉴스 블로그입니다.',
  adsenseClient: import.meta.env.PUBLIC_ADSENSE_CLIENT || '', // 예: ca-pub-1234567890123456
};
export const fmtDate = (d: Date) => d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });
