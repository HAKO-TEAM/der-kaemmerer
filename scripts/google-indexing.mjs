#!/usr/bin/env node
// Meldet Stellenanzeigen an die Google Indexing API (nur für JobPosting-Seiten zulässig).
// Neue aktive Stellen → URL_UPDATED, abgelaufene/deaktivierte → URL_DELETED.
// Schlüssel: ~/.config/derkaemmerer/google-indexing.json (Dienstkonto stellen-indexing, Inhaber in der Search Console).
// Stand:     ~/.config/derkaemmerer/indexing-stand.json (welche URLs bereits gemeldet sind).
// Aufruf:    node scripts/google-indexing.mjs [--dry] [--max 190] [--nur https://derkaemmerer.de/stellen/<slug>/]
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONF = join(homedir(), '.config/derkaemmerer');
const SCHLUESSEL = join(CONF, 'google-indexing.json');
const STAND = join(CONF, 'indexing-stand.json');
const JOBS = new URL('../src/content/jobs/', import.meta.url).pathname;
const BASIS = 'https://derkaemmerer.de/stellen/';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const max = Number(args[args.indexOf('--max') + 1]) || 190; // Tageskontingent 200
const nur = args.includes('--nur') ? args[args.indexOf('--nur') + 1] : null;

function kopf(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const d = {};
  if (m) for (const z of m[1].split('\n')) {
    const t = z.match(/^(\w+):\s*(.*)$/);
    if (t) d[t[1]] = t[2].replace(/^"(.*)"$/, '$1');
  }
  return d;
}

function aktiveStellen() {
  const heute = new Date().toISOString().slice(0, 10);
  const aktiv = new Map();
  for (const f of readdirSync(JOBS)) {
    if (!f.endsWith('.md')) continue;
    const d = kopf(readFileSync(join(JOBS, f), 'utf8'));
    if (d.aktiv === 'true' && (d.bewerbungsschluss || '') >= heute) aktiv.set(BASIS + f.slice(0, -3) + '/', d.datum || '');
  }
  return aktiv;
}

async function token() {
  const k = JSON.parse(readFileSync(SCHLUESSEL, 'utf8'));
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jetzt = Math.floor(Date.now() / 1000);
  const roh = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: k.client_email, scope: 'https://www.googleapis.com/auth/indexing',
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

async function melde(tok, url, type) {
  const r = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type }),
  });
  return { status: r.status, text: r.ok ? '' : (await r.text()).slice(0, 200) };
}

async function live(url) {
  try { return (await fetch(url, { method: 'HEAD', redirect: 'manual' })).status === 200; } catch { return false; }
}

const stand = existsSync(STAND) ? JSON.parse(readFileSync(STAND, 'utf8')) : { gemeldet: {} };
const aktiv = aktiveStellen();
let auftraege;
if (nur) {
  auftraege = [{ url: nur, type: aktiv.has(nur) ? 'URL_UPDATED' : 'URL_DELETED' }];
} else {
  const neu = [...aktiv].filter(([u]) => !stand.gemeldet[u]).sort((a, b) => b[1].localeCompare(a[1])).map(([url]) => ({ url, type: 'URL_UPDATED' }));
  const weg = Object.keys(stand.gemeldet).filter((u) => !aktiv.has(u)).map((url) => ({ url, type: 'URL_DELETED' }));
  auftraege = [...weg, ...neu].slice(0, max);   // Runbook 3.2: gelöschte zuerst
  console.log(`aktiv ${aktiv.size} · bereits gemeldet ${Object.keys(stand.gemeldet).length} · neu ${neu.length} · abgelaufen ${weg.length} · dieser Lauf ${auftraege.length}`);
}
if (dry) { for (const a of auftraege.slice(0, 10)) console.log(a.type, a.url); process.exit(0); }
if (!existsSync(SCHLUESSEL)) { console.error('Schlüssel fehlt: ' + SCHLUESSEL); process.exit(1); }

const tok = await token();
let ok = 0, fehler = 0, uebersprungen = 0;
for (const a of auftraege) {
  if (a.type === 'URL_UPDATED' && !(await live(a.url))) { uebersprungen++; continue; } // noch nicht deployt
  const r = await melde(tok, a.url, a.type);
  if (r.status === 200) {
    ok++;
    if (a.type === 'URL_UPDATED') stand.gemeldet[a.url] = new Date().toISOString().slice(0, 10);
    else delete stand.gemeldet[a.url];
  } else {
    fehler++;
    console.error(r.status, a.type, a.url, r.text);
    if (r.status === 429) break; // Tageskontingent erschöpft
  }
}
mkdirSync(CONF, { recursive: true });
writeFileSync(STAND, JSON.stringify(stand, null, 1));
console.log(`gemeldet ${ok} · Fehler ${fehler} · noch nicht live ${uebersprungen}`);
