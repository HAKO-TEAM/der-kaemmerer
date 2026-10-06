// Personal-Cockpit – Benchmark-Engine.
// Vergleicht eine Stelle mit dem kommunalen Stellenmarkt (src/data/markt/markt.json)
// und leitet Attraktivitätsindex, Wettbewerbsdruck und Verbesserungshebel ab.

import { LEISTUNGEN, FELD_NAMEN, LAENDER, niveauText } from './merkmale.mjs';

export const LKEYS = LEISTUNGEN.map(([k]) => k);
export const LNAME = Object.fromEntries(LEISTUNGEN.map(([k, n]) => [k, n]));
const bit = (s, k) => (s.k >> LKEYS.indexOf(k)) & 1;
export const leistungsListe = (s) => LKEYS.filter((k) => bit(s, k));
const anzahlLeistungen = (s) => { let c = 0, x = s.k || 0; while (x) { c += x & 1; x >>= 1; } return c; };

function quantil(arr, q) {
  const a = arr.filter((x) => x != null).sort((x, y) => x - y);
  if (!a.length) return null;
  const i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return a[lo] + (a[hi] - a[lo]) * (i - lo);
}
function rang(arr, wert) { // Anteil der Werte unter wert (0..1), Gleichstand halb
  const a = arr.filter((x) => x != null);
  if (!a.length || wert == null) return null;
  let u = 0, g = 0;
  for (const x of a) { if (x < wert) u++; else if (x === wert) g++; }
  return (u + g / 2) / a.length;
}
const anteil = (arr, f) => (arr.length ? arr.filter(f).length / arr.length : null);

export function km(a, b) {
  if (a.la == null || b.la == null) return Infinity;
  const r = Math.PI / 180, dLa = (b.la - a.la) * r, dLo = (b.lo - a.lo) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.la * r) * Math.cos(b.la * r) * Math.sin(dLo / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// ── Vergleichsgruppe ─────────────────────────────────────────────────────────
export function vergleichsgruppe(stelle, alle, { min = 25 } = {}) {
  const ohne = alle.filter((s) => s.id !== stelle.id);
  const passt = (s, breit) => s.f === stelle.f
    && (stelle.n == null || s.n == null || Math.abs(s.n - stelle.n) <= (breit ? 2 : 1.01))
    && (breit || (s.L || 0) === (stelle.L || 0));
  const stufen = [
    ['im Land, gleiche Entgeltstufe ±1', (s) => passt(s, false) && stelle.l && s.l === stelle.l, min],
    ['bundesweit, gleiche Entgeltstufe ±1', (s) => passt(s, false), min],
    ['bundesweit, Entgeltstufe ±2', (s) => passt(s, true), 12],
    ['bundesweit, Entgeltstufe ±2, alle Funktionsfelder der Verwaltung', (s) => (stelle.n == null || s.n == null || Math.abs(s.n - stelle.n) <= 2.01) && (s.L || 0) === (stelle.L || 0) && !['kita', 'gesundheit', 'technik'].includes(s.f), 12],
    ['bundesweit, gleiches Funktionsfeld', (s) => s.f === stelle.f, 0],
  ];
  for (const [label, f, mindest] of stufen) {
    const g = ohne.filter(f);
    if (g.length >= mindest && g.length) return { label, stellen: g };
  }
  return { label: 'gesamter Markt', stellen: ohne };
}

// ── Kennzahlen einer Gruppe ──────────────────────────────────────────────────
export function kennzahlen(g) {
  const n = g.map((s) => s.n);
  return {
    anzahl: g.length,
    niveau: { p25: quantil(n, 0.25), median: quantil(n, 0.5), p75: quantil(n, 0.75), werte: n.filter((x) => x != null) },
    homeoffice: anteil(g, (s) => s.h),
    befristet: anteil(g, (s) => s.b),
    teilzeit: anteil(g, (s) => s.tz),
    leistungenMedian: quantil(g.map(anzahlLeistungen), 0.5),
    leistungenWerte: g.map(anzahlLeistungen),
    leistungen: Object.fromEntries(LKEYS.map((k) => [k, anteil(g, (s) => bit(s, k))])),
    frist: quantil(g.map((s) => s.fr).filter((x) => x != null && x > 0 && x < 120), 0.5),
    woerter: quantil(g.map((s) => s.w).filter((x) => x), 0.5),
    ansprechpartner: anteil(g, (s) => s.g),
  };
}

// ── Bewertung ────────────────────────────────────────────────────────────────
export function bewerten(stelle, alle) {
  const gruppe = vergleichsgruppe(stelle, alle);
  const kz = kennzahlen(gruppe.stellen);
  const umkreis = alle.filter((s) => s.id !== stelle.id && s.o !== stelle.o && s.f === stelle.f && km(stelle, s) <= 50
    && (stelle.n == null || s.n == null || Math.abs(s.n - stelle.n) <= 1.01));
  const umkreisBesser = umkreis.filter((s) => stelle.n != null && s.n != null && s.n > stelle.n + 0.2);

  const anz = anzahlLeistungen(stelle);
  const rEntgelt = stelle.n != null ? rang(kz.niveau.werte, stelle.n) : null;
  const rLeist = rang(kz.leistungenWerte, anz);

  // Teilwerte 0..100
  const teile = [];
  teile.push(['Entgelt', rEntgelt != null ? rEntgelt * 100 : 35, 30]);
  teile.push(['Arbeitgeberleistungen', (rLeist ?? 0.5) * 100, 25]);
  teile.push(['Homeoffice', stelle.h ? 100 : (1 - (kz.homeoffice ?? 0.5)) * 60, 12]);
  teile.push(['Unbefristet', stelle.b ? (1 - (kz.befristet ?? 0.2)) * 40 : 100, 10]);
  teile.push(['Teilzeit möglich', stelle.tz ? 100 : (1 - (kz.teilzeit ?? 0.5)) * 70, 6]);
  const fr = stelle.fr, frM = kz.frist;
  teile.push(['Bewerbungsfrist', fr == null || frM == null ? 60 : fr >= frM * 0.85 ? 100 : Math.max(10, (fr / frM) * 100), 7]);
  const tq = (stelle.w ? Math.min(1, stelle.w / Math.max(250, (kz.woerter || 400) * 0.8)) * 70 : 40) + (stelle.g ? 30 : 0);
  teile.push(['Textqualität & Kontakt', tq, 10]);
  const summeG = teile.reduce((a, [, , w]) => a + w, 0);
  const index = Math.round(teile.reduce((a, [, v, w]) => a + Math.max(0, Math.min(100, v)) * w, 0) / summeG);

  // Wettbewerbsdruck im Umkreis
  const druck = umkreis.length >= 15 ? 'hoch' : umkreis.length >= 6 ? 'mittel' : 'gering';
  const malus = { hoch: 12, mittel: 5, gering: 0 }[druck];
  const chance = index - malus;
  const ampel = chance >= 62 ? 'gruen' : chance >= 45 ? 'gelb' : 'rot';

  return {
    gruppe: { label: gruppe.label, anzahl: gruppe.stellen.length },
    kz, index, teile: teile.map(([n, v, w]) => ({ name: n, wert: Math.round(Math.max(0, Math.min(100, v))), gewicht: w })),
    rEntgelt, anzahlLeistungen: anz,
    umkreis: { anzahl: umkreis.length, besserBezahlt: umkreisBesser.length, druck,
      arbeitgeber: [...new Set(umkreis.map((s) => s.o))].slice(0, 12) },
    ampel,
    hebel: hebel(stelle, kz, { rEntgelt, anz, umkreis, umkreisBesser }),
  };
}

// ── Verbesserungshebel (konkret, nach Wirkung sortiert) ──────────────────────
function prozent(x) { return x == null ? '–' : Math.round(x * 100) + ' %'; }
export function hebel(s, kz, { rEntgelt, anz, umkreis, umkreisBesser }) {
  const h = [];
  if (s.n != null && kz.niveau.median != null && s.n < kz.niveau.median - 0.2) {
    h.push({ gewicht: 30, typ: 'Entgelt', titel: `Entgelt liegt unter dem Marktmedian (${niveauText(s.n)} gegenüber ${niveauText(kz.niveau.median)})`,
      text: `${Math.round((1 - (rEntgelt ?? 0)) * 100)} % der Vergleichsstellen zahlen mehr. Prüfen Sie eine höhere Eingruppierung, eine Fachkräftezulage oder die Vorweggewährung von Erfahrungsstufen – und nennen Sie das ausdrücklich im Text.` });
  }
  if (s.n == null) h.push({ gewicht: 22, typ: 'Entgelt', titel: 'Entgelt ist nicht eindeutig genannt',
    text: 'Nennen Sie Entgeltgruppe bzw. Besoldung und, falls möglich, eine Spanne in Euro. Die EU-Entgelttransparenzrichtlinie verlangt künftig Angaben zum Einstiegsentgelt; Bewerber filtern schon heute danach.' });
  if (!s.h && (kz.homeoffice ?? 0) >= 0.35) h.push({ gewicht: 18, typ: 'Arbeitsort', titel: `Homeoffice fehlt – ${prozent(kz.homeoffice)} der Vergleichsstellen bieten es`,
    text: 'Wenn die Aufgabe es zulässt: mobiles Arbeiten anteilig (z. B. bis zu zwei Tage pro Woche) zusichern und konkret beziffern.' });
  if (s.b && (kz.befristet ?? 1) < 0.35) h.push({ gewicht: 16, typ: 'Vertrag', titel: `Befristung – nur ${prozent(kz.befristet)} der Vergleichsstellen sind befristet`,
    text: 'Befristete Stellen verlieren gegen unbefristete Angebote im Umkreis. Prüfen Sie eine unbefristete Besetzung oder eine Übernahmeperspektive und nennen Sie sie.' });
  if (!s.tz && (kz.teilzeit ?? 0) >= 0.5) h.push({ gewicht: 8, typ: 'Arbeitszeit', titel: `Teilzeit nicht erwähnt – ${prozent(kz.teilzeit)} der Vergleichsstellen bieten sie`,
    text: 'Ein Satz „Die Stelle ist grundsätzlich teilbar“ erweitert den Bewerberkreis spürbar.' });
  const fehlend = LKEYS.filter((k) => !bit(s, k) && (kz.leistungen[k] ?? 0) >= 0.3)
    .sort((a, b) => kz.leistungen[b] - kz.leistungen[a]);
  if (fehlend.length) h.push({ gewicht: 14 + Math.min(10, fehlend.length * 2), typ: 'Leistungen',
    titel: anz < (kz.leistungenMedian ?? 0) ? `${anz} Arbeitgeberleistungen genannt – im Markt üblich sind ${Math.round(kz.leistungenMedian ?? 0)}` : `${fehlend.length} marktübliche Leistung${fehlend.length > 1 ? 'en' : ''} nicht genannt`,
    text: 'Häufig angeboten, bei Ihnen nicht erwähnt: ' + fehlend.slice(0, 6).map((k) => `${LNAME[k]} (${prozent(kz.leistungen[k])})`).join(', ') + '. Vieles davon bieten Kommunen ohnehin – es muss nur im Text stehen.' });
  if (s.fr != null && kz.frist != null && s.fr < kz.frist * 0.75) h.push({ gewicht: 9, typ: 'Frist', titel: `Bewerbungsfrist kurz (${s.fr} Tage, üblich ${Math.round(kz.frist)})`,
    text: 'Eine längere Frist erhöht die Zahl der Bewerbungen, besonders bei Wechselwilligen mit Kündigungsfrist.' });
  if (s.w && kz.woerter && s.w < kz.woerter * 0.6) h.push({ gewicht: 7, typ: 'Text', titel: 'Ausschreibungstext deutlich kürzer als üblich',
    text: 'Beschreiben Sie Aufgaben, Team und Gestaltungsspielraum konkreter – kurze Texte wirken austauschbar.' });
  if (!s.g) h.push({ gewicht: 6, typ: 'Kontakt', titel: 'Keine Ansprechperson erkennbar',
    text: 'Eine namentliche Ansprechperson mit Telefon und E-Mail senkt die Hürde für Rückfragen und Bewerbungen.' });
  if (umkreisBesser.length >= 3) h.push({ gewicht: 12, typ: 'Wettbewerb', titel: `${umkreisBesser.length} vergleichbare Stellen im Umkreis von 50 km zahlen mehr`,
    text: 'Ihre Zielgruppe hat in erreichbarer Nähe besser bezahlte Alternativen. Hier wirken Entgelt, Homeoffice und ein klares Profil der Aufgabe am stärksten.' });
  return h.sort((a, b) => b.gewicht - a.gewicht);
}

// ── Marktüberblick (für Startseite und Cockpit) ──────────────────────────────
export function ueberblick(alle) {
  const proFeld = {}, proLand = {};
  for (const s of alle) { (proFeld[s.f] ||= []).push(s); if (s.l) (proLand[s.l] ||= []).push(s); }
  const feld = Object.entries(proFeld).map(([k, g]) => ({ k, name: FELD_NAMEN[k] || k, anzahl: g.length,
    median: quantil(g.map((s) => s.n), 0.5), homeoffice: anteil(g, (s) => s.h), befristet: anteil(g, (s) => s.b) }))
    .sort((a, b) => b.anzahl - a.anzahl);
  const land = Object.entries(proLand).map(([k, g]) => ({ k, name: LAENDER[k] || k, anzahl: g.length,
    median: quantil(g.map((s) => s.n), 0.5), homeoffice: anteil(g, (s) => s.h) })).sort((a, b) => b.anzahl - a.anzahl);
  const kz = kennzahlen(alle);
  const top = LKEYS.map((k) => ({ k, name: LNAME[k], anteil: kz.leistungen[k] })).sort((a, b) => b.anteil - a.anteil);
  return { anzahl: alle.length, arbeitgeber: new Set(alle.map((s) => s.o)).size, feld, land, kz, top,
    leitung: anteil(alle, (s) => s.L), wiederausschreibung: alle.filter((s) => s.wa).length };
}

export { FELD_NAMEN, LAENDER, niveauText };
