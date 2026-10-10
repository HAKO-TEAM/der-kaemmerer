// Interne Verlinkung: Städtenamen in Fachartikeln führen auf das Gemeindeprofil, das Gemeindeprofil zeigt die Artikel.
// Verlinkt werden Gemeinden ab 20.000 Einwohnern mit eindeutigem Namen; Namen, die zugleich gängige Wörter sind, bleiben außen vor.
import { verzeichnis, gemeindeUrl } from './gemeinden.mjs';

const MIN_EINWOHNER = 20000;
// Gemeindenamen, die im Fließtext meist etwas anderes bedeuten
const WOERTER = new Set(['Burg', 'Hof', 'Lage', 'Heide', 'Haar', 'Roth', 'Enger', 'Kamen', 'Löhne', 'Bünde', 'Senden',
  'Leer', 'Wetter', 'Langen', 'Singen', 'Lohne', 'Waren', 'Werder', 'Weiden', 'Halle', 'Brandenburg', 'Neustadt', 'Rees', 'Lauf', 'Weil', 'Wangen']);
// Kurzformen, die trotz Namensgleichheit eindeutig gemeint sind
const KURZ = { Frankfurt: '06412000' };

/** Kurzform: „Mülheim an der Ruhr“ → „Mülheim“, „Kempten (Allgäu)“ → „Kempten“. */
const kurzform = (n) => n.split(/\s*\/\s*|\s+\(| am | an der | im | in der | bei | unter | v\. d\.| a\.| i\.| b\./)[0].trim();

let cache = null;
/** {re, ziel: Name → {ags, url}} – ein Ausdruck über alle verlinkbaren Namen, längste zuerst. */
export function gemeindeMatcher(gemeinden) {
  if (cache) return cache;
  const { pfad } = verzeichnis(gemeinden);
  const kandidaten = gemeinden.filter((g) => (g.einwohner || 0) >= MIN_EINWOHNER);
  const zaehl = {};
  const plus = (n) => { zaehl[n] = (zaehl[n] || 0) + 1; };
  for (const g of kandidaten) { plus(g.name); const k = kurzform(g.name); if (k !== g.name) plus(k); }
  const ziel = {};
  for (const g of kandidaten) {
    for (const n of new Set([g.name, kurzform(g.name)])) {
      if (zaehl[n] === 1 && !WOERTER.has(n) && n.length >= 3) ziel[n] = { ags: g.ags, url: gemeindeUrl(pfad[g.ags]) };
    }
  }
  for (const [n, ags] of Object.entries(KURZ)) if (pfad[ags]) ziel[n] = { ags, url: gemeindeUrl(pfad[ags]) };
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const namen = Object.keys(ziel).sort((a, b) => b.length - a.length).map(esc);
  // Wortgrenzen inkl. Umlaute und Bindestrich; Genitiv-s erlaubt („Kölns“). Nicht nach „Kreis“/„Landkreis“.
  const re = new RegExp(`(?<![\\p{L}\\p{N}-])(?<!(?:Kreis|Kreises|Landkreis|Landkreises|Bistum|Region)\\s)(${namen.join('|')})(s?)(?![\\p{L}\\p{N}-])`, 'gu');
  cache = { re, ziel };
  return cache;
}

/** Alle in einem Text genannten Gemeinden (AGS). */
export function genannteGemeinden(text, gemeinden) {
  const { re, ziel } = gemeindeMatcher(gemeinden);
  const ags = new Set();
  for (const m of String(text || '').matchAll(re)) ags.add(ziel[m[1]].ags);
  return ags;
}

/** Rehype-Plugin: erste Nennung jeder Gemeinde im Artikel verlinken (höchstens 25), nicht in Links, Überschriften, Code. */
export function rehypeGemeindeLinks({ gemeinden, max = 25 }) {
  return () => (baum) => {
    const { re, ziel } = gemeindeMatcher(gemeinden);
    const erledigt = new Set();
    const SPERR = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'script', 'style']);
    const lauf = (knoten) => {
      if (!knoten.children) return;
      const neu = [];
      for (const kind of knoten.children) {
        if (kind.type === 'element') { if (!SPERR.has(kind.tagName)) lauf(kind); neu.push(kind); continue; }
        if (kind.type !== 'text' || erledigt.size >= max) { neu.push(kind); continue; }
        const t = kind.value; let pos = 0;
        re.lastIndex = 0;
        for (const m of t.matchAll(re)) {
          const z = ziel[m[1]];
          if (erledigt.has(z.ags) || erledigt.size >= max) continue;
          erledigt.add(z.ags);
          if (m.index > pos) neu.push({ type: 'text', value: t.slice(pos, m.index) });
          neu.push({ type: 'element', tagName: 'a', properties: { href: z.url, className: ['gemeinde-link'] }, children: [{ type: 'text', value: m[1] }] });
          pos = m.index + m[1].length;   // Genitiv-s bleibt außerhalb des Links
        }
        if (pos === 0) neu.push(kind); else if (pos < t.length) neu.push({ type: 'text', value: t.slice(pos) });
      }
      knoten.children = neu;
    };
    lauf(baum);
  };
}
