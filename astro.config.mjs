import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { readFileSync } from 'node:fs';
import { verzeichnis } from './src/lib/gemeinden.mjs';

// Gemeindeprofile werden per Funktion ausgeliefert – für die Sitemap hier alle Adressen aufzählen.
const gemeinden = JSON.parse(readFileSync(new URL('./src/data/spiegel/gemeinden.json', import.meta.url), 'utf8'));
const gemeindeSeiten = Object.values(verzeichnis(gemeinden).pfad).map((p) => `https://derkaemmerer.de/gemeinden/${p}/`);

export default defineConfig({
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/vorschau/'), customPages: gemeindeSeiten })],
  site: 'https://derkaemmerer.de',
  output: 'static',
  security: { checkOrigin: false },
  adapter: vercel({ maxDuration: 60 }),
});
