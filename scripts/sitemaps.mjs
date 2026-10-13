// Sitemaps nach dem Build (Runbook 2.5): Index + eine Datei je Seitentyp, Gemeinden je Bundesland.
// lastmod nur aus echten Daten: Artikel (article:modified_time), Stellen (datePosted), Datenseiten (Stand der Daten).
// Seiten mit noindex werden ausgelassen. Ersetzt @astrojs/sitemap.
import { readdirSync, readFileSync, statSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { verzeichnis } from '../src/lib/gemeinden.mjs';
import { stellenJeGemeinde } from '../src/lib/stellen-ort.mjs';

const SITE = 'https://derkaemmerer.de';
const OUT = new URL('../.vercel/output/static/', import.meta.url).pathname;
const lies = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const gemeinden = lies('../src/data/spiegel/gemeinden.json');
const markt = lies('../src/data/markt/markt.json');
const sperren = lies('../src/data/haushaltslage/sperren.json');
const tag = (s) => (s ? String(s).slice(0, 10) : null);
const STAND_MARKT = tag(markt.kopf?.stand);      // tägliche Aktualisierung des Stellenmarkts
const STAND_SPERREN = tag(sperren.stand);         // Stand des Haushaltssperren-Verzeichnisses

// 1. Statische Seiten aus dem Build einsammeln
const seiten = [];
(function lauf(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { lauf(p); continue; }
    if (f !== 'index.html') continue;
    const pfad = '/' + relative(OUT, d).split('\\').join('/');
    const url = SITE + (pfad === '/' ? '/' : pfad + '/');
    const html = readFileSync(p, 'utf8');
    const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] || '';
    if (/noindex/.test(robots) || pfad === '/404') continue;
    const canon = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    if (canon && canon !== url) continue;   // Seiten mit fremdem Canonical (z. B. Subdomains) nicht listen
    const lastmod = tag(html.match(/property="article:modified_time" content="([^"]*)"/)?.[1])
      || tag(html.match(/"datePosted":"([^"]*)"/)?.[1]) || null;
    seiten.push({ url, pfad, lastmod });
  }
})(OUT);

// 2. Serverseitig erzeugte Gemeindeseiten (wie bisher customPages)
const { pfad: gPfad } = verzeichnis(gemeinden);
const landVon = Object.fromEntries(gemeinden.map((g) => [g.ags, g.land]));
const gem = Object.entries(gPfad).map(([ags, p]) => ({ url: `${SITE}/gemeinden/${p}/`, land: landVon[ags], lastmod: STAND_MARKT }));
const gemStellen = [...stellenJeGemeinde(markt.stellen, gemeinden).keys()].map((ags) => ({ url: `${SITE}/gemeinden/${gPfad[ags]}/stellen/`, lastmod: STAND_MARKT }));

// 3. Zuordnung zu Gruppen
const RESSORTS = ['haushalt', 'einnahmen', 'ausgaben', 'praxis', 'recht', 'analyse', 'sozialkosten', 'konzern', 'dienst-karriere'];
const DATEN = { kreise: STAND_SPERREN, haushaltssperren: STAND_SPERREN, haushaltslage: STAND_SPERREN, 'haushaltslage-nrw': STAND_SPERREN, gehalt: STAND_MARKT, gemeinden: STAND_MARKT };
const gruppen = new Map();
const rein = (name, e) => { if (!gruppen.has(name)) gruppen.set(name, []); gruppen.get(name).push(e); };
for (const s of seiten) {
  const teil = s.pfad.split('/')[1] || '';
  const lastmod = s.lastmod || DATEN[teil] || null;
  if (RESSORTS.includes(teil)) rein('artikel', { ...s, lastmod });
  else if (teil === 'stellen') rein('stellen', { ...s, lastmod });
  else if (['kreise', 'ranglisten', 'lexikon', 'gehalt', 'haushaltssperren', 'haushaltslage', 'haushaltslage-nrw', 'gemeinden'].includes(teil)) rein('daten', { ...s, lastmod });
  else rein('seiten', { ...s, lastmod });
}
for (const g of gem) rein(`gemeinden-${g.land.toLowerCase()}`, g);
for (const g of gemStellen) rein('gemeinden-stellen', g);

// 4. Schreiben
const esc = (s) => s.replace(/&/g, '&amp;');
const datei = (eintraege) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${eintraege
  .sort((a, b) => a.url.localeCompare(b.url))
  .map((e) => `<url><loc>${esc(e.url)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
for (const f of readdirSync(OUT)) if (/^sitemap-.*\.xml$/.test(f)) rmSync(join(OUT, f));   // Reste von @astrojs/sitemap
const index = [];
let summe = 0;
for (const [name, eintraege] of [...gruppen].sort()) {
  const f = `sitemap-${name}.xml`;
  writeFileSync(join(OUT, f), datei(eintraege));
  const neuestes = eintraege.map((e) => e.lastmod).filter(Boolean).sort().pop();
  index.push(`<sitemap><loc>${SITE}/${f}</loc>${neuestes ? `<lastmod>${neuestes}</lastmod>` : ''}</sitemap>`);
  summe += eintraege.length;
}
writeFileSync(join(OUT, 'sitemap-index.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${index.join('\n')}\n</sitemapindex>\n`);
console.log(`Sitemaps: ${gruppen.size} Dateien, ${summe} URLs`);
