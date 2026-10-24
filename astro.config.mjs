import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Static output: deployable to Cloudflare Pages without an adapter.
export default defineConfig({
  output: 'static',
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
