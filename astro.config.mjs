import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { readFileSync } from 'node:fs';
import { verzeichnis } from './src/lib/gemeinden.mjs';
import { rehypeGemeindeLinks } from './src/lib/gemeinde-links.mjs';
import { stellenJeGemeinde } from './src/lib/stellen-ort.mjs';
import { rehypeLexikonLinks } from './src/lib/lexikon.mjs';

// Gemeindeprofile werden per Funktion ausgeliefert – für die Sitemap hier alle Adressen aufzählen.
const gemeinden = JSON.parse(readFileSync(new URL('./src/data/spiegel/gemeinden.json', import.meta.url), 'utf8'));
const gemeindeSeiten = Object.values(verzeichnis(gemeinden).pfad).map((p) => `https://derkaemmerer.de/gemeinden/${p}/`);
// Stellenangebote je Gemeinde: nur Gemeinden mit mindestens einer laufenden Ausschreibung (Seiten ohne eigene Stellen sind noindex)
const markt = JSON.parse(readFileSync(new URL('./src/data/markt/markt.json', import.meta.url), 'utf8'));
const { pfad: gemeindePfad } = verzeichnis(gemeinden);
for (const ags of stellenJeGemeinde(markt.stellen, gemeinden).keys()) gemeindeSeiten.push(`https://derkaemmerer.de/gemeinden/${gemeindePfad[ags]}/stellen/`);

export default defineConfig({
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/vorschau/'), customPages: gemeindeSeiten })],
  site: 'https://derkaemmerer.de',
  // Erste Nennung einer Gemeinde in Fachartikeln verlinkt auf ihr Profil
  markdown: { rehypePlugins: [rehypeLexikonLinks(), rehypeGemeindeLinks({ gemeinden })] },
  output: 'static',
  security: { checkOrigin: false },
  adapter: vercel({ maxDuration: 60 }),
});
