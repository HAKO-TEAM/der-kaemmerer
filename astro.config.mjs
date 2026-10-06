import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/vorschau/') })],
  site: 'https://derkaemmerer.de',
  output: 'static',
  security: { checkOrigin: false },
  adapter: vercel({ maxDuration: 60 }),
});
