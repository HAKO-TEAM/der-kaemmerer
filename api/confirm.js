export default async function handler(req, res) {
  const { email, list } = req.query;
  const KEY = process.env.BREVO_API_KEY;

  if (!email || !KEY) return res.redirect(302, '/danke');

  try {
    // Kontakt zur Liste hinzufügen
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'accept':'application/json','api-key':KEY,'content-type':'application/json' },
      body: JSON.stringify({
        email,
        listIds: [parseInt(list || '2')],
        updateEnabled: true,
      }),
    });
  } catch(e) { console.error(e); }

  return res.redirect(302, '/danke');
}
