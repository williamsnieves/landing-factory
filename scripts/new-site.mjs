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

import { SLUG_PATTERN, isPlanningDoc } from './lib/sites.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Starter paths copied verbatim into every new site (never pages or sections). */
export const COPIED_PATHS = [
  'astro.config.mjs',
  'tsconfig.json',
  'src/layouts',
  'src/components/motion',
  'src/components/three',
  'src/styles',
  'src/env.d.ts',
  'public/_headers',
  'public/favicon.svg',
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
  return { cloudflare: { pagesProject: slug, productionBranch: 'main' } };
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

export function proposalFile(slug, title) {
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
- **Language:** the copy language (default Spanish unless the brief says otherwise).
- **Site location:** \`sites/${slug}/\`, its own Cloudflare Pages project.

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

## 3D

None, or up to two scenes (\`<Scene3D />\`, built from code, no external models). For each scene: purpose, poster (rendered with \`scripts/render-poster.mjs\` or a credited museum image), scroll behavior (\`scrub\` or a looping clock), and the reduced-motion fallback (the poster; no canvas, no JavaScript, no WebGL). Default: none.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings.

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages.

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

export function readmeFile(slug) {
  return `# ${slug}

Landing site \`site-${slug}\`, an npm workspace of landing-factory. See [sites/README.md](../README.md) for the conventions.

\`\`\`bash
npm run dev -w site-${slug}      # dev server
npm run build -w site-${slug}    # static build into sites/${slug}/dist/
npm run check -w site-${slug}    # astro check
npm run qa -- --site ${slug}     # full QA for this site only
\`\`\`

Pages project and production branch: [site.config.json](site.config.json). Asset licenses: [CREDITS.md](CREDITS.md).
`;
}

/**
 * Throws unless sites/<slug> can be created. With allowExistingDocs, an existing
 * folder is accepted only when it contains nothing but top-level *.md files and brief.json.
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
  const offending = readdirSync(target, { withFileTypes: true }).filter(
    (entry) => !entry.isFile() || !isPlanningDoc(entry.name),
  );
  if (offending.length) {
    throw new Error(
      `sites/${slug} already exists with files other than Markdown docs or brief.json (${offending.map((e) => e.name).join(', ')}); refusing to touch it.`,
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
  lang = 'en',
  message = 'This site is under construction.',
}) {
  const slugError = validateSlug(slug);
  if (slugError) throw new Error(slugError);
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(lang))
    throw new Error(
      `Invalid --lang "${lang}": expected a language tag such as en or es.`,
    );

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
    'PROPOSAL.md': proposalFile(slug, title),
    'RUN.md': runFile(slug),
    'assets.json': assetsFile(),
    // Scene modules of <Scene3D /> live here (see src/components/three/README.md).
    'src/scenes/.gitkeep': '',
    'README.md': readmeFile(slug),
    'src/pages/index.astro': placeholderPage({
      title: pageTitle,
      description: description ?? message,
      lang,
      message,
    }),
  };

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
and configuration, plus a placeholder home page, CREDITS.md, README.md, the
planning templates PROPOSAL.md and RUN.md, and an empty assets.json (image manifest).
The 3D layer (src/components/three/) is copied with an empty src/scenes/. The starter's demo pages, demo scene and sections are never copied.

  <slug>                    lowercase letters, digits, single hyphens
  --title <text>            title and heading of the placeholder page (default: the slug)
  --description <text>      meta description (default: the message)
  --lang <tag>              <html lang> of the placeholder page (default: en)
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
