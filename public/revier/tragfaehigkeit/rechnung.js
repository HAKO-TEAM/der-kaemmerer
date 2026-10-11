// Tragfähigkeitsanalyse – Rechenkern (deterministisch). Eingabe: vollständiger Förderantrag + Haushaltsdaten der Kommune.
// Ausgabe: Jahreszeitreihen über die Zweckbindungsfrist, Haushaltswirkung inkl. Prüfung § 76 GO NRW, Kennzahlen, Ampel, Auflagen.

// KGSt-Bericht 8/2025 „Kosten eines Arbeitsplatzes“: Vollkosten je Stunde; Personalkosten je VZÄ wie im Nachbesetzungs-Check
// (Stundensatz × 1.561 Std. − Sachkosten 9.700 €) / 1,2 Gemeinkosten.
export const KGST = { 'E 2': 47.19, 'E 3': 48.96, 'E 4': 55.49, 'E 5': 55.18, 'E 6': 54.18, 'E 7': 54.64, 'E 8': 57.26, 'E 9a': 63.02, 'E 9b': 67.79,
  'E 9c': 68.33, 'E 10': 73.48, 'E 11': 78.55, 'E 12': 85.16, 'E 13': 82.24, 'E 14': 92.7, 'E 15': 101.46 };
export const personalkosten = (eg) => Math.round(((KGST[eg] || 63) * 1561 - 9700) / 1.2);

export const KG_NAMEN = { kg200: 'KG 200 Herrichten und Erschließen', kg300: 'KG 300 Bauwerk – Baukonstruktion', kg400: 'KG 400 Bauwerk – Technische Anlagen',
  kg500: 'KG 500 Außenanlagen und Freiflächen', kg600: 'KG 600 Ausstattung', kg700: 'KG 700 Baunebenkosten' };

const klon = (o) => JSON.parse(JSON.stringify(o));
const summe = (a) => a.reduce((x, y) => x + y, 0);

/** Annuität (Zins + Tilgung) eines Kredits. */
function kreditplan(betrag, zins, laufzeit, startJahr, jahre) {
  const rate = betrag > 0 ? (zins > 0 ? betrag * zins / (1 - Math.pow(1 + zins, -laufzeit)) : betrag / laufzeit) : 0;
  let rest = betrag; const out = {};
  for (const j of jahre) {
    if (j < startJahr || rest <= 0.5) { out[j] = { zins: 0, tilgung: 0, rest }; continue; }
    const z = rest * zins, t = Math.min(rest, rate - z); rest -= t; out[j] = { zins: z, tilgung: t, rest };
  }
  return out;
}

/** Hauptrechnung. st = Antrag (siehe muster.js). */
export function rechne(eingabe) {
  const st = klon(eingabe), p = st.projekt, k = st.kommune, b = st.betrieb, idx = st.indexierung;
  const start = p.baubeginn, inbetrieb = p.inbetriebnahme, ende = inbetrieb + p.zweckbindung - 1;
  const jahre = []; for (let j = start; j <= ende; j++) jahre.push(j);

  // ── Investition und Förderung
  const kg = p.kosten, gesamt = summe(Object.values(kg));
  const nichtFoerderfaehig = p.nichtFoerderfaehig || 0, foerderfaehig = gesamt - nichtFoerderfaehig;
  const foerderung = foerderfaehig * p.foerderquote, dritte = p.drittmittel || 0;
  const eigenanteil = Math.max(0, gesamt - foerderung - dritte);
  const kredit = eigenanteil * p.finanzierung.kreditanteil, eigenmittel = eigenanteil - kredit;
  const abfluss = {}; for (const j of jahre) abfluss[j] = gesamt * (p.mittelabfluss[j] || 0);

  // Baunebenkosten (KG 700) anteilig auf Bauwerk aktivieren; Sonderposten im Verhältnis Förderung+Dritte / Gesamt
  const bauwerk = kg.kg300 + kg.kg400;
  const anlagen = [
    { key: 'kg200', wert: kg.kg200, nd: st.nutzungsdauer.kg200 },
    { key: 'kg300', wert: kg.kg300 + kg.kg700 * (kg.kg300 / bauwerk), nd: st.nutzungsdauer.kg300 },
    { key: 'kg400', wert: kg.kg400 + kg.kg700 * (kg.kg400 / bauwerk), nd: st.nutzungsdauer.kg400 },
    { key: 'kg500', wert: kg.kg500, nd: st.nutzungsdauer.kg500 },
    { key: 'kg600', wert: kg.kg600, nd: st.nutzungsdauer.kg600 },
  ];
  const spQuote = (foerderung + dritte) / gesamt;

  // Ersatzinvestitionen innerhalb der Zweckbindung (nicht gefördert)
  const ersatz = [];
  for (const a of anlagen) for (let j = inbetrieb + a.nd; j <= ende; j += a.nd) {
    ersatz.push({ jahr: j, key: a.key, wert: a.wert * Math.pow(1 + idx.bau, j - inbetrieb), nd: a.nd });
  }

  const kp = kreditplan(kredit, p.finanzierung.zins, p.finanzierung.laufzeit, inbetrieb, jahre);
  const ersatzKredite = ersatz.map((e) => kreditplan(e.wert * p.finanzierung.kreditanteil, p.finanzierung.zins, Math.min(p.finanzierung.laufzeit, e.nd), e.jahr, jahre));

  // ── Betrieb (ab Inbetriebnahme; Inbetriebnahmejahr anteilig)
  const zeilen = jahre.map((j) => {
    const anteil = j < inbetrieb ? 0 : j === inbetrieb ? (p.monateErstesJahr / 12) : 1;
    const t = Math.max(0, j - inbetrieb);
    const fS = Math.pow(1 + idx.sach, t), fP = Math.pow(1 + idx.personal, t), fE = Math.pow(1 + idx.erloese, t);
    const energie = b.flaeche * b.energie * fS * anteil * (1 - (b.energieeinsparung || 0));
    const reinigung = b.flaeche * b.reinigung * fS * anteil;
    const wartung = b.flaeche * b.wartung * fS * anteil;
    const unterhaltung = (kg.kg300 + kg.kg400) * b.bauunterhaltung * fS * anteil;
    const pflege = kg.kg500 * b.pflegeAussen * fS * anteil;
    const personal = summe(b.personal.map((x) => x.vza * personalkosten(x.eg))) * fP * anteil;
    const sach = b.sachkosten * fS * anteil;
    const erloese = summe(b.erloese.map((x) => x.betrag * (x.auslastung ?? 1))) * fE * anteil;
    // Abschreibung und Sonderposten
    let afa = 0, sp = 0;
    if (j >= inbetrieb) for (const a of anlagen) if (j < inbetrieb + a.nd) { afa += a.wert / a.nd * anteil; sp += a.wert / a.nd * spQuote * anteil; }
    for (const e of ersatz) if (j >= e.jahr && j < e.jahr + e.nd) afa += e.wert / e.nd;
    const zinsen = kp[j].zins + summe(ersatzKredite.map((x) => x[j].zins));
    const tilgung = kp[j].tilgung + summe(ersatzKredite.map((x) => x[j].tilgung));
    const betrieb = energie + reinigung + wartung + unterhaltung + pflege + personal + sach;
    const ergebnis = -(betrieb + afa - sp + zinsen) + erloese;   // Wirkung auf den Ergebnishaushalt (negativ = Belastung)
    const ersatzJahr = summe(ersatz.filter((e) => e.jahr === j).map((e) => e.wert));
    const liquiditaet = -(betrieb + zinsen + tilgung) + erloese - (j < inbetrieb ? 0 : 0) - ersatzJahr * (1 - p.finanzierung.kreditanteil);
    return { jahr: j, anteil, energie, reinigung, wartung, unterhaltung, pflege, personal, sach, erloese, afa, sp, zinsen, tilgung, betrieb, ergebnis,
      investition: abfluss[j], foerderungEin: foerderung * (p.mittelabfluss[j] || 0), ersatz: ersatzJahr, liquiditaet };
  });

  // ── Haushaltswirkung: Ergebnisplan (mittelfristige Planung, danach fortgeschrieben) mit und ohne Projekt
  const planJahre = Object.keys(k.ergebnisplan).map(Number).sort();
  const letzter = planJahre[planJahre.length - 1];
  const plan = (j) => k.ergebnisplan[j] ?? k.ergebnisplan[letzter] * Math.pow(1 + (k.fortschreibung || 0), j - letzter);
  const rueckl = (mitProjekt) => {
    let ar = k.ausgleichsruecklage, allg = k.allgemeineRuecklage; const out = []; const trigger = [];
    for (const z of zeilen) {
      const vorAllg = allg, ergebnis = plan(z.jahr) + (mitProjekt ? z.ergebnis : 0);
      let rest = ergebnis;
      if (rest < 0) { const ausAR = Math.min(ar, -rest); ar -= ausAR; rest += ausAR; allg += rest; } else ar += rest;
      const verzehr = Math.max(0, vorAllg - allg);
      out.push({ jahr: z.jahr, ergebnis, ar, allg, verzehr, quote: vorAllg > 0 ? verzehr / vorAllg : 0, imPlan: z.jahr <= letzter });
    }
    // § 76 Abs. 1 GO NRW: (1) > 1/4 in einem Jahr, (2) zwei Folgejahre je > 1/20 (geplant), (3) aufgebraucht im Planungszeitraum
    out.forEach((o, i) => {
      if (o.imPlan && o.quote > 0.25) trigger.push({ jahr: o.jahr, regel: 'Verringerung der allgemeinen Rücklage um mehr als ein Viertel in einem Jahr' });
      if (i > 0 && o.imPlan && o.quote > 0.05 && out[i - 1].quote > 0.05) trigger.push({ jahr: o.jahr, regel: 'Verringerung in zwei aufeinanderfolgenden Jahren um jeweils mehr als ein Zwanzigstel' });
      if (o.allg <= 0 && o.imPlan) trigger.push({ jahr: o.jahr, regel: 'Allgemeine Rücklage im Zeitraum der mittelfristigen Planung aufgebraucht' });
    });
    const leer = out.find((o) => o.allg <= 0);
    return { reihe: out, trigger, reichweite: leer ? leer.jahr : null, ersterTrigger: trigger.length ? trigger.reduce((a, x) => (x.jahr < a.jahr ? x : a)) : null };
  };
  const ohne = rueckl(false), mit = rueckl(true);

  // ── Kennzahlen
  const betriebsjahre = zeilen.filter((z) => z.jahr > inbetrieb).slice(0, 10);
  const oeBelastung = -summe(betriebsjahre.map((z) => z.ergebnis)) / Math.max(1, betriebsjahre.length);
  const barwert = -summe(zeilen.map((z, i) => z.ergebnis / Math.pow(1 + (st.diskont || 0.02), i)));
  const punktwert = k.grundsteuerB / k.hebesatzB;   // Aufkommen je Hebesatzpunkt
  const status = k.haushaltsstatus;
  const streng = status >= 3;
  const jeEw = oeBelastung / k.einwohner;
  const [gr, ge] = streng ? [10, 40] : [25, 75];
  const loestAus = !ohne.ersterTrigger && !!mit.ersterTrigger;
  const vorzieht = ohne.ersterTrigger && mit.ersterTrigger && mit.ersterTrigger.jahr < ohne.ersterTrigger.jahr;
  const ampel = loestAus || vorzieht || jeEw >= ge ? 'rot' : jeEw >= gr ? 'gelb' : 'gruen';
  const deckung = summe(betriebsjahre.map((z) => z.erloese)) / Math.max(1, summe(betriebsjahre.map((z) => z.betrieb)));

  // ── Auflagen aus Regeln
  const auflagen = [];
  if (loestAus) auflagen.push({ prio: 1, text: `Das Vorhaben löst ${mit.ersterTrigger.jahr} die Pflicht zum Haushaltssicherungskonzept aus (${mit.ersterTrigger.regel}). Vor der Bewilligung ist eine Gegenfinanzierung der Folgekosten nachzuweisen.` });
  if (vorzieht) auflagen.push({ prio: 1, text: `Das Vorhaben zieht die Pflicht zum Haushaltssicherungskonzept von ${ohne.ersterTrigger.jahr} auf ${mit.ersterTrigger.jahr} vor.` });
  if (deckung < 0.5) auflagen.push({ prio: 2, text: `Erlöse decken nur ${Math.round(deckung * 100)} % der Betriebskosten. Ein Betreiber- oder Nutzungskonzept mit kostendeckenden Entgelten ist vorzulegen.` });
  const pAnteil = summe(betriebsjahre.map((z) => z.personal)) / Math.max(1, summe(betriebsjahre.map((z) => z.betrieb)));
  if (pAnteil > 0.3) auflagen.push({ prio: 2, text: `Personal macht ${Math.round(pAnteil * 100)} % der Betriebskosten aus. Neue Stellen sind im Stellenplan zu verankern oder über Dritte bzw. befristete Förderung abzudecken.` });
  if (nichtFoerderfaehig / gesamt > 0.05) auflagen.push({ prio: 3, text: `Nicht förderfähige Kosten von ${Math.round(nichtFoerderfaehig / 1000)} T€ (${(nichtFoerderfaehig / gesamt * 100).toFixed(1)} %) sind im Haushalt zusätzlich zu finanzieren.` });
  if (ersatz.length) auflagen.push({ prio: 3, text: `Innerhalb der Zweckbindungsfrist fallen Ersatzinvestitionen von ${Math.round(summe(ersatz.map((e) => e.wert)) / 1000)} T€ an (${[...new Set(ersatz.map((e) => KG_NAMEN[e.key].split(' ').slice(0, 2).join(' ')))].join(', ')}), die nicht gefördert werden.` });
  if (p.zweckbindung >= 20) auflagen.push({ prio: 3, text: `Zweckbindung ${p.zweckbindung} Jahre: Nutzungsänderungen innerhalb der Frist sind mit der Bewilligungsbehörde abzustimmen; bei Zweckverfehlung droht die anteilige Erstattung der Förderung.` });

  return { st, jahre, zeilen, anlagen, ersatz, gesamt, foerderfaehig, nichtFoerderfaehig, foerderung, dritte, eigenanteil, kredit, eigenmittel,
    ohne, mit, oeBelastung, jeEw, barwert, punktwert, hebesatzPunkte: oeBelastung / punktwert, ampel, schwellen: [gr, ge], deckung, auflagen, betriebsjahre };
}

/** Sensitivität: Ø Belastung bei ±Änderung je Treiber. */
export function sensitivitaet(st) {
  const basis = rechne(st).oeBelastung;
  const treiber = [
    ['Baukosten ±20 %', (s, f) => { for (const k in s.projekt.kosten) s.projekt.kosten[k] *= f; }, 0.2],
    ['Förderquote ±5 Punkte', (s, f) => { s.projekt.foerderquote = Math.min(1, s.projekt.foerderquote + (f - 1) / 0.2 * 0.05); }, 0.2],
    ['Zins ±1 Punkt', (s, f) => { s.projekt.finanzierung.zins = Math.max(0, s.projekt.finanzierung.zins + (f - 1) / 0.2 * 0.01); }, 0.2],
    ['Personal ±20 %', (s, f) => { s.betrieb.personal.forEach((x) => (x.vza *= f)); }, 0.2],
    ['Bewirtschaftung ±20 %', (s, f) => { s.betrieb.energie *= f; s.betrieb.reinigung *= f; s.betrieb.wartung *= f; }, 0.2],
    ['Erlöse ±20 %', (s, f) => { s.betrieb.erloese.forEach((x) => (x.betrag *= f)); }, 0.2],
    ['Bauunterhaltung ±20 %', (s, f) => { s.betrieb.bauunterhaltung *= f; s.betrieb.pflegeAussen *= f; }, 0.2],
  ];
  return treiber.map(([name, fn, d]) => {
    const hoch = klon(st); fn(hoch, 1 + d); const tief = klon(st); fn(tief, 1 - d);
    return { name, hoch: rechne(hoch).oeBelastung - basis, tief: rechne(tief).oeBelastung - basis };
  }).sort((a, b) => Math.max(Math.abs(b.hoch), Math.abs(b.tief)) - Math.max(Math.abs(a.hoch), Math.abs(a.tief)));
}

/** Szenarien: Basis, vorsichtig, mit Maßnahmen. */
export function szenarien(st, massnahmen) {
  const vorsicht = klon(st);
  for (const k in vorsicht.projekt.kosten) vorsicht.projekt.kosten[k] *= 1.15;
  vorsicht.betrieb.erloese.forEach((x) => (x.betrag *= 0.75));
  vorsicht.projekt.finanzierung.zins += 0.01;
  vorsicht.betrieb.personal.forEach((x) => (x.vza *= 1.1));
  return [
    { name: 'Basis (Antrag)', r: rechne(st) },
    { name: 'Vorsichtig', hinweis: 'Baukosten +15 %, Erlöse −25 %, Zins +1 Punkt, Personal +10 %', r: rechne(vorsicht) },
    { name: 'Mit Maßnahmen', hinweis: 'gewählte Maßnahmen aus der Ansicht „Maßnahmen“', r: rechne(massnahmen(st)) },
  ];
}
