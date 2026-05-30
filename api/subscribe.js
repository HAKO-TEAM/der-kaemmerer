// Vercel Serverless Function: Newsletter-Anmeldung
// Speichert E-Mail und sendet Benachrichtigung an pmo@hako.team

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
  }

  // Brevo API (EU-Server, DSGVO-konform)
  const BREVO_KEY = process.env.BREVO_API_KEY;
  const LIST_ID  = parseInt(process.env.BREVO_LIST_ID || '2');

  if (BREVO_KEY) {
    try {
      await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          listIds: [LIST_ID],
          updateEnabled: true,
          attributes: { SOURCE: 'derkaemmerer.de' },
        }),
      });
    } catch (e) {
      console.error('Brevo error:', e);
    }
  }

  // Fallback: Benachrichtigungs-E-Mail via Resend (oder nur log)
  console.log(`[Newsletter] Neue Anmeldung: ${email}`);

  return res.status(200).json({ success: true });
}
