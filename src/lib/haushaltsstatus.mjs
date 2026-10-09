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

/** Auswertung NRW: Punkte für die Karte, Zahlen je Stufe, Listen. kommunen = kommunenMitSperre(...). */
export function nrwAuswertung({ gemeinden, hs, kommunen, pfad, projiziere }) {
  const daten = hs.gemeinden;
  const sperrUrls = new Set(kommunen.filter((k) => k.land === 'NW' && k.url && k.ebene !== 'kreis').map((k) => k.url));
  const nw = gemeinden.filter((g) => g.land === 'NW' && daten[g.ags]);
  const zeilen = nw.map((g) => ({ ags: g.ags, name: g.name, kreis: g.kreis, einwohner: g.einwohner || 0, s: daten[g.ags].s, u: daten[g.ags].u,
    url: `/gemeinden/${pfad[g.ags]}/`, sperre: sperrUrls.has(`/gemeinden/${pfad[g.ags]}/`), lat: g.lat, lon: g.lon, akt: (hs.aktualisierungen || {})[g.ags] || null }));
  const punkte = zeilen.filter((z) => z.lat != null).map((z) => ({ ...z, ...projiziere(z.lat, z.lon), r: Math.max(1.6, Math.min(4.2, Math.sqrt(z.einwohner / 9000))) }))
    .sort((a, b) => b.r - a.r);
  const zahl = Object.fromEntries(Object.keys(STUFEN).map((k) => [k, zeilen.filter((z) => z.s === Number(k)).length]));
  const ueberholt = zeilen.filter((z) => z.akt);
  return { zeilen, punkte, zahl, ueberholt, gesamt: zeilen.length, ueberschuldet: zeilen.filter((z) => z.u === 1), drohend: zeilen.filter((z) => z.u === 2 || z.u === 3),
    mitSperre: zeilen.filter((z) => z.sperre) };
}
