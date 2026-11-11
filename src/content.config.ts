import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Collections are file based and edited through Pages CMS (see .pages.yml).
 * Image fields are stored as repository paths, e.g. "/src/assets/media/…",
 * and resolved to optimised images by src/lib/media.ts.
 */

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(10),
    summary: z.string(),
    image: z.string(),
    imageAlt: z.string(),
    priceFrom: z.string().default(''),
    priceNote: z.string().default(''),
    includes: z.array(z.string()).default([]),
    suitableFor: z.string(),
    expect: z.string(),
    seoTitle: z.string().default(''),
    seoDescription: z.string().default(''),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string(),
    imageAlt: z.string(),
    author: z.string().default('Nam'),
    category: z.string().default('Journal'),
    draft: z.boolean().default(false),
    seoTitle: z.string().default(''),
    seoDescription: z.string().default(''),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    updated: z.coerce.date(),
    intro: z.string().default(''),
  }),
});

export const collections = { services, blog, legal };
