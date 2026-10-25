import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Static output: deployable to Cloudflare Pages without an adapter.
export default defineConfig({
  output: 'static',
  // Multi-locale site (npm run new-site -- <slug> --langs ...): Astro's built-in i18n routing. The default locale
  // is served at the root and every other locale under /<locale>/, so src/pages/<locale>/ folders must match
  // `locales` exactly. There is no redirect by browser language (static output): the language switcher links.
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [react()],
  security: {
    // Content-Security-Policy from Astro's built-in support: every inline script and style Astro emits is
    // hashed and written to a <meta http-equiv="content-security-policy"> tag per page, so an injected inline
    // script cannot run. Never add 'unsafe-inline' to scriptDirective: if a script is blocked, add its origin
    // to scriptDirective.resources instead. frame-ancestors cannot be set in a meta tag, so public/_headers
    // keeps it as a response header.
    csp: {
      directives: ["base-uri 'self'", "object-src 'none'"],
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
