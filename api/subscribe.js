import { createHmac } from 'node:crypto';

// Newsletter-Anmeldung (Double-Opt-in über Brevo).
// Optional aus dem Lagebericht: Kommune, AGS und persönlicher Link werden als Kontaktmerkmale gespeichert,
// damit der Monatsversand jedem Abonnenten seinen eigenen Lagebericht schicken kann.
const ATTRIBUTE = ['KOMMUNE', 'AGS', 'LAGEBERICHT', 'QUELLE'];
let attributeAngelegt = false;

export function signatur(email, list, key) {
  return createHmac('sha256', key).update(`${String(email).toLowerCase()}|${list}`).digest('hex').slice(0, 32);
}

async function attributeSicherstellen(KEY) {
  if (attributeAngelegt) return;
  const antworten = await Promise.all(ATTRIBUTE.map((name) => fetch(`https://api.brevo.com/v3/contacts/attributes/normal/${name}`, {
    method: 'POST', headers: { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'text' }),
  }).catch(() => null)));   // existiert das Merkmal bereits, antwortet Brevo mit 400 – das ist gewollt
  // Frisch angelegte Merkmale kennt Brevo erst nach kurzer Zeit; Werte würden sonst stillschweigend verworfen
  if (antworten.some((r) => r && r.ok)) await new Promise((ok) => setTimeout(ok, 3000));
  attributeAngelegt = true;
}

async function kontaktSchreiben(KEY, email, attributes) {
  const r = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email, attributes, updateEnabled: true }),
  });
  if (!r.ok && r.status !== 204) console.error('Brevo contact error:', r.status, await r.text());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, lagebericht, kommune, ags } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Ungültige E-Mail' });

  const KEY     = process.env.BREVO_API_KEY;
  const LIST_ID = parseInt(process.env.BREVO_LIST_ID || '2');
  const TPL_ID  = parseInt(process.env.BREVO_DOI_TEMPLATE || '1');
  if (!KEY) return res.status(200).json({ success: true });

  const token = /^[a-f0-9]{16}$/.test(lagebericht || '') ? lagebericht : null;
  const attributes = { QUELLE: token ? 'Lagebericht' : 'Website' };
  if (token) {
    attributes.LAGEBERICHT = `https://derkaemmerer.de/spiegel/${token}/`;
    if (typeof kommune === 'string') attributes.KOMMUNE = kommune.slice(0, 120);
    if (/^\d{8}$/.test(ags || '')) attributes.AGS = ags;
  }

  try {
    await attributeSicherstellen(KEY);
    // Schritt 1: Kontakt anlegen bzw. ergänzen (noch nicht in der Liste)
    await kontaktSchreiben(KEY, email, attributes);
    // Schritt 2: Bestätigungs-E-Mail – Link mit Prüfsumme, damit niemand fremde Adressen eintragen kann
    const sig = signatur(email, LIST_ID, KEY);
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        to: [{ email }], templateId: TPL_ID,
        params: { CONFIRM_URL: `https://derkaemmerer.de/api/confirm?email=${encodeURIComponent(email)}&list=${LIST_ID}&sig=${sig}` },
      }),
    });
    if (!r.ok) console.error('Brevo send error:', await r.json());
  } catch (e) { console.error('Fehler:', e); }

  return res.status(200).json({ success: true });
}
