// Prüft dist auf interne href ohne abschließenden Schrägstrich (Runbook 2.1). Ergebnis muss leer sein.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
const ROOT = new URL('../.vercel/output/static/', import.meta.url).pathname;
const treffer = new Map();
let n = 0;
(function lauf(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { lauf(p); continue; }
    if (!f.endsWith('.html')) continue;
    const html = readFileSync(p, 'utf8');
    for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
      const h = m[1]; const letztes = h.split('/').pop();
      if (h === '/' || h.endsWith('/') || h.startsWith('//') || letztes.includes('.')) continue;
      n++; const s = '/' + relative(ROOT, p).replace(/index\.html$/, '');
      if (!treffer.has(h)) treffer.set(h, s);
    }
  }
})(ROOT);
console.log(`Link-Prüfung: ${n} interne Links ohne Schrägstrich, ${treffer.size} verschiedene Ziele`);
for (const [h, s] of [...treffer].slice(0, 40)) console.log(`  ${h}   (z. B. auf ${s})`);
process.exit(n ? 1 : 0);
