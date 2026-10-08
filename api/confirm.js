import { signatur } from './subscribe.js';

// Bestätigung des Double-Opt-in: nur mit gültiger Prüfsumme aus der Bestätigungsmail.
// Danach geht eine Benachrichtigung an chefredaktion@ – die tägliche Lagebericht-Routine wertet sie aus.
const MELDUNG_AN = 'chefredaktion@derkaemmerer.de';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function melden(KEY, email) {
  const h = { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' };
  const k = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, { headers: h }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const a = k.attributes || {};
  const wer = a.KOMMUNE ? `${a.KOMMUNE} (${a.AGS || 'ohne AGS'})` : 'Website';
  const zeilen = [['E-Mail', email], ['Kommune', a.KOMMUNE], ['AGS', a.AGS], ['Lagebericht', a.LAGEBERICHT], ['Quelle', a.QUELLE || 'Website']];
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: h,
    body: JSON.stringify({
      sender: { email: 'redaktion@derkaemmerer.de', name: 'Der Kämmerer – Anmeldungen' },
      to: [{ email: MELDUNG_AN }],
      subject: `Neue Briefing-Anmeldung: ${wer} – ${email}`,
      textContent: zeilen.map(([n, w]) => `${n}: ${w || '–'}`).join('\n'),
      htmlContent: `<p>Neue bestätigte Briefing-Anmeldung:</p><table>${zeilen.map(([n, w]) => `<tr><td><b>${n}</b></td><td>${esc(w || '–')}</td></tr>`).join('')}</table>`,
    }),
  });
  if (!r.ok) console.error('Brevo Meldung:', r.status, await r.text());
}

export default async function handler(req, res) {
  const { email, list, sig } = req.query;
  const KEY = process.env.BREVO_API_KEY;
  const LIST_ID = parseInt(process.env.BREVO_LIST_ID || '2');

  if (!email || !KEY) return res.redirect(302, '/danke');
  if (String(list || LIST_ID) !== String(LIST_ID) || sig !== signatur(email, LIST_ID, KEY)) {
    return res.redirect(302, '/newsletter/?bestaetigung=ungueltig#anmelden');
  }
  try {
    const h = { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' };
    // schon in der Liste? Dann keine zweite Meldung (Bestätigungslink mehrfach geklickt)
    const vorher = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, { headers: h }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST', headers: h,
      body: JSON.stringify({ email, listIds: [LIST_ID], updateEnabled: true }),
    });
    if (!(vorher.listIds || []).includes(LIST_ID)) await melden(KEY, email);
  } catch (e) { console.error(e); }
  return res.redirect(302, '/danke');
}
