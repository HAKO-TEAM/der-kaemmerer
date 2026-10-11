// Ressort „Dienst & Karriere“ (Runbook 4.1): Bereiche und Rechner.
export const RESSORT = { titel: 'Dienst & Karriere', unterzeile: 'Gehalt, Tarif, Laufbahn und Stellen im kommunalen Dienst', url: '/dienst-karriere/' };

export const RECHNER = [
  { slug: 'tvoed-brutto', name: 'TVöD-Bruttorechner', kurz: 'Monatsbrutto nach Entgeltgruppe, Stufe und Teilzeit – mit Jahresbetrag.' },
  { slug: 'tvoed-netto', name: 'TVöD-Nettorechner', kurz: 'Netto nach Steuerklasse, Kinderfreibeträgen, Kirchensteuer und Zusatzbeitrag – Lohnsteuer nach amtlichem Programmablaufplan 2026.' },
  { slug: 'stufenaufstieg', name: 'Stufenaufstieg', kurz: 'Termin des nächsten Stufenaufstiegs und Gehaltsverlauf bis zur Endstufe.' },
  { slug: 'stufe-bei-wechsel', name: 'Stufe bei Einstellung und Wechsel', kurz: 'Stufenzuordnung nach Berufserfahrung – mit den Spielräumen des Arbeitgebers.' },
  { slug: 'jahressonderzahlung', name: 'Jahressonderzahlung', kurz: 'Höhe der Jahressonderzahlung 2026 nach Bemessungsgrundlage, auch anteilig.' },
];

export const BEREICHE = [
  { slug: 'gehalt', name: 'Gehalt', text: 'Entgeltgruppen, Stufen, Zulagen und Leistungsentgelt im TVöD – mit der vollständigen Entgelttabelle 2026 und den offenen Stellen je Entgeltgruppe.', rechner: ['tvoed-brutto', 'tvoed-netto', 'jahressonderzahlung'], links: [{ name: 'TVöD-Tabelle 2026', url: '/gehalt/' }] },
  { slug: 'tarif', name: 'Tarif', text: 'Arbeitszeit, Urlaub, Überstunden, Teilzeit und Jahressonderzahlung nach dem TVöD für Beschäftigte der Kommunen.', rechner: ['jahressonderzahlung', 'stufenaufstieg'], links: [] },
  { slug: 'laufbahn', name: 'Laufbahn', text: 'Angestelltenlehrgang, Verwaltungsfachwirt, Aufstieg in den gehobenen Dienst und Wechsel zwischen Kommunen.', rechner: ['stufe-bei-wechsel', 'stufenaufstieg'], links: [{ name: 'Stellen in Personal & Organisation', url: '/stellen/berufsfeld/personal-organisation/' }] },
  { slug: 'arbeitsrecht', name: 'Arbeitsrecht', text: 'Eingruppierung, Befristung, Stufenzuordnung und Beteiligungsrechte im kommunalen Dienst.', rechner: ['stufe-bei-wechsel'], links: [] },
  { slug: 'ausbildung', name: 'Ausbildung', text: 'Verwaltungsfachangestellte, duales Studium Public Management und Ausbildungsvergütung bei Kommunen.', rechner: ['tvoed-brutto'], links: [] },
];
