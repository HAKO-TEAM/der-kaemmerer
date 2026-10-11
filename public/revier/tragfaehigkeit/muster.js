// Musterantrag (fiktiv): Gemeinde Musterbach, „Neue Mitte Musterbach“. Realistische Größenordnungen, keine reale Kommune.
export const MUSTER = {
  antrag: {
    aktenzeichen: 'MUSTER-2026-017', programm: 'Investitionsgesetz Kohleregionen (InvKG) § 4 Abs. 1 Nr. 3 und 5', bewilligungsbehoerde: 'Bezirksregierung (Bewilligungsbehörde)',
    eingang: '2026-09-15', stern: '2. Stern (antragsreif)', ansprechpartner: 'Kämmerei Gemeinde Musterbach',
    ziele: 'Neue Ortsmitte als Gemeinschafts- und Versorgungsort: Gesundheitsetage für eine hausärztliche Zweigpraxis und Therapie, Räume für zwei Kita-Gruppen eines freien Trägers, Bürgersaal, Café und Quartiersplatz.',
    indikatoren: [{ name: 'Arbeitsplätze vor Ort (Praxis, Kita, Café)', wert: '17' }, { name: 'Nutzerinnen und Nutzer je Woche', wert: 'ca. 1.200' }, { name: 'Versiegelte Fläche entsiegelt', wert: '1.850 m²' }],
  },
  kommune: {
    name: 'Gemeinde Musterbach', kreis: 'Revierkreis (Muster)', einwohner: 12400, haushaltsstatus: 3,
    statusText: 'genehmigte Verringerung der allgemeinen Rücklage',
    ausgleichsruecklage: 0, allgemeineRuecklage: 18_000_000, kassenkredite: 9_300_000,
    grundsteuerB: 3_100_000, hebesatzB: 620,
    ergebnisplan: { 2026: -780_000, 2027: -690_000, 2028: -600_000, 2029: -520_000, 2030: -450_000 },
    fortschreibung: -0.03,
  },
  projekt: {
    titel: 'Neue Mitte Musterbach – Gemeinschaftshaus mit Gesundheitsetage, Kita-Räumen und Quartiersplatz',
    baubeginn: 2026, inbetriebnahme: 2028, monateErstesJahr: 4, zweckbindung: 25,
    kosten: { kg200: 350_000, kg300: 5_200_000, kg400: 1_550_000, kg500: 950_000, kg600: 450_000, kg700: 1_100_000 },
    nichtFoerderfaehig: 250_000, foerderquote: 0.9, drittmittel: 0,
    mittelabfluss: { 2026: 0.1, 2027: 0.45, 2028: 0.45 },
    finanzierung: { kreditanteil: 1, zins: 0.034, laufzeit: 30 },
  },
  nutzungsdauer: { kg200: 40, kg300: 50, kg400: 25, kg500: 20, kg600: 10 },
  betrieb: {
    flaeche: 2100, energie: 12, reinigung: 10, wartung: 6, energieeinsparung: 0,
    bauunterhaltung: 0.012, pflegeAussen: 0.015,
    personal: [
      { funktion: 'Hausmeister', eg: 'E 5', vza: 0.5 },
      { funktion: 'Quartiersmanagement', eg: 'E 10', vza: 1.0 },
      { funktion: 'Verwaltung und Vermietung', eg: 'E 8', vza: 0.25 },
    ],
    sachkosten: 25_000,
    erloese: [
      { art: 'Miete Gesundheitsetage (380 m² × 9 €)', betrag: 41_040, auslastung: 1 },
      { art: 'Miete Kita-Räume (freier Träger)', betrag: 25_200, auslastung: 1 },
      { art: 'Vermietung Bürgersaal', betrag: 12_000, auslastung: 1 },
      { art: 'Pacht Café', betrag: 9_600, auslastung: 1 },
    ],
  },
  indexierung: { personal: 0.025, sach: 0.02, erloese: 0.015, bau: 0.025 },
  diskont: 0.02,
};

// Maßnahmen, mit denen die Kommune die Folgekosten senken kann (Ansicht „Maßnahmen“)
export const MASSNAHMEN = [
  { id: 'qm', titel: 'Quartiersmanagement über Dritte', text: 'Quartiersmanagement durch einen freien Träger mit eigener Förderung (z. B. Städtebauförderung) statt eigener Stelle.',
    an: (s) => { s.betrieb.personal = s.betrieb.personal.filter((x) => x.funktion !== 'Quartiersmanagement'); } },
  { id: 'miete', titel: 'Kostenmiete statt Sozialmiete', text: 'Gesundheitsetage zu 11 €/m², Bürgersaal mit Staffelpreisen (+50 %), Café-Pacht umsatzabhängig (+25 %).',
    an: (s) => { s.betrieb.erloese.forEach((e) => { if (/Gesundheit/.test(e.art)) e.betrag = 380 * 11 * 12; if (/Saal/.test(e.art)) e.betrag *= 1.5; if (/Café/.test(e.art)) e.betrag *= 1.25; }); } },
  { id: 'energie', titel: 'Photovoltaik und Wärmepumpe', text: '180 T€ zusätzliche, förderfähige Investition; Energiekosten −35 %.',
    an: (s) => { s.projekt.kosten.kg400 += 180_000; s.betrieb.energieeinsparung = 0.35; } },
  { id: 'hausmeister', titel: 'Interkommunaler Hausmeisterdienst', text: 'Hausmeisterei gemeinsam mit der Nachbargemeinde; eigener Anteil halbiert.',
    an: (s) => { s.betrieb.personal.forEach((x) => { if (x.funktion === 'Hausmeister') x.vza *= 0.5; }); } },
  { id: 'kita', titel: 'Kita-Träger übernimmt Bewirtschaftung', text: 'Betriebskosten der Kita-Fläche (rund 25 % der Fläche) als Nebenkosten an den Träger.',
    an: (s) => { s.betrieb.erloese.push({ art: 'Nebenkosten Kita-Träger', betrag: 2100 * 0.25 * 28, auslastung: 1 }); } },
];
