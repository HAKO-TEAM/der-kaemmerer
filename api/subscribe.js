export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Ungültige E-Mail' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  const LIST_ID   = parseInt(process.env.BREVO_LIST_ID || '2');
  const TPL_ID    = parseInt(process.env.BREVO_DOI_TEMPLATE || '1');

  if (BREVO_KEY) {
    try {
      await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
        method: 'POST',
        headers: { 'accept':'application/json', 'api-key': BREVO_KEY, 'content-type':'application/json' },
        body: JSON.stringify({
          email,
          includeListIds: [LIST_ID],
          templateId: TPL_ID,
          redirectionUrl: 'https://derkaemmerer.de/danke',
        }),
      });
    } catch(e) { console.error('Brevo error:', e); }
  }
  return res.status(200).json({ success: true });
}
