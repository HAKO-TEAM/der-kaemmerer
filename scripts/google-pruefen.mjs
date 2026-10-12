#!/usr/bin/env node
// Prüft Stellen-Seiten über die URL-Prüfung der Search Console (Dienstkonto aus google-indexing.mjs):
// ob Google die Seite kennt, indexiert hat und das Stellen-Markup („Job posting“) erkennt.
// Aufruf: node scripts/google-pruefen.mjs [--max 20] [url …]   (ohne URL: Stichprobe aus der Stellen-Sitemap)
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SCHLUESSEL = join(homedir(), '.config/derkaemmerer/google-indexing.json');
const PROPERTY = 'sc-domain:derkaemmerer.de';
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
const max = Number(arg('max') || 20);

async function token() {
  const k = JSON.parse(readFileSync(SCHLUESSEL, 'utf8'));
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jetzt = Math.floor(Date.now() / 1000);
  const roh = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: k.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: k.token_uri, iat: jetzt, exp: jetzt + 3600,
  });
  const sig = createSign('RSA-SHA256').update(roh).sign(k.private_key).toString('base64url');
  const r = await fetch(k.token_uri, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: roh + '.' + sig }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Token: ' + JSON.stringify(j));
  return j.access_token;
}

let urls = process.argv.slice(2).filter((a, i, l) => a.startsWith('http') && l[i - 1] !== '--max');
if (!urls.length) {
  const x = await (await fetch('https://derkaemmerer.de/sitemap-stellen.xml')).text();
  const alle = [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /\/stellen\/[^/]+\/$/.test(u) && !/\/(seite|bundesland|berufsfeld)\//.test(u));
  // gleichmäßig verteilte Stichprobe
  urls = Array.from({ length: Math.min(max, alle.length) }, (_, i) => alle[Math.floor((i * alle.length) / Math.min(max, alle.length))]);
}
const tok = await token();
const zaehler = {};
for (const u of urls) {
  const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: u, siteUrl: PROPERTY, languageCode: 'de-DE' }),
  });
  const j = await r.json();
  if (!r.ok) { console.log(`FEHLER ${r.status} ${u}: ${JSON.stringify(j).slice(0, 300)}`); if (r.status === 403 || r.status === 400) break; continue; }
  const i = j.inspectionResult || {};
  const idx = i.indexStatusResult || {};
  const rich = (i.richResultsResult?.detectedItems || []).map((d) => `${d.richResultType}${d.items?.some((x) => x.issues?.length) ? ' (Hinweise)' : ''}`).join(', ') || '–';
  const k = `${idx.coverageState || '?'} | ${rich}`;
  zaehler[k] = (zaehler[k] || 0) + 1;
  console.log(`${idx.verdict || '?'} | ${idx.coverageState || '?'} | zuletzt gecrawlt ${idx.lastCrawlTime?.slice(0, 10) || '–'} | Markup: ${rich} | ${u.replace('https://derkaemmerer.de', '')}`);
  for (const d of i.richResultsResult?.detectedItems || []) for (const it of d.items || []) for (const s of it.issues || []) console.log(`    ${s.severity}: ${s.issueMessage}`);
}
console.log('\nÜbersicht:'); for (const [k, v] of Object.entries(zaehler)) console.log(`  ${v} × ${k}`);
