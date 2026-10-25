// The README of an exported repository, from templates/README.md, and the copy of the deploy guide.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { secretsFor, targetSection } from '../deploy/config.mjs';

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), 'templates');

/** Text of a file in scripts/export/templates/. */
export const readTemplate = (name) =>
  readFileSync(join(TEMPLATES, name), 'utf8');

const DOMAIN_STEP = {
  cloudflare:
    'Domain: in Cloudflare open the Pages project, then **Custom domains**, add the domain and follow the DNS step it shows.',
  vercel:
    'Domain: in Vercel open **Project > Settings > Domains**, add the domain and create the DNS record Vercel shows (an `A` record for the apex, a `CNAME` for `www`). Moving a domain from another host is your step: lower the old record’s TTL first, add the domain in the new host, then switch the DNS record. Preview deployments are protected by default, so the live report sees a login page on previews (turn the protection off for previews if you want it checked).',
  vps: 'Domain: point the domain’s DNS at the server and let the web server (Caddy or Nginx, see `docs/deploy.md`) obtain the certificate.',
  shared:
    'Domain: point the domain at the hosting account in the host’s control panel and enable its certificate (see `docs/deploy.md`).',
};

/**
 * @param {object} o
 * @param {string} o.title         business or site name
 * @param {object} o.config        resolved site.config.json (resolveConfig)
 * @param {string} o.node          Node version (from .nvmrc)
 * @param {string} o.date          export date (YYYY-MM-DD)
 * @param {string} o.commit        factory commit
 * @param {boolean} o.withBrief    brief.json is in the repository
 * @param {string} [o.domain]      the site's public domain, when known
 */
export function renderReadme({
  title,
  config,
  node,
  date,
  commit,
  withBrief,
  domain,
}) {
  const needed = [
    ...secretsFor(config.target, config),
    ...(config.previews === 'cloudflare'
      ? secretsFor('cloudflare', config).map((name) => name)
      : []),
  ];
  const unique = [...new Set(needed)];
  const secrets =
    unique.length === 0
      ? 'This target needs no secrets.'
      : `Repository secrets the **${config.target}** target needs:\n\n${unique
          .map((name) => `- \`${name}\``)
          .join('\n')}${
          config.previews === 'cloudflare'
            ? '\n\nThe Cloudflare secrets are for branch previews (`previews: "cloudflare"` in `site.config.json`); production goes to the server with the others.'
            : ''
        }`;
  const domainText = `${DOMAIN_STEP[config.target]}${
    domain ? ` The site expects \`${domain}\`.` : ''
  }`;
  const brief = withBrief
    ? '- `brief.json`: the customer brief the site was built from (business, contact and legal data). The report’s legal checks read it. Remove it before making the repository public; the report then warns that the legal requirements are unknown.\n'
    : '';
  const values = {
    TITLE: title,
    DATE: date,
    COMMIT: commit.slice(0, 7),
    NODE: node,
    TARGET: config.target,
    BRANCH: targetSection(config).productionBranch,
    SECRETS: secrets,
    DOMAIN: domainText,
    BRIEF: brief,
  };
  return readTemplate('README.md').replace(
    /\{\{([A-Z]+)\}\}/g,
    (_, key) => values[key] ?? '',
  );
}

/**
 * The deploy guide of the target as it reads in a single-site repository: no `--site <slug>`, and the
 * configuration file at the root.
 */
export function singleSiteGuide(text) {
  return text
    .replace(/sites\/<slug>\/site\.config\.json/g, 'site.config.json')
    .replace(/ --site <slug>/g, '')
    .replace(/sites\/<slug>\/dist/g, 'dist');
}
