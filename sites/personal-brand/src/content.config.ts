// Content collections for the files the owner edits in Pages CMS (see .pages.yml and docs/cms.md in the factory).
// Each JSON file holds one entry (id "main"); a wrong value fails `astro check` and the build, so CI never deploys it.
// Facts shared by both languages are stored once; sentences are stored per language as { en, es }.
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const text = z.string().trim().min(1);
const textList = z.array(text);
const perLocale = <T extends z.ZodType>(shape: T) =>
  z.object({ en: shape, es: shape }).strict();

/** The JSON file is one object; the file loader wants entries keyed by id, so key it as the entry "main". */
const singleEntry = (path: string) =>
  file(path, { parser: (raw) => ({ main: JSON.parse(raw) }) });

const job = z
  .object({
    employer: text,
    role: perLocale(text),
    place: perLocale(text),
    dates: perLocale(text),
    // A job may have no bullets (the oldest stops are a stack only), but both languages must list the same number.
    bullets: perLocale(textList),
    stack: textList.min(1),
    /** Only when the Spanish list differs from `stack` (for example "IA" for "AI"). */
    stackEs: textList.min(1).optional(),
    // Pages CMS selects write strings; the page wants the number of the flat color field.
    tone: z
      .enum(['3', '5'])
      .transform((value) => (value === '3' ? 3 : (5 as const))),
  })
  .strict()
  .refine((value) => value.bullets.en.length === value.bullets.es.length, {
    message: 'bullets: English and Spanish need the same number of items',
    path: ['bullets'],
  });

const earlierRole = z
  .object({
    employer: text,
    role: perLocale(text),
    dates: perLocale(text),
  })
  .strict();

const skillGroup = z
  .object({
    title: perLocale(text),
    size: z.enum(['wide', 'narrow']),
    tone: z.literal('ai').optional(),
    items: textList.min(1),
    /** Only when the Spanish list differs from `items`. */
    itemsEs: textList.min(1).optional(),
  })
  .strict()
  .refine(
    (value) => !value.itemsEs || value.itemsEs.length === value.items.length,
    {
      message: 'itemsEs: needs the same number of items as items',
      path: ['itemsEs'],
    },
  );

const career = defineCollection({
  loader: singleEntry('./src/content/career.json'),
  schema: z
    .object({
      jobs: z.array(job).min(1),
      earlier: z.array(earlierRole),
    })
    .strict(),
});

const skills = defineCollection({
  loader: singleEntry('./src/content/skills.json'),
  schema: z.object({ groups: z.array(skillGroup).min(1) }).strict(),
});

export const collections = { career, skills };
