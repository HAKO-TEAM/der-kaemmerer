import PDFDocument from 'pdfkit';
import { Resend } from 'resend';

// ─── Tally Payload parsen ────────────────────────────────────────────────────

function parseTally(body) {
  const fields = body?.data?.fields ?? [];
  const get = (key) => {
    const f = fields.find(f =>
      f.key?.toLowerCase() === key.toLowerCase() ||
      f.label?.toLowerCase().replace(/\s+/g, '-') === key.toLowerCase()
    );
    if (!f) return '';
    if (Array.isArray(f.value)) return f.value.join(', ');
    return f.value ?? '';
  };
  return {
    organisation:   get('organisation'),
    abteilung:      get('abteilung'),
    ansprechpartner: get('ansprechpartner'),
    strasse:        get('strasse'),
    plz:            get('plz'),
    ort:            get('ort'),
    email:          get('rechnungs-email'),
    telefon:        get('telefon'),
    leitwegId:      get('leitweg-id'),
    stellentitel:   get('stellentitel'),
  };
}

// ─── Rechnungsnummer via GitHub ──────────────────────────────────────────────

const GH_HEADERS = () => ({
  'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
});
const GH_BASE = () =>
  `https://api.github.com/repos/${process.env.GITHUB_OWNER ?? 'HAKO-TEAM'}/${process.env.GITHUB_REPO ?? 'der-kaemmerer'}/contents`;

async function nextInvoiceNumber() {
  const path = 'data/rechnungen.json';
  const url  = `${GH_BASE()}/${path}`;
  let records = [], sha;

  const existing = await fetch(url, { headers: GH_HEADERS() });
  if (existing.ok) {
    const json = await existing.json();
    sha     = json.sha;
    records = JSON.parse(Buffer.from(json.content, 'base64').toString('utf8'));
  }

  const year = new Date().getFullYear();
  const num  = (records.filter(r => r.year === year).length + 1).toString().padStart(4, '0');
  const id   = `DK-${year}-${num}`;
  return { id, records, sha, path };
}

async function saveInvoiceRecord(path, sha, records, entry) {
  const url     = `${GH_BASE()}/${path}`;
  const updated = [...records, entry];
  const content = Buffer.from(JSON.stringify(updated, null, 2), 'utf8').toString('base64');
  await fetch(url, {
    method: 'PUT',
    headers: GH_HEADERS(),
    body: JSON.stringify({
      message: `Rechnung ${entry.id}`,
      content,
      branch: 'main',
      ...(sha ? { sha } : {}),
    }),
  });
}

// ─── PDF generieren ──────────────────────────────────────────────────────────

const NAVY = '#172840';
const BLUE = '#2563eb';
const GRAY = '#6b7280';
const LIGHT = '#f8fafc';

function formatDate(d = new Date()) {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function buildPDF(data, invoiceId) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W     = 595.28;
    const heute = new Date();
    const frist = addDays(heute, parseInt(process.env.ZAHLUNGSZIEL_TAGE ?? '14'));

    // Header-Band
    doc.rect(0, 0, W, 80).fill(NAVY);
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
       .text('Der Kämmerer', 50, 28);
    doc.fontSize(9).font('Helvetica')
       .text('Das unabhängige Briefing für kommunale Entscheider', 50, 52);
    doc.fillColor(BLUE).fontSize(20).font('Helvetica-Bold')
       .text('RECHNUNG', W - 160, 28, { align: 'right', width: 110 });

    // Rechnungsinfos oben rechts
    doc.fillColor(NAVY).fontSize(9).font('Helvetica')
       .text(`Rechnungsnummer: ${invoiceId}`, 350, 100, { align: 'right', width: 195 })
       .text(`Rechnungsdatum: ${formatDate(heute)}`, 350, 114, { align: 'right', width: 195 })
       .text(`Leistungsdatum: ${formatDate(heute)}`, 350, 128, { align: 'right', width: 195 })
       .text(`Zahlungsziel: ${formatDate(frist)}`, 350, 142, { align: 'right', width: 195 });

    // Absender (klein über Empfänger)
    doc.fillColor(GRAY).fontSize(7)
       .text('HAKO GmbH · Steuernr.: ' + (process.env.FIRMA_STEUERNR ?? ''), 50, 100);

    // Rechnungsadresse
    doc.fillColor(NAVY).fontSize(10).font('Helvetica-Bold')
       .text(data.organisation, 50, 118);
    doc.font('Helvetica').fillColor('#374151')
       .text(data.abteilung || '', 50, 132)
       .text(data.ansprechpartner || '', 50, 146)
       .text(data.strasse, 50, 160)
       .text(`${data.plz} ${data.ort}`, 50, 174);

    if (data.leitwegId) {
      doc.fillColor(GRAY).fontSize(8)
         .text(`Leitweg-ID: ${data.leitwegId}`, 50, 192);
    }

    // Trennlinie
    const lineY = 215;
    doc.moveTo(50, lineY).lineTo(W - 50, lineY).strokeColor(BLUE).lineWidth(1.5).stroke();

    // Betreff
    doc.fillColor(NAVY).fontSize(13).font('Helvetica-Bold')
       .text('Rechnung KommunalFlat – Stellenbörse', 50, lineY + 15);
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
       .text(`Flatrate-Abonnement · 12-Monatsvertrag`, 50, lineY + 32);

    // Positionstabelle
    const tableY = lineY + 55;
    doc.rect(50, tableY, W - 100, 22).fill(NAVY);
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
       .text('Pos.', 58, tableY + 6)
       .text('Leistungsbeschreibung', 90, tableY + 6)
       .text('Menge', 370, tableY + 6, { width: 60, align: 'right' })
       .text('Einzelpreis', 435, tableY + 6, { width: 60, align: 'right' })
       .text('Betrag', 500, tableY + 6, { width: 45, align: 'right' });

    const rowY = tableY + 30;
    doc.rect(50, rowY - 6, W - 100, 40).fill(LIGHT);
    doc.fillColor(NAVY).fontSize(9).font('Helvetica-Bold')
       .text('1', 58, rowY)
       .text('KommunalFlat – Stellenbörse derkaemmerer.de', 90, rowY);
    doc.font('Helvetica').fillColor(GRAY).fontSize(8)
       .text('Unlimitierte Stellenanzeigen · Stadt-Dossier · Newsletter + LinkedIn', 90, rowY + 13);
    doc.fillColor(NAVY).fontSize(9)
       .text('1 Monat', 370, rowY + 4, { width: 60, align: 'right' })
       .text('249,00 €', 435, rowY + 4, { width: 60, align: 'right' })
       .text('249,00 €', 500, rowY + 4, { width: 45, align: 'right' });

    // Summenblock
    const sumY = rowY + 60;
    doc.moveTo(W - 220, sumY).lineTo(W - 50, sumY).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

    const sumRow = (label, value, bold = false, color = NAVY) => {
      const y = sumY + (sumRow._n++ * 17);
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(label, W - 220, y, { width: 130, align: 'right' });
      doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9)
         .text(value, W - 85, y, { width: 35, align: 'right' });
    };
    sumRow._n = 0;
    sumRow('Nettobetrag:', '249,00 €');
    sumRow('Umsatzsteuer 19 %:', '47,31 €');

    const totalY = sumY + 2 * 17 + 6;
    doc.rect(W - 225, totalY, 175, 22).fill(NAVY);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
       .text('Gesamtbetrag:', W - 220, totalY + 5, { width: 130, align: 'right' })
       .text('296,31 €', W - 85, totalY + 5, { width: 35, align: 'right' });

    // Zahlungshinweis
    const payY = totalY + 45;
    doc.rect(50, payY, W - 100, 70).fill(LIGHT);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9).text('Bankverbindung', 65, payY + 10);
    doc.fillColor('#374151').font('Helvetica').fontSize(8.5)
       .text(`IBAN: ${process.env.FIRMA_IBAN ?? ''}`, 65, payY + 24)
       .text(`BIC: ${process.env.FIRMA_BIC ?? ''}  ·  ${process.env.FIRMA_BANK ?? ''}`, 65, payY + 38)
       .text(`Verwendungszweck: ${invoiceId} · ${data.organisation}`, 65, payY + 52);

    // Vertragsbedingungen
    const condY = payY + 90;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.5).text('Vertragsbedingungen', 50, condY);
    doc.fillColor(GRAY).font('Helvetica').fontSize(7.5)
       .text(
         '12-Monatsvertrag, erstmalig kündbar zum Ablauf des 12. Monats. ' +
         'Danach monatlich kündbar zum Monatsende mit 1 Monat Kündigungsfrist. ' +
         'Bitte überweisen Sie den Betrag innerhalb von ' +
         (process.env.ZAHLUNGSZIEL_TAGE ?? '14') + ' Tagen unter Angabe des Verwendungszwecks.',
         50, condY + 14, { width: W - 100 }
       );

    // Footer
    doc.rect(0, 790, W, 52).fill(NAVY);
    doc.fillColor('#9ca3af').fontSize(7).font('Helvetica')
       .text('HAKO GmbH  ·  derkaemmerer.de  ·  anzeigen@derkaemmerer.de', 50, 800, { align: 'center', width: W - 100 })
       .text(`Steuernummer: ${process.env.FIRMA_STEUERNR ?? ''}  ·  Gemäß §14 UStG`, 50, 812, { align: 'center', width: W - 100 });

    doc.end();
  });
}

// ─── E-Mail versenden ────────────────────────────────────────────────────────

async function sendInvoiceEmail(data, invoiceId, pdfBuffer) {
  const resend  = new Resend(process.env.RESEND_API_KEY);
  const pdfB64  = pdfBuffer.toString('base64');
  const filename = `Rechnung_${invoiceId}.pdf`;
  const frist    = new Date(); frist.setDate(frist.getDate() + parseInt(process.env.ZAHLUNGSZIEL_TAGE ?? '14'));

  await resend.emails.send({
    from:    'Der Kämmerer – Rechnungsstelle <anzeigen@derkaemmerer.de>',
    to:      [data.email],
    cc:      ['anzeigen@derkaemmerer.de'],
    subject: `Ihre Rechnung ${invoiceId} – KommunalFlat derkaemmerer.de`,
    attachments: [{ filename, content: pdfB64 }],
    html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#172840;padding:24px;color:#fff">
    <h1 style="margin:0;font-size:20px">Ihre Rechnung ist eingegangen</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px">${invoiceId}</p>
  </div>
  <div style="padding:24px">
    <p style="color:#374151">Sehr geehrte Damen und Herren,</p>
    <p style="color:#374151">vielen Dank für Ihre Buchung der <strong>KommunalFlat</strong> auf derkaemmerer.de.
    Anbei erhalten Sie Ihre Rechnung als PDF.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:24px 0">
      <tr style="background:#f8fafc">
        <td style="padding:10px;color:#6b7280">Rechnungsnummer</td>
        <td style="padding:10px;font-weight:bold;color:#172840">${invoiceId}</td>
      </tr>
      <tr>
        <td style="padding:10px;color:#6b7280">Betrag</td>
        <td style="padding:10px;color:#172840">296,31 € (inkl. 19% MwSt.)</td>
      </tr>
      <tr style="background:#f8fafc">
        <td style="padding:10px;color:#6b7280">Zahlungsziel</td>
        <td style="padding:10px;color:#172840">${frist.toLocaleDateString('de-DE')}</td>
      </tr>
      <tr>
        <td style="padding:10px;color:#6b7280">IBAN</td>
        <td style="padding:10px;color:#172840">${process.env.FIRMA_IBAN ?? '(wird nachgereicht)'}</td>
      </tr>
    </table>
    <p style="color:#374151">Ihr Zugang zur Stellenbörse wird nach Zahlungseingang freigeschaltet.
    Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    <p style="color:#374151">Mit freundlichen Grüßen<br><strong>Das Team von Der Kämmerer</strong></p>
  </div>
  <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#9ca3af">
    derkaemmerer.de · anzeigen@derkaemmerer.de
  </div>
</div>`,
  });
}

// ─── Webhook Handler ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Tally sendet entweder body direkt oder als { data: { fields: [...] } }
    const body  = req.body;
    const isTally = body?.eventType || body?.data?.fields;

    let data;
    if (isTally) {
      data = parseTally(body);
    } else {
      // Direktaufruf (Test)
      data = body;
    }

    if (!data.organisation || !data.email) {
      return res.status(400).json({ error: 'organisation und rechnungs-email sind Pflichtfelder' });
    }

    const { id, records, sha, path } = await nextInvoiceNumber();
    const pdf = await buildPDF(data, id);
    await sendInvoiceEmail(data, id, pdf);
    await saveInvoiceRecord(path, sha, records, {
      id,
      year: new Date().getFullYear(),
      date: new Date().toISOString().split('T')[0],
      organisation: data.organisation,
      email: data.email,
      betrag: 296.31,
    });

    return res.status(200).json({ ok: true, rechnungsnummer: id });
  } catch (err) {
    console.error('Rechnungsfehler:', err);
    return res.status(500).json({ error: err.message ?? 'Unbekannter Fehler' });
  }
}
