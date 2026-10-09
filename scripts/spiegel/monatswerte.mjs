#!/usr/bin/env node
// Lagebericht-Monatsupdate: drei persönliche Zeilen je Kommune, mit Veränderung gegenüber dem Vormonatsstand.
//   node scripts/spiegel/monatswerte.mjs 09563000 05362024 …   → JSON auf stdout
// Grundlage: derselbe Rechenweg wie der Bericht (src/lib/spiegel.mjs) und die Stände in src/data/spiegel/stand/.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spiegel } from '../../src/lib/spiegel.mjs';
import { kennwerte, vormonat, differenz, mitVorzeichen, datumKurz } from '../../src/lib/spiegel-stand.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const L = (f) => JSON.parse(readFileSync(join(REPO, 'src/data', f), 'utf8'));
const daten = { gemeinden: L('spiegel/gemeinden.json'), markt: L('markt/markt.json'), sperren: L('haushaltslage/sperren.json'),
  hebesaetze: L('spiegel/hebesaetze.json'), schulden: L('spiegel/schulden.json') };
const LAND = { NW: 'NRW', BY: 'Bayern', BW: 'Baden-Württemberg', NI: 'Niedersachsen', HE: 'Hessen', SN: 'Sachsen', ST: 'Sachsen-Anhalt', TH: 'Thüringen', BB: 'Brandenburg', MV: 'Mecklenburg-Vorpommern', SH: 'Schleswig-Holstein', RP: 'Rheinland-Pfalz', SL: 'Saarland' };
const staende = Object.fromEntries(readdirSync(join(REPO, 'src/data/spiegel/stand')).filter((f) => f.endsWith('.json'))
  .map((f) => [f.slice(0, 10), L(`spiegel/stand/${f}`)]));
const vm = vormonat(staende);
const MONAT = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

const aus = {};
for (const ags of process.argv.slice(2)) {
  const s = spiegel(ags, daten);
  if (!s) { aus[ags] = null; continue; }
  const k = kennwerte(s), alt = vm?.werte?.[ags] || null, land = LAND[s.gemeinde.land] || s.gemeinde.landLang;
  const seit = alt ? ` (${mitVorzeichen(differenz(k.anzahl, alt.anzahl))} seit ${datumKurz(vm.datum)})` : '';
  const seitF = alt ? ` (${mitVorzeichen(differenz(k.finanz, alt.finanz))})` : '';
  const seitS = alt ? ` (${mitVorzeichen(differenz(k.sperrenLand, alt.sperrenLand))} seit ${datumKurz(vm.datum)})` : '';
  const zeilen = [
    `Personalmarkt: Im Umkreis von 50 km suchen ${k.arbeitgeber} Kommunen ${k.anzahl} Fachkräfte${seit}, davon ${k.finanz} im Finanzwesen${seitF}.`,
    `Haushaltslage: In ${land} sind Haushaltssperren in ${k.sperrenLand} Kommunen belegt${seitS}, bundesweit in ${k.sperrenBund}.`,
    k.naechsteKm != null && k.naechsteKm <= 80
      ? `Im Umfeld: Die nächste belegte Haushaltssperre liegt ${k.naechsteKm} km entfernt in ${k.naechsteKommune}.`
      : k.gstB != null && k.gstBPlatz ? `Grundsteuer B: ${k.gstB} %, Platz ${k.gstBPlatz} von ${k.gstBVon} in ${land}.` : '',
  ];
  aus[ags] = { kommune: s.gemeinde.name, monat: MONAT, vergleich: vm?.datum || null, zeilen };
}
console.log(JSON.stringify(aus, null, 1));
