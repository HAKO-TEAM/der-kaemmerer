import { abmeldeSig } from './_jobalert.js';

// Abmeldung vom Job-Alert über den Link in jeder Mail (auch „One-Click“ per POST aus dem Mailprogramm).
// Setzt JOBALERT=nein; der Kontakt bleibt in der Liste Dienst & Karriere, falls er den Ressort-Newsletter weiter erhält.
export default async function handler(req, res) {
  const email = String(req.query.email || '');
  const KEY = process.env.BREVO_API_KEY;
  if (!email || !KEY || req.query.sig !== abmeldeSig(email, KEY)) return res.redirect(302, '/stellen/job-alert/?abmeldung=ungueltig');
  try {
    await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT', headers: { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ attributes: { JOBALERT: 'nein' } }),
    });
  } catch (e) { console.error('Job-Alert Abmeldung:', e.message || e); }
  if (req.method === 'POST') return res.status(200).json({ ok: true });
  return res.redirect(302, '/stellen/job-alert/abgemeldet/');
}
