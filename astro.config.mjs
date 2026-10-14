import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 도메인을 연결하면 SITE_URL 환경변수만 바꾸면 된다.
export default defineConfig({
  site: process.env.SITE_URL || 'https://ai-news-branch.pages.dev',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
