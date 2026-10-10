// Lexikon Kommunalfinanzen: Live-Zahlen je Begriff und Verlinkung der ersten Nennung in Fachartikeln.
import { LEXIKON } from '../data/lexikon.mjs';

export { LEXIKON };
export const lexikonUrl = (slug) => `/lexikon/${slug}/`;

// Zusätzliche Schreibweisen, unter denen ein Begriff im Fließtext vorkommt
const AUCH = {
  'haushaltssperre': ['Haushaltssperren'], 'haushaltssicherungskonzept': ['Haushaltssicherungskonzepte', 'Haushaltssicherung'],
  'kassenkredite': ['Kassenkredit', 'Liquiditätskredite', 'Liquiditätskredit', 'Kassenkrediten'], 'hebesatz': ['Hebesätze', 'Hebesätzen'],
  'nachtragshaushalt': ['Nachtragssatzung', 'Nachtragshaushalts'], 'ausgleichsruecklage': [], 'kreisumlage': ['Kreisumlagen'],
  'schluesselzuweisungen': [], 'hilfen-zur-erziehung': [], 'kosten-der-unterkunft': [], 'abschreibungen': [],
  'pensionsrueckstellungen': [], 'altschulden': [], 'konnexitaetsprinzip': ['Konnexität'], 'kommunalaufsicht': [],
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let cache = null;
export function lexikonMatcher() {
  if (cache) return cache;
  const ziel = {};
  for (const e of LEXIKON) {
    const basis = e.begriff.replace(/\s*\(.*?\)\s*/g, '').trim();
    for (const n of [basis, ...(AUCH[e.slug] || [])]) if (n.length >= 5) ziel[n] = e.slug;
  }
  const namen = Object.keys(ziel).sort((a, b) => b.length - a.length).map(esc);
  cache = { re: new RegExp(`(?<![\\p{L}\\p{N}-])(${namen.join('|')})(?![\\p{L}\\p{N}-])`, 'gu'), ziel };
  return cache;
}

/** Rehype-Plugin: erste Nennung eines Lexikonbegriffs verlinken (höchstens max je Artikel). */
export function rehypeLexikonLinks({ max = 6 } = {}) {
  return () => (baum) => {
    const { re, ziel } = lexikonMatcher();
    const erledigt = new Set();
    const SPERR = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'script', 'style']);
    const lauf = (knoten) => {
      if (!knoten.children) return;
      const neu = [];
      for (const kind of knoten.children) {
        if (kind.type === 'element') { if (!SPERR.has(kind.tagName)) lauf(kind); neu.push(kind); continue; }
        if (kind.type !== 'text' || erledigt.size >= max) { neu.push(kind); continue; }
        const t = kind.value; let pos = 0;
        for (const m of t.matchAll(re)) {
          const slug = ziel[m[1]];
          if (erledigt.has(slug) || erledigt.size >= max) continue;
          erledigt.add(slug);
          if (m.index > pos) neu.push({ type: 'text', value: t.slice(pos, m.index) });
          neu.push({ type: 'element', tagName: 'a', properties: { href: lexikonUrl(slug), className: ['lexikon-link'], title: 'Im Lexikon Kommunalfinanzen' }, children: [{ type: 'text', value: m[1] }] });
          pos = m.index + m[1].length;
        }
        if (pos === 0) neu.push(kind); else if (pos < t.length) neu.push({ type: 'text', value: t.slice(pos) });
      }
      knoten.children = neu;
    };
    lauf(baum);
  };
}

const med = (xs) => { const v = xs.filter((x) => x != null && x > 0).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
const z = (x) => Math.round(x).toLocaleString('de-DE');

/** Live-Zahl je Schlüssel als ein Satz mit Link (aus den Datenbeständen von Der Kämmerer). */
export function liveZahlen({ sperren, hsNw, hebesaetze, schulden, markt }) {
  const nw = Object.values(hsNw.gemeinden);
  const n = (s) => nw.filter((x) => x.s === s).length;
  const kommunen = new Set(sperren.faelle.map((f) => `${f.land}|${f.anzeige || f.kommune}`)).size;
  const H = Object.values(hebesaetze), S = Object.values(schulden);
  return {
    sperren: { wert: z(kommunen), text: `Kommunen mit belegter Haushaltssperre seit 2025 (Stand ${sperren.stand.split('-').reverse().join('.')})`, link: '/haushaltssperren/' },
    hsk: { wert: z(n(5) + n(6) + n(7)), text: `von ${nw.length} Gemeinden in NRW in der Haushaltssicherung (amtlich, 31.12.2025)`, link: '/haushaltslage-nrw/' },
    ausgeglichen: { wert: z(n(1)), text: `von ${nw.length} Gemeinden in NRW mit echtem Haushaltsausgleich zum 31.12.2025`, link: '/haushaltslage-nrw/' },
    fiktiv: { wert: z(n(2)), text: `von ${nw.length} Gemeinden in NRW nur fiktiv ausgeglichen (31.12.2025)`, link: '/haushaltslage-nrw/' },
    ruecklage: { wert: z(n(3) + n(4)), text: `Gemeinden in NRW mit genehmigtem Rücklagenverzehr oder Fehlbetragsvortrag (31.12.2025)`, link: '/haushaltslage-nrw/' },
    vorlaeufig: { wert: z(n(6) + n(7)), text: `Gemeinden in NRW in vorläufiger Haushaltsführung (31.12.2025)`, link: '/haushaltslage-nrw/' },
    ueberschuldet: { wert: z(nw.filter((x) => x.u === 1).length), text: `überschuldete Gemeinden in NRW, bei ${nw.filter((x) => x.u === 2 || x.u === 3).length} weiteren droht die Überschuldung`, link: '/haushaltslage-nrw/' },
    kassenkredite: { wert: `${z(med(S.map((x) => x.kassenkredite_je_ew)))} €`, text: 'Kassenkredite je Einwohner im Median der Gemeinden, die solche Kredite haben (31.12.2025)', link: '/ranglisten/kassenkredite/' },
    schulden: { wert: `${z(med(S.map((x) => x.schulden_je_ew)))} €`, text: 'Schulden im Kernhaushalt je Einwohner im Median aller Gemeinden (31.12.2025)', link: '/ranglisten/schulden/' },
    hebesatz: { wert: `${z(med(H.map((x) => x.grundsteuer_b)))} %`, text: 'Hebesatz der Grundsteuer B im Median aller Gemeinden (2024)', link: '/ranglisten/grundsteuer-b/' },
    grundsteuer_b: { wert: `${z(med(H.map((x) => x.grundsteuer_b)))} %`, text: 'Hebesatz der Grundsteuer B im Median aller Gemeinden (2024)', link: '/ranglisten/grundsteuer-b/' },
    grundsteuer_a: { wert: `${z(med(H.map((x) => x.grundsteuer_a)))} %`, text: 'Hebesatz der Grundsteuer A im Median aller Gemeinden (2024)', link: '/ranglisten/grundsteuer-a/' },
    gewerbesteuer: { wert: `${z(med(H.map((x) => x.gewerbesteuer)))} %`, text: 'Hebesatz der Gewerbesteuer im Median aller Gemeinden (2024)', link: '/ranglisten/gewerbesteuer/' },
    stellen: { wert: z(markt.stellen.length), text: 'kommunale und öffentliche Stellen im täglich erfassten Stellenmarkt', link: '/stellen/' },
  };
}
