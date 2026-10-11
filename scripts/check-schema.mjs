// Prüft dist: "@type":"WebSite" nur auf der Startseite; jedes JSON-LD parsebar (Runbook 2.3).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
const ROOT = new URL('../.vercel/output/static/', import.meta.url).pathname;
const fehler = [];
let seiten = 0, bloecke = 0;
(function lauf(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { lauf(p); continue; }
    if (!f.endsWith('.html')) continue;
    seiten++;
    const url = '/' + relative(ROOT, p).replace(/index\.html$/, '');
    const html = readFileSync(p, 'utf8');
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      bloecke++;
      let o; try { o = JSON.parse(m[1]); } catch { fehler.push(`${url}: JSON-LD nicht lesbar`); continue; }
      if (url !== '/' && /"@type":"WebSite"/.test(m[1])) fehler.push(`${url}: WebSite außerhalb der Startseite`);
    }
  }
})(ROOT);
console.log(`Schema-Prüfung: ${seiten} Seiten, ${bloecke} JSON-LD-Blöcke, ${fehler.length} Fehler`);
for (const f of fehler.slice(0, 30)) console.log('  ' + f);
process.exit(fehler.length ? 1 : 0);
