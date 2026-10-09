// Haushaltssperren-Verzeichnis: Fälle je Kommune bündeln, verorten und eine Deutschlandkarte aus den Gemeindekoordinaten zeichnen.
import { verzeichnis, LAND_SLUG } from './gemeinden.mjs';

const norm = (s = '') => s.toLowerCase().replace(/\(.*?\)|landkreis|kreis|stadt|gemeinde|hansestadt/g, '').replace(/[^a-zäöüß]+/g, ' ').trim();
const anker = (k) => k.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-');

// Kartenausschnitt Deutschland, flächentreu genug für eine Übersicht (Länge mit cos 51° gestaucht)
const LON0 = 5.7, LAT0 = 55.15, K = 64, COS = Math.cos(51 * Math.PI / 180);
export const projiziere = (lat, lon) => ({ x: +((lon - LON0) * COS * K).toFixed(1), y: +((LAT0 - lat) * K).toFixed(1) });
export const KARTE = { breite: Math.round((15.2 - LON0) * COS * K), hoehe: Math.round((LAT0 - 47.2) * K) };

/** Hintergrund: ein Punkt je belegter Rasterzelle (≈ 10 × 10 km) aller Gemeinden – ergibt die Umrisse Deutschlands. */
export function raster(gemeinden) {
  const zellen = new Set();
  for (const g of gemeinden) if (g.lat != null) zellen.add(`${Math.round(g.lat / 0.09)}|${Math.round(g.lon / 0.14)}`);
  return [...zellen].map((z) => { const [a, b] = z.split('|').map(Number); const p = projiziere(a * 0.09, b * 0.14); return `M${Math.round(p.x)} ${Math.round(p.y)}h4v4h-4z`; }).join('');
}

/** Fälle je Kommune: {name, land, ebene, url, lat, lon, faelle[]} – sortiert nach Land und Name. */
export function kommunenMitSperre(sperren, gemeinden) {
  const { pfad } = verzeichnis(gemeinden);
  const gruppen = new Map();
  for (const f of sperren.faelle) {
    const name = f.anzeige || f.kommune;
    const k = `${f.land}|${name}`;
    if (!gruppen.has(k)) {
      let ort = null, url = null;
      if (f.ebene === 'kreis') {
        const gs = gemeinden.filter((g) => g.land === f.land && norm(g.kreis || '') === norm(f.kreisname || f.kommune) && g.lat != null);
        if (gs.length) {
          const haupt = gs.reduce((a, b) => ((b.einwohner || 0) > (a.einwohner || 0) ? b : a));
          ort = { lat: gs.reduce((s, g) => s + g.lat, 0) / gs.length, lon: gs.reduce((s, g) => s + g.lon, 0) / gs.length };
          url = `/gemeinden/${LAND_SLUG[f.land]}/#${anker(haupt.kreis)}`;
        }
      } else {
        const roh = name.replace(/-.*\(bezirk\)/i, '');
        const suche = norm(roh);
        const alias = norm(roh.replace(/^(Ostseeheilbad|Ostseebad|Hansestadt|Stadt|Gemeinde|Markt)\s+/i, '').replace(/ bei /, ' b ').replace(/ in der Oberpfalz/, ' i d opf'));
        const g = gemeinden.find((x) => x.land === f.land && norm(x.name) === suche)
          || gemeinden.find((x) => x.land === f.land && norm(x.name) === alias)
          || gemeinden.find((x) => x.land === f.land && norm(x.name).startsWith(suche + ' '));
        if (g) { ort = { lat: g.lat, lon: g.lon }; url = `/gemeinden/${pfad[g.ags]}/`; }
      }
      gruppen.set(k, { name, land: f.land, ebene: f.ebene, url, ...(ort || {}), faelle: [] });
    }
    gruppen.get(k).faelle.push(f);
  }
  return [...gruppen.values()].sort((a, b) => a.land.localeCompare(b.land) || a.name.localeCompare(b.name, 'de'));
}

/** Raster je Bundesland: {land: {pfad, x, y}} – Fläche als Pfad, Schwerpunkt für die Beschriftung. */
export function laenderRaster(gemeinden, dLat = 0.09, dLon = 0.14) {
  const zelle = new Map();   // Zelle → Land (erste Gemeinde gewinnt)
  for (const g of gemeinden) if (g.lat != null) { const k = `${Math.round(g.lat / dLat)}|${Math.round(g.lon / dLon)}`; if (!zelle.has(k)) zelle.set(k, g.land); }
  const s = (dLon * COS * K) * 0.92, laender = {};
  for (const [k, land] of zelle) {
    const [a, b] = k.split('|').map(Number); const p = projiziere(a * dLat, b * dLon);
    const l = (laender[land] ||= { teile: [], sx: 0, sy: 0, n: 0 });
    l.teile.push(`M${p.x.toFixed(1)} ${p.y.toFixed(1)}h${s.toFixed(1)}v${s.toFixed(1)}h-${s.toFixed(1)}z`); l.sx += p.x; l.sy += p.y; l.n++;
  }
  return Object.fromEntries(Object.entries(laender).map(([l, v]) => [l, { pfad: v.teile.join(''), x: v.sx / v.n, y: v.sy / v.n, zellen: v.n }]));
}

/** Ausschnitt (viewBox) eines Landes mit Rand. */
export function ausschnitt(gemeinden, land, rand = 14) {
  const ps = gemeinden.filter((g) => g.land === land && g.lat != null).map((g) => projiziere(g.lat, g.lon));
  const x0 = Math.min(...ps.map((p) => p.x)) - rand, x1 = Math.max(...ps.map((p) => p.x)) + rand;
  const y0 = Math.min(...ps.map((p) => p.y)) - rand, y1 = Math.max(...ps.map((p) => p.y)) + rand;
  return { x: x0, y: y0, b: Math.max(x1 - x0, 40), h: Math.max(y1 - y0, 40) };
}

/** Farbstufe nach Anzahl (0 = neutral). */
export const stufe = (n, max) => (!n ? 0 : Math.min(5, Math.ceil((n / Math.max(max, 1)) * 5)));
