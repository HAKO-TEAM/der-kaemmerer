// Nach dem Build (Runbook 3.1): abgelaufene Stellen (aktiv, Bewerbungsschluss vor dem Build-Tag) mit HTTP 410
// beantworten und auf die Hinweisseite /stelle-abgelaufen/ leiten. Nicht freigeschaltete Anzeigen (aktiv: false) bleiben 404.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const JOBS = new URL('../src/content/jobs/', import.meta.url).pathname;
const heute = new Date(); heute.setHours(0, 0, 0, 0);
const feld = (s, k) => (s.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1];
const abgelaufen = [];
for (const f of readdirSync(JOBS)) {
  if (!f.endsWith('.md')) continue;
  const s = readFileSync(join(JOBS, f), 'utf8');
  if (feld(s, 'aktiv') === 'true' && new Date(feld(s, 'bewerbungsschluss')) < heute) abgelaufen.push(f.slice(0, -3));
}
const datei = '.vercel/output/config.json';
const config = JSON.parse(readFileSync(datei, 'utf8'));
config.routes = config.routes.filter((r) => r.dest !== '/stelle-abgelaufen/index.html');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regeln = [];
for (let i = 0; i < abgelaufen.length; i += 80) {   // Regex in Blöcken, damit keine Regel zu lang wird
  regeln.push({ src: `^/stellen/(?:${abgelaufen.slice(i, i + 80).map(esc).join('|')})/?$`, dest: '/stelle-abgelaufen/index.html', status: 410 });
}
// vor der Schrägstrich-Weiterleitung einfügen, damit auch /stellen/<slug> ohne Schrägstrich direkt 410 erhält
const i = config.routes.findIndex((r) => r.status === 308 && r.headers?.Location === '/$1/');
const pos = i >= 0 ? i : config.routes.findIndex((r) => r.handle === 'filesystem');
config.routes.splice(pos < 0 ? 0 : pos, 0, ...regeln);
writeFileSync(datei, JSON.stringify(config, null, 2));
console.log(`stellen-410: ${abgelaufen.length} abgelaufene Stellen → 410`);
