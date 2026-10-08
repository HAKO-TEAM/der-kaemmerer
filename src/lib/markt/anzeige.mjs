// Marktvergleich für eine veröffentlichte Anzeige der Stellenbörse (öffentliche, neutrale Sicht für Bewerber).
// Ampel, Index und Verbesserungshebel bleiben dem Personal-Cockpit (Arbeitgeber) vorbehalten.

import { funktionsfeld, istLeitung, niveau, leistungen, htmlZuText, LEISTUNGEN, FELD_NAMEN, niveauText } from './merkmale.mjs';
import { vergleichsgruppe, kennzahlen, km } from './benchmark.mjs';

const LAND = { 'Baden-Württemberg': 'BW', Bayern: 'BY', Berlin: 'BE', Brandenburg: 'BB', Bremen: 'HB', Hamburg: 'HH', Hessen: 'HE',
  'Mecklenburg-Vorpommern': 'MV', Niedersachsen: 'NI', 'Nordrhein-Westfalen': 'NW', 'Rheinland-Pfalz': 'RP', Saarland: 'SL',
  Sachsen: 'SN', 'Sachsen-Anhalt': 'ST', 'Schleswig-Holstein': 'SH', 'Thüringen': 'TH' };
const LBIT = Object.fromEntries(LEISTUNGEN.map(([k], i) => [k, 1 << i]));

export function stelleAusAnzeige(d, body, markt) {
  const text = htmlZuText(body || '');
  const lst = leistungen(text);
  const idMatch = (d.bewerbungslink || '').match(/[?&]id=(\d+)/);
  const imMarkt = markt.stellen.find((s) => (idMatch && s.id === 'ia' + idMatch[1]) || s.u === d.bewerbungslink);
  const ortRef = imMarkt || markt.stellen.find((s) => s.ort && d.ort && s.ort.toLowerCase() === d.ort.toLowerCase() && s.la != null);
  return {
    id: imMarkt?.id || 'anzeige', t: d.title, o: d.organisation,
    l: LAND[d.bundesland] || imMarkt?.l || null, la: ortRef?.la ?? null, lo: ortRef?.lo ?? null,
    f: funktionsfeld(d.title), L: istLeitung(d.title) ? 1 : 0,
    n: niveau(d.entgelt) ?? imMarkt?.n ?? null,
    h: lst.includes('homeoffice') || imMarkt?.h ? 1 : 0,
    b: /befristet/i.test(d.befristung || '') && !/unbefristet/i.test(d.befristung || '') ? 1 : 0,
    k: lst.reduce((s, k) => s | (LBIT[k] || 0), 0),
  };
}

export function marktKontext(stelle, markt) {
  const g = vergleichsgruppe(stelle, markt.stellen);
  const kz = kennzahlen(g.stellen);
  const umkreis = stelle.la == null ? null : markt.stellen.filter((s) => s.id !== stelle.id && s.o !== stelle.o && s.f === stelle.f
    && km(stelle, s) <= 50 && (stelle.n == null || s.n == null || Math.abs(s.n - stelle.n) <= 1.01)).length;
  const werte = kz.niveau.werte;
  const anteilDarunter = stelle.n == null || !werte.length ? null : werte.filter((x) => x < stelle.n - 0.05).length / werte.length;
  const top = LEISTUNGEN.map(([k, name]) => ({ k, name, anteil: kz.leistungen[k] ?? 0, hier: !!(stelle.k & LBIT[k]) }))
    .sort((a, b) => b.anteil - a.anteil).slice(0, 6);
  return {
    feld: FELD_NAMEN[stelle.f] || 'Kommunalverwaltung', gruppe: g.label, anzahl: g.stellen.length,
    median: kz.niveau.median, p25: kz.niveau.p25, p75: kz.niveau.p75, n: stelle.n, anteilDarunter,
    homeoffice: kz.homeoffice, befristet: kz.befristet, hierHomeoffice: !!stelle.h, umkreis, top,
    niveauText,
  };
}
