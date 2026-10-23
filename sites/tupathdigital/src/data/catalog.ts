/**
 * The catalog of the page. Titles, prices, URLs and coupon codes are read from
 * brief.json (the owner's listings), so they are shown exactly as given. This
 * file only adds the layout: shelf, cover, alt text, and mono format tags.
 */
import type { ImageMetadata } from 'astro';
import brief from '../../brief.json';

import gumHeoolh from '../assets/images/gumroad-heoolh.png';
import gumUfvyu from '../assets/images/gumroad-ufvyu.png';
import gumFrbcf from '../assets/images/gumroad-frbcf.png';
import gumXfoqn from '../assets/images/gumroad-xfoqn.png';
import etsyLovable from '../assets/images/etsy-4510744982.jpg';
import etsyPlanner from '../assets/images/etsy-1888381994.jpg';
import etsyCyber from '../assets/images/etsy-4426604786.jpg';
import etsyAiTech from '../assets/images/etsy-4428727624.jpg';
import etsyVapor from '../assets/images/etsy-4423955365.jpg';
import etsyEarth from '../assets/images/etsy-4442926542.jpg';
import etsyVehicles from '../assets/images/etsy-4443144664.jpg';
import etsyCharacters from '../assets/images/etsy-4448900410.jpg';
import etsyKit from '../assets/images/etsy-4316616449.jpg';
import etsyParents from '../assets/images/etsy-4338601085.jpg';
import etsyFreelance from '../assets/images/etsy-4349241344.jpg';
import etsyFinanceEs from '../assets/images/etsy-4298208749.jpg';
import etsyFinanceEn from '../assets/images/etsy-4297967816.jpg';

export const PRIMARY = brief.goal.primary;
export const SECONDARY = brief.goal.secondary;
export const SOCIAL = brief.contact.social;
export const BUSINESS = brief.business.name;

export const COUPONS = {
  Etsy: { code: 'FALL2026', url: PRIMARY.url },
  Gumroad: { code: '92xsh57', url: SECONDARY.url },
} as const;
export const COUPON_END = 'Oct 31, 2026';
export const COUPON_END_ISO = '2026-10-31';

export type StoreName = 'Etsy' | 'Gumroad';

export interface Store {
  name: StoreName;
  title: string;
  /** Price as listed, formatted like "$14.50". */
  price: string;
  url: string;
  code: string;
}

export interface Product {
  id: string;
  cover: ImageMetadata;
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

const formatPrice = (value: string) =>
  `$${Number(value.replace(',', '.')).toFixed(2)}`;

function store(listingId: string): Store {
  const offer = brief.offer.find((o) => o.url.includes(listingId));
  if (!offer) throw new Error(`brief.json has no listing ${listingId}`);
  const name: StoreName = offer.url.includes('etsy.com') ? 'Etsy' : 'Gumroad';
  return {
    name,
    title: offer.name,
    price: formatPrice(offer.price),
    url: offer.url,
    code: COUPONS[name].code,
  };
}

const product = (
  p: Omit<Product, 'stores'> & { listings: string[] },
): Product => {
  const { listings, ...rest } = p;
  return { ...rest, stores: listings.map(store) };
};

export const shelves: Shelf[] = [
  {
    id: 'ai',
    name: 'AI & prompts',
    blurb:
      'Prompt packs and playbooks for making images, apps and a calmer week with AI.',
    items: [
      product({
        id: 'gen-ai-450',
        cover: gumHeoolh,
        alt: 'Cover: Practical Guide to Generative AI plus 450 prompts, showing a mountain landscape, an animated girl portrait and a unicorn line drawing on a pink and orange gradient.',
        listings: ['4369377710', 'heoolh'],
        tags: ['450 prompts', 'PDF', 'Midjourney', 'DALL-E 3'],
      }),
      product({
        id: 'prompt-collection',
        cover: gumUfvyu,
        alt: 'Cover: Ultimate AI Prompt Bundle, a grid of glowing city and robot scenes with a stack of PDF prompt files.',
        listings: ['ufvyu'],
        tags: ['Prompt collection', 'Strategy', 'Creativity'],
      }),
      product({
        id: 'lovable',
        cover: etsyLovable,
        alt: 'Cover: The Lovable Playbook, a dark purple poster with an app dashboard on a laptop and the line from prompt to deployment.',
        listings: ['4510744982'],
        tags: ['No-code', 'Guide', 'SaaS MVPs'],
      }),
      product({
        id: 'planner',
        cover: etsyPlanner,
        alt: 'Cover: Organize your life with Notion and ChatGPT in 7 days, a laptop showing a weekly planner next to the Notion and ChatGPT logos.',
        listings: ['1888381994'],
        tags: ['Notion', 'ChatGPT'],
      }),
    ],
  },
  {
    id: '3d',
    name: '3D & game assets',
    blurb:
      'Ready-made models in GLB, FBX and OBJ, and a guide to make your own with AI.',
    items: [
      product({
        id: 'meshy-54',
        cover: gumFrbcf,
        alt: 'Cover: The Ultimate Bundle, a 94-page guide, 250 prompts and 54 ready-to-use 3D assets, with a dragon, a wizard, a castle and a spaceship.',
        listings: ['4560860968', 'frbcf'],
        tags: [
          '54 3D models',
          '250 prompts',
          '94-page guide',
          'GLB',
          'FBX',
          'OBJ',
        ],
      }),
      product({
        id: 'fantasy-50',
        cover: gumXfoqn,
        alt: 'Cover: 50 Premium 3D Assets Volume 2, a game-ready set with a scavenger heroine, an armored beast, a timber house and a stone gate.',
        listings: ['4565088403', 'xfoqn'],
        tags: ['50 3D models', 'GLB', 'FBX', 'OBJ'],
      }),
    ],
  },
  {
    id: 'wallpapers',
    name: 'Wallpapers',
    blurb:
      'Six packs of AI backgrounds: neon, cyberpunk, sci-fi, landscapes, vehicles and characters.',
    items: [
      product({
        id: 'ai-tech',
        cover: etsyAiTech,
        alt: 'Cover: AI Tech and Data sci-fi abstract backgrounds, showing a glowing brain, a planet ring, a globe and a cloud in blue.',
        listings: ['4428727624'],
        tags: ['85 wallpapers'],
      }),
      product({
        id: 'cyberpunk',
        cover: etsyCyber,
        alt: 'Cover: Futuristic Cyberpunk abstract backgrounds, a mosaic of neon grids, waves and tunnels.',
        listings: ['4426604786'],
        tags: ['150 wallpapers'],
      }),
      product({
        id: 'vehicles',
        cover: etsyVehicles,
        alt: 'Cover: AI Vehicles and Transportation backgrounds, with a black hypercar, a hover craft, a rover and a bullet train.',
        listings: ['4443144664'],
        tags: ['Backgrounds'],
      }),
      product({
        id: 'characters',
        cover: etsyCharacters,
        alt: 'Cover: AI Characters and Fantasy Beings, a wizard, a robot, a warrior and a dragon in a starry sky.',
        listings: ['4448900410'],
        tags: ['Backgrounds'],
      }),
      product({
        id: 'earth',
        cover: etsyEarth,
        alt: 'Cover: Epic Earth landscape backgrounds, four panels of mountains, rivers, lava and forests through the seasons.',
        listings: ['4442926542'],
        tags: ['Landscape', 'Backgrounds'],
      }),
      product({
        id: 'vaporwave',
        cover: etsyVapor,
        alt: 'Cover: Vaporwave Neon abstract backgrounds, three overlapping neon rings on black.',
        listings: ['4423955365'],
        tags: ['89 wallpapers'],
      }),
    ],
  },
  {
    id: 'guides',
    name: 'Guides',
    blurb:
      'Practical kits and 30-day guides for money, freelancing, parenting and social media.',
    items: [
      product({
        id: 'social-kit',
        cover: etsyKit,
        alt: 'Cover: Social media marketing kit for local businesses, with Instagram and Facebook icons, a calendar and a phone.',
        listings: ['4316616449'],
        tags: ['Canva', 'Calendario', 'PDF'],
      }),
      product({
        id: 'parents',
        cover: etsyParents,
        alt: 'Cover: Pantallas con Propósito, a parents guide with a mother and child reading a book.',
        listings: ['4338601085'],
        tags: ['Guía'],
      }),
      product({
        id: 'freelancer',
        cover: etsyFreelance,
        alt: 'Cover: How to start as a freelancer in 30 days, an illustration of a person working at a laptop.',
        listings: ['4349241344'],
        tags: ['30 días', 'Manual'],
      }),
      product({
        id: 'finance-es',
        cover: etsyFinanceEs,
        alt: 'Cover: Controla tus finanzas en 30 días, an orange cover with a woman holding a coin and a checklist.',
        listings: ['4298208749'],
        tags: ['30 días', 'Plantilla'],
      }),
      product({
        id: 'finance-en',
        cover: etsyFinanceEn,
        alt: 'Cover: Take control of your finances in 30 days, a yellow cover with a piggy bank and a checklist.',
        listings: ['4297967816'],
        tags: ['30-day', 'Spreadsheet'],
      }),
    ],
  },
];

/** Total distinct products on the page. */
export const productCount = shelves.reduce((n, s) => n + s.items.length, 0);

/** Lowest listed price in the catalog, as shown on a card ("$4.10"). */
export const lowestPrice = shelves
  .flatMap((s) => s.items.flatMap((p) => p.stores.map((st) => st.price)))
  .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))[0];

/** Number of stores that sell the products. */
export const storeCount = 2;
