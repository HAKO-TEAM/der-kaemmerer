import { Resend } from 'resend';
import { createInvoice } from './rechnung.js';
import { abosLesen, abosAendern, monatVon, vertragsmonat, faellig } from './_abo.js';

// Monatlicher Rechnungslauf KommunalFlat (Vercel-Cron am 1. des Monats, 05:00 UTC):
// je fälligem Abo (data/abos.json) eine Rechnung mit Abo-Nr., Leistungszeitraum und Vertragsmonat – sofort per Mail
// an die Rechnungsadresse des Kunden (Kopie an anzeigen@derkaemmerer.de). Danach Bericht an anzeigen@.
// Doppelschutz: Ein Monat gilt als abgerechnet, sobald er im Abo ODER in data/rechnungen.json (Feld abo/monat) steht –
// ein erneuter Aufruf erzeugt also keine zweite Rechnung.
// Aufruf nur durch den Vercel-Cron oder mit CRON_SECRET (?key=… bzw. Authorization: Bearer …).
async function schonInRechnungen(abo, monat) {
  const url = `https://api.github.com/repos/${process.env.GITHUB_OWNER || 'HAKO-TEAM'}/${process.env.GITHUB_REPO || 'der-kaemmerer'}/contents/data/rechnungen.json`;
  const r = await fetch(url, { headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' } });
  if (!r.ok) throw new Error('rechnungen.json nicht lesbar');
  const liste = JSON.parse(Buffer.from((await r.json()).content, 'base64').toString('utf8'));
  return liste.find((x) => x.abo === abo.id && x.monat === monat) || null;
}

export default async function handler(req, res) {
  const SECRET = process.env.CRON_SECRET;
  const auth = Boolean(SECRET) && (req.headers.authorization === `Bearer ${SECRET}` || req.query.key === SECRET);
  const cron = /vercel-cron/.test(req.headers['user-agent'] || '');
  if (!auth && !cron) return res.status(401).json({ error: 'nicht berechtigt' });

  const monat = monatVon();
  const zeilen = [];
  let gesendet = 0, fehler = 0;
  try {
    const { abos } = await abosLesen();
    for (const abo of abos.filter((a) => faellig(a, monat))) {
      try {
        const vorhanden = await schonInRechnungen(abo, monat);
        let id = vorhanden?.id;
        if (!vorhanden) {
          id = await createInvoice({
            organisation: abo.organisation, abteilung: abo.abteilung || '', ansprechpartner: abo.ansprechpartner || '',
            strasse: abo.strasse || '', plz: abo.plz || '', ort: abo.ort || '', email: abo.email, leitwegId: abo.leitwegId || '',
            abo: { id: abo.id, monat, vertragsmonat: vertragsmonat(abo, monat), laufzeit: abo.laufzeitMonate || 12,
                   preis: abo.preis, leistung: abo.leistung, folgerechnung: true },
          });
          gesendet++;
        }
        await abosAendern(`Abo ${abo.id}: Rechnung ${id} für ${monat}`, (liste) => {
          const a = liste.find((x) => x.id === abo.id);
          if (a && !(a.rechnungen ||= []).some((r) => r.monat === monat)) a.rechnungen.push({ monat, id, datum: new Date().toISOString().slice(0, 10) });
        });
        zeilen.push(`${abo.id} ${abo.organisation}: ${vorhanden ? 'bereits vorhanden' : 'gesendet'} ${id} an ${abo.email}`);
      } catch (e) {
        fehler++;
        zeilen.push(`${abo.id} ${abo.organisation}: FEHLER ${e.message}`);
        console.error('[ABO]', abo.id, e.message);
      }
    }
    const bericht = `Abo-Rechnungslauf ${monat}: ${gesendet} gesendet, ${fehler} Fehler, ${abos.length} Abos im Verzeichnis`;
    console.log(bericht + '\n' + zeilen.join('\n'));
    if ((zeilen.length || fehler) && process.env.RESEND_API_KEY) {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: 'Rechnungsstelle Der Kämmerer <rechnung@derkaemmerer.de>', to: ['anzeigen@derkaemmerer.de'],
        subject: `${fehler ? '⚠ ' : ''}${bericht}`, text: bericht + '\n\n' + zeilen.join('\n'),
      });
    }
    return res.status(fehler ? 500 : 200).json({ ok: !fehler, bericht, zeilen });
  } catch (e) {
    console.error('[ABO] Lauf fehlgeschlagen:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
