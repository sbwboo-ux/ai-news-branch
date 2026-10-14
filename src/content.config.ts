import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const CATEGORIES = ['모델', '제품', '연구', '산업'] as const;

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    category: z.enum(CATEGORIES),
    topic: z.string(),
    image: z.string(),
    sources: z.array(z.object({ title: z.string(), url: z.string().url(), publisher: z.string(), date: z.string().optional() })).min(1),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

export const collections = { articles };
