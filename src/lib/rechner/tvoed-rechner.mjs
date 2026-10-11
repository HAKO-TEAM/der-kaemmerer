// Rechenlogik der Rechner im Ressort „Dienst & Karriere“ (Runbook 4.2). Reine Funktionen, clientseitig und in Tests nutzbar.
// Werte: src/data/tarif/tvoed_vka_2026.json (Entgelttabelle), tvoed_regeln.mjs (Tarifregeln), rechengroessen_2026.mjs (SV).
import tarif from '../../data/tarif/tvoed_vka_2026.json' with { type: 'json' };
import { STUFENLAUFZEIT, E1, JSZ, EINSTELLUNG } from '../../data/tarif/tvoed_regeln.mjs';
import { SV_2026 as SV } from '../../data/tarif/rechengroessen_2026.mjs';
import { lohnsteuer2026 } from './lohnsteuer2026.mjs';

export const TABELLE = tarif.tabelle;
export const GRUPPEN = ['E1', 'E2', 'E2Ü', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9a', 'E9b', 'E9c', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15', 'E15Ü'];
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const stufen = (eg) => (TABELLE[eg] || []).map((w, i) => (w == null ? null : i + 1)).filter(Boolean);

/** Monatsbrutto nach Entgeltgruppe, Stufe und Teilzeitanteil (0 < anteil ≤ 1). */
export function brutto({ eg, stufe, anteil = 1 }) {
  const voll = TABELLE[eg]?.[stufe - 1];
  if (voll == null) throw new Error(`Stufe ${stufe} gibt es in ${eg} nicht`);
  if (!(anteil > 0 && anteil <= 1)) throw new Error('Teilzeitanteil muss zwischen 0 und 100 % liegen');
  const monat = r2(voll * anteil);
  return { eg, stufe, anteil, vollzeit: voll, monat, jahr: r2(monat * 12 + monat * JSZ.satz), jsz: r2(monat * JSZ.satz) };
}

/** Stufenaufstieg: nächste Stufe und Verlauf bis zur Endstufe (Regel-Laufzeiten nach § 16 Abs. 3/4; ohne § 17-Verkürzung/-Verlängerung). */
export function stufenaufstieg({ eg, stufe, seit }) {
  if (eg === 'E2Ü' || eg === 'E15Ü') throw new Error('Für Überleitungsgruppen gelten Sonderregeln – nicht im Rechner enthalten');
  const s = stufen(eg); if (!s.includes(stufe)) throw new Error(`Stufe ${stufe} gibt es in ${eg} nicht`);
  const verlauf = [{ stufe, ab: seit, monat: TABELLE[eg][stufe - 1] }];
  let d = new Date(seit + 'T00:00:00Z'), st = stufe;
  while (st < Math.max(...s)) {
    const jahre = eg === 'E1' ? E1.jahreJeStufe : STUFENLAUFZEIT[st - 1];
    d = new Date(Date.UTC(d.getUTCFullYear() + jahre, d.getUTCMonth(), d.getUTCDate()));
    st += 1;
    verlauf.push({ stufe: st, ab: d.toISOString().slice(0, 10), monat: TABELLE[eg][st - 1] });
  }
  return { eg, naechste: verlauf[1] || null, verlauf };
}

/** Stufenzuordnung bei Einstellung (§ 16 Abs. 2, Abs. 4; Hinweise zu Abs. 2 Satz 3 und Abs. 2a). */
export function stufeBeiEinstellung({ eg, jahreEinschlaegig = 0, bisherigeStufeOeD = null, foerderlicheJahre = 0 }) {
  const hinweise = [];
  let stufe, regel;
  if (eg === 'E1') { stufe = E1.eingangsstufe; regel = '§ 16 Abs. 4: Entgeltgruppe 1 – Einstellung in Stufe 2'; }
  else if (jahreEinschlaegig >= EINSTELLUNG.stufe3abJahren) { stufe = 3; regel = '§ 16 Abs. 2 Satz 2: mindestens drei Jahre einschlägige Berufserfahrung – in der Regel Stufe 3'; }
  else if (jahreEinschlaegig >= EINSTELLUNG.stufe2abJahren) { stufe = 2; regel = '§ 16 Abs. 2 Satz 2: mindestens ein Jahr einschlägige Berufserfahrung – Stufe 2'; }
  else { stufe = 1; regel = '§ 16 Abs. 2 Satz 1: ohne einschlägige Berufserfahrung – Stufe 1'; }
  if (foerderlicheJahre > 0 && eg !== 'E1') hinweise.push('§ 16 Abs. 2 Satz 3: Förderliche Zeiten kann der Arbeitgeber zur Deckung des Personalbedarfs ganz oder teilweise berücksichtigen – Verhandlungssache, kein Anspruch.');
  if (bisherigeStufeOeD && bisherigeStufeOeD > stufe && eg !== 'E1') hinweise.push(`§ 16 Abs. 2a: Bei Einstellung im unmittelbaren Anschluss an ein Arbeitsverhältnis im öffentlichen Dienst kann die bisherige Stufe (${bisherigeStufeOeD}) ganz oder teilweise berücksichtigt werden – Kann-Regel, kein Anspruch.`);
  const max = Math.max(...stufen(eg));
  return { eg, stufe: Math.min(stufe, max), regel, hinweise, monat: TABELLE[eg][Math.min(stufe, max) - 1] };
}

/** Jahressonderzahlung (§ 20 TVöD-VKA ab 2026). monateOhneEntgelt: Kalendermonate ohne Entgeltanspruch (ohne Elternzeit/Mutterschutz). */
export function jahressonderzahlung({ eg, durchschnittJulSep, monateOhneEntgelt = 0, besondererTeilBK = false, imArbeitsverhaeltnisAm1Dez = true }) {
  if (!imArbeitsverhaeltnisAm1Dez) return { betrag: 0, satz: 0, anteil: 0, hinweis: 'Kein Anspruch: Am 1. Dezember besteht kein Arbeitsverhältnis (§ 20 Abs. 1).' };
  const gruppe = parseInt(eg.slice(1), 10);
  const satz = besondererTeilBK && gruppe <= 8 ? JSZ.satzBkEg1bis8 : JSZ.satz;
  const monate = Math.max(0, Math.min(12, 12 - monateOhneEntgelt));
  const betrag = r2(durchschnittJulSep * satz * monate / 12);
  return { betrag, satz, anteil: monate / 12, voll: r2(durchschnittJulSep * satz) };
}

/** Netto für Monatsentgelte oberhalb des Übergangsbereichs. Lohnsteuer exakt nach PAP 2026 (BMF), SV-Anteile nach Rechengrößen 2026. */
export function netto({ brutto: b, stkl, kinderfreibetraege = 0, kirchensteuer = 0, sachsen = false, zusatzbeitrag = SV.zusatzbeitragDurchschnitt, kinder = 0, ab23 = true }) {
  if (b <= SV.uebergangsbereichBis) throw new Error(`Monatsentgelte bis ${SV.uebergangsbereichBis} € (Übergangsbereich) sind nicht enthalten`);
  const ls = lohnsteuer2026({ LZZ: 2, RE4: Math.round(b * 100), STKL: stkl, ZKF: kinderfreibetraege, R: kirchensteuer ? 1 : 0,
    KVZ: zusatzbeitrag, PVZ: kinder === 0 && ab23 ? 1 : 0, PVS: sachsen ? 1 : 0, PVA: Math.max(0, Math.min(kinder, SV.pvAbschlagMaxKinder) - 1), KRV: 0, ALV: 0, PKV: 0 });
  const lst = ls.LSTLZZ / 100, soli = ls.SOLZLZZ / 100;
  const kist = kirchensteuer ? Math.floor(ls.BK * kirchensteuer / 100) / 100 : 0;
  const kvb = Math.min(b, SV.bbgKvPv), rvb = Math.min(b, SV.bbgRvAv);
  const pvSatz = SV.pvAn + (sachsen ? SV.pvAnSachsenPlus : 0) + (kinder === 0 && ab23 ? SV.pvKinderlosZuschlag : 0)
    - (kinder >= 2 ? SV.pvAbschlagJeKind * (Math.min(kinder, SV.pvAbschlagMaxKinder) - 1) : 0);
  const kvSatz = SV.kvAllgemeinAn + zusatzbeitrag / 2;
  const kv = r2(kvb * kvSatz / 100), pv = r2(kvb * pvSatz / 100), rv = r2(rvb * SV.rvAn / 100), av = r2(rvb * SV.avAn / 100);
  const sv = r2(kv + pv + rv + av), steuern = r2(lst + soli + kist);
  return { brutto: b, lohnsteuer: lst, soli, kirchensteuer: kist, kv, pv, rv, av, sv, steuern, netto: r2(b - steuern - sv),
    saetze: { kv: kvSatz, pv: pvSatz, rv: SV.rvAn, av: SV.avAn }, bemessung: { kvPv: kvb, rvAv: rvb } };
}
