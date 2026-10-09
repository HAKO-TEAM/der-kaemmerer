#!/usr/bin/env node
// Lagebericht: Monatsstand aller Zugänge festhalten → src/data/spiegel/stand/<heute>.json
//   node scripts/spiegel/schnappschuss.mjs [JJJJ-MM-TT]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spiegel } from '../../src/lib/spiegel.mjs';
import { kennwerte } from '../../src/lib/spiegel-stand.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const L = (f) => JSON.parse(readFileSync(join(REPO, 'src/data', f), 'utf8'));
const daten = { gemeinden: L('spiegel/gemeinden.json'), markt: L('markt/markt.json'), sperren: L('haushaltslage/sperren.json'),
  hebesaetze: L('spiegel/hebesaetze.json'), schulden: L('spiegel/schulden.json') };
const d = new Date();
const heute = process.argv[2] || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const aus = {};
for (const z of L('spiegel/zugaenge.json')) {
  if (aus[z.ags]) continue;
  const s = spiegel(z.ags, daten);
  if (s) aus[z.ags] = kennwerte(s);
}
mkdirSync(join(REPO, 'src/data/spiegel/stand'), { recursive: true });
writeFileSync(join(REPO, 'src/data/spiegel/stand', `${heute}.json`), JSON.stringify(aus));
console.log(`Stand ${heute}: ${Object.keys(aus).length} Kommunen`);
