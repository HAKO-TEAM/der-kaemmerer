import { LAENDER, FELDER, abmeldeSig, wunsch, treffer } from './_jobalert.js';

// Wöchentlicher Job-Alert (Montag früh, Vercel-Cron): jeder bestätigte Abonnent (Brevo-Kontakt mit Merkmal JOBALERT=ja, ohne Liste)
// bekommt die neuen Stellen der letzten 7 Tage, die zu seinem Wunsch passen (Bundesland, PLZ-Region, Berufsfelder).
// Ohne neue Treffer geht keine Mail raus.
//
// Schutz: Versand an Abonnenten NUR, wenn die Umgebungsvariable JOBALERT_VERSAND=an gesetzt ist; sonst nur eine Vorschau
// an die Chefredaktion. Jeder Abonnent bekommt höchstens EINE Mail je Kalenderwoche (Merkmal JA_WOCHE) – ein mehrfacher
// Aufruf des Endpunkts erzeugt also keine zusätzlichen Mails.
// Manuell (nur mit CRON_SECRET): /api/jobalert-versand?key=<CRON_SECRET>&test=<adresse> – schickt die Beispielmail an diese Adresse.
const SITE = 'https://derkaemmerer.de';
const VORSCHAU_AN = 'chefredaktion@derkaemmerer.de';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const datum = (d) => (d ? d.split('-').reverse().join('.') : '');

async function abonnenten(KEY) {
  const h = { 'accept': 'application/json', 'api-key': KEY };
  const alle = [];
  for (let offset = 0; offset < 50000; offset += 1000) {
    const r = await fetch(`https://api.brevo.com/v3/contacts?limit=1000&offset=${offset}`, { headers: h });
    if (!r.ok) throw new Error('Brevo Kontakte: ' + r.status + ' ' + (await r.text()));
    const j = await r.json();
    alle.push(...(j.contacts || []));
    if (!j.contacts || j.contacts.length < 1000) break;
  }
  return alle.filter((c) => (c.attributes || {}).JOBALERT === 'ja' && !c.emailBlacklisted);
}

function mail(email, w, liste, KEY) {
  const wo = [w.land || 'bundesweit', w.plz ? `PLZ ${w.plz}…` : ''].filter(Boolean).join(', ');
  const was = w.felder.length ? w.felder.map((f) => FELDER[f]).join(', ') : 'alle Berufsfelder';
  const abmelden = `${SITE}/api/jobalert-abmelden?email=${encodeURIComponent(email)}&sig=${abmeldeSig(email, KEY)}`;
  const utm = 'utm_source=jobalert&utm_medium=email';
  const zeilen = liste.slice(0, 25).map((s) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb">
    <a href="${SITE}/stellen/${s.id}/?${utm}" style="color:#1a2744;font-weight:bold;text-decoration:none;font-size:15px">${esc(s.t)}</a><br>
    <span style="color:#475569;font-size:13px">${esc(s.o)} · ${esc(s.ort)}${s.entgelt ? ' · ' + esc(s.entgelt) : ''} · Bewerbung bis ${datum(s.frist)}</span></td></tr>`).join('');
  const mehr = liste.length > 25 ? `<p style="font-size:14px">… und ${liste.length - 25} weitere: <a href="${SITE}/stellen/?${utm}">alle Stellen</a></p>` : '';
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;color:#1a1a1a">
  <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#2563eb;margin:0">Der Kämmerer · Job-Alert</p>
  <h1 style="font-family:Georgia,serif;font-size:22px;margin:6px 0 4px">${liste.length} neue ${liste.length === 1 ? 'Stelle' : 'Stellen'} für Sie</h1>
  <p style="color:#475569;font-size:14px;margin:0 0 12px">Ihr Wunsch: ${esc(wo)} · ${esc(was)} · neu in den letzten 7 Tagen</p>
  <table style="width:100%;border-collapse:collapse">${zeilen}</table>${mehr}
  <p style="font-size:14px;margin-top:18px">Was bleibt netto? <a href="${SITE}/dienst-karriere/rechner/tvoed-netto/?${utm}">TVöD-Nettorechner</a> · <a href="${SITE}/gehalt/?${utm}">TVöD-Tabelle 2026</a></p>
  <p style="font-size:12px;color:#64748b;margin-top:24px">Sie erhalten diese Mail, weil Sie den Job-Alert auf derkaemmerer.de bestätigt haben.
  <a href="${abmelden}" style="color:#64748b">Job-Alert abbestellen</a> · <a href="${SITE}/stellen/job-alert/?${utm}" style="color:#64748b">Wunsch ändern</a> · <a href="${SITE}/datenschutz/" style="color:#64748b">Datenschutz</a></p></div>`;
  const text = `${liste.length} neue Stellen für Sie (${wo} · ${was})\n\n` + liste.slice(0, 25).map((s) => `${s.t}\n${s.o} · ${s.ort} · bis ${datum(s.frist)}\n${SITE}/stellen/${s.id}/`).join('\n\n')
    + `\n\nJob-Alert abbestellen: ${abmelden}`;
  return { subject: `${liste.length} neue ${liste.length === 1 ? 'Stelle' : 'Stellen'} im öffentlichen Dienst – ${wo}`, html, text, abmelden };
}

/** ISO-Kalenderwoche, z. B. 2026-W42 */
function kalenderwoche(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - tag);
  const j = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - j) / 864e5 + 1) / 7)).padStart(2, '0')}`;
}

let wocheAngelegt = false;
async function gemerkt(KEY, email, woche) {
  const h = { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' };
  if (!wocheAngelegt) {   // Merkmal einmalig anlegen (400 = existiert bereits); frisch angelegte Merkmale kennt Brevo erst nach kurzer Zeit
    const r = await fetch('https://api.brevo.com/v3/contacts/attributes/normal/JA_WOCHE', { method: 'POST', headers: h, body: JSON.stringify({ type: 'text' }) }).catch(() => null);
    if (r && r.ok) await new Promise((ok) => setTimeout(ok, 3000));
    wocheAngelegt = true;
  }
  const r = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, { method: 'PUT', headers: h, body: JSON.stringify({ attributes: { JA_WOCHE: woche } }) });
  if (!r.ok) throw new Error('Woche nicht gemerkt ' + r.status);
}

async function senden(KEY, an, m) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ sender: { email: 'redaktion@derkaemmerer.de', name: 'Der Kämmerer – Job-Alert' }, to: [{ email: an }],
      subject: m.subject, htmlContent: m.html, textContent: m.text,
      headers: { 'List-Unsubscribe': `<${m.abmelden}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }, tags: ['jobalert'] }),
  });
  if (!r.ok) throw new Error('Brevo Versand ' + r.status + ' ' + (await r.text()));
}

export default async function handler(req, res) {
  const KEY = process.env.BREVO_API_KEY, LIST = process.env.BREVO_LIST_ID_DK, SECRET = process.env.CRON_SECRET;
  const auth = Boolean(SECRET) && (req.headers.authorization === `Bearer ${SECRET}` || req.query.key === SECRET);
  const cron = /vercel-cron/.test(req.headers['user-agent'] || '');
  // Ohne gültiges Geheimnis höchstens die Vorschau an die Chefredaktion (Vercel-Cron vor der Freischaltung)
  if (!auth && !cron) return res.status(401).json({ error: 'nicht berechtigt' });
  if (!KEY || !LIST) return res.status(503).json({ error: 'nicht konfiguriert' });

  const scharf = process.env.JOBALERT_VERSAND === 'an' && !req.query.test;
  const woche = kalenderwoche(new Date());
  const seit = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  try {
    const feed = await fetch(`${SITE}/stellen-feed.json`).then((r) => r.json());
    const abos = await abonnenten(KEY);
    let gesendet = 0, ohne = 0, fehler = 0, beispiel = null;
    for (const c of abos) {
      const w = wunsch(c.attributes);
      const liste = treffer(feed.stellen, w, seit);
      if (!liste.length) { ohne++; continue; }
      const m = mail(c.email, w, liste, KEY);
      beispiel ||= { an: c.email, m };
      if (!scharf || (c.attributes || {}).JA_WOCHE === woche) continue;   // diese Woche schon versorgt
      try { await senden(KEY, c.email, m); await gemerkt(KEY, c.email, woche); gesendet++; } catch (e) { fehler++; console.error(e.message); }
    }
    const bericht = `Job-Alert ${new Date().toISOString().slice(0, 10)}: ${abos.length} Abonnenten · ${scharf ? gesendet + ' gesendet' : 'VORSCHAU (JOBALERT_VERSAND ist nicht „an“)'} · ${ohne} ohne neue Treffer · ${fehler} Fehler · ${feed.stellen.filter((s) => s.datum >= seit).length} neue Stellen seit ${datum(seit)}`;
    // Bericht bzw. Vorschau an die Chefredaktion (mit Beispielmail)
    const an = (auth && req.query.test && /^[^\s@]+@[^\s@]+$/.test(req.query.test)) ? req.query.test : VORSCHAU_AN;
    if ((beispiel || !scharf) && (gesendet > 0 || !scharf || req.query.test)) {   // Bericht nur bei echtem Versand oder Vorschau
      const m = beispiel ? beispiel.m : { subject: 'kein Treffer', html: '<p>Kein Abonnent mit neuen Treffern.</p>', text: 'Kein Abonnent mit neuen Treffern.', abmelden: SITE };
      await senden(KEY, an, { ...m, subject: `[${scharf ? 'Bericht' : 'Vorschau'}] ${m.subject}`,
        html: `<p style="font-family:Arial;font-size:13px;background:#fef3c7;padding:8px">${esc(bericht)}${beispiel ? ' · Beispiel für ' + esc(beispiel.an.replace(/^(.).*@/, '$1…@')) : ''}</p>` + m.html });
    }
    console.log(bericht);
    return res.status(200).json({ ok: true, bericht });
  } catch (e) {
    console.error('Job-Alert:', e.message || e);
    return res.status(500).json({ error: 'Versand fehlgeschlagen' });
  }
}
