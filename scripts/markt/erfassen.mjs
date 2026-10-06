#!/usr/bin/env node
// Personal-Cockpit – tägliche Markterfassung kommunaler Stellen.
//
//   node scripts/markt/erfassen.mjs            # erfassen + src/data/markt/markt.json schreiben
//   node scripts/markt/erfassen.mjs --limit 200 # Probelauf mit wenigen Detailabrufen
//
// Quellen: interamt.de (Gesamtbestand + Detail je Stelle), karriere.nrw.
// Gespeichert werden nur Merkmale und Kennzahlen, keine Anzeigentexte.
// Rohdaten-Cache und Verlauf liegen außerhalb des Repos in ~/derkaemmerer-markt/.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  funktionsfeld, istLeitung, niveau, htmlZuText, leistungen, textMerkmale,
  land, istKommunal, LEISTUNGEN,
} from '../../src/lib/markt/merkmale.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BASIS = join(homedir(), 'derkaemmerer-markt');
const CACHE = join(BASIS, 'cache');
const VERLAUF = join(BASIS, 'verlauf.json');
const ZIEL = join(REPO, 'src/data/markt/markt.json');
mkdirSync(CACHE, { recursive: true });
mkdirSync(dirname(ZIEL), { recursive: true });

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const LIMIT = +(arg('--limit') || 0);
const HEUTE = new Date(); HEUTE.setHours(0, 0, 0, 0);
// lokales Datum (toISOString wäre UTC und verschiebt Mitternacht auf den Vortag)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const IA = { 'X-REMOTE-APPLICATION': 'Interamtb2c', 'Content-Type': 'application/json' };
const LBIT = Object.fromEntries(LEISTUNGEN.map(([k], i) => [k, 1 << i]));

function datum(s) {
  if (!s) return null;
  let m = String(s).match(/(\d{4})-(\d\d)-(\d\d)/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = String(s).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}
const tage = (a, b) => (a && b ? Math.round((a - b) / 864e5) : null);

const AUSSCHLUSS = /initiativbewerbung|studiengang|bachelor of|lehramtsstudent|ausbildung|azubi|auszubildende|praktik|duales studium|dualer student|studium|anwärter|anwaerter|referendar|trainee|freiwilliges|fsj|bfd|bundesfreiwillig|werkstudent|minijob|aushilfe|ferienjob|schülerpraktik/i;

async function json(url, opt = {}, versuche = 3) {
  for (let i = 0; i < versuche; i++) {
    try {
      const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(30000) });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
    } catch {}
    await new Promise((s) => setTimeout(s, 1500 * (i + 1)));
  }
  return null;
}

async function parallel(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

// ── interamt ─────────────────────────────────────────────────────────────────
async function interamt() {
  const liste = (await json('https://api.interamt.de/search/stellenangebot?showResult=true',
    { method: 'POST', headers: IA, body: '{"search":{}}' }))?.data || [];
  console.log(`interamt: ${liste.length} Stellen im Gesamtbestand`);
  const kandidaten = liste.filter((x) => {
    if (!istKommunal(x.behoerdeName || '')) return false;
    if (AUSSCHLUSS.test(x.stellenbezeichnung || '')) return false;
    const f = datum(x.bewerbungsfrist);
    if (f) return f >= HEUTE;
    const e = datum(x.datumErstellt);
    return e && tage(HEUTE, e) <= 120; // „baldmöglichst“: nur frische Ausschreibungen
  });
  console.log(`interamt: ${kandidaten.length} kommunale, aktive Stellen`);

  let neu = 0, fehl = 0;
  const offen = kandidaten.filter((x) => !existsSync(join(CACHE, `ia_${x.stellenangebotId}.json`)));
  const abzurufen = LIMIT ? offen.slice(0, LIMIT) : offen;
  await parallel(abzurufen, 8, async (x) => {
    const d = await json(`https://api.interamt.de/query/stellenangebot/${x.stellenangebotId}`, { headers: IA });
    if (d?.data) { writeFileSync(join(CACHE, `ia_${x.stellenangebotId}.json`), JSON.stringify(d.data)); neu++; }
    else fehl++;
    if ((neu + fehl) % 250 === 0) console.log(`  … ${neu + fehl}/${abzurufen.length} Details`);
  });
  console.log(`interamt: ${neu} Details neu geladen, ${fehl} nicht abrufbar`);

  const aus = [];
  for (const x of kandidaten) {
    const p = join(CACHE, `ia_${x.stellenangebotId}.json`);
    if (!existsSync(p)) continue;
    const d = JSON.parse(readFileSync(p, 'utf8'));
    const text = htmlZuText(d.stellenbeschreibung || '');
    const tm = textMerkmale(text);
    const bv = (d.beschaeftigungsverhaeltnisse || [])[0] || {};
    const entg = [x.tarifEbeneMin, x.besoldungGruppe, bv.entgeltgruppeVon, bv.besoldungVon].filter(Boolean).join(' ');
    const entgMax = [x.tarifEbeneMax, x.besoldungGruppeMax, bv.entgeltgruppeBis, bv.besoldungBis].filter(Boolean).join(' ');
    let n = niveau(entg), nm = niveau(entgMax);
    // Spannen wie „E 1 bis E 15“ sind Platzhalter, keine Aussage
    if (n != null && nm != null && nm - n > 4) { n = niveau(text); nm = null; }
    const ort = (d.einsatzorte || x.einsatzorte || [])[0] || {};
    const veroeff = datum(d.veroeffentlichungsdatum || d.datumOeffentlichAusschreiben || x.datumErstellt);
    const frist = datum(d.bewerbungsfrist || x.bewerbungsfrist);
    const lst = leistungen(text);
    const ho = (d.dienstort || x.dienstortEnumDto || '');
    if (/HYBRID|HOME/.test(ho) && !lst.includes('homeoffice')) lst.push('homeoffice');
    aus.push({
      id: `ia${x.stellenangebotId}`,
      t: (d.stellenbezeichnung || x.stellenbezeichnung || '').replace(/\s+/g, ' ').trim().slice(0, 140),
      o: (d.behoerdeName || x.behoerdeName || '').trim(),
      ort: ort.ort || d.ort || '',
      p: ort.plz || d.plz || '',
      l: land(ort.plz || d.plz),
      la: ort.latitude ? +(+ort.latitude).toFixed(3) : null,
      lo: ort.longitude ? +(+ort.longitude).toFixed(3) : null,
      f: funktionsfeld(d.stellenbezeichnung || x.stellenbezeichnung),
      L: istLeitung(d.stellenbezeichnung || x.stellenbezeichnung) ? 1 : 0,
      n, nm: nm && nm !== n ? nm : null,
      h: lst.includes('homeoffice') ? 1 : 0,
      b: d.beschaeftigungsdauer === 'BEFRISTET' || (d.beschaeftigungsdauer !== 'UNBEFRISTET' && tm.befristet) ? 1 : 0,
      tz: /BEIDES|TEILZEIT/.test(d.teilzeitVollzeit || '') || tm.teilzeit ? 1 : 0,
      az: bv.wochenarbeitszeit ? +bv.wochenarbeitszeit : null,
      k: lst.reduce((s, k) => s | (LBIT[k] || 0), 0),
      fr: tage(frist, veroeff),
      v: veroeff ? iso(veroeff) : null,
      s: frist ? iso(frist) : null,
      w: tm.woerter,
      g: tm.ansprechpartner ? 1 : 0,
      u: `https://interamt.de/koop/app/stelle?id=${x.stellenangebotId}`,
    });
  }
  return aus;
}

// ── karriere.nrw ─────────────────────────────────────────────────────────────
async function karriereNrw() {
  const liste = (await json('https://api.karriere.nrw/v1.0/search/?jobtype=joboffer'))?.items || [];
  if (!liste.length) { console.log('karriere.nrw: keine Daten'); return []; }
  const kandidaten = liste.filter((x) => istKommunal(x.authority || x.contracting_authority || '')
    && !AUSSCHLUSS.test(x.title || '') && (!datum(x.deadline) || datum(x.deadline) >= HEUTE));
  console.log(`karriere.nrw: ${liste.length} Stellen, davon ${kandidaten.length} kommunal und aktiv`);
  const offen = kandidaten.filter((x) => !existsSync(join(CACHE, `kn_${x.uuid}.json`)));
  await parallel(LIMIT ? offen.slice(0, LIMIT) : offen, 6, async (x) => {
    const d = await json(`https://api.karriere.nrw/v1.0/combined-jobs/${x.uuid}/`);
    if (d?.uuid) writeFileSync(join(CACHE, `kn_${x.uuid}.json`), JSON.stringify(d));
  });
  const aus = [];
  for (const x of kandidaten) {
    const p = join(CACHE, `kn_${x.uuid}.json`);
    if (!existsSync(p)) continue;
    const d = JSON.parse(readFileSync(p, 'utf8'));
    const text = htmlZuText((d.stellenbeschreibung || '') + ' ' + (d.ergaenzende_inhalte || ''));
    const tm = textMerkmale(text);
    const titel = (d.titel_der_stelle || x.title || '').replace(/\s+/g, ' ').trim();
    const ent = (d.besoldung_entgelt || []).map((e) => niveau(e)).filter((e) => e != null).sort((a, b) => a - b);
    const plz = ((d.address_display || '').match(/\b(\d{5})\b/) || [])[1] || '';
    const lst = leistungen(text);
    const frist = datum(d.bewerbungsfrist || x.deadline), veroeff = datum(d.erscheinungsdatum || x.published);
    aus.push({
      id: `kn${x.uuid}`, t: titel.slice(0, 140), o: (d.behoerde || x.authority || '').trim(), ort: d.ort || x.location || '',
      p: plz, l: land(plz) || 'NW', la: d.lat ? +(+d.lat).toFixed(3) : null, lo: d.lon ? +(+d.lon).toFixed(3) : null,
      f: funktionsfeld(titel), L: istLeitung(titel) ? 1 : 0,
      n: ent.length ? ent[0] : niveau(text), nm: ent.length > 1 && ent[ent.length - 1] !== ent[0] ? ent[ent.length - 1] : null,
      h: lst.includes('homeoffice') ? 1 : 0,
      b: /befristet/i.test(d.befristung_display || '') && !/unbefristet/i.test(d.befristung_display || '') ? 1 : 0,
      tz: /teilzeit/i.test((d.arbeitszeit_display || []).join(' ')) || tm.teilzeit ? 1 : 0, az: null,
      k: lst.reduce((s, k) => s | (LBIT[k] || 0), 0),
      fr: tage(frist, veroeff), v: veroeff ? iso(veroeff) : null, s: frist ? iso(frist) : null,
      w: tm.woerter, g: (d.ansprechpartner || []).length || tm.ansprechpartner ? 1 : 0,
      u: `https://www.karriere.nrw/stellenausschreibung/${x.uuid}`,
    });
  }
  console.log(`karriere.nrw: ${aus.length} kommunale Stellen ausgewertet`);
  return aus;
}

// ── Verlauf: Wiederausschreibungen erkennen ──────────────────────────────────
const norm = (s) => s.toLowerCase().replace(/\(.*?\)|m\/w\/d|w\/m\/d|d\/m\/w|\*in|:in|innen\b/g, '').replace(/[^a-zäöüß]+/g, ' ').trim();
function verlauf(stellen) {
  const v = existsSync(VERLAUF) ? JSON.parse(readFileSync(VERLAUF, 'utf8')) : {};
  const heute = iso(HEUTE);
  const nachSchluessel = {};
  for (const [id, e] of Object.entries(v)) (nachSchluessel[e.key] ||= []).push([id, e]);
  let wa = 0;
  for (const s of stellen) {
    const key = norm(s.o) + '|' + norm(s.t);
    if (!v[s.id]) {
      const frueher = (nachSchluessel[key] || []).filter(([id, e]) => id !== s.id && e.zuletzt < heute && tage(HEUTE, datum(e.zuletzt)) <= 365);
      v[s.id] = { key, erst: heute, zuletzt: heute, wa: frueher.length };
    } else v[s.id].zuletzt = heute;
    if (v[s.id].wa) { s.wa = v[s.id].wa; wa++; }
  }
  writeFileSync(VERLAUF, JSON.stringify(v));
  return wa;
}

// ── Lauf ─────────────────────────────────────────────────────────────────────
const t0 = Date.now();
const alle = [...await interamt(), ...await karriereNrw()];
// Dubletten über Quellen hinweg (gleiche Behörde + gleicher Titel)
const gesehen = new Set();
const stellen = alle.filter((s) => { const k = norm(s.o) + '|' + norm(s.t); if (gesehen.has(k)) return false; gesehen.add(k); return true; })
  .sort((a, b) => a.id.localeCompare(b.id));
const wa = verlauf(stellen);

const kopf = {
  stand: new Date().toISOString(),
  anzahl: stellen.length,
  quellen: { interamt: stellen.filter((s) => s.id.startsWith('ia')).length, karriereNrw: stellen.filter((s) => s.id.startsWith('kn')).length },
  wiederausschreibungen: wa,
  leistungen: LEISTUNGEN.map(([k, n]) => [k, n]),
};
// eine Stelle je Zeile → kleine Git-Diffs beim täglichen Commit
const zeilen = stellen.map((s) => '  ' + JSON.stringify(s));
writeFileSync(ZIEL, `{"kopf":${JSON.stringify(kopf)},\n"stellen":[\n${zeilen.join(',\n')}\n]}\n`);
console.log(`\n${stellen.length} kommunale Stellen → ${ZIEL} (${(Date.now() - t0) / 1000 | 0} s, ${wa} Wiederausschreibungen)`);
