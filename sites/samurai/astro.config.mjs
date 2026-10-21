import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Static output: deployable to Cloudflare Pages without an adapter.
export default defineConfig({
  output: 'static',
  // Inline the single stylesheet: one render-blocking request less on mobile.
  build: { inlineStylesheets: 'always' },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
