import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import { readFileSync } from 'node:fs';
import { rehypeGemeindeLinks } from './src/lib/gemeinde-links.mjs';
import { rehypeLexikonLinks } from './src/lib/lexikon.mjs';
import { rehypeSlash } from './src/lib/rehype-slash.mjs';

// Gemeinden für die automatische Verlinkung in Fachartikeln
const gemeinden = JSON.parse(readFileSync(new URL('./src/data/spiegel/gemeinden.json', import.meta.url), 'utf8'));

export default defineConfig({
  integrations: [mdx()],   // Sitemaps erzeugt scripts/sitemaps.mjs nach dem Build (Runbook 2.5)
  site: 'https://derkaemmerer.de',
  // Erste Nennung einer Gemeinde in Fachartikeln verlinkt auf ihr Profil
  markdown: { rehypePlugins: [rehypeLexikonLinks(), rehypeGemeindeLinks({ gemeinden }), rehypeSlash] },
  output: 'static',
  security: { checkOrigin: false },
  adapter: vercel({ maxDuration: 60 }),
});
