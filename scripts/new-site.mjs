#!/usr/bin/env node
// Scaffold a new landing site at sites/<slug>/ from the root starter.
// Run `node scripts/new-site.mjs --help` for options.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { SLUG_PATTERN, hasBriefFile, isPlanningEntry } from './lib/sites.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Starter paths copied verbatim into every new site (never pages or sections). */
export const COPIED_PATHS = [
  'astro.config.mjs',
  'tsconfig.json',
  'src/layouts',
  'src/components/motion',
  'src/components/three',
  'src/components/legal',
  'src/components/forms',
  'src/styles',
  'src/env.d.ts',
  'public/_headers',
  'public/favicon.svg',
  'public/robots.txt',
];

/** Dependencies a site shares with the root, with the root's exact version ranges. */
export const SHARED_DEPENDENCIES = [
  '@astrojs/react',
  '@tailwindcss/vite',
  'astro',
  'gsap',
  'lenis',
  'react',
  'react-dom',
  'tailwindcss',
  'three',
];

/** Dev dependencies needed so `astro check` works inside the site. */
export const SHARED_DEV_DEPENDENCIES = [
  '@astrojs/check',
  '@types/react',
  '@types/react-dom',
  '@types/three',
  'typescript',
];

export function validateSlug(slug) {
  if (typeof slug !== 'string' || slug === '') {
    return 'A site slug is required, for example: npm run new-site -- cafeteria';
  }
  if (!SLUG_PATTERN.test(slug)) {
    return `Invalid slug "${slug}": use lowercase letters, digits and single hyphens (^[a-z0-9]+(-[a-z0-9]+)*$).`;
  }
  return null;
}

const pick = (source, names) =>
  Object.fromEntries(
    names.map((name) => {
      if (!source?.[name])
        throw new Error(`Root package.json has no dependency "${name}"`);
      return [name, source[name]];
    }),
  );

/** Remove the root-only block (marked "Root-only") and its @source not rules. */
export function stripRootOnlyCss(css) {
  return css
    .replace(/\/\* Root-only[\s\S]*?\*\/\n/, '')
    .replace(/^@source not .*;\n/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

export function siteManifest(slug, rootPackage) {
  return {
    name: `site-${slug}`,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'astro dev',
      build: 'astro build',
      preview: 'astro preview',
      check: 'astro check',
    },
    dependencies: pick(rootPackage.dependencies, SHARED_DEPENDENCIES),
    devDependencies: pick(rootPackage.devDependencies, SHARED_DEV_DEPENDENCIES),
  };
}

export function siteConfig(slug) {
  return {
    target: 'cloudflare',
    cloudflare: { pagesProject: slug, productionBranch: 'main' },
  };
}

/** A single-quoted JavaScript string literal (the style Prettier keeps). */
export function jsString(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\n');
  return `'${escaped}'`;
}

/** `const name = 'value';`, wrapped the way Prettier wraps long lines. */
function constLine(name, value) {
  const line = `const ${name} = ${jsString(value)};`;
  return line.length <= 80 ? line : `const ${name} =\n  ${jsString(value)};`;
}

export function placeholderPage({ title, description, lang, message }) {
  return `---
import BaseLayout from '../layouts/BaseLayout.astro';

${constLine('title', title)}
${constLine('description', description)}
${constLine('lang', lang)}
${constLine('message', message)}
---

<BaseLayout title={title} description={description} lang={lang} noindex>
  <section class="mx-auto max-w-3xl px-6 py-32 md:py-48">
    <h1 class="font-display text-3xl leading-tight tracking-tight text-balance">
      {title}
    </h1>
    <p class="text-ink-soft mt-6 text-lg">{message}</p>
  </section>
</BaseLayout>
`;
}

/** Texts of the default 404 page, by language (English for any other language tag). */
const NOT_FOUND_TEXTS = {
  en: {
    title: 'Page not found',
    description: 'This page does not exist.',
    heading: 'This page does not exist.',
    body: 'The link may be old or mistyped.',
    link: 'Back to the home page',
  },
  es: {
    title: 'Página no encontrada',
    description: 'Esta página no existe.',
    heading: 'Esta página no existe.',
    body: 'El enlace puede estar desactualizado o mal escrito.',
    link: 'Volver al inicio',
  },
};

/**
 * Default 404 page (src/pages/404.astro): noindex, BaseLayout, a heading and a link home. The build emits dist/404.html
 * from it, which the landing report's 404 item needs; the /new-landing build phase restyles it in the landing's design.
 */
export function notFoundPage({ title, lang }) {
  const text = NOT_FOUND_TEXTS[lang.split('-')[0]] ?? NOT_FOUND_TEXTS.en;
  return `---
// Not-found page: the build emits dist/404.html, which static hosts serve with status 404.
import BaseLayout from '../layouts/BaseLayout.astro';

${constLine('title', `${text.title} | ${title}`)}
${constLine('description', text.description)}
${constLine('lang', lang)}
${constLine('heading', text.heading)}
${constLine('body', text.body)}
${constLine('homeLabel', text.link)}
---

<BaseLayout title={title} description={description} lang={lang} noindex>
  <section class="mx-auto max-w-3xl px-6 py-32 md:py-48">
    <p class="text-ink-soft text-sm tracking-widest uppercase">404</p>
    <h1 class="font-display mt-4 text-3xl leading-tight tracking-tight text-balance">
      {heading}
    </h1>
    <p class="text-ink-soft mt-6 text-lg">{body}</p>
    <p class="mt-8">
      <a href="/" class="underline underline-offset-4">
        {homeLabel}
      </a>
    </p>
  </section>
</BaseLayout>
`;
}

// --- Multi-locale sites (--langs en,es; design: openspec/changes/add-bilingual-landing/design.md) -----------------

/** A locale is a lowercase language tag; it names the folder src/pages/<locale>/ and must match i18n.locales exactly. */
export const LOCALE_PATTERN = /^[a-z]{2,3}(-[a-z0-9]+)*$/;

/**
 * Locales of a multi-locale site from `--langs`: the default locale first (`lang`, else the first of the list),
 * then the others in order. Throws on a bad tag, a duplicate, fewer than two languages, or a `lang` not in the list.
 */
export function resolveLocales(langs, lang) {
  const list = (Array.isArray(langs) ? langs : String(langs).split(','))
    .map((tag) => String(tag).trim())
    .filter(Boolean);
  for (const tag of list)
    if (!LOCALE_PATTERN.test(tag))
      throw new Error(
        `Invalid --langs entry "${tag}": use lowercase language tags such as en, es or pt-br (they name the folders src/pages/<locale>/).`,
      );
  const duplicate = list.find((tag, index) => list.indexOf(tag) !== index);
  if (duplicate) throw new Error(`Duplicate --langs entry "${duplicate}".`);
  if (list.length < 2)
    throw new Error(
      '--langs needs two or more languages, for example --langs en,es; use --lang for a single-language site.',
    );
  const defaultLocale = lang ?? list[0];
  if (!list.includes(defaultLocale))
    throw new Error(
      `--lang "${defaultLocale}" is not in --langs (${list.join(', ')}); the default locale must be one of them.`,
    );
  return [defaultLocale, ...list.filter((tag) => tag !== defaultLocale)];
}

/** The `i18n` block of astro.config.mjs (Astro's built-in routing: the default locale has no URL prefix). */
export function i18nConfigBlock(locales) {
  return `  // Multi-locale site (npm run new-site -- <slug> --langs ...): Astro's built-in i18n routing. The default locale
  // is served at the root and every other locale under /<locale>/, so src/pages/<locale>/ folders must match
  // \`locales\` exactly. There is no redirect by browser language (static output): the language switcher links.
  i18n: {
    locales: [${locales.map(jsString).join(', ')}],
    defaultLocale: ${jsString(locales[0])},
    routing: {
      prefixDefaultLocale: false,
    },
  },
`;
}

/** The starter's astro.config.mjs with the `i18n` block after `output: 'static'` (the security.csp block stays as is). */
export function i18nAstroConfig(rootConfig, locales) {
  const anchor = "  output: 'static',\n";
  if (!rootConfig.includes(anchor))
    throw new Error(
      "The starter's astro.config.mjs has no `output: 'static',` line to place the i18n block after.",
    );
  return rootConfig.replace(anchor, `${anchor}${i18nConfigBlock(locales)}`);
}

/** Interface strings by language, for the generated dictionary. Other languages start in English: translate them. */
const UI_TEXTS = {
  en: {
    skipToContent: 'Skip to content',
    language: 'Language',
    aiDisclosure: 'Some images on this page were generated with AI.',
    photoCredits: 'Photo credits',
    underConstruction: 'This site is under construction.',
  },
  es: {
    skipToContent: 'Saltar al contenido',
    language: 'Idioma',
    aiDisclosure: 'Algunas imágenes de esta página se generaron con IA.',
    photoCredits: 'Créditos de las fotos',
    underConstruction: 'Estamos preparando esta web.',
  },
};

const objectKey = (tag) => (/^[a-z_$][\w$]*$/i.test(tag) ? tag : jsString(tag));

/** src/i18n/ui.ts: the typed UI dictionary, one object per locale, and the `t(locale)` helper. */
export function uiFile(locales) {
  const known = (tag) => UI_TEXTS[tag.split('-')[0]];
  const toTranslate = locales.filter((tag) => !known(tag));
  const body = locales
    .map((tag) => {
      const texts = known(tag) ?? UI_TEXTS.en;
      const note = known(tag)
        ? ''
        : '    // TODO: translate these strings (copied from English).\n';
      const entries = Object.entries(texts)
        .map(([key, value]) => `    ${key}: ${jsString(value)},`)
        .join('\n');
      return `  ${objectKey(tag)}: {\n${note}${entries}\n  },`;
    })
    .join('\n');
  const todo = toTranslate.length
    ? `\n// Still to translate: ${toTranslate.join(', ')}.`
    : '';
  return `// UI dictionary of the site: the short interface strings (skip link, language switcher label, AI disclosure,
// credits label) by locale. Page copy is not here: write it in each locale's own page or content file as natural
// text, never as a word-for-word translation. To add a string, add the key to \`Dictionary\` and then to every
// locale (TypeScript fails on a missing one).${todo}

/** Must match i18n.locales in astro.config.mjs (the folder names under src/pages/); check-landing verifies it. */
export const locales = [${locales.map(jsString).join(', ')}] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = ${jsString(locales[0])};

export interface Dictionary {
  skipToContent: string;
  language: string;
  aiDisclosure: string;
  photoCredits: string;
  underConstruction: string;
}
export type UiKey = keyof Dictionary;

export const ui: Record<Locale, Dictionary> = {
${body}
};

/** The dictionary of a locale (the default locale's when the locale is unknown or undefined). */
export function t(locale: string | undefined): Dictionary {
  return ui[locale as Locale] ?? ui[defaultLocale];
}
`;
}

/** src/i18n/urls.ts: the bridge BaseLayout loads (only sites with i18n have it) to emit the hreflang alternates. */
export function urlsFile() {
  return `// Bridge between BaseLayout and Astro's i18n routing. BaseLayout loads this file only when it exists, which is how
// single-language sites avoid importing \`astro:i18n\` (it fails to resolve without an \`i18n\` block in astro.config.mjs).
export { alternateLinks } from '../components/i18n/paths';
export { defaultLocale, locales } from './ui';
`;
}

/**
 * Placeholder home page of a multi-locale site. The same file lives at src/pages/index.astro (default locale) and at
 * src/pages/<locale>/index.astro; the language comes from Astro.currentLocale and the texts from the dictionary.
 * `depth` is 0 at the root and 1 under a locale folder. A `message` replaces the dictionary's body text.
 */
export function i18nPlaceholderPage({ title, description, message, depth }) {
  const up = '../'.repeat(depth + 1);
  return `---
import BaseLayout from '${up}layouts/BaseLayout.astro';
import LanguageSwitcher from '${up}components/i18n/LanguageSwitcher.astro';
import { locales, t } from '${up}i18n/ui';

${constLine('title', title)}
${constLine('description', description)}
const dict = t(Astro.currentLocale);
${message === undefined ? 'const message = dict.underConstruction;' : constLine('message', message)}
---

<BaseLayout
  title={title}
  description={description}
  skipLabel={dict.skipToContent}
  noindex
>
  <LanguageSwitcher
    slot="header"
    locales={locales}
    label={dict.language}
    class="mx-auto max-w-3xl px-6 pt-6"
  />
  <section class="mx-auto max-w-3xl px-6 py-32 md:py-48">
    <h1 class="font-display text-3xl leading-tight tracking-tight text-balance">
      {title}
    </h1>
    <p class="text-ink-soft mt-6 text-lg">{message}</p>
  </section>
</BaseLayout>
`;
}

export function creditsFile(slug) {
  return `# Credits: ${slug}

Every external image, font, icon or component used by this site must be listed here with its source URL, author and license (for example CC0, MIT, or an open collection that allows commercial use). No asset without a recorded license.

| Asset | Source URL | Author | License |
| ----- | ---------- | ------ | ------- |
`;
}

/** Phases of the /new-landing skill, in order. RUN.md tracks one row per phase. */
export const RUN_PHASES = [
  'brief',
  'synthesis',
  'checkpoint',
  'design-system',
  'build',
  'qa',
  'polish',
  'final-check',
];

export function proposalFile(slug, title, locales = null) {
  return `# Proposal: ${title ?? slug}

Status: **draft**. Fill every section; the checkpoint waits for approval unless the run is automatic.

## Brief

- **Source:** the niche line, or \`sites/${slug}/brief.json\` (the customer's requirement; fields listed in its \`assumed\` array, and empty ones, are not customer facts and are listed under Decisions).
- **Niche:**
- **Brand (fictional or real):** from the brief when there is one.
- **Goal of the page:** primary action and secondary action.
- **Audience:**
- **Tone:**
- **Signals:** (comma-separated words from the closed vocabulary of design-archetypes/README.md; the synthesis writes them)
- **Language:** ${
    locales
      ? `multi-locale: ${locales.join(', ')} (default ${locales[0]}, no URL prefix; the others under /<locale>/). The copy is written for every locale as natural text, same sections in each.`
      : 'the copy language (default Spanish unless the brief says otherwise).'
  }
- **Site location:** \`sites/${slug}/\`, deployed to the target in its \`site.config.json\` (Cloudflare Pages by default).

## References used

| Sheet | What we take | What we leave |
| ----- | ------------ | ------------- |

**Direction in one line:**

## Archetype blend

Chosen from \`node scripts/pick-archetypes.mjs --site ${slug}\` (signals of the Brief, the reference sheets above, blends other sites already use). The archetype sheets in \`design-archetypes/\` are a starting grammar, not a template: any deviation goes in RUN.md "Design decisions".

- **Primary:** (owns the layout grammar; or \`custom\` when the references lead)
- **Secondary:** (optional)
- **Lent traits:** (one or two; \`ref:<sheet>/<trait>\` when a reference supplies one)
- **Why:** the signals and references that led here, and why the top candidate was or was not taken.
- **Twist from the requirement:** one idea that comes from this business, not from a catalog.
- **Planned deviations:**

## Page map

| #   | Section | Height | Purpose | Layout idea |
| --- | ------- | ------ | ------- | ----------- |

## Motion plan

| Moment | Trigger | Type | Notes |
| ------ | ------- | ---- | ----- |

Reduced motion: no pin, no scrub, no parallax, no smooth scroll; all content visible in its final state. Without JavaScript the page reads top to bottom with every section visible.

## Visual direction

- **Type:**
- **Palette:**
- **Hero type:** one of the types listed in the new-landing skill (full-bleed-photo, split, typographic, video, illustration, collage).
- **Imagery:** openly licensed photos only; every one recorded in \`assets.json\` and \`CREDITS.md\`. No images from the references.

## SEO

- **Primary keyword:** from \`seo.primaryKeyword\` in the brief; if the brief has none, chosen here from the niche and marked assumed.
- **Service area:** from \`seo.serviceArea\` (cities or regions), or none for an online business.
- **Schema type:** from \`seo.schemaType\` (a schema.org type, JSON-LD in \`src/data/seo.ts\` with customer facts only; no review or rating markup without real reviews).
- **Title and description per page (and per locale):** within the report limits (title 30 to 60 characters, description 70 to 160), one \`h1\`, the keyword written naturally.

## 3D

None, or up to two scenes (\`<Scene3D />\`, built from code, no external models). For each scene: purpose, poster (rendered with \`scripts/render-poster.mjs\` or a credited museum image), scroll behavior (\`scrub\` or a looping clock), and the reduced-motion fallback (the poster; no canvas, no JavaScript, no WebGL). Default: none.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings.

## Out of scope

Online shop, cart, payments, backend forms, CMS${locales ? ', a browser-language redirect (static output)' : ', multiple languages'}.

## Decisions

1.
`;
}

export function runFile(slug) {
  const rows = RUN_PHASES.map(
    (phase) => `| ${phase.padEnd(13)} | pending |         |          |       |`,
  );
  return `# Run log: ${slug}

Result: pending

Written by the /new-landing skill. \`Result:\` ends as one of \`checkpoint\` (waiting for approval), \`dry-run-done\`, \`passed\` or \`failed\`; scripts/new-landing.sh reads it for its exit code. A phase marked \`done\` is skipped when the run resumes.

## Inputs

| Field           | Value |
| --------------- | ----- |
| Niche           |       |
| References      |       |
| Mode            |       |
| Max QA attempts |       |
| Started         |       |

## Phases

| Phase         | Status  | Started | Finished | Notes |
| ------------- | ------- | ------- | -------- | ----- |
${rows.join('\n')}

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins). Every deviation from the chosen archetype sheets, with the requirement or reference that justifies it.

## Images

Count, sources and any photo dropped, with the reason.

## QA attempts

| #   | Verdict | Failures by check | Fixed | Notes |
| --- | ------- | ----------------- | ----- | ----- |

## Final check

Result of \`check-landing\`, \`credits --check\`, Prettier and \`astro check\`.

## Totals

Wall clock, approximate tokens when the session reports them, remaining failures if the run did not finish.
`;
}

export function assetsFile() {
  return `${JSON.stringify({ images: [] }, null, 2)}\n`;
}

export function readmeFile(slug, locales = null) {
  return `# ${slug}

Landing site \`site-${slug}\`, an npm workspace of landing-factory. See [sites/README.md](../README.md) for the conventions.

\`\`\`bash
npm run dev -w site-${slug}      # dev server
npm run build -w site-${slug}    # static build into sites/${slug}/dist/
npm run check -w site-${slug}    # astro check
npm run qa -- --site ${slug}     # full QA for this site only
\`\`\`

Deploy target (Cloudflare Pages project by default) and its settings: [site.config.json](site.config.json); guides in docs/deploy/. Asset licenses: [CREDITS.md](CREDITS.md).${
    locales
      ? `

Languages: ${locales.join(', ')} (default \`${locales[0]}\`, served at the root; the others under \`/<locale>/\`). Routing is Astro's built-in i18n (\`i18n\` in astro.config.mjs); \`src/i18n/ui.ts\` holds the interface strings, \`src/components/i18n/LanguageSwitcher.astro\` the switcher.`
      : ''
  }
`;
}

/**
 * Throws unless sites/<slug> can be created. With allowExistingDocs, an existing
 * folder is accepted only when it contains nothing but top-level *.md files, brief.json
 * and, next to a brief, an assets/ folder.
 */
function assertTargetFree(target, slug, allowExistingDocs) {
  if (!existsSync(target)) return;
  if (!allowExistingDocs) {
    throw new Error(
      `sites/${slug} already exists; refusing to touch it. Pick another slug.`,
    );
  }
  if (!statSync(target).isDirectory()) {
    throw new Error(`sites/${slug} exists and is not a folder.`);
  }
  const entries = readdirSync(target, { withFileTypes: true });
  const hasBrief = hasBriefFile(entries);
  const offending = entries.filter(
    (entry) => !isPlanningEntry(entry, { hasBrief }),
  );
  if (offending.length) {
    throw new Error(
      `sites/${slug} already exists with files other than Markdown docs, brief.json or its assets folder (${offending.map((e) => e.name).join(', ')}); refusing to touch it.`,
    );
  }
}

/**
 * Create sites/<slug>. Returns { created: string[], kept: string[] } with paths
 * relative to the site folder. Throws on invalid input; changes nothing when it throws.
 */
export function scaffoldSite({
  slug,
  repoRoot = ROOT,
  sitesDir = join(repoRoot, 'sites'),
  allowExistingDocs = false,
  title,
  description,
  lang,
  langs,
  message,
}) {
  const slugError = validateSlug(slug);
  if (slugError) throw new Error(slugError);
  // With langs (a multi-locale site) the default locale is lang, else the first language; otherwise lang or English.
  const locales = langs ? resolveLocales(langs, lang) : null;
  lang ??= locales ? locales[0] : 'en';
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(lang))
    throw new Error(
      `Invalid --lang "${lang}": expected a language tag such as en or es.`,
    );
  const bodyText = message ?? 'This site is under construction.';

  const target = join(sitesDir, slug);
  assertTargetFree(target, slug, allowExistingDocs);

  const rootPackage = JSON.parse(
    readFileSync(join(repoRoot, 'package.json'), 'utf8'),
  );
  const pageTitle = title ?? slug;
  const generated = {
    'package.json': `${JSON.stringify(siteManifest(slug, rootPackage), null, 2)}\n`,
    'site.config.json': `${JSON.stringify(siteConfig(slug), null, 2)}\n`,
    'CREDITS.md': creditsFile(slug),
    'PROPOSAL.md': proposalFile(slug, title, locales),
    'RUN.md': runFile(slug),
    'assets.json': assetsFile(),
    // Scene modules of <Scene3D /> live here (see src/components/three/README.md).
    'src/scenes/.gitkeep': '',
    'README.md': readmeFile(slug, locales),
    'src/pages/index.astro': locales
      ? i18nPlaceholderPage({
          title: pageTitle,
          description: description ?? bodyText,
          message,
          depth: 0,
        })
      : placeholderPage({
          title: pageTitle,
          description: description ?? bodyText,
          lang,
          message: bodyText,
        }),
    // One 404 page, in the default language (static hosts serve a single 404.html).
    'src/pages/404.astro': notFoundPage({ title: pageTitle, lang }),
  };
  if (locales) {
    generated['src/i18n/ui.ts'] = uiFile(locales);
    generated['src/i18n/urls.ts'] = urlsFile();
    for (const locale of locales.slice(1))
      generated[`src/pages/${locale}/index.astro`] = i18nPlaceholderPage({
        title: pageTitle,
        description: description ?? bodyText,
        depth: 1,
      });
  }

  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(join(dir, entry.name))
        : [relative(target, join(dir, entry.name)).split(sep).join('/')],
    );
  // Whatever is already there (planning docs) is kept and never overwritten.
  const kept = existsSync(target) ? walk(target) : [];

  mkdirSync(target, { recursive: true });
  for (const path of COPIED_PATHS) {
    const from = join(repoRoot, path);
    if (!existsSync(from)) throw new Error(`Starter file missing: ${path}`);
    const to = join(target, path);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true, force: false });
  }
  if (locales) {
    // The switcher and its URL helpers exist only in multi-locale sites; so does the i18n block of the config.
    cpSync(
      join(repoRoot, 'src/components/i18n'),
      join(target, 'src/components/i18n'),
      { recursive: true, force: false },
    );
    const config = join(target, 'astro.config.mjs');
    writeFileSync(
      config,
      i18nAstroConfig(readFileSync(config, 'utf8'), locales),
    );
  }
  // The root stylesheet excludes sites/ and scripts/ from its class scan; those
  // paths do not exist inside a site, so drop the rules from the copy.
  const globalCss = join(target, 'src/styles/global.css');
  writeFileSync(globalCss, stripRootOnlyCss(readFileSync(globalCss, 'utf8')));
  for (const [path, content] of Object.entries(generated)) {
    if (kept.includes(path)) continue;
    const to = join(target, path);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, content);
  }

  const created = walk(target).filter((file) => !kept.includes(file));
  return { created: created.sort(), kept: kept.sort() };
}

const HELP = `Usage: npm run new-site -- <slug> [options]

Creates sites/<slug>/ from the starter: layout, motion layer, styles, headers
and configuration, plus a placeholder home page, a default 404 page (src/pages/404.astro), CREDITS.md, README.md, the
planning templates PROPOSAL.md and RUN.md, and an empty assets.json (image manifest).
The 3D layer (src/components/three/) is copied with an empty src/scenes/. The starter's demo pages, demo scene and sections are never copied.

  <slug>                    lowercase letters, digits, single hyphens
  --title <text>            title and heading of the placeholder page (default: the slug)
  --description <text>      meta description (default: the message)
  --lang <tag>              <html lang> of the placeholder page (default: en; with --langs, the default locale)
  --langs <a,b,...>         a multi-locale site: two or more lowercase language tags (for example en,es). The default
                            locale is --lang, else the first. Writes the i18n block of astro.config.mjs (default
                            locale at the root, the others under /<locale>/), src/pages/<locale>/index.astro for each
                            other locale, src/i18n/ui.ts (typed UI dictionary and t(locale)), src/i18n/urls.ts and
                            the language switcher (src/components/i18n/). The single 404 page stays in the default language.
  --message <text>          placeholder body text (default: "This site is under construction.")
  --allow-existing-docs     accept an existing sites/<slug> that holds only *.md
                            files (for example a PROPOSAL.md or RUN.md) and brief.json; they are never overwritten
  --help                    show this help

Environment: LANDING_FACTORY_ROOT=<dir> creates the site in <dir>/sites/ instead of this repo (tests only).

Refuses invalid slugs and existing folders. Afterwards run \`npm install\` once to
register the workspace in package-lock.json, and commit the lockfile.`;

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      title: { type: 'string' },
      description: { type: 'string' },
      lang: { type: 'string' },
      langs: { type: 'string' },
      message: { type: 'string' },
      'allow-existing-docs': { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(HELP);
    return 0;
  }
  if (positionals.length !== 1) {
    console.error(`Expected exactly one slug.\n\n${HELP}`);
    return 1;
  }
  try {
    // LANDING_FACTORY_ROOT redirects only where sites/ lives (used by tests); the starter source stays this repo.
    const rootOverride = process.env.LANDING_FACTORY_ROOT;
    const { created, kept } = scaffoldSite({
      slug: positionals[0],
      ...(rootOverride
        ? { sitesDir: join(resolve(rootOverride), 'sites') }
        : {}),
      allowExistingDocs: values['allow-existing-docs'],
      title: values.title,
      description: values.description,
      lang: values.lang,
      langs: values.langs,
      message: values.message,
    });
    console.log(`Created sites/${positionals[0]}/ (${created.length} files):`);
    for (const file of created) console.log(`  + ${file}`);
    for (const file of kept) console.log(`  = ${file} (kept, not overwritten)`);
    console.log(
      `\nNext: run \`npm install\` to register the workspace, then \`npm run build -w site-${positionals[0]}\`.`,
    );
    return 0;
  } catch (error) {
    console.error(`new-site: ${error.message}`);
    return 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exit(main());
}
