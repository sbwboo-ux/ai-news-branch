// AdSense 승인 후 PUBLIC_ADSENSE_CLIENT(ca-pub-...)만 넣으면 ads.txt가 자동으로 생성된다.
export function GET() {
  const c = (import.meta.env.PUBLIC_ADSENSE_CLIENT || '').replace('ca-', '');
  return new Response(c ? `google.com, ${c}, DIRECT, f08c47fec0942fa0\n` : '');
}
