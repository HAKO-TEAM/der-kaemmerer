#!/usr/bin/env node
// KommunalFlat-Kunden: aktive Ausschreibungen aus dem Markt, die noch nicht auf derkaemmerer.de stehen.
//   node scripts/markt/kundenstellen.mjs   → JSON-Liste [{org, t, u, s, ort, l, n}] auf stdout
// Grundlage: src/data/personal-cockpit/zugaenge.json + src/data/markt/markt.json + src/content/jobs/*.md

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const zugaenge = JSON.parse(readFileSync(join(REPO, 'src/data/personal-cockpit/zugaenge.json'), 'utf8'));
const markt = JSON.parse(readFileSync(join(REPO, 'src/data/markt/markt.json'), 'utf8'));
const heute = new Date().toISOString().slice(0, 10);

const kern = (name = '') => name.toLowerCase()
  .replace(/\(.*?\)/g, ' ')
  .replace(/\b(große kreisstadt|grosse kreisstadt|universitätsstadt|hansestadt|landeshauptstadt|kreisstadt|stadtverwaltung|gemeindeverwaltung|kreisverwaltung|verwaltung der|magistrat der stadt|der magistrat der|stadt|gemeinde|markt|landratsamt|landkreis|kreis|bezirksamt|samtgemeinde|verbandsgemeinde|amt|zweckverband|eigenbetrieb)\b/g, ' ')
  .replace(/[^a-zäöüß]+/g, ' ').trim();
const istKreis = (s) => /landkreis|landratsamt|kreisverwaltung|\bkreis\b/i.test(s);

// vorhandene Links und Titel je Organisation auf der Seite
const jobsDir = join(REPO, 'src/content/jobs');
const vorhanden = new Set();
const normT = (s = '') => s.toLowerCase().replace(/\(.*?\)|m\/w\/d|w\/m\/d|:in|\*in/g, '').replace(/[^a-zäöüß]+/g, ' ').trim();
for (const f of readdirSync(jobsDir).filter((x) => x.endsWith('.md'))) {
  const t = readFileSync(join(jobsDir, f), 'utf8');
  const link = (t.match(/^bewerbungslink:\s*"?([^"\n]+)"?/m) || [])[1];
  const id = link && (link.match(/[?&]id=(\d+)/) || [])[1];
  if (link) vorhanden.add(link.trim());
  const org = (t.match(/^organisation:\s*"?([^"\n]+)"?/m) || [])[1] || '';
  const tit = (t.match(/^title:\s*"?([^"\n]+)"?/m) || [])[1] || '';
  vorhanden.add(kern(org) + '|' + normT(tit));
  if (id) vorhanden.add('ia' + id);
}

const aus = [];
for (const z of zugaenge.filter((x) => x.kommunalflat)) {
  const k = kern(z.org);
  for (const s of markt.stellen) {
    if (kern(s.o) !== k || istKreis(s.o) !== istKreis(z.org)) continue;
    if (s.s && s.s < heute) continue;
    if (vorhanden.has(s.u) || vorhanden.has(s.id) || vorhanden.has(kern(s.o) + '|' + normT(s.t))) continue;
    aus.push({ kunde: z.org, org: s.o, t: s.t, u: s.u, frist: s.s, ort: s.ort, land: s.l });
  }
}
console.log(JSON.stringify(aus, null, 1));
console.error(`${aus.length} Kundenstelle(n) noch nicht auf derkaemmerer.de (${zugaenge.filter((x) => x.kommunalflat).length} Kunden)`);
