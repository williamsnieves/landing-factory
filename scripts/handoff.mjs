#!/usr/bin/env node
// Handing a finished landing over to its owner's repository, host and domain. Read-only: it writes nothing.
//
//   node scripts/handoff.mjs check --site <slug> [--visibility public|private] [--json]
//   node scripts/handoff.mjs plan  --site <slug> --repo <owner>/<name> --visibility public|private [--old-host <name>]
//
// `check` is the preflight: it names every problem that would stop a clean export or a working domain.
// `plan` prints the owner's checklist in Markdown from the site's real configuration (target, secrets by name,
// `site` URL). Secret values are never read. Exit codes: 0 ready (warnings allowed), 1 not ready, 2 bad usage.
// Design: openspec/changes/add-landing-handoff/design.md. Guide: docs/handoff.md.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  ConfigError,
  loadSiteConfig,
  mapBriefTarget,
  secretsFor,
  targetSection,
} from './deploy/config.mjs';
import { stripComments } from './export/closure.mjs';
import { SLUG_PATTERN, isSiteDir } from './lib/sites.mjs';
import { unusedLayers } from './site-layers.mjs';

const FACTORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The factory root; LANDING_FACTORY_ROOT moves it (tests, like the MCP server). */
const defaultRoot = () =>
  process.env.LANDING_FACTORY_ROOT
    ? resolve(process.env.LANDING_FACTORY_ROOT)
    : FACTORY_ROOT;

const VISIBILITIES = ['public', 'private'];
const REPO = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;
const OLD_HOST = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,39}$/;

/** A usage error: the arguments are wrong (exit 2). */
class UsageError extends Error {}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** The `site` URL of the astro.config.mjs source (a literal string), or null. Comments are ignored. */
export function siteUrlOfConfig(source) {
  const match = /(?:^|[\s,{])site\s*:\s*(['"`])([^'"`\n]*)\1/m.exec(
    stripComments(source),
  );
  return match ? match[2] : null;
}

/** Hosts the brief's domain may stand for: itself and its `www.` twin (and the reverse). */
const domainMatchesHost = (domain, host) =>
  host === domain || host === `www.${domain}` || domain === `www.${host}`;

/**
 * The preflight of one site. Returns { site, problems, warnings, facts }; problems and warnings are
 * { id, message }. `facts` holds what `plan` needs (config, site URL, brief domain). Writes nothing.
 */
export function checkSite(root, slug, { visibility } = {}) {
  const siteDir = join(root, 'sites', slug);
  const problems = [];
  const warnings = [];
  const problem = (id, message) => problems.push({ id, message });
  const facts = { slug, config: null, siteUrl: null, briefDomain: '' };

  if (!existsSync(siteDir) || !isSiteDir(siteDir)) {
    problem(
      'site',
      `there is no site "${slug}" under sites/ (create it with: npm run new-site -- ${slug})`,
    );
    return { site: slug, problems, warnings, facts };
  }

  if (existsSync(join(siteDir, 'EXPORTED.json')))
    problem(
      'exported',
      `sites/${slug}/EXPORTED.json exists: this landing already lives in its own repository (to refresh that repository's workflow and scripts, see docs/handoff.md)`,
    );

  for (const layer of unusedLayers(siteDir))
    problem(
      'unused-layer',
      `the site holds an unused optional layer (${layer}): run node scripts/site-layers.mjs prune --site ${slug}, then npm install`,
    );

  let config = null;
  try {
    config = loadSiteConfig(root, slug);
    facts.config = config;
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    problem('site-config', error.message);
  }

  const astroFile = join(siteDir, 'astro.config.mjs');
  const siteUrl = existsSync(astroFile)
    ? siteUrlOfConfig(readFileSync(astroFile, 'utf8'))
    : null;
  let siteHost = null;
  if (!siteUrl)
    problem(
      'site-url',
      `site is missing in sites/${slug}/astro.config.mjs: set it to the public https URL (for example site: 'https://example.com'); it is the canonical and hreflang base and the address of the domain report`,
    );
  else {
    try {
      const url = new URL(siteUrl);
      if (url.protocol !== 'https:') throw new Error('not https');
      siteHost = url.host;
      facts.siteUrl = url.origin;
    } catch {
      problem(
        'site-url',
        `site in sites/${slug}/astro.config.mjs is "${siteUrl}", which is not an absolute https URL`,
      );
    }
  }

  const briefFile = join(siteDir, 'brief.json');
  let brief = null;
  if (existsSync(briefFile))
    try {
      brief = readJson(briefFile);
    } catch (error) {
      problem(
        'brief',
        `sites/${slug}/brief.json is not valid JSON (${error.message})`,
      );
    }

  const domain = brief?.deploy?.domain;
  if (typeof domain === 'string' && domain.trim()) {
    facts.briefDomain = domain.trim().toLowerCase();
    if (siteHost && !domainMatchesHost(facts.briefDomain, siteHost))
      problem(
        'domain-mismatch',
        `the brief's deploy.domain is "${domain}" but site is ${facts.siteUrl}: change one of them so they name the same host (the www form of the same domain is accepted)`,
      );
  }

  const briefTarget = brief?.deploy?.target;
  if (config && typeof briefTarget === 'string') {
    try {
      const wanted = mapBriefTarget(briefTarget);
      if (wanted && wanted !== config.target)
        problem(
          'target-mismatch',
          `the brief asks for the "${briefTarget}" target but site.config.json has "${config.target}": run node scripts/deploy/config.mjs --site ${slug} --from-brief --write (a vps or shared target also needs its section by hand)`,
        );
    } catch (error) {
      if (!(error instanceof ConfigError)) throw error;
      problem('target-mismatch', error.message);
    }
  }

  if (visibility === 'public' && existsSync(briefFile))
    warnings.push({
      id: 'public-brief',
      message: `a public repository would carry sites/${slug}/brief.json (customer contact data and assumptions): export with --no-brief`,
    });

  return { site: slug, problems, warnings, facts };
}

// --- plan ----------------------------------------------------------------------------------------------------

/** Description of each secret from the "Secrets" table of docs/deploy/<target>.md (name -> text). */
export function secretDescriptions(target, docsRoot = FACTORY_ROOT) {
  const file = join(
    docsRoot,
    'docs',
    'deploy',
    `${target === 'shared' ? 'shared-hosting' : target}.md`,
  );
  const result = new Map();
  if (!existsSync(file)) return result;
  const lines = readFileSync(file, 'utf8').split('\n');
  const start = lines.findIndex((line) => /^## Secrets\b/.test(line));
  if (start === -1) return result;
  for (const line of lines.slice(start + 1)) {
    if (/^## /.test(line)) break;
    const row = /^\|\s*`([A-Z][A-Z0-9_]+)`\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (row) result.set(row[1], row[2]);
  }
  return result;
}

const DOCS_FILE = {
  cloudflare: 'docs/deploy/cloudflare.md',
  vercel: 'docs/deploy/vercel.md',
  vps: 'docs/deploy/vps.md',
  shared: 'docs/deploy/shared-hosting.md',
};

/** Apex or www: the host of `site` is the production domain, its twin redirects to it. */
export function domainPlan(siteUrl) {
  if (!siteUrl) return null;
  const host = new URL(siteUrl).host;
  const www = host.startsWith('www.');
  const apex = www ? host.slice(4) : host;
  return {
    production: host,
    other: www ? apex : `www.${host}`,
    productionIsWww: www,
    otherName: www ? 'the apex' : '`www`',
  };
}

function domainLines(target, config, slug, d) {
  if (!d)
    return [
      '- `site` is not set, so the production domain is unknown. Set it in `astro.config.mjs` (see "Fix before handing off"), then run this plan again.',
    ];
  const prod = `\`${d.production}\``;
  const other = `\`${d.other}\``;
  const lines = [
    `- The landing's \`site\` is \`https://${d.production}\`. It is the canonical and hreflang base, so ${prod} is the production domain and ${other} must redirect to it with a permanent redirect.`,
  ];
  const redirectWord = d.productionIsWww
    ? '"redirect www to apex"'
    : '"redirect apex to www"';
  const section = targetSection(config);
  if (target === 'vercel') {
    lines.push(
      '- In Vercel open **Project > Settings > Domains** and add the domain.',
      `- Keep ${prod} as the production domain and leave ${redirectWord} unchecked (Vercel's default can point the other way, which contradicts \`site\`).`,
      `- Add ${other} too and set it to redirect to ${prod} as a permanent (308) redirect.`,
      '- Vercel shows the DNS records it needs next to each domain (usually an `A` record for the apex and a `CNAME` for `www`). Copy exactly what it shows: this plan does not know the values.',
    );
  } else if (target === 'cloudflare') {
    lines.push(
      `- In Cloudflare open **Workers & Pages > ${section.pagesProject} > Custom domains > Set up a custom domain** and add ${prod}.`,
      "- Pages manages the DNS record itself when the domain's DNS zone is on Cloudflare. If the DNS lives elsewhere, either move the name servers to Cloudflare or add the `CNAME` record Pages shows at the real DNS host (an apex cannot take a `CNAME` outside Cloudflare, so a `www` production domain is simpler there).",
      `- Add ${other} as a second custom domain and a **Redirect Rule** (**Rules > Redirect Rules**) that sends it to ${prod} with a 301.`,
    );
  } else if (target === 'vps') {
    lines.push(
      `- Create the DNS records for ${prod} and ${other} that point at the server (\`${section.host}\`): an \`A\` record for the IPv4 address, plus \`AAAA\` if the server has IPv6.`,
      `- Configure the web server for ${prod}: the generated headers snippet is printed by \`node scripts/deploy.mjs --site ${slug} --dry-run\` (Caddy and Nginx), and ${other} redirects to ${prod}. Get a TLS certificate for both names (Caddy does it by itself; with Nginx use certbot).`,
    );
  } else {
    lines.push(
      `- In the hosting panel add the domain ${prod} with the document root \`${section.path}\`, enable the free SSL certificate and force HTTPS.`,
      `- Create the DNS records the panel shows (an \`A\` record for the apex, a \`CNAME\` for \`www\`), and make ${other} redirect to ${prod} (panel redirect, or the generated \`.htaccess\` printed by \`node scripts/deploy.mjs --site ${slug} --dry-run\`).`,
    );
  }
  if (target !== 'vercel')
    lines.push(
      '- Copy the exact records the host shows. This tool never invents record values.',
    );
  return lines;
}

/** The Markdown checklist. `result` is checkSite's result; the plan is still printed when it has problems. */
export function renderPlan(
  { slug, repo, visibility, oldHost },
  result,
  docsRoot = FACTORY_ROOT,
) {
  const { config } = result.facts;
  const lines = [`# Handoff plan: ${slug}`, ''];
  const d = domainPlan(result.facts.siteUrl);
  lines.push(
    `Repository: \`${repo}\` (${visibility}). ${
      config ? `Target: **${config.target}**. ` : ''
    }${d ? `Production domain: \`${d.production}\`.` : ''}`.trim(),
    '',
  );
  if (result.problems.length) {
    lines.push('## Fix before handing off', '');
    for (const p of result.problems) lines.push(`- ${p.message}`);
    lines.push('');
  }
  if (result.warnings.length) {
    lines.push('## Warnings', '');
    for (const w of result.warnings) lines.push(`- ${w.message}`);
    lines.push('');
  }
  if (!config) {
    lines.push(
      'The rest of the checklist depends on the site configuration. Fix the problems above and run this plan again.',
      '',
    );
    return lines.join('\n').trimEnd();
  }

  const target = config.target;
  const section = targetSection(config);
  const [ownerName] = repo.split('/');
  lines.push(
    '## 1. Repository',
    '',
    `- Create the repository \`${repo}\` on GitHub as **${visibility}**, empty: no README, no \`.gitignore\`, no license (a first commit is pushed to it).`,
    `- Give the Claude GitHub App access to it: **GitHub > Settings > Applications > Installed GitHub Apps > Claude > Repository access** (account \`${ownerName}\`). The app can push to a repository it has access to, but it cannot create repositories or start workflow runs, so these two steps are yours.`,
    '',
    '## 2. Secrets',
    '',
  );
  const descriptions = secretDescriptions(target, docsRoot);
  for (const name of secretsFor(target, config)) {
    const text = descriptions.get(name);
    lines.push(`- \`${name}\`${text ? `: ${text}` : ''}`);
  }
  if (target !== 'cloudflare' && config.previews === 'cloudflare')
    lines.push(
      '- Optional, for per-branch previews on Cloudflare Pages: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (docs/deploy/cloudflare.md).',
    );
  lines.push(
    '',
    `Add each one under the repository's **Settings > Secrets and variables > Actions > New repository secret**. How to create them: \`${DOCS_FILE[target]}\`. Paste a value only into GitHub, never into a chat or a file.`,
    '',
    '## 3. First runs',
    '',
    '- The first push runs format, lint, types, QA and the static report. The deploy is skipped with a warning until the secrets exist, and the run stays green.',
    `- When the secrets exist, start the first deploy by hand: **Actions > CI > Run workflow** on the \`${section.productionBranch}\` branch. A push alone does not repeat it.`,
    '- The deployment URL is in the summary of that run.',
    '',
    '## 4. Domain',
    '',
    ...domainLines(target, config, slug, d),
    '',
    '## 5. Where the DNS really lives',
    '',
    '- Open the domain at the registrar where it was bought and read its **name servers**.',
    "- If they are the registrar's own (for example Namecheap BasicDNS), add the records there.",
    '- If they belong to another host (for example `*.nsone.net` for Netlify DNS, or `*.ns.cloudflare.com` for Cloudflare), the records are edited at that host. The alternative, and the one that leaves the domain independent of any host, is to switch the name servers back to the registrar first and then add the records there.',
    '- The registrar may show host records only while its own name servers are selected. Send a screenshot of the name servers if in doubt.',
    '',
    '## 6. Check',
    '',
    '- Wait until the host shows the domain as valid or verified.',
    d
      ? `- Every production deploy now also runs the live report on \`https://${d.production}\`. Until the domain points at the new host its items are not run and the job stays green; once it does, a failing item fails the job.`
      : '- Once `site` is set, every production deploy also runs the live report on that domain.',
    '',
    '## 7. Cleanup',
    '',
    `- When the domain serves the new site, remove it from the old host${oldHost ? ` (${oldHost})` : ''}, delete the DNS zone it kept, and then the old site or repository if you want.`,
    '- Do not delete anything before the new site answers on the domain.',
    '',
  );
  return lines.join('\n').trimEnd();
}

// --- command line -------------------------------------------------------------------------------------------

const HELP = `Usage: node scripts/handoff.mjs check --site <slug> [--visibility public|private] [--json]
       node scripts/handoff.mjs plan --site <slug> --repo <owner>/<name> --visibility public|private [--old-host <name>]

check  Preflight: names every problem that would stop a clean handoff (site missing or already exported, unused
       layer, invalid site.config.json, no "site" URL, brief domain or target that disagrees with the site).
       Warns when a public repository would carry brief.json.
plan   Prints the owner's checklist in Markdown: repository, secrets by name, first runs, domain, DNS, cleanup.
       Problems from check come first; the exit code is 1 when there are any.
Both are read-only. Exit codes: 0 ready, 1 not ready, 2 bad usage.
Environment: LANDING_FACTORY_ROOT=<dir> uses <dir> as the factory root (tests only).`;

function parse(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        site: { type: 'string' },
        repo: { type: 'string' },
        visibility: { type: 'string' },
        'old-host': { type: 'string' },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (error) {
    throw new UsageError(error.message);
  }
  const { values, positionals } = parsed;
  if (values.help) return { help: true };
  const [command, ...extra] = positionals;
  if (!['check', 'plan'].includes(command ?? ''))
    throw new UsageError(
      command ? `Unknown command "${command}".` : 'A command is required.',
    );
  if (extra.length) throw new UsageError(`Unexpected argument "${extra[0]}".`);
  if (typeof values.site !== 'string' || !SLUG_PATTERN.test(values.site))
    throw new UsageError(
      `--site needs a site slug (lowercase letters, digits, hyphens), got "${values.site ?? ''}".`,
    );
  if (
    values.visibility !== undefined &&
    !VISIBILITIES.includes(values.visibility)
  )
    throw new UsageError('--visibility must be "public" or "private".');
  if (command === 'check') {
    if (values.repo !== undefined || values['old-host'] !== undefined)
      throw new UsageError('check takes only --site, --visibility and --json.');
  } else {
    if (values.json) throw new UsageError('plan takes no --json.');
    if (typeof values.repo !== 'string' || !REPO.test(values.repo))
      throw new UsageError('plan needs --repo <owner>/<name>.');
    if (!values.visibility)
      throw new UsageError('plan needs --visibility public|private.');
    if (values['old-host'] !== undefined && !OLD_HOST.test(values['old-host']))
      throw new UsageError(
        '--old-host may only hold letters, digits, spaces, ".", "_" and "-" (40 characters at most).',
      );
  }
  return { command, values };
}

/** Run the command. `io` has log (stdout) and error (stderr). Returns the exit code. */
export function main(argv, io = console, root = defaultRoot()) {
  let args;
  try {
    args = parse(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    io.error(`handoff: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (args.help) {
    io.log(HELP);
    return 0;
  }
  const { command, values } = args;
  const result = checkSite(root, values.site, {
    visibility: values.visibility,
  });
  const ready = result.problems.length === 0;

  if (command === 'plan') {
    io.log(
      renderPlan(
        {
          slug: values.site,
          repo: values.repo,
          visibility: values.visibility,
          oldHost: values['old-host'],
        },
        result,
      ),
    );
    return ready ? 0 : 1;
  }

  if (values.json) {
    io.log(
      JSON.stringify(
        {
          site: result.site,
          ready,
          problems: result.problems,
          warnings: result.warnings,
        },
        null,
        2,
      ),
    );
    return ready ? 0 : 1;
  }
  for (const p of result.problems) io.log(`problem [${p.id}]: ${p.message}`);
  for (const w of result.warnings) io.log(`warning [${w.id}]: ${w.message}`);
  io.log(
    ready
      ? `${values.site}: ready to hand off${result.warnings.length ? ` (${result.warnings.length} warning(s))` : ''}.`
      : `${values.site}: not ready, ${result.problems.length} problem(s).`,
  );
  return ready ? 0 : 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
