// Tests der Rechner „Dienst & Karriere“ (Runbook 4.2: je Rechner mindestens 10 Fälle).
// Netto-Sollwerte: ~/Desktop/Der Kämmerer/SEO/Netto-Testfaelle-2026.xlsx – Steuern aus der externen Schnittstelle des
// BMF-Lohnsteuerrechners (PAP 2026, Abfrage 12.10.2026), SV-Anteile nach Rechengrößen 2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brutto, netto, stufenaufstieg, stufeBeiEinstellung, jahressonderzahlung, TABELLE } from '../src/lib/rechner/tvoed-rechner.mjs';
import { lohnsteuer2026 } from '../src/lib/rechner/lohnsteuer2026.mjs';

const NETTO = [ // [Fall, Brutto, StKl, Kinderfreibeträge, Kirchensteuer %, Sachsen, Zusatzbeitrag, Kinder, LSt, Soli, KiSt, Netto]
  [1, 4097.67, 1, 0, 0, true, 2.9, 0, 542.16, 0, 0, 2643.78],
  [2, 5454.10, 1, 0, 8, false, 2.9, 0, 908.25, 0, 72.66, 3286.93],
  [3, 4794.69, 3, 1, 9, false, 2.5, 1, 369.50, 0, 15.12, 3405.58],
  [4, 4979.11, 4, 1, 9, false, 3.1, 2, 789.41, 0, 58.89, 3085.19],
  [5, 3992.40, 5, 0, 0, false, 2.9, 0, 942.33, 0, 0, 2181.72],
  [6, 3440.25, 2, 0.5, 9, false, 2.9, 1, 297.75, 0, 17.08, 2397.82],
  [7, 6900.18, 3, 3, 9, false, 2.5, 3, 875.00, 0, 19.69, 4701.54],
  [8, 8204.11, 1, 0, 9, false, 2.9, 0, 1888.08, 22.87, 169.92, 4605.52],
  [9, 2586.79, 1, 0, 0, false, 2.9, 0, 205.16, 0, 0, 1819.01],
  [10, 5279.32, 6, 0, 0, false, 2.9, 0, 1418.25, 0, 0, 2712.82],
];
for (const [fall, b, stkl, zkf, ki, sachsen, kvz, kinder, lst, soli, kist, n] of NETTO) {
  test(`Netto Fall ${fall}: centgenau zu BMF + SV`, () => {
    const e = netto({ brutto: b, stkl, kinderfreibetraege: zkf, kirchensteuer: ki, sachsen, zusatzbeitrag: kvz, kinder });
    assert.equal(e.lohnsteuer, lst); assert.equal(e.soli, soli); assert.equal(e.kirchensteuer, kist); assert.equal(e.netto, n);
  });
}
test('Netto: Übergangsbereich wird abgelehnt', () => assert.throws(() => netto({ brutto: 1999, stkl: 1 })));
test('PAP 2026: Jahreslohnsteuer Grundfreibetrag (12.348 € Jahr, StKl I) ergibt 0', () => {
  assert.equal(lohnsteuer2026({ LZZ: 1, RE4: 1234800, STKL: 1 }).LSTLZZ, 0);
});

const BRUTTO = [ // [eg, stufe, anteil, monat]
  ['E9a', 3, 1, TABELLE.E9a[2]], ['E11', 4, 1, TABELLE.E11[3]], ['E13', 1, 1, TABELLE.E13[0]], ['E15', 6, 1, TABELLE.E15[5]], ['E1', 2, 1, TABELLE.E1[1]],
  ['E5', 3, 0.5, Math.round(TABELLE.E5[2] * 50) / 100], ['E10', 2, 0.75, Math.round(TABELLE.E10[1] * 75) / 100], ['E12', 5, 0.8, Math.round(TABELLE.E12[4] * 80) / 100],
  ['E8', 6, 1, TABELLE.E8[5]], ['E2', 1, 1, TABELLE.E2[0]],
];
for (const [eg, st, a, m] of BRUTTO) test(`Brutto ${eg}/${st} ${a * 100} %`, () => {
  const e = brutto({ eg, stufe: st, anteil: a });
  assert.equal(e.monat, m); assert.equal(e.jsz, Math.round(m * 85) / 100);
});
test('Brutto: E1 Stufe 1 gibt es nicht', () => assert.throws(() => brutto({ eg: 'E1', stufe: 1 })));

test('Stufenaufstieg E9a ab Stufe 1: 1/2/3/4/5 Jahre', () => {
  const v = stufenaufstieg({ eg: 'E9a', stufe: 1, seit: '2026-01-01' }).verlauf.map((x) => x.ab);
  assert.deepEqual(v, ['2026-01-01', '2027-01-01', '2029-01-01', '2032-01-01', '2036-01-01', '2041-01-01']);
});
test('Stufenaufstieg E11 Stufe 3 → 4 nach drei Jahren', () => assert.equal(stufenaufstieg({ eg: 'E11', stufe: 3, seit: '2025-07-01' }).naechste.ab, '2028-07-01'));
test('Stufenaufstieg E13 Stufe 5 → 6 nach fünf Jahren', () => assert.equal(stufenaufstieg({ eg: 'E13', stufe: 5, seit: '2024-04-01' }).naechste.ab, '2029-04-01'));
test('Stufenaufstieg E15 Stufe 6: Endstufe', () => assert.equal(stufenaufstieg({ eg: 'E15', stufe: 6, seit: '2020-01-01' }).naechste, null));
test('Stufenaufstieg E1 Stufe 2 → 3 nach vier Jahren', () => assert.equal(stufenaufstieg({ eg: 'E1', stufe: 2, seit: '2026-03-01' }).naechste.ab, '2030-03-01'));
test('Stufenaufstieg E1 bis Stufe 6: 16 Jahre', () => assert.equal(stufenaufstieg({ eg: 'E1', stufe: 2, seit: '2026-03-01' }).verlauf.at(-1).ab, '2042-03-01'));
test('Stufenaufstieg E5 Stufe 2 → 3 nach zwei Jahren', () => assert.equal(stufenaufstieg({ eg: 'E5', stufe: 2, seit: '2026-10-15' }).naechste.ab, '2028-10-15'));
test('Stufenaufstieg E9c Stufe 4: Verlauf bis 6 = 4 + 5 Jahre', () => assert.equal(stufenaufstieg({ eg: 'E9c', stufe: 4, seit: '2026-01-01' }).verlauf.at(-1).ab, '2035-01-01'));
test('Stufenaufstieg Monatsbetrag der neuen Stufe', () => assert.equal(stufenaufstieg({ eg: 'E10', stufe: 2, seit: '2026-01-01' }).naechste.monat, TABELLE.E10[2]));
test('Stufenaufstieg: Überleitungsgruppe abgelehnt', () => assert.throws(() => stufenaufstieg({ eg: 'E15Ü', stufe: 2, seit: '2026-01-01' })));
test('Stufenaufstieg: ungültige Stufe abgelehnt', () => assert.throws(() => stufenaufstieg({ eg: 'E1', stufe: 1, seit: '2026-01-01' })));

const EIN = [ // [eg, jahreEinschlaegig, erwarteteStufe]
  ['E9a', 0, 1], ['E9a', 0.5, 1], ['E9a', 1, 2], ['E9a', 2.9, 2], ['E9a', 3, 3], ['E13', 10, 3], ['E1', 0, 2], ['E1', 5, 2], ['E15', 1, 2], ['E5', 3.5, 3],
];
for (const [eg, j, st] of EIN) test(`Einstellung ${eg} mit ${j} Jahren → Stufe ${st}`, () => assert.equal(stufeBeiEinstellung({ eg, jahreEinschlaegig: j }).stufe, st));
test('Einstellung: Hinweis Abs. 2a bei höherer bisheriger Stufe', () => assert.equal(stufeBeiEinstellung({ eg: 'E11', jahreEinschlaegig: 4, bisherigeStufeOeD: 5 }).hinweise.length, 1));
test('Einstellung: Hinweis förderliche Zeiten', () => assert.match(stufeBeiEinstellung({ eg: 'E11', foerderlicheJahre: 2 }).hinweise[0], /Satz 3/));

const JSZT = [ // [eg, durchschnitt, monateOhne, bk, erwartet]
  ['E9a', 4000, 0, false, 3400], ['E13', 5000, 0, false, 4250], ['E5', 3000, 0, true, 2700], ['E9a', 4000, 0, true, 3400], ['E8', 3600, 6, false, 1530],
  ['E11', 4800, 3, false, 3060], ['E1', 2534.55, 0, false, 2154.37], ['E15', 7000, 12, false, 0], ['E10', 4200, 1, false, 3272.5], ['E12', 5555.55, 0, false, 4722.22],
];
for (const [eg, d, m, bk, erw] of JSZT) test(`Jahressonderzahlung ${eg} ${d} € ${m} Monate ohne Entgelt${bk ? ' (BT B/K)' : ''}`, () => {
  assert.equal(jahressonderzahlung({ eg, durchschnittJulSep: d, monateOhneEntgelt: m, besondererTeilBK: bk }).betrag, erw);
});
test('Jahressonderzahlung: kein Anspruch ohne Arbeitsverhältnis am 1.12.', () => assert.equal(jahressonderzahlung({ eg: 'E9a', durchschnittJulSep: 4000, imArbeitsverhaeltnisAm1Dez: false }).betrag, 0));
