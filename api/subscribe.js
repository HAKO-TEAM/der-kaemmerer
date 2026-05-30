export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Ungültige E-Mail' });

  const KEY     = process.env.BREVO_API_KEY;
  const LIST_ID = parseInt(process.env.BREVO_LIST_ID || '2');
  const TPL_ID  = parseInt(process.env.BREVO_DOI_TEMPLATE || '1');

  if (!KEY) return res.status(200).json({ success: true });

  try {
    // Schritt 1: Kontakt anlegen (noch nicht in Liste)
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'accept':'application/json','api-key':KEY,'content-type':'application/json' },
      body: JSON.stringify({ email, updateEnabled: true }),
    });

    // Schritt 2: Bestätigungs-E-Mail senden
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept':'application/json','api-key':KEY,'content-type':'application/json' },
      body: JSON.stringify({
        to: [{ email }],
        templateId: TPL_ID,
        params: {
          CONFIRM_URL: `https://derkaemmerer.de/api/confirm?email=${encodeURIComponent(email)}&list=${LIST_ID}`,
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) console.error('Brevo send error:', data);
  } catch(e) { console.error('Fehler:', e); }

  return res.status(200).json({ success: true });
}
