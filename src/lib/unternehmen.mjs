// Kommunale Unternehmen (MK 13.10.2026): Stadtwerke/Versorger, Wohnungsgesellschaften, Verkehr/Entsorgung, weitere Betriebe.
// Erkennung über Organisationstyp und Namen; Sparkassen und Kliniken gehören nicht dazu.
// Land/Bund und Nicht-Unternehmen ausschließen (Landesbetriebe, Bundesämter, Studierendenwerke)
const AUS = /sparkasse|klinik|krankenhaus|klinikum|landesbank|thüringenforst|landeszentrum|akademisches förderungswerk|gebäudemanagement schleswig-holstein|\bamt für\b|landesbetrieb|bundes/i;
const UNTERNEHMEN = /stadtwerk|gmbh|\bag\b|aör|aoer|kaör|anstalt öffentlichen|eigenbetrieb|betriebe\b|betrieb\b|wohnungs|wohnbau|baugesellschaft|verkehrs|entsorg|abfall|stadtreinigung|wasser|abwasser|entwässerung|energie|versorg|bäder|baeder|kommunales unternehmen|zweckverband wasser/i;

export const SPARTEN = [
  { slug: 'versorger', name: 'Stadtwerke und Versorger', re: /stadtwerk|energie|versorg|wasser|abwasser|entwässerung|fernwärme|netz/i },
  { slug: 'wohnen', name: 'Wohnungsgesellschaften', re: /wohnungs|wohnbau|baugesellschaft|wohnen|gewoba|gewobag|\bwbg\b/i },
  { slug: 'verkehr', name: 'Verkehr und Entsorgung', re: /verkehrs|\bbus|bahn|entsorg|abfall|stadtreinigung|kommunalbetrieb|wirtschaftsbetriebe|bäder|baeder|hafen/i },
  { slug: 'weitere', name: 'Weitere kommunale Betriebe', re: /./ },
];

/** Ist dieser Arbeitgeber ein kommunales Unternehmen? */
export function istUnternehmen(org = '', orgtyp = '') {
  const t = `${orgtyp} ${org}`;
  if (AUS.test(t)) return false;
  if (/kommunales unternehmen|stadtwerke \/ versorger|wohnungsgesellschaft|verkehrsbetrieb|entsorgung \/ kommunalbetrieb|eigenbetrieb|anstalt/i.test(orgtyp)) return true;
  return UNTERNEHMEN.test(org);
}

/** Sparte eines kommunalen Unternehmens */
export function sparte(org = '', orgtyp = '') {
  const t = `${orgtyp} ${org}`;
  return SPARTEN.find((s) => s.re.test(t)) || SPARTEN[SPARTEN.length - 1];
}

/** Vergleichsschlüssel für Firmennamen (Bindestrich/Gedankenstrich, Akzente, Satzzeichen egal) */
export const schluessel = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export const LAND_NAME = { BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg', HE: 'Hessen', MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen', RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen' };

/**
 * Kommunale Unternehmen mit offenen Stellen in einer Gemeinde.
 * marktHier = Marktstellen dieser Gemeinde (stellenJeGemeinde), eigene = aktiveStellen() von derkaemmerer.de.
 * Ergebnis: [{ name, sparte, n, eigene: [{ slug, titel }] }], größte zuerst.
 */
export function unternehmenInGemeinde(marktHier, eigene, g) {
  const m = new Map();
  const k = schluessel;
  for (const s of marktHier) {
    if (!istUnternehmen(s.o)) continue;
    const e = m.get(k(s.o)) || { name: s.o, sparte: sparte(s.o).name, n: 0, eigene: [] };
    e.n++; m.set(k(s.o), e);
  }
  for (const j of eigene) {
    const d = j.data;
    if (d.ort !== g.name || d.bundesland !== LAND_NAME[g.land] || !istUnternehmen(d.organisation, d.orgtyp)) continue;
    const e = m.get(k(d.organisation)) || { name: d.organisation, sparte: sparte(d.organisation, d.orgtyp).name, n: 0, eigene: [] };
    e.eigene.push({ slug: j.id, titel: d.title }); e.n = Math.max(e.n, e.eigene.length); m.set(k(d.organisation), e);
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'de'));
}
