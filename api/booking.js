import { Resend } from 'resend';
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
paket: "${d.paket?.split(' – ')[0] || 'Basis'}"
aktiv: false
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
    body: JSON.stringify({ message: `Draft job: ${slug}`, content: encoded, branch: 'main', ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(`GitHub: ${e.message}`); }
}

async function sendEmail(d, slug) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  // 1. Interne Benachrichtigung an DerKämmerer
  await resend.emails.send({
    from: 'Buchungssystem <noreply@derkaemmerer.de>',
    to: 'anzeigen@derkaemmerer.de',
    subject: `Neue Anzeigenbuchung: ${d.stellentitel} – ${d.behoerde}`,
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
      Entwurf auf GitHub prüfen
    </a>
    <p style="margin-top:16px;font-size:12px;color:#9ca3af">Zum Freigeben: aktiv: false → aktiv: true ändern und committen.</p>
  </div>
</div>`,
  });

  // 2. Buchungsbestätigung an den Kunden
  const kundeEmail = d.rechnungsemail || d.kontaktemail;
  await resend.emails.send({
    from: 'Der Kämmerer <anzeigen@derkaemmerer.de>',
    to: [kundeEmail],
    subject: `Buchungsbestätigung KommunalFlat – ${d.behoerde}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#172840;padding:24px;color:#fff">
    <h1 style="margin:0;font-size:20px">Ihre Buchung ist eingegangen</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px">KommunalFlat – Stellenbörse derkaemmerer.de</p>
  </div>
  <div style="padding:24px">
    <p style="color:#374151">Sehr geehrte Damen und Herren,</p>
    <p style="color:#374151">vielen Dank für Ihre Buchung der <strong>KommunalFlat</strong> auf derkaemmerer.de. Wir haben Ihre Anfrage erhalten und bearbeiten diese schnellstmöglich.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:24px 0;background:#f8fafc;border:1px solid #e2e8f0">
      <tr><td style="padding:10px 12px;color:#6b7280;width:160px">Paket</td><td style="padding:10px 12px;font-weight:bold;color:#172840">${d.paket || 'KommunalFlat – 249 €/Monat'}</td></tr>
      <tr style="background:#fff"><td style="padding:10px 12px;color:#6b7280">Organisation</td><td style="padding:10px 12px;color:#172840">${d.behoerde}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b7280">Erster Stellentitel</td><td style="padding:10px 12px;color:#172840">${d.stellentitel}</td></tr>
      <tr style="background:#fff"><td style="padding:10px 12px;color:#6b7280">Ansprechpartner</td><td style="padding:10px 12px;color:#172840">${d.kontaktname}</td></tr>
    </table>
    <p style="color:#374151">Die <strong>Rechnung</strong> erhalten Sie in einer separaten E-Mail. Ihr Zugang zur Stellenbörse wird nach Zahlungseingang freigeschaltet.</p>
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
    if (process.env.RESEND_API_KEY) await sendEmail(d, slug);

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
