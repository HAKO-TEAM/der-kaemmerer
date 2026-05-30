export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, funktion, kommune, email } = req.body;
  if (!name || !email || !kommune) return res.status(400).json({ error: 'Pflichtfelder fehlen' });

  const KEY = process.env.BREVO_API_KEY;
  if (!KEY) return res.status(200).json({ success: true });

  const body = `
Neue ASCEND Demo-Anfrage

Name:      ${name}
Funktion:  ${funktion || '—'}
Kommune:   ${kommune}
E-Mail:    ${email}

Quelle: derkaemmerer.de/ascend
  `.trim();

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Der Kämmerer', email: 'noreply@derkaemmerer.de' },
        to: [{ email: 'pmo@hako.team', name: 'HAKO PMO' }],
        replyTo: { email, name },
        subject: `ASCEND Demo-Anfrage: ${kommune} — ${funktion}`,
        textContent: body,
      }),
    });
  } catch(e) { console.error('Demo-Anfrage Fehler:', e); }

  return res.status(200).json({ success: true });
}
