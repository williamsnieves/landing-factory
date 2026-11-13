// Content collections for the files the owner edits in Pages CMS (see .pages.yml and docs/cms.md in the factory).
// Each JSON file holds one entry (id "main"); a wrong value fails `astro check` and the build, so CI never deploys it.
// Checks that span entries (a product's shelf exists, a cover file exists) run in src/data/catalog.ts at build time.
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const text = z.string().trim().min(1);

/** The JSON file is one object; the file loader wants entries keyed by id, so key it as the entry "main". */
const singleEntry = (path: string) =>
  file(path, { parser: (raw) => ({ main: JSON.parse(raw) }) });

const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'use lowercase letters, digits and hyphens',
  );

/** An https listing URL on one of the two stores, so a typo can never point a button somewhere else. */
const storeUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === 'https:' &&
    ['etsy.com', 'gumroad.com'].some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    )
  );
}, 'the URL must be https on etsy.com or gumroad.com');

const store = z
  .object({
    store: z.enum(['Etsy', 'Gumroad']),
    title: text,
    // USD, written as in the listing: "4.10", "14.50".
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'a number like 4.10'),
    url: storeUrl,
  })
  .strict();

const shelf = z.object({ id: slug, name: text, blurb: text }).strict();

const product = z
  .object({
    id: slug,
    shelf: slug,
    /** File name of an image in src/assets/images/; empty or missing shows the typographic card. */
    cover: z.string().trim().nullish(),
    alt: z.string().trim().nullish(),
    tags: z.array(text),
    stores: z.array(store).min(1),
  })
  .strict()
  .refine((value) => !value.cover || !!value.alt, {
    message: 'alt is required when the product has a cover',
    path: ['alt'],
  });

const offer = defineCollection({
  loader: singleEntry('./src/content/offer.json'),
  schema: z
    .object({
      shelves: z.array(shelf).min(1),
      products: z.array(product).min(1),
    })
    .strict(),
});

const isRealDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const coupon = z
  .object({
    code: z
      .string()
      .regex(
        /^[A-Z0-9]{3,32}$/,
        'capital letters and digits, 3 to 32 characters',
      ),
    discount: z.string().trim().min(1).max(40),
    store: z.enum(['Etsy', 'Gumroad', 'Both']),
    endsOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'a date like 2026-12-31')
      .refine(isRealDate, 'not a real calendar date'),
    note: z.string().trim().max(120).optional(),
  })
  .strict();

const coupons = defineCollection({
  loader: singleEntry('./src/content/coupons.json'),
  schema: z.object({ coupons: z.array(coupon) }).strict(),
});

export const collections = { offer, coupons };
