// Amtlicher Haushaltsstatus der NRW-Gemeinden (MHKBD NRW, Open.NRW) – Stufen, Farben, Texte.
export const STUFEN = {
  1: { kurz: 'ausgeglichen', lang: 'ausgeglichener Haushalt', text: 'Der Haushalt ist ohne Rückgriff auf Rücklagen ausgeglichen (§ 75 Abs. 2 S. 2 GO NRW).', farbe: '#15803d' },
  2: { kurz: 'fiktiv ausgeglichen', lang: 'fiktiv ausgeglichen (Ausgleichsrücklage)', text: 'Der Ausgleich gelingt nur durch Inanspruchnahme der Ausgleichsrücklage (§ 75 Abs. 2 S. 3 GO NRW).', farbe: '#84cc16' },
  3: { kurz: 'Rücklage sinkt', lang: 'genehmigte Verringerung der allgemeinen Rücklage', text: 'Die Kommunalaufsicht hat eine Verringerung der allgemeinen Rücklage genehmigt (§ 75 Abs. 4 GO NRW).', farbe: '#facc15' },
  4: { kurz: 'Fehlbetrag vorgetragen', lang: 'genehmigter Vortrag eines Jahresfehlbetrags', text: 'Ein Jahresfehlbetrag wird mit Genehmigung in künftige Jahre vorgetragen.', farbe: '#fb923c' },
  5: { kurz: 'HSK genehmigt', lang: 'Haushaltssicherungskonzept genehmigt', text: 'Die Gemeinde arbeitet unter einem genehmigten Haushaltssicherungskonzept (§ 76 Abs. 2 GO NRW).', farbe: '#ef4444' },
  6: { kurz: 'HSK nicht genehmigt', lang: 'Haushaltssicherungskonzept nicht genehmigt', text: 'Das Haushaltssicherungskonzept ist nicht genehmigt; die Gemeinde unterliegt der vorläufigen Haushaltsführung.', farbe: '#b91c1c' },
  7: { kurz: 'Nothaushalt', lang: 'dauerhafte vorläufige Haushaltsführung', text: 'Mangels festgestellter Jahresabschlüsse gilt dauerhaft die vorläufige Haushaltsführung.', farbe: '#7f1d1d' },
};
export const UEBERSCHULDUNG = { 0: null, 1: 'Überschuldung eingetreten (negatives Eigenkapital)', 2: 'Überschuldung droht im Finanzplanungszeitraum', 3: 'Überschuldung droht nach dem Finanzplanungszeitraum' };
