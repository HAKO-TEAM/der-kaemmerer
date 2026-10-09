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
        const suche = norm(name.replace(/-.*\(bezirk\)/i, ''));
        const g = gemeinden.find((x) => x.land === f.land && norm(x.name) === suche)
          || gemeinden.find((x) => x.land === f.land && norm(x.name).startsWith(suche + ' '));
        if (g) { ort = { lat: g.lat, lon: g.lon }; url = `/gemeinden/${pfad[g.ags]}/`; }
      }
      gruppen.set(k, { name, land: f.land, ebene: f.ebene, url, ...(ort || {}), faelle: [] });
    }
    gruppen.get(k).faelle.push(f);
  }
  return [...gruppen.values()].sort((a, b) => a.land.localeCompare(b.land) || a.name.localeCompare(b.name, 'de'));
}
