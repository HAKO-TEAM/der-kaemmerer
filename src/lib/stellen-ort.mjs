// Stellen je Gemeinde: jede erfasste Ausschreibung wird der Gemeinde ihres Dienstorts zugeordnet
// (gleicher Name im selben Land, sonst nächstgelegene Gemeinde bis 8 km). Grundlage für /gemeinden/<land>/<gemeinde>/stellen/.
import { km } from './markt/benchmark.mjs';

const MAX_KM = 8;
const norm = (s = '') => s.toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').replace(/[^a-zäöüß0-9]+/g, ' ').trim();

let cache = null;
/** Map AGS → Stellen (nur laufende, Bewerbungsschluss heute oder später). */
export function stellenJeGemeinde(stellen, gemeinden, heute = new Date().toISOString().slice(0, 10)) {
  if (cache && cache.heute === heute) return cache.map;
  const nachName = new Map();
  for (const g of gemeinden) {
    for (const n of new Set([g.name, norm(g.name)])) {
      const k = `${g.land}|${n}`;
      nachName.set(k, nachName.has(k) ? null : g);   // null = mehrdeutig im Land
    }
  }
  const mitOrt = gemeinden.filter((g) => g.lat != null);
  const map = new Map();
  for (const s of stellen) {
    if (s.s && s.s < heute) continue;
    let g = nachName.get(`${s.l}|${s.ort}`) || nachName.get(`${s.l}|${norm(s.ort)}`);
    if (!g && s.la != null) {
      let best = null, d = MAX_KM;
      for (const x of mitOrt) {
        if (x.land !== s.l || Math.abs(x.lat - s.la) > 0.1) continue;
        const e = km({ la: s.la, lo: s.lo }, { la: x.lat, lo: x.lon });
        if (e < d) { d = e; best = x; }
      }
      g = best;
    }
    if (!g) continue;
    if (!map.has(g.ags)) map.set(g.ags, []);
    map.get(g.ags).push(s);
  }
  cache = { heute, map };
  return map;
}
