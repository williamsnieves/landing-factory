// One interface for the page copy of every locale. The labels, headings and prose live in src/content/en.ts and es.ts
// (PageCopy); the career (path.jobs, path.earlier) and the skill groups (skills.groups) are CMS-editable JSON files,
// src/content/career.json and skills.json, validated by src/content.config.ts and merged into Content by getContent().

export interface JobContent {
  employer: string;
  role: string;
  place: string;
  dates: string;
  bullets: string[];
  stack: string[];
  /** Which flat color field the card uses (design-system fields 3 and 5). */
  tone: 3 | 5;
}

export interface EarlierRole {
  employer: string;
  role: string;
  dates: string;
}

export interface SkillGroup {
  title: string;
  items: string[];
  /** Width of the bento tile on desktop: wide is 7 of 12 columns, narrow is 5. */
  size: 'wide' | 'narrow';
  /** The AI tools tile takes the deep blue field of the AI chapter. */
  tone?: 'ai';
}

export interface Content {
  meta: { title: string; description: string };
  ticker: string[];
  hero: {
    role: string;
    lead: string;
    findMe: string;
    portraitAlt: string;
    humanLabel: string;
    machineLabel: string;
    chips: string[];
  };
  about: {
    label: string;
    heading: string;
    statement: { before: string; accent: string; after: string };
    paragraphs: string[];
    facts: { key: string; value: string }[];
  };
  ai: {
    label: string;
    heading: string;
    intro: string;
    stepLabel: string;
    steps: { title: string; body: string; chips: string[] }[];
    portraitAlt: string;
    portraitCaption: string;
  };
  path: {
    label: string;
    heading: string;
    intro: string;
    present: string;
    stackLabel: string;
    earlierLabel: string;
    jobs: JobContent[];
    earlier: EarlierRole[];
  };
  skills: {
    label: string;
    heading: string;
    intro: string;
    groups: SkillGroup[];
  };
  beyond: {
    label: string;
    heading: string;
    intro: string;
    cards: { title: string; body: string }[];
    stringsLabel: string;
    stringsHint: string;
  };
  edu: {
    label: string;
    heading: string;
    educationTitle: string;
    degree: string;
    school: string;
    years: string;
    languagesTitle: string;
    languages: { name: string; level: string }[];
  };
  footer: { tagline: string };
}

/** What en.ts and es.ts hold: Content without the lists that come from the CMS-editable JSON files. */
export type PageCopy = Omit<Content, 'path' | 'skills'> & {
  path: Omit<Content['path'], 'jobs' | 'earlier'>;
  skills: Omit<Content['skills'], 'groups'>;
};
