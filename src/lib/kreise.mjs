// Kreise und Ranglisten aus dem Gemeindeverzeichnis: /kreise/<land>/<kreis>/ und /ranglisten/<kennzahl>/[<land>/].
import { slug, LAND_SLUG } from './gemeinden.mjs';

/** „Kreis Unna“ (NRW, SH), „Landkreis Harz“, aber „Rhein-Sieg-Kreis“, „Region Hannover“ unverändert. */
export function kreisTitel(name, land) {
  if (/kreis|region|regionalverband/i.test(name)) return name;
  return `${['NW', 'SH'].includes(land) ? 'Kreis' : 'Landkreis'} ${name}`;
}

/** „im Kreis Unna“, aber „in der Region Hannover“. */
export const imKreis = (titel) => (/^(Region|Städteregion)\b/.test(titel) ? `in der ${titel}` : `im ${titel}`);

let cache = null;
/** Alle Landkreise mit ihren Gemeinden (kreisfreie Städte haben kein Kreisprofil). */
export function kreise(gemeinden) {
  if (cache) return cache;
  const m = new Map();
  for (const g of gemeinden) {
    if (!g.kreis_ags || g.kreis_ags === g.ags) continue;
    if (!m.has(g.kreis_ags)) m.set(g.kreis_ags, { ags: g.kreis_ags, name: g.kreis, land: g.land, gemeinden: [] });
    m.get(g.kreis_ags).gemeinden.push(g);
  }
  const liste = [...m.values()];
  const zaehl = {};
  for (const k of liste) { const s = `${k.land}/${slug(k.name)}`; zaehl[s] = (zaehl[s] || 0) + 1; }
  for (const k of liste) {
    const s = slug(k.name);
    k.slug = zaehl[`${k.land}/${s}`] > 1 ? `${s}-${k.ags.slice(0, 5)}` : s;
    k.url = `/kreise/${LAND_SLUG[k.land]}/${k.slug}/`;
    k.titel = kreisTitel(k.name, k.land);
    k.einwohner = k.gemeinden.reduce((a, g) => a + (g.einwohner || 0), 0);
  }
  cache = liste.sort((a, b) => a.land.localeCompare(b.land) || a.name.localeCompare(b.name, 'de'));
  return cache;
}
export const kreisVonAgs = (gemeinden) => new Map(kreise(gemeinden).map((k) => [k.ags, k]));

export const median = (xs) => {
  const v = xs.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const h = Math.floor(v.length / 2);
  return v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2;
};
/** Einwohnergewichteter Mittelwert (für Schulden je Einwohner eines Kreises). */
export const gewichtet = (gs, wert) => {
  let s = 0, e = 0;
  for (const g of gs) { const w = wert(g); if (w != null && g.einwohner) { s += w * g.einwohner; e += g.einwohner; } }
  return e ? s / e : null;
};

// Kennzahlen der Ranglisten. quelle: hebesaetze|schulden, feld im Datensatz, einheit, Formulierung für „hoch“/„niedrig“.
export const KENNZAHLEN = {
  'grundsteuer-b': { quelle: 'hebesaetze', feld: 'grundsteuer_b', einheit: ' %', name: 'Grundsteuer B', kurz: 'Hebesatz Grundsteuer B', hoch: 'Höchste Grundsteuer', niedrig: 'Niedrigste Grundsteuer', jahr: 2024 },
  'gewerbesteuer': { quelle: 'hebesaetze', feld: 'gewerbesteuer', einheit: ' %', name: 'Gewerbesteuer', kurz: 'Hebesatz Gewerbesteuer', hoch: 'Höchste Gewerbesteuer', niedrig: 'Niedrigste Gewerbesteuer', jahr: 2024 },
  'grundsteuer-a': { quelle: 'hebesaetze', feld: 'grundsteuer_a', einheit: ' %', name: 'Grundsteuer A', kurz: 'Hebesatz Grundsteuer A', hoch: 'Höchste Grundsteuer A', niedrig: 'Niedrigste Grundsteuer A', jahr: 2024 },
  'schulden': { quelle: 'schulden', feld: 'schulden_je_ew', einheit: ' €', name: 'Schulden je Einwohner', kurz: 'Schulden im Kernhaushalt je Einwohner', hoch: 'Höchste Verschuldung', niedrig: 'Geringste Verschuldung', jahr: 2025 },
  'kassenkredite': { quelle: 'schulden', feld: 'kassenkredite_je_ew', einheit: ' €', name: 'Kassenkredite je Einwohner', kurz: 'Kassenkredite (Liquiditätskredite) je Einwohner', hoch: 'Höchste Kassenkredite', niedrig: 'Geringste Kassenkredite', jahr: 2025 },
};

/** Zeilen einer Rangliste: [{g, wert}] absteigend; land optional. */
export function rangliste(kz, { gemeinden, hebesaetze, schulden }, land = null) {
  const K = KENNZAHLEN[kz];
  const daten = K.quelle === 'hebesaetze' ? hebesaetze : schulden;
  return gemeinden.filter((g) => !land || g.land === land)
    .map((g) => ({ g, wert: daten[g.ags]?.[K.feld] ?? null }))
    .filter((z) => z.wert != null && (K.quelle !== 'hebesaetze' || z.wert > 0))
    .sort((a, b) => b.wert - a.wert || (b.g.einwohner || 0) - (a.g.einwohner || 0));
}
