// IndexNow nach dem Deploy (Runbook 2.5): liest die LIVE-Sitemaps, vergleicht mit dem letzten Lauf
// und meldet nur neue oder geänderte URLs (lastmod) an api.indexnow.org (Bing, Yandex, Seznam, Naver …).
// Zustand: ~/.config/derkaemmerer/indexnow-stand.json · Aufruf: node scripts/indexnow.mjs [--dry] [--init]
//   --init  übernimmt den aktuellen Stand ohne Meldung (z. B. nach einer Komplettmeldung)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY = '0be8993824f3763c2c0310b0337537e4';
const SITE = 'https://derkaemmerer.de';
const CONF = join(homedir(), '.config/derkaemmerer');
const STAND = join(CONF, 'indexnow-stand.json');
const dry = process.argv.includes('--dry');
const init = process.argv.includes('--init');

const text = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.text(); };
const index = await text(`${SITE}/sitemap-index.xml`);
const dateien = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const jetzt = {};
for (const d of [...dateien, `${SITE}/news-sitemap.xml`]) {
  for (const m of (await text(d)).matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)) jetzt[m[1]] = m[2] || '';
}
const alt = existsSync(STAND) ? JSON.parse(readFileSync(STAND, 'utf8')) : {};
const melden = Object.keys(jetzt).filter((u) => !(u in alt) || alt[u] !== jetzt[u]);
console.log(`IndexNow: ${Object.keys(jetzt).length} URLs live, ${melden.length} neu oder geändert`);

if (!dry && !init && melden.length) {
  for (let i = 0; i < melden.length; i += 10000) {
    const teil = melden.slice(i, i + 10000);
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: 'derkaemmerer.de', key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: teil }),
    });
    console.log(`  ${r.status} – ${teil.length} URLs gemeldet`);
    if (r.status >= 300) process.exit(1);
  }
}
if (dry) { for (const u of melden.slice(0, 10)) console.log('  ' + u); process.exit(0); }
mkdirSync(CONF, { recursive: true });
writeFileSync(STAND, JSON.stringify(jetzt));
