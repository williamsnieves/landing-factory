import { getEntry } from 'astro:content';
import { en } from './en';
import { es } from './es';
import type { Content, PageCopy } from './types';

const byLocale: Record<string, PageCopy> = { en, es };

/**
 * The page copy of a locale (English when the locale is unknown or undefined): the prose from en.ts / es.ts plus the
 * career and the skill groups from the content collections (src/content/career.json and skills.json).
 */
export async function getContent(locale: string | undefined): Promise<Content> {
  const lang = locale === 'es' ? 'es' : 'en';
  const copy = byLocale[lang] ?? en;
  const career = await getEntry('career', 'main');
  const skills = await getEntry('skills', 'main');
  if (!career || !skills) {
    throw new Error(
      'Missing content entry: src/content/career.json or skills.json did not load.',
    );
  }
  return {
    ...copy,
    path: {
      ...copy.path,
      jobs: career.data.jobs.map((job) => ({
        employer: job.employer,
        role: job.role[lang],
        place: job.place[lang],
        dates: job.dates[lang],
        bullets: job.bullets[lang],
        stack: (lang === 'es' && job.stackEs) || job.stack,
        tone: job.tone,
      })),
      earlier: career.data.earlier.map((role) => ({
        employer: role.employer,
        role: role.role[lang],
        dates: role.dates[lang],
      })),
    },
    skills: {
      ...copy.skills,
      groups: skills.data.groups.map((group) => ({
        title: group.title[lang],
        items: (lang === 'es' && group.itemsEs) || group.items,
        size: group.size,
        ...(group.tone ? { tone: group.tone } : {}),
      })),
    },
  };
}

export type { Content } from './types';
