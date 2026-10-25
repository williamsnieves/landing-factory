import { en } from './en';
import { es } from './es';
import type { Content } from './types';

const byLocale: Record<string, Content> = { en, es };

/** The page copy of a locale (English when the locale is unknown or undefined). */
export function getContent(locale: string | undefined): Content {
  return byLocale[locale ?? 'en'] ?? en;
}

export type { Content } from './types';
