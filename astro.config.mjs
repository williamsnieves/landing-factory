import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Writes dist/sitemap.xml and the Sitemap: line of dist/robots.txt after the build. It reads the built pages, so
// the sitemap lists exactly the indexable ones: a page with <meta name="robots" content="noindex">, 404.html and
// /directions/ are left out. URLs are absolute when `site` is set, root-relative otherwise (the report warns).
// A post-build step instead of a src/pages endpoint because a page's noindex flag is a BaseLayout prop, which an
// endpoint cannot read. No dependency: this is plain node.
function seoFiles() {
  let site;
  return {
    name: 'seo-files',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site;
      },
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const paths = [];
        const walk = (folder, prefix) => {
          for (const entry of readdirSync(folder, { withFileTypes: true })) {
            if (entry.isDirectory())
              walk(`${folder}/${entry.name}`, `${prefix}${entry.name}/`);
            else if (entry.name.endsWith('.html')) {
              const rel = `${prefix}${entry.name}`;
              if (rel === '404.html' || rel.startsWith('directions/')) continue;
              const head = readFileSync(`${folder}/${entry.name}`, 'utf8');
              if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(head))
                continue;
              paths.push(
                entry.name === 'index.html' ? `/${prefix}` : `/${rel}`,
              );
            }
          }
        };
        walk(root, '');
        const escape = (text) =>
          text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const urls = paths
          .sort()
          .map(
            (path) =>
              `  <url><loc>${escape(site ? new URL(path, site).href : path)}</loc></url>`,
          );
        writeFileSync(
          `${root}/sitemap.xml`,
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
        );
        if (site) {
          const file = `${root}/robots.txt`;
          const base = existsSync(file)
            ? readFileSync(file, 'utf8').trimEnd()
            : 'User-agent: *\nAllow: /';
          if (!/^sitemap:/im.test(base))
            writeFileSync(
              file,
              `${base}\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`,
            );
        }
        logger.info(`sitemap.xml: ${paths.length} page(s)`);
      },
    },
  };
}

// Lead forms (docs/forms.md): a site whose legal data (src/data/legal.json, written from the brief by
// scripts/legal.mjs) says a form posts to Web3Forms opens that origin, and only that one, in form-action and
// connect-src. These directives also restrict forms to 'self' and the provider. A site without such a form (and
// the starter, which has no legal.json) gains nothing: no directive is added. public/_headers carries no CSP
// beyond frame-ancestors, so it does not change.
function formDirectives() {
  try {
    const file = fileURLToPath(
      new URL('./src/data/legal.json', import.meta.url),
    );
    const forms = JSON.parse(readFileSync(file, 'utf8')).processing?.forms;
    if (forms?.providers?.includes('web3forms'))
      return [
        "form-action 'self' https://api.web3forms.com",
        "connect-src 'self' https://api.web3forms.com",
      ];
  } catch {
    // no legal data: the site has no form
  }
  return [];
}

// Static output: deployable to Cloudflare Pages without an adapter.
export default defineConfig({
  output: 'static',
  integrations: [react(), seoFiles()],
  security: {
    // Content-Security-Policy from Astro's built-in support: every inline script and style Astro emits is
    // hashed and written to a <meta http-equiv="content-security-policy"> tag per page, so an injected inline
    // script cannot run. Never add 'unsafe-inline' to scriptDirective: if a script is blocked, add its origin
    // to scriptDirective.resources instead. frame-ancestors cannot be set in a meta tag, so public/_headers
    // keeps it as a response header.
    csp: {
      directives: ["base-uri 'self'", "object-src 'none'", ...formDirectives()],
      styleDirective: {
        // Style attributes (style="--x: 1" for custom properties, set by components and by the motion layer)
        // cannot be hashed, so style-src-attr keeps 'unsafe-inline'. Injected style is far less dangerous than
        // injected script, and <style> and <link> elements stay restricted to 'self' and hashes.
        resources: [
          "'self'",
          { resource: "'unsafe-inline'", kind: 'attribute' },
        ],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
