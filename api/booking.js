import { Resend } from 'resend';
import { randomBytes } from 'node:crypto';
import { createInvoice } from './rechnung.js';

function makeSlug(title, org) {
  const clean = s => s
    .toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${clean(title)}-${clean(org)}-${new Date().getFullYear()}`;
}

function buildMarkdown(d) {
  const slug = makeSlug(d.stellentitel || 'stelle', d.behoerde || 'kommune');
  const tags = (d.schlagwoerter || '').split(',').map(t => t.trim()).filter(Boolean).map(t => `"${t}"`).join(', ');
  return { slug, content: `---
title: "${d.stellentitel}"
organisation: "${d.behoerde}"
orgtyp: "${d.orgtyp || 'Kommune'}"
ort: "${d.ort}"
bundesland: "${d.bundesland}"
entgelt: "${d.entgelt || ''}"
beschaeftigung: "${d.beschaeftigung || 'Vollzeit'}"
befristung: "${d.befristung || 'Unbefristet'}"
startdatum: "${d.startdatum || 'zum nächstmöglichen Zeitpunkt'}"
bewerbungsschluss: "${d.bewerbungsschluss}"
bewerbungslink: "${d.bewerbungslink || ''}"
schlagwoerter: [${tags || '"Kommunalverwaltung", "TVöD"'}]
paket: "KommunalFlat"
aktiv: true
datum: "${new Date().toISOString().split('T')[0]}"
featured: false
---

${d.kurzbeschreibung || ''}

## Ihre Aufgaben

${(d.aufgaben || '').split('\n').filter(Boolean).map(l => `- ${l.replace(/^[-•]\s*/,'')}`).join('\n')}

## Ihr Profil

${(d.anforderungen || '').split('\n').filter(Boolean).map(l => `- ${l.replace(/^[-•]\s*/,'')}`).join('\n')}

${d.wirbieten ? `## Wir bieten\n\n${d.wirbieten.split('\n').filter(Boolean).map(l => `- ${l.replace(/^[-•]\s*/,'')}`).join('\n')}` : ''}

*Eingereicht von: ${d.kontaktname} · ${d.kontaktemail}${d.kontakttel ? ' · ' + d.kontakttel : ''}*
` };
}

async function createGitHubFile(slug, content) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'HAKO-TEAM';
  const repo  = process.env.GITHUB_REPO  || 'der-kaemmerer';
  const path  = `src/content/jobs/${slug}.md`;
  const encoded = Buffer.from(content, 'utf8').toString('base64');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const existing = await fetch(url, { headers });
  const sha = existing.ok ? (await existing.json()).sha : undefined;
  const res = await fetch(url, {
    method: 'PUT', headers,
    body: JSON.stringify({ message: `KommunalFlat: ${slug} (sofort freigeschaltet)`, content: encoded, branch: 'main', ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(`GitHub: ${e.message}`); }
}

// ── Personal-Cockpit-Zugang: wird mit der Buchung sofort angelegt ──────────
// Eintrag in src/data/personal-cockpit/zugaenge.json (gleiche Behörde → bestehender Token).
async function cockpitZugang(d) {
  const owner = process.env.GITHUB_OWNER || 'HAKO-TEAM';
  const repo  = process.env.GITHUB_REPO  || 'der-kaemmerer';
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/src/data/personal-cockpit/zugaenge.json`;
  const headers = { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' };
  for (let versuch = 0; versuch < 3; versuch++) {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error('zugaenge.json nicht lesbar');
    const datei = await r.json();
    const liste = JSON.parse(Buffer.from(datei.content, 'base64').toString('utf8'));
    const vorhanden = liste.find(z => normOrg(z.org) === normOrg(d.behoerde));
    if (vorhanden) return vorhanden.token;
    const token = randomBytes(8).toString('hex');
    liste.push({ token, org: d.behoerde.trim(), kommunalflat: true, seit: new Date().toISOString().slice(0, 10),
      email: (d.rechnungsemail || d.kontaktemail || '').trim(), ort: d.ort || '', bundesland: d.bundesland || '' });
    const put = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({
      message: `Personal-Cockpit: Zugang für ${d.behoerde}`, branch: 'main', sha: datei.sha,
      content: Buffer.from(JSON.stringify(liste, null, 2) + '\n', 'utf8').toString('base64') }) });
    if (put.ok) return token;
    if (put.status !== 409) throw new Error(`GitHub ${put.status}`);
  }
  throw new Error('zugaenge.json: Konflikt');
}

// ── Bestehende KommunalFlat erkennen ────────────────────
// Die Flat enthält beliebig viele Anzeigen. Hat dieselbe Behörde in den letzten
// 12 Monaten bereits eine Flat-Rechnung erhalten, wird keine weitere erstellt.
const FREEMAIL = ['gmail.com', 'googlemail.com', 'web.de', 'gmx.de', 'gmx.net', 't-online.de', 'outlook.com', 'hotmail.com', 'yahoo.de', 'icloud.com'];

const normOrg = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const domainOf = e => ((e || '').toLowerCase().trim().split('@')[1] || '');

export function passtZuFlat(records, d, heute = new Date()) {
  const grenze = new Date(heute); grenze.setFullYear(grenze.getFullYear() - 1);
  const org = normOrg(d.behoerde);
  const mails = [d.rechnungsemail, d.kontaktemail].filter(Boolean).map(e => e.toLowerCase().trim());
  const domains = mails.map(domainOf).filter(x => x && !FREEMAIL.includes(x));
  return records.find(r => {
    if (!r.date || new Date(r.date) < grenze) return false;
    const rMail = (r.email || '').toLowerCase().trim();
    return (org && normOrg(r.organisation) === org)
        || mails.includes(rMail)
        || domains.includes(domainOf(rMail));
  }) || null;
}

async function findeBestehendeFlat(d) {
  const owner = process.env.GITHUB_OWNER || 'HAKO-TEAM';
  const repo  = process.env.GITHUB_REPO  || 'der-kaemmerer';
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/rechnungen.json`, {
    headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) return null;
  const records = JSON.parse(Buffer.from((await res.json()).content, 'base64').toString('utf8'));
  return passtZuFlat(records, d);
}

async function sendEmail(d, slug, flat = null, token = null) {
  const anzeigeUrl = `https://derkaemmerer.de/stellen/${slug}/`;
  const cockpitUrl = token ? `https://personal.derkaemmerer.de/${token}/` : null;
  const resend = new Resend(process.env.RESEND_API_KEY);

  // 1. Interne Benachrichtigung an DerKämmerer
  await resend.emails.send({
    from: 'Der Kämmerer <anzeigen@derkaemmerer.de>',
    to: 'anzeigen@derkaemmerer.de',
    subject: flat
      ? `Weitere Anzeige (bestehende KommunalFlat, keine Rechnung): ${d.stellentitel} – ${d.behoerde}`
      : `Neue Anzeigenbuchung: ${d.stellentitel} – ${d.behoerde}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1a2744;padding:24px;color:#fff"><h1 style="margin:0;font-size:20px">Neue Stellenanzeigen-Buchung</h1></div>
  <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#6b7280;width:140px">Paket</td><td style="padding:8px 0;font-weight:bold;color:#1a2744">${d.paket}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Stellentitel</td><td style="padding:8px 0;color:#1a2744">${d.stellentitel}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Behörde</td><td style="padding:8px 0;color:#1a2744">${d.behoerde} (${d.orgtyp || 'Kommune'})</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Ort</td><td style="padding:8px 0;color:#1a2744">${d.ort}, ${d.bundesland}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Bewerbungsschluss</td><td style="padding:8px 0;color:#1a2744">${d.bewerbungsschluss}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Kontakt</td><td style="padding:8px 0;color:#1a2744">${d.kontaktname} · ${d.kontaktemail}</td></tr>
    </table>
  </div>
  <div style="padding:24px">
    <a href="https://github.com/HAKO-TEAM/der-kaemmerer/blob/main/src/content/jobs/${slug}.md"
       style="display:inline-block;background:#1a2744;color:#fff;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:4px;margin-right:12px">
      Anzeige auf GitHub ansehen
    </a>
    <p style="margin-top:16px;font-size:12px;color:#6b7280">Bereits freigeschaltet und in wenigen Minuten live: <a href="${anzeigeUrl}">${anzeigeUrl}</a>${cockpitUrl ? `<br>Personal-Cockpit: <a href="${cockpitUrl}">${cockpitUrl}</a>` : ''}<br>Arbeitgeberprofil und Übernahme weiterer Stellen erledigt die Routine am nächsten Morgen.</p>
  </div>
</div>`,
  });

  // 2. Buchungsbestätigung an den Kunden
  const kundeEmail = d.rechnungsemail || d.kontaktemail;
  await resend.emails.send({
    from: 'Der Kämmerer <anzeigen@derkaemmerer.de>',
    to: [kundeEmail],
    subject: flat
      ? `Ihre weitere Stellenanzeige ist eingegangen – ${d.behoerde}`
      : `Buchungsbestätigung KommunalFlat – ${d.behoerde}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#172840;padding:24px;color:#fff">
    <h1 style="margin:0;font-size:20px">Ihre Buchung ist eingegangen</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px">KommunalFlat – Stellenbörse derkaemmerer.de</p>
  </div>
  <div style="padding:24px">
    <p style="color:#374151">Sehr geehrte Damen und Herren,</p>
    <p style="color:#374151">${flat ? 'vielen Dank für Ihre weitere Ausschreibung.' : 'vielen Dank für Ihre Buchung der <strong>KommunalFlat</strong> auf derkaemmerer.de – herzlich willkommen als Partner.'} Ihre Anzeige ist ab sofort freigeschaltet und in wenigen Minuten online:<br><a href="${anzeigeUrl}" style="color:#2563eb">${anzeigeUrl}</a></p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:24px 0;background:#f8fafc;border:1px solid #e2e8f0">
      <tr><td style="padding:10px 12px;color:#6b7280;width:160px">Paket</td><td style="padding:10px 12px;font-weight:bold;color:#172840">${d.paket || 'KommunalFlat – 249 €/Monat'}</td></tr>
      <tr style="background:#fff"><td style="padding:10px 12px;color:#6b7280">Organisation</td><td style="padding:10px 12px;color:#172840">${d.behoerde}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b7280">Erster Stellentitel</td><td style="padding:10px 12px;color:#172840">${d.stellentitel}</td></tr>
      <tr style="background:#fff"><td style="padding:10px 12px;color:#6b7280">Ansprechpartner</td><td style="padding:10px 12px;color:#172840">${d.kontaktname}</td></tr>
    </table>
    ${cockpitUrl ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;padding:16px 18px;margin:0 0 18px">
      <p style="margin:0 0 6px;color:#172840;font-weight:bold">Ihr Personal-Cockpit</p>
      <p style="margin:0 0 10px;color:#374151;font-size:14px">Ihre Stellen im Vergleich mit dem kommunalen Stellenmarkt – Entgelt, Arbeitgeberleistungen, Wettbewerb im Umkreis. Neue Ausschreibungen prüfen Sie dort vor der Veröffentlichung und erhalten einen überarbeiteten Ausschreibungstext.</p>
      <a href="${cockpitUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;text-decoration:none;font-weight:bold;border-radius:4px">Personal-Cockpit öffnen</a>
      <p style="margin:10px 0 0;color:#6b7280;font-size:12px">Persönlicher Zugang – bitte nur innerhalb Ihrer Verwaltung weitergeben.</p></div>` : ''}
    ${flat
      ? `<p style="color:#374151">Diese Anzeige ist in Ihrer bestehenden <strong>KommunalFlat</strong> enthalten – es entstehen keine weiteren Kosten.</p>`
      : `<p style="color:#374151"><strong>So geht es weiter:</strong></p>
    <ul style="color:#374151;padding-left:20px;line-height:1.6">
      <li>Die <strong>Rechnung</strong> erhalten Sie in einer separaten E-Mail.</li>
      <li>Ihr <strong>Arbeitgeberprofil</strong> auf derkaemmerer.de legen wir in den nächsten 24 Stunden an.</li>
      <li>Ihre <strong>weiteren Ausschreibungen</strong>, die Sie auf interamt.de veröffentlichen, übernehmen wir automatisch als KommunalFlat-Anzeigen. Alle anderen senden Sie uns einfach über <a href="https://derkaemmerer.de/anzeige-aufgeben" style="color:#2563eb">derkaemmerer.de/anzeige-aufgeben</a> – sie sind sofort online.</li>
    </ul>`}
    <p style="color:#374151">Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    <p style="color:#374151">Mit freundlichen Grüßen<br><strong>Das Team von Der Kämmerer</strong><br>
    <a href="mailto:anzeigen@derkaemmerer.de" style="color:#2563eb">anzeigen@derkaemmerer.de</a></p>
  </div>
  <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e2e8f0">
    HAKO Beteiligungsgesellschaft mbH · derkaemmerer.de
  </div>
</div>`,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const d = req.body;
    if (!d.stellentitel || !d.behoerde || !d.kontaktemail) {
      return res.status(400).json({ error: 'Pflichtfelder fehlen' });
    }
    const { slug, content } = buildMarkdown(d);
    await createGitHubFile(slug, content);

    // Bestehende KommunalFlat? Dann keine weitere Rechnung.
    let flat = null;
    try { flat = await findeBestehendeFlat(d); }
    catch (e) { console.error('Flat-Prüfung fehlgeschlagen:', e.message); }

    let token = null;
    try { token = await cockpitZugang(d); }
    catch (e) { console.error('Cockpit-Zugang fehlgeschlagen:', e.message); }

    if (process.env.RESEND_API_KEY) await sendEmail(d, slug, flat, token);
    if (flat) {
      console.log(`Bestehende KommunalFlat (${flat.id}) – keine neue Rechnung für ${d.behoerde}`);
      return res.status(200).json({ ok: true, slug, flat: flat.id });
    }

    // Rechnung direkt erstellen und an Kunden senden
    try {
      await createInvoice({
        organisation:    d.behoerde,
        abteilung:       d.abteilung || '',
        ansprechpartner: d.kontaktname,
        strasse:         d.rechnungsadresse || '',
        plz:             d.rechnungsplz || '',
        ort:             d.rechnungsort || d.ort || '',
        email:           d.rechnungsemail || d.kontaktemail,
        telefon:         d.kontakttel || '',
        leitwegId:       d.leitwegid || '',
        stellentitel:    d.stellentitel,
      });
    } catch (e) {
      console.error('Rechnung-Fehler:', e.message);
    }

    return res.status(200).json({ ok: true, slug });
  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: err.message || 'Unbekannter Fehler' });
  }
}
