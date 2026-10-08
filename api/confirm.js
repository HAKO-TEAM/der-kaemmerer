import { signatur } from './subscribe.js';

// Bestätigung des Double-Opt-in: nur mit gültiger Prüfsumme aus der Bestätigungsmail.
export default async function handler(req, res) {
  const { email, list, sig } = req.query;
  const KEY = process.env.BREVO_API_KEY;
  const LIST_ID = parseInt(process.env.BREVO_LIST_ID || '2');

  if (!email || !KEY) return res.redirect(302, '/danke');
  if (String(list || LIST_ID) !== String(LIST_ID) || sig !== signatur(email, LIST_ID, KEY)) {
    return res.redirect(302, '/newsletter/?bestaetigung=ungueltig#anmelden');
  }
  try {
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ email, listIds: [LIST_ID], updateEnabled: true }),
    });
  } catch (e) { console.error(e); }
  return res.redirect(302, '/danke');
}
