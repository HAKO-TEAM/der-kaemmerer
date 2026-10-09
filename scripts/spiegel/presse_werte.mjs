#!/usr/bin/env node
// Pressemitteilung Haushaltslage NRW: Kennwerte je NRW-Gemeinde für personalisierte Mails an Lokalredaktionen → JSON {Name: {...}}
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spiegel } from '../../src/lib/spiegel.mjs';
import { verzeichnis } from '../../src/lib/gemeinden.mjs';
import { kommunenMitSperre, projiziere } from '../../src/lib/sperren-karte.mjs';
import { STUFEN, UEBERSCHULDUNG, nrwAuswertung } from '../../src/lib/haushaltsstatus.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const L = (f) => JSON.parse(readFileSync(join(REPO, 'src/data', f), 'utf8'));
const gemeinden = L('spiegel/gemeinden.json'), hs = L('spiegel/haushaltsstatus_nw.json'), sperren = L('haushaltslage/sperren.json');
const daten = { gemeinden, markt: L('markt/markt.json'), sperren, hebesaetze: L('spiegel/hebesaetze.json'), schulden: L('spiegel/schulden.json') };
const { pfad } = verzeichnis(gemeinden);
const kommunen = kommunenMitSperre(sperren, gemeinden);
const a = nrwAuswertung({ gemeinden, hs, kommunen, pfad, projiziere });
const aus = {};
for (const z of a.zeilen) {
  const s = spiegel(z.ags, daten), sch = s?.finanzen.schulden;
  const sp = kommunen.find((k) => k.url === z.url);
  aus[z.name] = { url: `https://derkaemmerer.de${z.url}`, einstufung: STUFEN[z.s].lang, stufe: z.s, ueberschuldung: UEBERSCHULDUNG[z.u] || null,
    sperre: sp ? sp.faelle.map((f) => f.art.split(';')[0]).join(' / ') : null, akt: z.akt ? `${z.akt.kurz} (${z.akt.stand}): ${z.akt.text}` : null, schulden: sch?.wert ?? null, rang: sch?.rangLand?.platz ?? null, einwohner: z.einwohner };
}
console.log(JSON.stringify(aus));
