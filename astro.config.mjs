// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Replace with the live domain once it is connected in Cloudflare Pages.
// Canonical URLs, the sitemap and structured data are all derived from this.
const SITE = process.env.SITE_URL ?? 'https://beautybynam.pages.dev';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      // The quote builder is private and must never be advertised.
      filter: (page) => !page.includes('/studio'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // The only large chunk is PDFKit + embedded font data (~530 kB), loaded
    // solely by the private /studio/quote page. Public pages never fetch it.
    build: { chunkSizeWarningLimit: 700 },
  },
});
