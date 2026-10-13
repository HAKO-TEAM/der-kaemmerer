// KommunalFlat-Abonnements: Verzeichnis data/abos.json (im Repo, über die GitHub-API gepflegt).
// Je Abo: Kunde + Rechnungsanschrift, Preis, Start (erster Abo-Monat), Laufzeit, Status und die bereits
// abgerechneten Monate. Der Monatslauf (api/abo-rechnungen.js) schreibt am 1. jedes Monats eine Rechnung je aktivem Abo.
// Kündigung: status "gekuendigt" und "endeMonat" (letzter abzurechnender Monat, JJJJ-MM) eintragen.
const GH = () => ({
  url: `https://api.github.com/repos/${process.env.GITHUB_OWNER || 'HAKO-TEAM'}/${process.env.GITHUB_REPO || 'der-kaemmerer'}/contents/data/abos.json`,
  headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
});

export async function abosLesen() {
  const { url, headers } = GH();
  const r = await fetch(url, { headers });
  if (r.status === 404) return { abos: [], sha: undefined };
  if (!r.ok) throw new Error('abos.json nicht lesbar: ' + r.status);
  const j = await r.json();
  return { abos: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')), sha: j.sha };
}

/** Ändert das Verzeichnis per Funktion (liest frisch, bei Konflikt bis zu 3 Versuche). */
export async function abosAendern(nachricht, aendern) {
  const { url, headers } = GH();
  for (let versuch = 0; versuch < 3; versuch++) {
    const { abos, sha } = await abosLesen();
    const neu = aendern(abos) ?? abos;
    const r = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({
      message: nachricht, branch: 'main', ...(sha ? { sha } : {}),
      content: Buffer.from(JSON.stringify(neu, null, 2) + '\n', 'utf8').toString('base64') }) });
    if (r.ok) return neu;
    if (r.status !== 409 && r.status !== 422) throw new Error('abos.json nicht gespeichert: ' + r.status);
  }
  throw new Error('abos.json: Konflikt');
}

export const monatVon = (d = new Date()) => {
  const t = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
};
const monatsIndex = (m) => { const [j, mm] = m.split('-').map(Number); return j * 12 + mm - 1; };
/** Vertragsmonat (1 = Startmonat) */
export const vertragsmonat = (abo, monat) => monatsIndex(monat) - monatsIndex(abo.start) + 1;

/** Ist dieses Abo für den Monat abzurechnen? */
export function faellig(abo, monat) {
  if (abo.status !== 'aktiv' && abo.status !== 'gekuendigt') return false;
  if (monatsIndex(monat) < monatsIndex(abo.start)) return false;
  if (abo.endeMonat && monatsIndex(monat) > monatsIndex(abo.endeMonat)) return false;
  return !(abo.rechnungen || []).some((r) => r.monat === monat);
}

export function naechsteAboId(abos, jahr = new Date().getFullYear()) {
  const max = abos.filter((a) => a.id.startsWith(`ABO-${jahr}-`)).reduce((m, a) => Math.max(m, parseInt(a.id.split('-')[2]) || 0), 0);
  return `ABO-${jahr}-${String(max + 1).padStart(3, '0')}`;
}
