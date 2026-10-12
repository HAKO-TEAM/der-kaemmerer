import { createHmac } from 'node:crypto';

// Newsletter-Anmeldung (Double-Opt-in über Brevo).
// Optional aus dem Lagebericht: Kommune, AGS und persönlicher Link werden als Kontaktmerkmale gespeichert,
// damit der Monatsversand jedem Abonnenten seinen eigenen Lagebericht schicken kann.
import { LAENDER, FELDER } from './_jobalert.js';
const ATTRIBUTE = ['KOMMUNE', 'AGS', 'LAGEBERICHT', 'QUELLE', 'JOBALERT', 'JA_LAND', 'JA_PLZ', 'JA_FELDER'];
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
  if (!r.ok && r.status !== 204) {
    const t = await r.text();
    console.error('Brevo contact error:', r.status, t);
    throw new Error('Kontakt nicht gespeichert (' + r.status + ')');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, lagebericht, kommune, ags, liste = 'kaemmerer', land, plz, felder } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Ungültige E-Mail' });

  const KEY     = process.env.BREVO_API_KEY;
  // Listen: kaemmerer = Kämmerer-Briefing (Standard); dienst-karriere = Ressort-Newsletter (Phase 4.5, Env BREVO_LIST_ID_DK)
  // job-alert = wöchentliche Stellen-Mail nach Wunsch; nur Merkmal JOBALERT=ja (keine Listenaufnahme), Prüfsumme über die DK-Liste
  const LISTEN = { kaemmerer: process.env.BREVO_LIST_ID || '2', 'dienst-karriere': process.env.BREVO_LIST_ID_DK, 'job-alert': process.env.BREVO_LIST_ID_DK };
  if (!(liste in LISTEN)) return res.status(400).json({ error: 'Unbekannte Liste' });
  const LIST_ID = parseInt(LISTEN[liste] || '');
  const TPL_ID  = parseInt(process.env.BREVO_DOI_TEMPLATE || '1');
  if (!KEY || !LIST_ID) {
    console.error('Newsletter nicht konfiguriert:', { key: !!KEY, liste, LIST_ID });
    return res.status(503).json({ error: 'Anmeldung derzeit nicht möglich' });
  }

  const token = /^[a-f0-9]{16}$/.test(lagebericht || '') ? lagebericht : null;
  const attributes = { QUELLE: token ? 'Lagebericht' : 'Website' };
  if (liste === 'job-alert') {
    // Wunsch erst mit der Bestätigung aktiv: JOBALERT steht bis dahin auf „offen“
    Object.assign(attributes, { QUELLE: 'Job-Alert', JOBALERT: 'offen',
      JA_LAND: LAENDER.includes(land) ? land : '', JA_PLZ: /^\d{2}/.test(plz || '') ? String(plz).slice(0, 2) : '',
      JA_FELDER: (Array.isArray(felder) ? felder : []).filter((f) => f in FELDER).join(',') });
  }
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
        params: { CONFIRM_URL: `https://derkaemmerer.de/api/confirm?email=${encodeURIComponent(email)}&list=${LIST_ID}&sig=${sig}${liste === 'job-alert' ? '&art=jobalert' : ''}` },
      }),
    });
    if (!r.ok) throw new Error('Bestätigungsmail nicht versendet: ' + r.status + ' ' + JSON.stringify(await r.json().catch(() => ({}))));
  } catch (e) {
    console.error('Newsletter-Anmeldung fehlgeschlagen:', email.replace(/^(.).*@/, '$1…@'), e.message || e);
    return res.status(502).json({ error: 'Anmeldung fehlgeschlagen' });
  }

  return res.status(200).json({ success: true });
}
