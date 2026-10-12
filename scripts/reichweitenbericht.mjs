#!/usr/bin/env node
// Reichweitenbericht je Arbeitgeber (Runbook 5.3) – monatlich, nur für die Geschäftsführung.
//
// Quelle: Vercel Web Analytics des Projekts der-kaemmerer, abgefragt über die angemeldete Vercel-CLI (`vercel api`):
//   – Aufrufe der Stellen-Detailseiten /stellen/<id> (Seitenaufrufe, Besucher, Herkunft nach Referrer-Host)
//   – Ereignis „Stelle geöffnet“ (Klick auf eine Stelle, mit Herkunftsseite auf derkaemmerer.de)
//   – Ereignis „Zur Bewerbung“ (Klick auf den Bewerbungslink)
// Zuordnung Stelle → Arbeitgeber über src/content/jobs (Feld organisation) und src/data/markt/markt.json (Feld o).
//
// Ausgabe (außerhalb des Repos): ~/Desktop/Der Kämmerer/Reichweitenberichte/<JJJJ-MM>/
//   arbeitgeber.csv · stellen.csv · herkunft.csv · Reichweitenbericht_<JJJJ-MM>_intern.pdf
//   mit --arbeitgeber "Stadt X" zusätzlich ein Einzelbericht als ENTWURF für diesen Arbeitgeber.
//
// VERSAND: Das Skript verschickt nichts und kennt keinen Versandweg. Die Weitergabe an einen Kunden erfolgt
// in keinem Fall automatisch, sondern nur von Hand nach Prüfung durch die Geschäftsführung (Vorgabe MK).
//
// Aufruf:  node scripts/reichweitenbericht.mjs [--monat 2026-10] [--arbeitgeber "Stadt Bamberg"] [--ohne-pdf]
//          Standard ist der Vormonat. Für den laufenden Monat --monat mit dem aktuellen Monat angeben (Stand: heute).
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEAM = 'team_rqgptMM3oDWRE70aEu1qjBRs';
const PROJEKT = 'der-kaemmerer';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ---------- Argumente ----------
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(`--${name}`);
const vormonat = () => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); };
const monat = arg('monat') || vormonat();
if (!/^\d{4}-\d{2}$/.test(monat)) { console.error('--monat im Format JJJJ-MM'); process.exit(1); }
const nurArbeitgeber = arg('arbeitgeber');
const since = new Date(`${monat}-01T00:00:00.000Z`);
const ende = new Date(since); ende.setUTCMonth(ende.getUTCMonth() + 1);
const until = new Date(Math.min(ende.getTime(), Date.now()));
const OUT = join(homedir(), 'Desktop', 'Der Kämmerer', 'Reichweitenberichte', monat);

// ---------- Vercel-Abfragen ----------
function api(pfad, params) {
  const q = new URLSearchParams({ projectId: PROJEKT, teamId: TEAM, limit: '100' });
  for (const [k, v] of Object.entries(params)) for (const w of [].concat(v)) q.append(k, w);
  const out = execFileSync('npx', ['vercel', 'api', `${pfad}?${q}`, '--method', 'GET'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
  const json = out.slice(out.indexOf('{'));
  return JSON.parse(json).data || [];
}
// Holt eine Aufschlüsselung vollständig: Enthält das Ergebnis die Sammelgruppe „Others“, wird der Zeitraum halbiert.
function vollstaendig(pfad, by, filter, von, bis, tiefe = 0) {
  const zeilen = api(pfad, { by, filter, since: von.toISOString(), until: new Date(bis.getTime() - 1).toISOString() });
  const others = zeilen.some((z) => by.some((b) => z[b] === 'Others'));
  if (!others) return zeilen;
  if (bis - von <= 3600e3 || tiefe > 12) { console.warn(`  Hinweis: Sammelgruppe „Others“ bleibt (${von.toISOString()}), Werte dort unvollständig.`); return zeilen; }
  const halb = (bis - von) / 2;
  const mitte = new Date(von.getTime() + (halb >= 3600e3 ? Math.round(halb / 3600e3) * 3600e3 : halb));
  return [...vollstaendig(pfad, by, filter, von, mitte, tiefe + 1), ...vollstaendig(pfad, by, filter, mitte, bis, tiefe + 1)];
}

console.log(`Reichweitenbericht ${monat} (${since.toISOString().slice(0, 10)} bis ${until.toISOString().slice(0, 10)})`);
console.log('  Seitenaufrufe der Stellen …');
const aufrufe = vollstaendig('/v1/query/web-analytics/visits/aggregate', ['requestPath', 'referrerHostname'],
  "startswith(requestPath,'/stellen/')", since, until);
console.log('  Ereignisse „Stelle geöffnet“ …');
const geoeffnet = vollstaendig('/v1/query/web-analytics/events/aggregate', ['eventData/stelle', 'eventData/herkunft'],
  "eventName eq 'Stelle geöffnet'", since, until);
console.log('  Ereignisse „Zur Bewerbung“ …');
const bewerbung = vollstaendig('/v1/query/web-analytics/events/aggregate', ['eventData/stelle', 'eventData/herkunft'],
  "eventName eq 'Zur Bewerbung'", since, until);

// ---------- Zuordnung Stelle → Arbeitgeber ----------
const stellen = new Map();   // id → { titel, arbeitgeber, ort, quelle }
const jobsDir = join(ROOT, 'src/content/jobs');
for (const f of readdirSync(jobsDir).filter((x) => x.endsWith('.md'))) {
  const kopf = readFileSync(join(jobsDir, f), 'utf8').split('---')[1] || '';
  const feld = (k) => (kopf.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  stellen.set(f.replace(/\.md$/, ''), { titel: feld('title'), arbeitgeber: feld('organisation'), ort: feld('ort'), quelle: 'Anzeige' });
}
const markt = JSON.parse(readFileSync(join(ROOT, 'src/data/markt/markt.json'), 'utf8'));
for (const s of markt.stellen) if (!stellen.has(s.id)) stellen.set(s.id, { titel: s.t, arbeitgeber: s.o, ort: s.ort, quelle: 'Marktbeobachtung' });

const ressort = (h) => (!h ? 'unbekannt' : h.startsWith('/dienst-karriere') ? 'Dienst & Karriere' : h.startsWith('/stellen') ? 'Stellenbörse'
  : h.startsWith('/gemeinden') ? 'Gemeindeseiten' : h.startsWith('/gehalt') ? 'TVöD-Tabelle' : h === '/' ? 'Startseite' : 'übrige Seiten');
const idAusPfad = (p) => (p.match(/^\/stellen\/(?!seite\/|bundesland\/|berufsfeld\/|job-alert\b)([a-z0-9-]+)\/?$/) || [])[1] || null;

const proStelle = new Map();
const stelle = (id) => {
  if (!proStelle.has(id)) {
    const m = stellen.get(id) || { titel: id, arbeitgeber: 'nicht zuordenbar', ort: '', quelle: '' };
    proStelle.set(id, { id, ...m, aufrufe: 0, besucher: 0, geoeffnet: 0, bewerbung: 0, referrer: {}, herkunft: {}, ressorts: {} });
  }
  return proStelle.get(id);
};
for (const z of aufrufe) {
  const id = idAusPfad(z.requestPath || ''); if (!id) continue;
  const s = stelle(id); s.aufrufe += z.pageviews || 0; s.besucher += z.visitors || 0;
  const host = z.referrerHostname && z.referrerHostname !== 'Others' ? z.referrerHostname.replace(/^www\./, '') : '';
  const r = !host ? 'direkt / unbekannt' : /sendibm|brevo|sendinblue/.test(host) ? 'Newsletter (Brevo)' : host === 'derkaemmerer.de' ? 'derkaemmerer.de (intern)' : host;
  s.referrer[r] = (s.referrer[r] || 0) + (z.pageviews || 0);
}
for (const [liste, feld] of [[geoeffnet, 'geoeffnet'], [bewerbung, 'bewerbung']]) for (const z of liste) {
  const id = z['eventData/stelle']; if (!id || id === 'Others') continue;
  const s = stelle(id); s[feld] += z.count || 0;
  const h = z['eventData/herkunft'] || ''; s.herkunft[h] = (s.herkunft[h] || 0) + (z.count || 0);
  const r = ressort(h); s.ressorts[r] = (s.ressorts[r] || 0) + (z.count || 0);
}

// ---------- je Arbeitgeber ----------
const plus = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = (a[k] || 0) + v; return a; };
const proAg = new Map();
for (const s of proStelle.values()) {
  const a = proAg.get(s.arbeitgeber) || { arbeitgeber: s.arbeitgeber, stellen: [], aufrufe: 0, besucher: 0, geoeffnet: 0, bewerbung: 0, referrer: {}, herkunft: {}, ressorts: {} };
  a.stellen.push(s); a.aufrufe += s.aufrufe; a.besucher += s.besucher; a.geoeffnet += s.geoeffnet; a.bewerbung += s.bewerbung;
  plus(a.referrer, s.referrer); plus(a.herkunft, s.herkunft); plus(a.ressorts, s.ressorts);
  proAg.set(s.arbeitgeber, a);
}
const ags = [...proAg.values()].sort((a, b) => b.aufrufe + b.bewerbung * 10 - (a.aufrufe + a.bewerbung * 10));
const top = (o, n = 3) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
const anteil = (o) => { const s = Object.values(o).reduce((x, y) => x + y, 0); return top(o, 6).map(([k, v]) => `${k} ${Math.round((v / s) * 100)} %`).join(', '); };

// ---------- CSV ----------
mkdirSync(OUT, { recursive: true });
const csv = (kopf, zeilen) => '﻿' + [kopf, ...zeilen].map((z) => z.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n') + '\n';
writeFileSync(join(OUT, 'arbeitgeber.csv'), csv(
  ['Arbeitgeber', 'Stellen mit Reichweite', 'Seitenaufrufe', 'Besucher', 'Klicks auf Stelle', 'Klicks „Zur Bewerbung“', 'wichtigste Herkunft (Referrer)', 'Ressort-Anteil der Klicks'],
  ags.map((a) => [a.arbeitgeber, a.stellen.length, a.aufrufe, a.besucher, a.geoeffnet, a.bewerbung, top(a.referrer).map(([k, v]) => `${k} (${v})`).join(', '), anteil(a.ressorts)])));
writeFileSync(join(OUT, 'stellen.csv'), csv(
  ['Arbeitgeber', 'Stelle', 'Kennung', 'Ort', 'Quelle', 'Seitenaufrufe', 'Besucher', 'Klicks auf Stelle', 'Klicks „Zur Bewerbung“', 'Herkunftsseiten (derkaemmerer.de)'],
  ags.flatMap((a) => a.stellen.sort((x, y) => y.aufrufe - x.aufrufe).map((s) => [a.arbeitgeber, s.titel, s.id, s.ort, s.quelle, s.aufrufe, s.besucher, s.geoeffnet, s.bewerbung, top(s.herkunft, 5).map(([k, v]) => `${k} (${v})`).join(', ')]))));
const herkunftGesamt = {}, ressortGesamt = {}, refGesamt = {};
for (const a of ags) { plus(herkunftGesamt, a.herkunft); plus(ressortGesamt, a.ressorts); plus(refGesamt, a.referrer); }
writeFileSync(join(OUT, 'herkunft.csv'), csv(['Art', 'Herkunft', 'Anzahl'], [
  ...top(refGesamt, 50).map(([k, v]) => ['Referrer (Seitenaufrufe)', k, v]),
  ...top(herkunftGesamt, 50).map(([k, v]) => ['Herkunftsseite (Klicks)', k, v]),
  ...top(ressortGesamt, 20).map(([k, v]) => ['Ressort (Klicks)', k, v])]));

// ---------- PDF ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const z = (n) => Number(n || 0).toLocaleString('de-DE');
const monatLang = since.toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const stand = new Date().toLocaleDateString('de-DE');
const summe = (k) => ags.reduce((s, a) => s + a[k], 0);
const css = `* { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
@page { size: A4; margin: 0; }
body { margin: 0; font-family: Arial, sans-serif; color: #1a1a1a; font-size: 10.5pt; }
.page { width: 210mm; min-height: 296.8mm; padding: 18mm 18mm 16mm; page-break-after: always; }
.page:last-child { page-break-after: auto; }
.kopf { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #172840; padding-bottom: 6px; margin-bottom: 14px; }
.kopf b { font-family: Georgia, serif; font-size: 15pt; color: #172840; } .kopf span { font-size: 9pt; color: #444; }
.marke { background: #fef3c7; border: 1px solid #f59e0b; color: #78350f; padding: 6px 10px; font-size: 9pt; margin-bottom: 14px; }
h1 { font-family: Georgia, serif; font-size: 20pt; color: #172840; margin: 0 0 4px; } h2 { font-size: 12pt; color: #172840; margin: 18px 0 6px; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
.kpis div { border: 1px solid #aebecb; padding: 8px 10px; } .kpis b { display: block; font-size: 16pt; color: #172840; } .kpis span { font-size: 8.5pt; color: #444; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; } th { text-align: left; background: #172840; color: #fff; padding: 4px 6px; font-weight: normal; }
td { border-bottom: 1px solid #d6dee6; padding: 4px 6px; vertical-align: top; } td.n { text-align: right; white-space: nowrap; }
.hin { font-size: 8.5pt; color: #444; margin-top: 12px; line-height: 1.45; }`;
const kopf = (titel) => `<div class="kopf"><b>Der Kämmerer</b><span>${esc(titel)} · ${esc(monatLang)} · Stand ${stand}</span></div>`;
const methodik = `<p class="hin">Methodik: Seitenaufrufe und Besucher der Stellen-Detailseiten sowie die Klicks „Stelle geöffnet“ und „Zur Bewerbung“
aus der cookiefreien Reichweitenmessung von derkaemmerer.de (Vercel Web Analytics). Erfasst werden ausschließlich die Kennung der Stelle und die
Herkunftsseite, keine personenbezogenen Daten. Besucher werden je Tag gezählt. Klicks auf Stellen der Marktbeobachtung führen direkt zum Arbeitgeber.</p>`;
const agTabelle = (liste) => `<table><tr><th>Stelle</th><th>Aufrufe</th><th>Besucher</th><th>Klicks</th><th>Bewerbung</th></tr>
${liste.map((s) => `<tr><td>${esc(s.titel)}<br><span style="color:#666;font-size:8pt">${esc(s.ort)} · ${esc(s.quelle)}</span></td><td class="n">${z(s.aufrufe)}</td><td class="n">${z(s.besucher)}</td><td class="n">${z(s.geoeffnet)}</td><td class="n">${z(s.bewerbung)}</td></tr>`).join('')}</table>`;
const agSeite = (a, entwurf) => `<div class="page">${kopf('Reichweitenbericht')}
${entwurf ? '<div class="marke">ENTWURF – Weitergabe an den Arbeitgeber nur von Hand nach Freigabe durch die Geschäftsführung.</div>' : ''}
<h1>${esc(a.arbeitgeber)}</h1><p>Reichweite der Ausschreibungen auf derkaemmerer.de im ${esc(monatLang)}.</p>
<div class="kpis"><div><b>${z(a.aufrufe)}</b><span>Seitenaufrufe</span></div><div><b>${z(a.besucher)}</b><span>Besucher</span></div>
<div><b>${z(a.geoeffnet)}</b><span>Klicks auf die Stellen</span></div><div><b>${z(a.bewerbung)}</b><span>Klicks „Zur Bewerbung“</span></div></div>
<h2>Herkunft der Leserinnen und Leser</h2><p>${top(a.referrer, 6).map(([k, v]) => `${esc(k)}: ${z(v)}`).join(' · ') || '–'}</p>
<h2>Ressort-Anteil der Klicks</h2><p>${esc(anteil(a.ressorts)) || '–'}</p>
<h2>Stellen</h2>${agTabelle(a.stellen.slice().sort((x, y) => y.aufrufe - x.aufrufe))}${methodik}</div>`;

function pdf(html, datei) {
  const h = join(OUT, '.tmp.html'); writeFileSync(h, `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${join(OUT, datei)}`, `file://${h}`], { stdio: 'ignore' });
  unlinkSync(h);
}
if (!flag('ohne-pdf') && existsSync(CHROME)) {
  const uebersicht = `<div class="page">${kopf('Reichweitenbericht – intern')}
<div class="marke">INTERN – nur für die Geschäftsführung. Kein Versand an Kunden ohne Prüfung und Freigabe von Hand.</div>
<h1>Reichweite der Stellen im ${esc(monatLang)}</h1>
<div class="kpis"><div><b>${z(summe('aufrufe'))}</b><span>Seitenaufrufe Stellen</span></div><div><b>${z(ags.length)}</b><span>Arbeitgeber mit Reichweite</span></div>
<div><b>${z(summe('geoeffnet'))}</b><span>Klicks auf Stellen</span></div><div><b>${z(summe('bewerbung'))}</b><span>Klicks „Zur Bewerbung“</span></div></div>
<h2>Ressort-Anteil der Klicks</h2><p>${esc(anteil(ressortGesamt)) || '–'}</p>
<h2>Wichtigste Herkunft (Referrer)</h2><p>${top(refGesamt, 8).map(([k, v]) => `${esc(k)}: ${z(v)}`).join(' · ') || '–'}</p>
<h2>Arbeitgeber</h2><table><tr><th>Arbeitgeber</th><th>Stellen</th><th>Aufrufe</th><th>Klicks</th><th>Bewerbung</th></tr>
${ags.slice(0, 40).map((a) => `<tr><td>${esc(a.arbeitgeber)}</td><td class="n">${a.stellen.length}</td><td class="n">${z(a.aufrufe)}</td><td class="n">${z(a.geoeffnet)}</td><td class="n">${z(a.bewerbung)}</td></tr>`).join('')}</table>
${ags.length > 40 ? `<p class="hin">${ags.length - 40} weitere Arbeitgeber in arbeitgeber.csv.</p>` : ''}${methodik}</div>`;
  pdf(uebersicht + ags.slice(0, 15).map((a) => agSeite(a, false)).join(''), `Reichweitenbericht_${monat}_intern.pdf`);
  if (nurArbeitgeber) {
    // alle Arbeitgeber-Bezeichnungen mit dem Suchbegriff zusammenfassen (z. B. „Stadt Bamberg“ und „Stadt Bamberg – Bamberg Service“)
    const treffer = ags.filter((x) => x.arbeitgeber.toLowerCase().startsWith(nurArbeitgeber.toLowerCase()));
    const a = treffer.length && treffer.reduce((m, x) => ({ ...m, stellen: [...m.stellen, ...x.stellen], aufrufe: m.aufrufe + x.aufrufe, besucher: m.besucher + x.besucher,
      geoeffnet: m.geoeffnet + x.geoeffnet, bewerbung: m.bewerbung + x.bewerbung, referrer: plus({ ...m.referrer }, x.referrer), ressorts: plus({ ...m.ressorts }, x.ressorts) }),
      { arbeitgeber: nurArbeitgeber, stellen: [], aufrufe: 0, besucher: 0, geoeffnet: 0, bewerbung: 0, referrer: {}, ressorts: {} });
    if (treffer.length > 1) console.log(`  Einzelbericht fasst zusammen: ${treffer.map((x) => x.arbeitgeber).join(' | ')}`);
    if (a) pdf(agSeite(a, true), `ENTWURF_Reichweitenbericht_${monat}_${a.arbeitgeber.replace(/[^\p{L}\p{N}]+/gu, '_')}.pdf`);
    else console.warn(`  Arbeitgeber „${nurArbeitgeber}“ ohne Reichweite im ${monatLang}.`);
  }
}
console.log(`Fertig: ${ags.length} Arbeitgeber, ${proStelle.size} Stellen, ${summe('aufrufe')} Seitenaufrufe, ${summe('bewerbung')} Klicks „Zur Bewerbung“.`);
console.log(`Ablage: ${OUT}`);
console.log('Versand: keiner. Weitergabe an Kunden nur von Hand nach Freigabe.');
