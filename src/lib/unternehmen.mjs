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
