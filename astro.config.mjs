// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages: https://mnyuka.github.io/zouyuxian/
export default defineConfig({
  site: 'https://mnyuka.github.io/zouyuxian/',
  base: '/zouyuxian/',
  integrations: [sitemap()],
});
