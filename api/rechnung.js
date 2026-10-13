import PDFDocument from 'pdfkit';
import { Resend } from 'resend';

// ─── Tally Payload parsen ────────────────────────────────────────────────────

// Label-Aliases: welche deutschen Labels matchen auf welchen internen Key
const LABEL_MAP = {
  organisation:    ['organisation', 'behörde', 'organisation / behörde', 'organisation/behörde'],
  abteilung:       ['abteilung'],
  ansprechpartner: ['ansprechpartner', 'kontakt', 'name'],
  strasse:         ['strasse', 'straße', 'straße + hausnummer', 'strasse + hausnummer', 'adresse'],
  plz:             ['plz', 'postleitzahl'],
  ort:             ['ort', 'stadt'],
  email:           ['rechnungs-email', 'rechnungsemail', 'e-mail', 'email', 'e-mail für rechnungsversand'],
  telefon:         ['telefon', 'telefonnummer', 'tel'],
  leitwegId:       ['leitweg-id', 'leitwegid', 'leitweg id', 'leitweg-id (optional, für xrechnung)'],
  stellentitel:    ['stellentitel', 'stelle', 'erster stellentitel', 'gewünschter erster stellentitel (optional)'],
};

function getValue(f) {
  if (!f) return '';
  const v = f.value;
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(i => (typeof i === 'object' ? i.text ?? i.label ?? i.value ?? '' : i)).join(', ');
  if (typeof v === 'object') return v.text ?? v.label ?? v.value ?? v.number ?? String(v);
  return String(v);
}

function parseTally(body) {
  // Tally kann Felder unter data.fields oder direkt unter fields liefern
  const fields = body?.data?.fields ?? body?.fields ?? [];

  const get = (internalKey) => {
    const aliases = LABEL_MAP[internalKey] ?? [internalKey];
    const f = fields.find(f => {
      const key   = (f.key   ?? '').toLowerCase().trim();
      const label = (f.label ?? '').toLowerCase().trim();
      return aliases.some(a =>
        key === a ||
        key.includes(a) ||
        label === a ||
        label.startsWith(a) ||
        label.includes(a)
      );
    });
    return getValue(f);
  };

  // Fallback: E-Mail anhand des Typs finden falls Label-Match scheitert
  const findByType = (type) => {
    const f = fields.find(f => (f.type ?? '').toUpperCase().includes(type.toUpperCase()));
    return getValue(f);
  };

  const organisation = get('organisation');
  const email        = get('email') || findByType('EMAIL');

  return {
    organisation,
    abteilung:       get('abteilung'),
    ansprechpartner: get('ansprechpartner'),
    strasse:         get('strasse'),
    plz:             get('plz'),
    ort:             get('ort'),
    email,
    telefon:         get('telefon') || findByType('PHONE'),
    leitwegId:       get('leitwegId'),
    stellentitel:    get('stellentitel'),
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

// Bereits vergebene Nummern, deren Datensätze gelöscht wurden (Testläufe bis DK-2026-1050, 13.10.2026) –
// so wird keine Rechnungsnummer ein zweites Mal vergeben.
const BELEGT_BIS = { 2026: 1050 };

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
  // Höchste bereits vergebene Nummer dieses Jahres finden
  const maxNum = records
    .filter(r => r.year === year)
    .reduce((max, r) => {
      const n = parseInt((r.id ?? '').split('-')[2]) || 0;
      return Math.max(max, n);
    }, BELEGT_BIS[year] ?? 1000);  // Startwert 1000 → erste Rechnung = 1001
  const num = (maxNum + 1).toString().padStart(4, '0');
  const id  = `DK-${year}-${num}`;
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

const NAVY  = '#172840';
const BLUE  = '#2563eb';
const GRAY  = '#6b7280';
const LIGHT = '#f8fafc';

// A4: 595.28 x 841.89 pt
const PW = 595.28;
const PH = 841.89;
// DIN 5008 Form B: Text links 25 mm, rechts 20 mm; Anschriftfeld ab 45 mm (Vermerkzone 17,7 mm, Anschriftzone 62,7–90 mm),
// Informationsblock ab 50 mm / 125 mm von links, Betreff ab ca. 98,5 mm, Falzmarken 105/210 mm, Lochmarke 148,5 mm
const MM = 72 / 25.4;
const ML = 25 * MM;  // margin left
const MR = 20 * MM;  // margin right
const CW = PW - ML - MR;

function eur(amount) {
  return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

function addWorkdays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

function formatDate(d = new Date()) {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
/** Abo-Monat 'JJJJ-MM' → { von, bis, name } */
export function aboMonat(monat) {
  const [j, m] = monat.split('-').map(Number);
  return { von: new Date(Date.UTC(j, m - 1, 1)), bis: new Date(Date.UTC(j, m, 0)), name: `${MONATE[m - 1]} ${j}` };
}
const datumUTC = (d) => `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
/** Kennzeichnung für Abo-Rechnungen (data.abo = { id, monat, vertragsmonat, laufzeit }) */
function aboText(abo) {
  if (!abo) return null;
  const z = aboMonat(abo.monat);
  const vm = abo.vertragsmonat <= abo.laufzeit ? `Vertragsmonat ${abo.vertragsmonat} von ${abo.laufzeit}` : `Vertragsmonat ${abo.vertragsmonat} (monatlich kündbar)`;
  return { zeitraum: `${datumUTC(z.von)} – ${datumUTC(z.bis)}`, monat: z.name, vm };
}

function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function txt(doc, text, x, y, opts = {}) {
  // Wrapper für absolut positionierten Text ohne automatischen Zeilenvorschub
  doc.text(text, x, y, { lineBreak: false, ...opts });
}

export function buildPDF(data, invoiceId, positionen, vorlage = 'kaemmerer') {
  // vorlage: 'kaemmerer' = Der Kämmerer-Branding | 'hako' = HAKO neutral
  // positionen: [{ beschreibung, menge, einheit, einzelpreis }]
  // Falls nicht übergeben → KommunalFlat-Standard
  if (!positionen || positionen.length === 0) {
    const a = aboText(data.abo);
    positionen = [{
      beschreibung: (data.abo?.leistung || 'KommunalFlat – Stellenbörse derkaemmerer.de\nUnlimitierte Stellenanzeigen  |  Stadt-Dossier')
        + (a ? `\nLeistungszeitraum ${a.zeitraum}` : ''),
      menge: 1,
      einheit: '1 Monat',
      einzelpreis: data.abo?.preis ?? 249,
    }];
  }

  const mwstSatz   = data.mwstSatz ?? 19;
  const nettoGes   = positionen.reduce((s, p) => s + (p.einzelpreis * p.menge), 0);
  const mwstBetrag = Math.round(nettoGes * mwstSatz) / 100;
  const bruttoGes  = Math.round((nettoGes + mwstBetrag) * 100) / 100;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: true,
      bufferPages: true,
    });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const heute       = new Date();
    const frist       = addDays(heute, parseInt(process.env.ZAHLUNGSZIEL_TAGE ?? '14'));
    const tage        = process.env.ZAHLUNGSZIEL_TAGE ?? '14';
    const skontoPct   = 5;
    const skontoTage  = 5;
    const skontoFrist = addWorkdays(heute, skontoTage);
    const skontoAbzug  = Math.round(bruttoGes * skontoPct) / 100;
    const skontoBetrag = Math.round((bruttoGes - skontoAbzug) * 100) / 100;

    // ── HEADER ────────────────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 72).fill(NAVY);

    // Logo links — je nach Vorlage
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18);
    if (vorlage === 'hako') {
      txt(doc, 'HAKO', ML, 14);
      doc.font('Helvetica').fontSize(10).fillColor('#93c5fd');
      txt(doc, 'Beteiligungsgesellschaft mbH', ML, 36);
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8');
      txt(doc, 'Hertha-Lindner-Str. 10-12  |  01067 Dresden', ML, 52);
    } else {
      txt(doc, 'Der Kämmerer', ML, 18);
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8');
      txt(doc, 'HAKO Beteiligungsgesellschaft mbH', ML, 40);
      txt(doc, 'Das unabhängige Briefing für kommunale Entscheider', ML, 52);
    }

    // "RECHNUNG" rechts — genug Breite damit kein Umbruch
    doc.font('Helvetica-Bold').fontSize(18).fillColor(BLUE);
    txt(doc, 'RECHNUNG', ML, 22, { align: 'right', width: CW, lineBreak: false });

    // ── RECHNUNGSINFOS (rechts) — DIN 5008: ab 80pt ──────────────────────────
    const abo   = aboText(data.abo);
    const infoX = 125 * MM;
    const infoW = PW - infoX - MR;
    const info  = [
      ['Rechnungsnr.', invoiceId],
      ['Rechnungsdatum', formatDate(heute)],
      abo ? ['Leistungszeitraum', abo.zeitraum] : data.zeitraum ? ['Leistungszeitraum', data.zeitraum] : ['Leistungsdatum', formatDate(heute)],
      ['Zahlungsziel', formatDate(frist)],
      ...(abo ? [['Abo-Nr.', data.abo.id], ['Vertragsmonat', abo.vm.replace('Vertragsmonat ', '')]] : []),
    ];
    info.forEach(([k, v], i) => {
      const y = 50 * MM + i * 13;
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
      txt(doc, k + ':', infoX, y, { width: 78 });
      doc.font('Helvetica-Bold').fillColor(NAVY);
      txt(doc, v, infoX + 80, y, { width: infoW - 80, align: 'right' });
    });

    // ── FALZ- UND LOCHMARKEN (DIN 5008) ──────────────────────────────────────
    doc.strokeColor('#9ca3af').lineWidth(0.5);
    doc.moveTo(0, 105 * MM).lineTo(5 * MM, 105 * MM).stroke();
    doc.moveTo(0, 210 * MM).lineTo(5 * MM, 210 * MM).stroke();
    doc.moveTo(0, 148.5 * MM).lineTo(7 * MM, 148.5 * MM).stroke();

    // ── ABSENDER-RÜCKSENDEZEILE — DIN 5008: 45mm = 127pt vom oberen Rand ─────
    // Unterstrichen / abgetrennt für Kuvertfenster
    doc.font('Helvetica').fontSize(6.5).fillColor(GRAY);
    txt(doc, 'HAKO GmbH · Hertha-Lindner-Str. 10-12 · 01067 Dresden', ML, 58 * MM, { width: 80 * MM });
    doc.moveTo(ML, 58 * MM + 9).lineTo(ML + 80 * MM, 58 * MM + 9).strokeColor('#d1d5db').lineWidth(0.5).stroke();

    // ── RECHNUNGSADRESSE — DIN 5008: ab 50mm = 142pt ─────────────────────────
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY);
    txt(doc, data.organisation, ML, 62.7 * MM);

    doc.font('Helvetica').fontSize(9).fillColor('#374151');
    let addrY = 62.7 * MM + 15;
    if (data.abteilung)      { txt(doc, data.abteilung,      ML, addrY); addrY += 13; }
    if (data.ansprechpartner){ txt(doc, data.ansprechpartner,ML, addrY); addrY += 13; }
    txt(doc, data.strasse,             ML, addrY); addrY += 13;
    txt(doc, `${data.plz} ${data.ort}`,ML, addrY); addrY += 13;
    if (data.leitwegId && data.leitwegId !== '-') {
      doc.fontSize(7.5).fillColor(GRAY);
      txt(doc, `Leitweg-ID: ${data.leitwegId}`, ML, addrY);
    }

    // ── TRENNLINIE — nach DIN 5008 Adressfeld (max 95mm = 269pt) ─────────────
    const lineY = 95 * MM;
    doc.moveTo(ML, lineY).lineTo(PW - MR, lineY).strokeColor(BLUE).lineWidth(1.5).stroke();

    // ── BETREFF ───────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY);
    if (vorlage === 'hako') {
      txt(doc, `Rechnung ${invoiceId}`, ML, lineY + 14);
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
      txt(doc, data.betreff || 'Leistungsrechnung', ML, lineY + 30);
    } else {
      txt(doc, abo ? `Rechnung KommunalFlat – Abonnement ${data.abo.id}` : data.art === 'einzel' ? 'Rechnung Einzelanzeige – Stellenbörse derkaemmerer.de' : 'Rechnung KommunalFlat – Stellenbörse derkaemmerer.de', ML, lineY + 14);
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
      txt(doc, abo ? `Monatliche Abo-Rechnung ${abo.monat}  |  Leistungszeitraum ${abo.zeitraum}  |  ${abo.vm}` : data.art === 'einzel' ? `Einmalige Stellenanzeige  |  Laufzeit ${data.zeitraum}` : 'Flatrate-Abonnement  |  12-Monatsvertrag', ML, lineY + 30);
    }

    // ── TABELLE ───────────────────────────────────────────────────────────────
    const tY  = lineY + 50;
    const tH  = 20;
    // Spalten: Pos | Beschreibung | Menge | Einzelpreis | Betrag
    const c0 = ML,      w0 = 28;
    const c1 = c0+w0,   w1 = 234;
    const c2 = c1+w1,   w2 = 55;
    const c3 = c2+w2,   w3 = 75;
    const c4 = c3+w3,   w4 = PW - MR - (c3+w3) - 6;

    // Header-Zeile
    doc.rect(ML, tY, CW, tH).fill(NAVY);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    txt(doc, 'Pos.',             c0+4, tY+6);
    txt(doc, 'Leistung',         c1,   tY+6);
    txt(doc, 'Menge',            c2,   tY+6, { width: w2, align: 'right' });
    txt(doc, 'Einzelpreis',      c3,   tY+6, { width: w3, align: 'right' });
    txt(doc, 'Betrag',           c4,   tY+6, { width: w4, align: 'right' });

    // ── Dynamische Positionen ─────────────────────────────────────────────────
    let curY = tY + tH + 6;
    positionen.forEach((p, i) => {
      const lines = p.beschreibung.split('\n');
      // Unterzeilen umbrechen lassen und ihre Höhe vorab messen, damit nichts überlappt
      doc.font('Helvetica').fontSize(7.5);
      const hoehen = lines.slice(1).map((l) => doc.heightOfString(l, { width: w1 - 6 }));
      const rowH  = 30 + hoehen.reduce((a, b) => a + b + 2, 0);
      doc.rect(ML, curY - 4, CW, rowH).fill(i % 2 === 0 ? LIGHT : '#ffffff');
      doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY);
      txt(doc, String(i + 1), c0 + 4, curY);
      txt(doc, lines[0], c1, curY, { width: w1 });
      if (lines.length > 1) {
        doc.font('Helvetica').fontSize(7.5).fillColor(GRAY);
        let uy = curY + 13;
        lines.slice(1).forEach((l, li) => { doc.text(l, c1, uy, { width: w1 - 6, lineBreak: true }); uy += hoehen[li] + 2; });
      }
      doc.font('Helvetica').fontSize(9).fillColor(NAVY);
      txt(doc, p.einheit || String(p.menge), c2, curY + 4, { width: w2, align: 'right' });
      txt(doc, eur(p.einzelpreis),           c3, curY + 4, { width: w3, align: 'right' });
      txt(doc, eur(p.einzelpreis * p.menge), c4, curY + 4, { width: w4, align: 'right' });
      curY += rowH + 4;
    });

    // ── SUMMENBLOCK (rechts) ──────────────────────────────────────────────────
    const sY  = curY + 10;
    const sLX = c3;
    const sVX = c4;

    doc.moveTo(sLX, sY).lineTo(PW - MR, sY).strokeColor('#d1d5db').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(9).fillColor(GRAY);
    txt(doc, 'Nettobetrag:',          sLX, sY+6,  { width: w3, align: 'right' });
    txt(doc, `MwSt. ${mwstSatz} %:`, sLX, sY+20, { width: w3, align: 'right' });
    doc.fillColor(NAVY);
    txt(doc, eur(nettoGes),   sVX, sY+6,  { width: w4, align: 'right' });
    txt(doc, eur(mwstBetrag), sVX, sY+20, { width: w4, align: 'right' });

    // Gesamtbetrag (volle Breite)
    const gY = sY + 38;
    doc.rect(ML, gY, CW, 24).fill(NAVY);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
    txt(doc, 'Gesamtbetrag:', ML+12, gY+6);
    txt(doc, eur(bruttoGes), ML, gY+6, { width: CW - 12, align: 'right' });

    // Skonto (volle Breite, hellblau, klar sichtbar)
    const skY = gY + 30;
    const skLabelW = CW - 120;  // Label-Breite lässt 120pt für Betrag rechts
    doc.rect(ML, skY, CW, 36).fill('#dbeafe');
    doc.moveTo(ML, skY).lineTo(ML, skY + 36).strokeColor(BLUE).lineWidth(3).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLUE);
    txt(doc, `${skontoPct}% Skonto bei Zahlung bis ${formatDate(skontoFrist)}:`, ML+10, skY+6, { width: skLabelW });
    txt(doc, eur(skontoBetrag), ML + 10 + skLabelW, skY+6, { width: 110, align: 'right' });
    doc.font('Helvetica').fontSize(8).fillColor('#1d4ed8');
    txt(doc, `Abzug ${eur(skontoAbzug)} bei Zahlung innerhalb von ${skontoTage} Werktagen. Danach netto ${tage} Tage bis ${formatDate(frist)}.`, ML+10, skY+22, { width: CW - 20 });

    // ── BANKVERBINDUNG ────────────────────────────────────────────────────────
    const bY = skY + 46;
    doc.rect(ML, bY, CW, 64).fill(LIGHT);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY);
    txt(doc, 'Bankverbindung', ML+12, bY+10);
    doc.font('Helvetica').fontSize(8.5).fillColor('#374151');
    txt(doc, `IBAN: ${process.env.FIRMA_IBAN ?? '(wird nachgereicht)'}`, ML+12, bY+24);
    txt(doc, `BIC: ${process.env.FIRMA_BIC ?? ''}   ${process.env.FIRMA_BANK ?? ''}`, ML+12, bY+38);
    txt(doc, `Verwendungszweck: ${invoiceId}  |  ${data.organisation}`, ML+12, bY+51);

    // ── VERTRAGSBEDINGUNGEN ───────────────────────────────────────────────────
    const vY = bY + 76;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NAVY);
    txt(doc, 'Zahlungs- und Vertragsbedingungen', ML, vY);
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY);
    const vertragsBed = vorlage === 'hako'
      ? `${skontoPct}% Skonto bei Zahlung bis ${formatDate(skontoFrist)}. ` +
        `Danach fällig netto innerhalb von ${tage} Tagen bis ${formatDate(frist)}. ` +
        `Bitte überweisen Sie unter Angabe des Verwendungszwecks (Rechnungsnummer und Organisation).`
      : `${skontoPct}% Skonto bei Zahlung bis ${formatDate(skontoFrist)}. ` +
        `Danach fällig netto innerhalb von ${tage} Tagen bis ${formatDate(frist)}. ` +
        `Bitte überweisen Sie unter Angabe des Verwendungszwecks. ` +
        (data.art === 'einzel'
          ? `Einmalige Leistung: Veröffentlichung der Stellenanzeige für 60 Tage ab Buchung.`
          : `12-Monatsvertrag, erstmalig kündbar zum Ablauf des 12. Monats, ` +
            `danach monatlich zum Monatsende mit 1 Monat Kündigungsfrist.`);
    doc.text(vertragsBed, ML, vY + 12, { width: CW, lineBreak: true });

    // ── FOOTER (absolut auf Seite 1 — KEIN doc.text davor der umbricht) ───────
    const fY = PH - 38;
    doc.rect(0, fY, PW, 38).fill(NAVY);
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8');
    txt(doc,
      `HAKO Beteiligungsgesellschaft mbH  |  Hertha-Lindner-Str. 10-12, D-01067 Dresden  |  HRB 29317, AG Dresden  |  GF: Pierre Haustein & Michael G. Kosel`,
      15 * MM, fY + 7, { width: PW - 30 * MM, align: 'center' }
    );
    txt(doc,
      `derkaemmerer.de  |  anzeigen@derkaemmerer.de  |  Steuernr. ${process.env.FIRMA_STEUERNR ?? ''}  |  Gem. §14 UStG`,
      15 * MM, fY + 20, { width: PW - 30 * MM, align: 'center' }
    );

    // Sicherstellen: nur 1 Seite
    doc.flushPages();
    doc.end();
  });
}

// ─── E-Mail versenden ────────────────────────────────────────────────────────

async function sendInvoiceEmail(data, invoiceId, pdfBuffer, betrag, vorlage = 'kaemmerer') {
  betrag = betrag ?? 296.31;
  const resend  = new Resend(process.env.RESEND_API_KEY);
  const pdfB64  = pdfBuffer.toString('base64');
  const filename = `Rechnung_${invoiceId}.pdf`;
  const frist    = new Date(); frist.setDate(frist.getDate() + parseInt(process.env.ZAHLUNGSZIEL_TAGE ?? '14'));

  const isHako = vorlage === 'hako';
  const absender   = isHako
    ? 'HAKO Beteiligungsgesellschaft mbH <rechnung@derkaemmerer.de>'
    : 'Rechnungsstelle Der Kämmerer <rechnung@derkaemmerer.de>';
  const grusszeile = isHako
    ? 'HAKO Beteiligungsgesellschaft mbH<br>Hertha-Lindner-Str. 10–12 · 01067 Dresden<br>HRB 29317 · AG Dresden'
    : 'Das Team von Der Kämmerer';
  const hinweis = isHako
    ? 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer als Verwendungszweck.'
    : 'Ihre Anzeige ist bereits freigeschaltet – den Betrag überweisen Sie bitte innerhalb des Zahlungsziels.';
  const footer = isHako
    ? 'HAKO Beteiligungsgesellschaft mbH · hako.team · anzeigen@derkaemmerer.de'
    : 'derkaemmerer.de · anzeigen@derkaemmerer.de';

  await resend.emails.send({
    from:    absender,
    to:      [data.email],
    cc:      ['anzeigen@derkaemmerer.de'],
    subject: data.abo ? `Ihre Rechnung ${invoiceId} – KommunalFlat ${aboText(data.abo).monat} (Abo ${data.abo.id})` : `Ihre Rechnung ${invoiceId}`,
    attachments: [{ filename, content: pdfB64 }],
    html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#172840;padding:24px;color:#fff">
    <h1 style="margin:0;font-size:20px">Rechnung ${invoiceId}</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px">${data.organisation}</p>
  </div>
  <div style="padding:24px">
    <p style="color:#374151">Sehr geehrte Damen und Herren,</p>
    <p style="color:#374151">${data.abo ? `anbei erhalten Sie die monatliche Rechnung zu Ihrem KommunalFlat-Abonnement ${data.abo.id} für ${aboText(data.abo).monat} (Leistungszeitraum ${aboText(data.abo).zeitraum}, ${aboText(data.abo).vm}) als PDF.` : 'anbei erhalten Sie Ihre Rechnung als PDF.'}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:24px 0">
      <tr style="background:#f8fafc">
        <td style="padding:10px;color:#6b7280">Rechnungsnummer</td>
        <td style="padding:10px;font-weight:bold;color:#172840">${invoiceId}</td>
      </tr>
      <tr>
        <td style="padding:10px;color:#6b7280">Betrag</td>
        <td style="padding:10px;color:#172840">${betrag.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} € (inkl. MwSt.)</td>
      </tr>
      <tr style="background:#f8fafc">
        <td style="padding:10px;color:#6b7280">Zahlungsziel</td>
        <td style="padding:10px;color:#172840">${frist.toLocaleDateString('de-DE')}</td>
      </tr>
      <tr>
        <td style="padding:10px;color:#6b7280">IBAN</td>
        <td style="padding:10px;color:#172840">${process.env.FIRMA_IBAN ?? '(wird nachgereicht)'}</td>
      </tr>
      <tr style="background:#f8fafc">
        <td style="padding:10px;color:#6b7280">Verwendungszweck</td>
        <td style="padding:10px;color:#172840">${invoiceId} · ${data.organisation}</td>
      </tr>
    </table>
    <p style="color:#374151">${data.abo?.folgerechnung ? 'Ihre KommunalFlat läuft unverändert weiter.' : hinweis}<br>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    <p style="color:#374151;margin-top:24px">Mit freundlichen Grüßen<br><strong>${grusszeile}</strong></p>
  </div>
  <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e2e8f0">
    ${footer}
  </div>
</div>`,
  });
}

// ─── Exportierte Funktion für direkten Aufruf aus booking.js ─────────────────

export async function createInvoice(data, positionen, vorlage = 'kaemmerer') {
  if (!data.organisation || !data.email) {
    throw new Error(`Pflichtfelder fehlen: organisation="${data.organisation}" email="${data.email}"`);
  }
  console.log(`[RE] Starte Rechnung für ${data.organisation} (${data.email})`);
  const { id, records, sha, path } = await nextInvoiceNumber();
  console.log(`[RE] Nächste Nummer: ${id}`);
  const pdf = await buildPDF(data, id, positionen, vorlage);
  console.log(`[RE] PDF generiert (${pdf.length} bytes)`);
  const netto = (positionen || []).reduce((s, p) => s + p.einzelpreis * p.menge, 0) || data.abo?.preis || 249;
  const mwst  = data.mwstSatz ?? 19;
  const brutto = Math.round(netto * (1 + mwst / 100) * 100) / 100;
  try {
    await sendInvoiceEmail(data, id, pdf, brutto, vorlage);
    console.log(`[RE] E-Mail gesendet an ${data.email}`);
  } catch (mailErr) {
    console.error(`[RE] E-Mail FEHLER:`, mailErr.message ?? mailErr);
    throw mailErr;
  }
  await saveInvoiceRecord(path, sha, records, {
    id,
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    organisation: data.organisation,
    email: data.email,
    betrag: brutto,
    ...(data.abo ? { abo: data.abo.id, monat: data.abo.monat } : {}),
    ...(data.art ? { art: data.art } : {}),
  });
  return id;
}

// ─── Webhook Handler ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body    = req.body;
    const isTally = body?.eventType || body?.data?.fields;

    // Payload für Debugging loggen
    console.log('RECHNUNG_PAYLOAD:', JSON.stringify(body).slice(0, 2000));

    let data;
    if (isTally) {
      data = parseTally(body);
      console.log('PARSED_DATA:', JSON.stringify(data));
    } else {
      data = body;
    }

    if (!data.organisation || !data.email) {
      // Fallback: Benachrichtigung an uns mit Rohdaten senden
      console.error('PARSE_FEHLER: organisation oder email fehlt', JSON.stringify({ organisation: data.organisation, email: data.email }));
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Der Kämmerer <anzeigen@derkaemmerer.de>',
        to: ['anzeigen@derkaemmerer.de'],
        subject: 'ACHTUNG: KommunalFlat-Buchung konnte nicht verarbeitet werden',
        html: `<p>Buchung eingegangen aber Pflichtfelder fehlen. Rohdaten:</p><pre>${JSON.stringify(body, null, 2).slice(0, 5000)}</pre>`,
      }).catch(e => console.error('Fallback-Mail-Fehler:', e));
      // 200 zurückgeben damit Tally nicht wiederholt versucht
      return res.status(200).json({ ok: false, error: 'Felder konnten nicht geparst werden — manuelle Prüfung erforderlich' });
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
