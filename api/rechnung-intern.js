import { createInvoice } from './rechnung.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { passwort, empfaenger, positionen, mwstSatz, vorlage, _check } = req.body;
  if (passwort !== process.env.INTERN_PASSWORT) {
    return res.status(401).json({ error: 'Falsches Passwort' });
  }
  // Nur Passwort-Check, keine Rechnung erstellen
  if (_check) return res.status(200).json({ ok: true });

  if (!empfaenger?.organisation || !empfaenger?.email) {
    return res.status(400).json({ error: 'Organisation und E-Mail sind Pflichtfelder' });
  }
  if (!positionen || positionen.length === 0) {
    return res.status(400).json({ error: 'Mindestens eine Position erforderlich' });
  }

  try {
    const id = await createInvoice(
      { ...empfaenger, mwstSatz: mwstSatz ?? 19 },
      positionen,
      vorlage ?? 'kaemmerer'
    );
    return res.status(200).json({ ok: true, rechnungsnummer: id });
  } catch (err) {
    console.error('Intern-Rechnungsfehler:', err);
    return res.status(500).json({ error: err.message ?? 'Unbekannter Fehler' });
  }
}
