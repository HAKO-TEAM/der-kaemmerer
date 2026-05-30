export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, organisation, email, rolle, ressort, titel, beschreibung, link } = req.body;

  if (!name || !email || !ressort || !titel || !beschreibung) {
    return res.status(400).json({ error: 'Pflichtfelder fehlen' });
  }

  const KEY = process.env.BREVO_API_KEY;
  if (!KEY) return res.status(200).json({ success: true }); // Dev-Fallback

  const body = `
Neue Gastbeitrag-Einreichung — Der Kämmerer

Name:          ${name}
Organisation:  ${organisation || '—'}
E-Mail:        ${email}
Rolle:         ${rolle || '—'}
Ressort:       ${ressort}
Arbeitstitel:  ${titel}
Entwurf-Link:  ${link || '—'}

Beschreibung:
${beschreibung}
  `.trim();

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Der Kämmerer', email: 'noreply@derkaemmerer.de' },
        to: [{ email: 'redaktion@derkaemmerer.de', name: 'Redaktion' }],
        replyTo: { email, name },
        subject: `Gastbeitrag: ${titel} (${ressort})`,
        textContent: body,
      }),
    });
    if (!r.ok) {
      const err = await r.json();
      console.error('Brevo error:', err);
    }
  } catch (e) {
    console.error('Gastbeitrag API Fehler:', e);
  }

  return res.status(200).json({ success: true });
}
