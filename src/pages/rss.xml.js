import rss from '@astrojs/rss';
import { allArticles } from '../lib';
import { SITE } from '../site';
export async function GET(context) {
  const list = await allArticles();
  return rss({ title: SITE.name, description: SITE.description, site: context.site,
    items: list.map((a) => ({ title: a.data.title, description: a.data.description, pubDate: a.data.date, link: `/articles/${a.id}/`, categories: [a.data.category] })),
    customData: '<language>ko</language>' });
}
