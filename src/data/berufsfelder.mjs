// Berufsfelder der Stellenbörse (Runbook 3.3). Zuordnung deterministisch über Stichwörter in Titel und Schlagwörtern,
// erste passende Gruppe in dieser Reihenfolge gewinnt; sonst „Allgemeine Verwaltung“.
export const BERUFSFELDER = [
  { slug: 'finanzen', name: 'Finanzen & Kämmerei', woerter: ['kämmer', 'finanz', 'haushalt', 'steuer', 'kasse', 'rechnungswesen', 'rechnungsprüf', 'controlling', 'buchhalt', 'beteiligung', 'abgaben', 'vollstreck', 'kalkulation', 'doppik', 'anlagenbuchhalt', 'fördermittel'] },
  { slug: 'it-digitalisierung', name: 'IT & Digitalisierung', woerter: ['informatik', /\bit\b/, 'digital', 'software', 'netzwerk', 'e-government', 'datenschutz', 'informationssicherheit', 'systemadmin', 'anwendungsbetreu', 'smart city', 'cyber'] },
  { slug: 'bau-technik', name: 'Bau, Planung & Technik', woerter: ['bau', 'ingenieur', 'planung', 'architekt', 'gebäude', 'liegenschaft', 'vermess', 'straßen', 'tiefbau', 'hochbau', 'umwelt', 'klimaschutz', 'stadtentwicklung', 'techni', 'abwasser', 'wasserwirtschaft', 'verkehr', 'grünflächen', 'energie'] },
  { slug: 'soziales-jugend', name: 'Soziales, Jugend & Bildung', woerter: ['jugend', 'sozial', 'kita', 'kindertages', 'eingliederung', 'teilhabe', 'familie', 'schul', 'bildung', 'pflege', 'gesundheit', 'senioren', 'integration', 'asyl', 'jobcenter', 'erzieh'] },
  { slug: 'recht-ordnung', name: 'Recht, Ordnung & Sicherheit', woerter: ['recht', 'jurist', 'justiziar', 'ordnung', 'bürgerbüro', 'bürgerservice', 'standesamt', 'feuerwehr', 'rettung', 'leitstelle', 'bevölkerungsschutz', 'gewerbe', 'ausländer', 'vergabe'] },
  { slug: 'personal-organisation', name: 'Personal & Organisation', woerter: ['personal', 'organisation', 'zentrale dienste', 'hauptamt', 'hauptverwaltung', 'gleichstellung', 'büroleit', 'assistenz', 'sekretariat', 'kommunikation', 'presse', 'öffentlichkeit'] },
];
export const ALLGEMEIN = { slug: 'allgemeine-verwaltung', name: 'Allgemeine Verwaltung', woerter: [] };

const passt = (text, w) => (w instanceof RegExp ? w.test(text) : text.includes(w));
const suche = (text) => BERUFSFELDER.find((f) => f.woerter.some((w) => passt(text, w)));

/** Titel entscheidet zuerst, Schlagwörter nur ersatzweise. */
export function berufsfeld(job) {
  return suche(` ${job.title || ''} `.toLowerCase())
    || suche(` ${(job.schlagwoerter || []).join(' ')} `.toLowerCase())
    || ALLGEMEIN;
}
