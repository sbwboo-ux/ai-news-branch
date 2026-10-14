import { getCollection } from 'astro:content';
export async function allArticles() {
  return (await getCollection('articles')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
