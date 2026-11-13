/**
 * The catalog of the page. Shelves, products, titles, prices and URLs live in src/content/offer.json (edited in
 * Pages CMS, validated by src/content.config.ts), so they are shown exactly as the owner lists them. This file
 * resolves the cover files, checks the references between entries and adds the one helper that tags outbound
 * store links for attribution. The business name, the calls to action and the social links still come from brief.json.
 */
import { getEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import brief from '../../brief.json';

import brandMark from '../assets/images/logo.webp';

/** Every image of src/assets/images, keyed by its path, so a cover is looked up by the file name the CMS stores. */
const images = import.meta.glob<ImageMetadata>('../assets/images/*', {
  eager: true,
  import: 'default',
});

/** The brand mark, imported once here so the header, the footer and the structured data share one use. */
export { brandMark };
export const PRIMARY = brief.goal.primary;
export const SECONDARY = brief.goal.secondary;
export const SOCIAL = brief.contact.social;
export const BUSINESS = brief.business.name;

/** Attribution parameters added to every outbound store link (they show up in the Etsy and Gumroad stats). */
const UTM = {
  utm_source: 'tupathdigital.com',
  utm_medium: 'referral',
  utm_campaign: 'landing',
} as const;

/** A store URL with the UTM parameters appended; a query string that is already there is kept. */
export function storeLink(url: string): string {
  const link = new URL(url);
  for (const [key, value] of Object.entries(UTM))
    link.searchParams.set(key, value);
  return link.href;
}

/** Primary and secondary calls to action, with attribution. */
export const PRIMARY_HREF = storeLink(PRIMARY.url);
export const SECONDARY_HREF = storeLink(SECONDARY.url);

export type StoreName = 'Etsy' | 'Gumroad';

export interface Store {
  name: StoreName;
  title: string;
  /** Price as listed, formatted like "$14.50". */
  price: string;
  /** The same price as a plain number string ("14.50"), for structured data. */
  amount: string;
  /** The listing URL, without attribution (structured data uses it). */
  url: string;
  /** The listing URL with the UTM parameters, for the buttons. */
  href: string;
}

export interface Product {
  id: string;
  /** The cover image, or null: the card then shows the product title as typography. */
  cover: ImageMetadata | null;
  alt: string;
  stores: Store[];
  /** Mono format tags, each one a word or number taken from the listing titles. */
  tags: string[];
}

export interface Shelf {
  id: string;
  name: string;
  blurb: string;
  items: Product[];
}

const formatPrice = (value: string) => `$${Number(value).toFixed(2)}`;

export interface Catalog {
  shelves: Shelf[];
  /** Total distinct products on the page. */
  productCount: number;
  /** Lowest listed price in the catalog, as shown on a card ("$4.10"). */
  lowestPrice: string;
  /** Number of stores that sell the products. */
  storeCount: number;
}

let cached: Promise<Catalog> | undefined;

/** The catalog, read from the `offer` collection and checked: every shelf exists and every cover file is there. */
export function getCatalog(): Promise<Catalog> {
  cached ??= loadCatalog();
  return cached;
}

async function loadCatalog(): Promise<Catalog> {
  const entry = await getEntry('offer', 'main');
  if (!entry)
    throw new Error(
      'Missing content entry: src/content/offer.json did not load.',
    );
  const { shelves: shelfData, products } = entry.data;

  const shelves: Shelf[] = shelfData.map((s) => ({ ...s, items: [] }));
  const ids = new Set(shelves.map((s) => s.id));
  if (ids.size !== shelves.length)
    throw new Error('offer.json: two shelves share the same id.');
  const productIds = new Set<string>();

  for (const p of products) {
    if (productIds.has(p.id))
      throw new Error(`offer.json: two products share the id "${p.id}".`);
    productIds.add(p.id);
    const shelf = shelves.find((s) => s.id === p.shelf);
    if (!shelf)
      throw new Error(
        `offer.json: product "${p.id}" is on the shelf "${p.shelf}", which is not in shelves (${[...ids].join(', ')}).`,
      );
    let cover: ImageMetadata | null = null;
    if (p.cover) {
      cover = images[`../assets/images/${p.cover}`] ?? null;
      if (!cover)
        throw new Error(
          `offer.json: product "${p.id}" uses the cover "${p.cover}", which is not in src/assets/images/.`,
        );
    }
    shelf.items.push({
      id: p.id,
      cover,
      alt: p.alt ?? '',
      tags: p.tags,
      stores: p.stores.map((s) => ({
        name: s.store,
        title: s.title,
        price: formatPrice(s.price),
        amount: Number(s.price).toFixed(2),
        url: s.url,
        href: storeLink(s.url),
      })),
    });
  }

  const empty = shelves.find((s) => s.items.length === 0);
  if (empty)
    throw new Error(`offer.json: the shelf "${empty.id}" has no products.`);

  const lowestPrice = shelves
    .flatMap((s) => s.items.flatMap((p) => p.stores.map((st) => st.price)))
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))[0];
  return {
    shelves,
    productCount: products.length,
    lowestPrice,
    storeCount: 2,
  };
}

export interface Coupon {
  code: string;
  discount: string;
  store: 'Etsy' | 'Gumroad' | 'Both';
  /** ISO date, "2026-12-31". */
  endsOn: string;
  note?: string;
}

/** Today as an ISO date (UTC), the build date. */
const today = () => new Date().toISOString().slice(0, 10);

/**
 * The coupons that can still be used: a coupon is valid through its `endsOn` date, and one whose date is before the
 * build date is not shown. An empty list means the page has no coupon section at all.
 */
export async function getActiveCoupons(): Promise<Coupon[]> {
  const entry = await getEntry('coupons', 'main');
  if (!entry)
    throw new Error(
      'Missing content entry: src/content/coupons.json did not load.',
    );
  const now = today();
  return entry.data.coupons.filter((c) => c.endsOn >= now);
}
