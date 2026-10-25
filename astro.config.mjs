// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages: https://mnyuka.github.io/zouyuxian/
export default defineConfig({
  site: 'https://mnyuka.github.io/zouyuxian/',
  base: '/zouyuxian/',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      // 代码块配色跟随系统深浅色（原默认 github-dark 在浅色页是一块黑）
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
