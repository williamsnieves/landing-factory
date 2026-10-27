// The public URL of a built landing, read from the canonical link of dist/index.html. The canonical URL is
// absolute exactly when the site sets `site` in astro.config.mjs, and it is what search engines see, so the
// report needs no import of the Astro configuration (which would pull Astro into the deploy job).
//
//   node scripts/report/site-url.mjs [dist-dir]     prints the origin; exit 1 (silent) when there is none
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanHtml } from './html.mjs';

/** Why no site URL could be read. */
export class SiteUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SiteUrlError';
  }
}

/** Origin of the absolute canonical URL in `html`; throws SiteUrlError naming the reason. */
export function originFromHtml(html) {
  const canonical = scanHtml(html).tags.find(
    (tag) => tag.name === 'link' && /canonical/i.test(tag.attrs.rel ?? ''),
  );
  if (!canonical?.attrs.href)
    throw new SiteUrlError(
      'dist/index.html has no canonical link; set `site` in astro.config.mjs and build again',
    );
  let url;
  try {
    url = new URL(canonical.attrs.href);
  } catch {
    throw new SiteUrlError(
      `the canonical URL of dist/index.html is relative (${canonical.attrs.href}); set \`site\` in astro.config.mjs and build again`,
    );
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    throw new SiteUrlError(
      `the canonical URL of dist/index.html (${canonical.attrs.href}) is not an http(s) URL`,
    );
  return url.origin;
}

/** Origin of the site built in `distDir`. */
export function readSiteUrl(distDir) {
  const file = join(distDir, 'index.html');
  if (!existsSync(file))
    throw new SiteUrlError(
      `${file} does not exist; build the site first (npm run build)`,
    );
  return originFromHtml(readFileSync(file, 'utf8'));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.stdout.write(
      `${readSiteUrl(resolve(process.argv[2] ?? 'dist'))}\n`,
    );
  } catch (error) {
    if (!(error instanceof SiteUrlError)) throw error;
    process.stderr.write(`site-url: ${error.message}\n`);
    process.exitCode = 1;
  }
}
