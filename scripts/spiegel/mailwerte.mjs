#!/usr/bin/env node
// Lagebericht: Betreff und drei Kernzahlen je Kommune für die Kämmerer-Ansprache.
//   node scripts/spiegel/mailwerte.mjs 05978028 09461000 …   → JSON auf stdout
// Alle Werte stammen aus demselben Rechenweg wie der Bericht (src/lib/spiegel.mjs).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spiegel, kalenderwoche } from '../../src/lib/spiegel.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const L = (f) => JSON.parse(readFileSync(join(REPO, 'src/data', f), 'utf8'));
const daten = { gemeinden: L('spiegel/gemeinden.json'), markt: L('markt/markt.json'), sperren: L('haushaltslage/sperren.json'),
  hebesaetze: L('spiegel/hebesaetze.json'), schulden: L('spiegel/schulden.json') };
const LAND = { NW: 'NRW', BY: 'Bayern', BW: 'Baden-Württemberg', NI: 'Niedersachsen', HE: 'Hessen', SN: 'Sachsen', ST: 'Sachsen-Anhalt', TH: 'Thüringen', BB: 'Brandenburg', MV: 'Mecklenburg-Vorpommern', SH: 'Schleswig-Holstein', RP: 'Rheinland-Pfalz', SL: 'Saarland' };
const kw = kalenderwoche();

const aus = {};
for (const ags of process.argv.slice(2)) {
  const s = spiegel(ags, daten);
  if (!s) { aus[ags] = null; continue; }
  const g = s.gemeinde, p = s.personal, h = s.haushalt, f = s.finanzen;
  const land = LAND[g.land] || g.landLang;
  const gb = f.grundsteuerB;
  const auffaelligerRang = gb.rangLand && (gb.rangLand.platz <= gb.rangLand.von / 4 || gb.rangLand.platz >= gb.rangLand.von * 3 / 4);
  const fremd = h.naechste.filter((x) => x.kommune !== g.name);

  // Betreff: stärkste persönliche Zahl
  let betreff;
  if (h.eigeneSperre) betreff = `${g.name} und ${h.imLand - 1} weitere Kommunen in ${land} mit Haushaltssperre – Ihr Lagebericht KW ${kw}`;
  else if (p.finanz >= 3) betreff = `${g.name}: ${p.finanz} Kommunen im Umkreis suchen Finanzpersonal – Ihr Lagebericht KW ${kw}`;
  else if (auffaelligerRang) betreff = `${g.name}: Grundsteuer B ${gb.wert} %, Rang ${gb.rangLand.platz} von ${gb.rangLand.von} in ${land} – Ihr Lagebericht KW ${kw}`;
  else betreff = `${g.name}: Personal- und Haushaltslage – Ihr Lagebericht KW ${kw}`;

  const zahlen = [];
  if (p.anzahl) zahlen.push(`Im Umkreis von 50 km suchen ${p.arbeitgeberZahl} Kommunen ${p.anzahl} Fachkräfte${p.finanz ? `, davon ${p.finanz} im Finanzwesen` : ''}.`);
  if (h.eigeneSperre) zahlen.push(`In ${land} hat die Redaktion seit 2025 Haushaltssperren in ${h.imLand} Kommunen belegt${fremd[0] && fremd[0].km <= 60 ? `, die nächste weitere ${fremd[0].km} km entfernt in ${fremd[0].kommune}` : ''}.`);
  else if (fremd[0] && fremd[0].km <= 60) zahlen.push(`Die nächste belegte Haushaltssperre liegt ${fremd[0].km} km entfernt (${fremd[0].kommune}); in ${land} sind es seit 2025 ${h.imLand} Kommunen.`);
  else zahlen.push(`In ${land} hat die Redaktion seit 2025 Haushaltssperren in ${h.imLand} Kommunen belegt.`);
  if (gb.wert != null && gb.rangLand) zahlen.push(`Grundsteuer B ${gb.wert} % (2024), Platz ${gb.rangLand.platz} von ${gb.rangLand.von} in ${land}.`);
  else if (f.schulden.wert != null && f.schulden.kreis != null) zahlen.push(`Schulden im Kernhaushalt ${f.schulden.wert.toLocaleString('de-DE')} € je Einwohner (Vergleich ${Math.round(f.schulden.kreis).toLocaleString('de-DE')} €).`);

  aus[ags] = { kommune: g.name, kw, betreff, zahlen: zahlen.slice(0, 3) };
}
console.log(JSON.stringify(aus, null, 1));
