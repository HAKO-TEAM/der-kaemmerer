import { signatur } from './subscribe.js';

// Bestätigung des Double-Opt-in: nur mit gültiger Prüfsumme aus der Bestätigungsmail.
// Danach geht eine Benachrichtigung an chefredaktion@ – die tägliche Lagebericht-Routine wertet sie aus.
const MELDUNG_AN = 'chefredaktion@derkaemmerer.de';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function melden(KEY, email, dk = false, jobalert = false) {
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
      // Betreff „Neue Briefing-Anmeldung“ wertet die Lagebericht-Routine aus – Dienst & Karriere bewusst mit eigenem Betreff
      subject: jobalert ? `Neue Anmeldung Job-Alert: ${email} (${a.JA_LAND || 'bundesweit'}${a.JA_PLZ ? ', PLZ ' + a.JA_PLZ : ''})` : dk ? `Neue Anmeldung Dienst & Karriere: ${email}` : `Neue Briefing-Anmeldung: ${wer} – ${email}`,
      textContent: zeilen.map(([n, w]) => `${n}: ${w || '–'}`).join('\n'),
      htmlContent: `<p>Neue bestätigte Briefing-Anmeldung:</p><table>${zeilen.map(([n, w]) => `<tr><td><b>${n}</b></td><td>${esc(w || '–')}</td></tr>`).join('')}</table>`,
    }),
  });
  if (!r.ok) console.error('Brevo Meldung:', r.status, await r.text());
}

export default async function handler(req, res) {
  const { email, list, sig, art } = req.query;
  const jobalert = art === 'jobalert';
  const KEY = process.env.BREVO_API_KEY;
  const BRIEFING = parseInt(process.env.BREVO_LIST_ID || '2');
  const DK = parseInt(process.env.BREVO_LIST_ID_DK || '');   // Newsletter Dienst & Karriere (Runbook 4.5)
  const LIST_ID = parseInt(list || String(BRIEFING));

  if (!email || !KEY) return res.redirect(302, '/danke/');
  if (![BRIEFING, DK].includes(LIST_ID) || sig !== signatur(email, LIST_ID, KEY)) {
    return res.redirect(302, LIST_ID === DK ? '/dienst-karriere/?bestaetigung=ungueltig' : '/newsletter/?bestaetigung=ungueltig#anmelden');
  }
  try {
    const h = { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' };
    // schon in der Liste? Dann keine zweite Meldung (Bestätigungslink mehrfach geklickt)
    const vorher = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, { headers: h }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST', headers: h,
      // Job-Alert: nur Merkmal JOBALERT=ja – KEINE Aufnahme in die Newsletter-Liste (Einwilligung gilt nur für den Job-Alert)
      body: JSON.stringify(jobalert ? { email, attributes: { JOBALERT: 'ja' }, updateEnabled: true } : { email, listIds: [LIST_ID], updateEnabled: true }),
    });
    const neu = jobalert ? (vorher.attributes || {}).JOBALERT !== 'ja' : !(vorher.listIds || []).includes(LIST_ID);
    if (neu) await melden(KEY, email, LIST_ID === DK, jobalert);
  } catch (e) { console.error(e); }
  return res.redirect(302, jobalert ? '/stellen/job-alert/danke/' : LIST_ID === DK ? '/dienst-karriere/danke/' : '/danke/');
}
