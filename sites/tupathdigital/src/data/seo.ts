/**
 * Page text and structured data (schema.org JSON-LD) for the home page. Every value comes from brief.json or the
 * catalog: names, URLs, prices and currency of the owner's listings. No reviews, ratings or availability claims
 * (the brief has none), and no discount (the codes ended).
 */
import { getImage } from 'astro:assets';
import brief from '../../brief.json';
import { BUSINESS, SOCIAL, brandMark, shelves } from './catalog';
import share from '../assets/images/gumroad-heoolh.png';

export const homeTitle = 'tupathdigital: AI products, 3D assets and wallpapers';
export const homeDescription =
  'Ready-to-use AI products: prompt guides, 3D game assets, wallpapers and practical guides on Etsy and Gumroad, with instant download.';

/** Absolute URL of the Open Graph image: the owner's own cover of the 450-prompts guide. */
export async function shareImageUrl(site: URL) {
  const image = await getImage({ src: share, format: 'jpg', width: 1000 });
  return new URL(image.src, site).href;
}

const priceOf = (value: string) => Number(value.replace(',', '.')).toFixed(2);

/** The JSON-LD graph of the home page. `site` is the absolute origin (astro.config.mjs `site`). */
export async function homeJsonLd(site: URL) {
  const origin = site.href.replace(/\/$/, '');
  const logoImage = await getImage({
    src: brandMark,
    format: 'webp',
    width: 512,
  });
  const products = await Promise.all(
    shelves
      .flatMap((shelf) => shelf.items)
      .map(async (item) => {
        const image = await getImage({
          src: item.cover,
          format: 'webp',
          width: 800,
        });
        return {
          '@type': 'Product',
          name: item.stores[0].title,
          image: `${origin}${image.src}`,
          brand: { '@type': 'Brand', name: BUSINESS },
          offers: item.stores.map((store) => {
            const offer = brief.offer.find((o) => o.url === store.url);
            return {
              '@type': 'Offer',
              url: store.url,
              price: priceOf(offer?.price ?? ''),
              priceCurrency: offer?.currency ?? 'USD',
            };
          }),
        };
      }),
  );
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: BUSINESS,
        url: `${origin}/`,
        logo: `${origin}${logoImage.src}`,
        sameAs: [
          brief.goal.primary.url,
          brief.goal.secondary.url,
          ...SOCIAL.map((s) => s.url),
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: BUSINESS,
        url: `${origin}/`,
        publisher: { '@id': `${origin}/#organization` },
        inLanguage: brief.language,
      },
      {
        '@type': 'ItemList',
        name: 'tupathdigital products',
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: product,
        })),
      },
    ],
  };
}
