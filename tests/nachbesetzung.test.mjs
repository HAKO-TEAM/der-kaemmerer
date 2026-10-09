// Tests Schnellbefund Nachbesetzungs-Check (src/lib/markt/nachbesetzung.mjs). Aufruf: npm test
// Die Werte müssen mit der Pipeline ~/nachbesetzungs-check (Python) übereinstimmen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRAD, personalkosten, egAusNiveau, kostenEg, empfehlung, rechnen } from '../src/lib/markt/nachbesetzung.mjs';

const t = (paare) => paare.map(([klasse, zeitanteil]) => ({ bezeichnung: klasse, klasse, zeitanteil }));
const nah = (a, b, d = 1e-6) => assert.ok(Math.abs(a - b) <= d, `${a} ≠ ${b}`);

test('Grade und Schwellen', () => {
  assert.deepEqual(GRAD, { A: 0.8, B: 0.4, C: 0.05, D: 0 });
  assert.equal(empfehlung(0.25), 'Nachbesetzung prüfen');
  assert.equal(empfehlung(0.2499), 'Aufgaben bündeln');
  assert.equal(empfehlung(0.1), 'Aufgaben bündeln');
  assert.equal(empfehlung(0.0999), 'Nachbesetzen');
});

test('KGSt-Personalkosten wie in der Pipeline', () => {
  nah(personalkosten('E 9c'), 80802.608333, 0.001);
  nah(personalkosten('A 10'), (74.82 * 1602 - 9700) / 1.2);
});

test('Niveau → Kostengruppe', () => {
  for (const [n, eg] of [[null, 'E 9a'], [9, 'E 9a'], [9.3, 'E 9b'], [9.6, 'E 9c'], [11, 'E 11'], [16.6, 'E 15'], [1, 'E 2']]) {
    assert.equal(egAusNiveau(n), eg);
  }
});

test('Kostenansatz aus Modelltext oder Markt', () => {
  assert.equal(kostenEg('E 9c').eg, 'E 9c');
  assert.equal(kostenEg('EG 11').eg, 'E 11');
  assert.equal(kostenEg('E 9').eg, 'E 9a');
  assert.equal(kostenEg('A 10').eg, 'A 10');
  assert.equal(kostenEg('A 5').eg, 'A 6');
  assert.equal(kostenEg('S 8b').eg, 'E 8');
  assert.equal(kostenEg('S 11b', 9.3).eg, 'E 9b');
  assert.deepEqual(kostenEg('k. A.'), { eg: 'E 9a', hinweis: 'Entgeltgruppe unbekannt: E 9a angesetzt' });
  assert.equal(kostenEg('k. A.', 8).eg, 'E 8');
});

test('Rechnung je Stelle mit Randfällen', () => {
  const r = rechnen({ entgeltgruppe: 'E 9a', realisierbarkeit: 0.5, taetigkeiten: t([['A', 0.5], ['C', 0.5]]) }, { wochenstunden: 39 });
  nah(r.anteil, 0.425); nah(r.potenzial, 0.2125); nah(r.pk, 0.2125 * personalkosten('E 9a'));
  assert.equal(r.empfehlung, 'Aufgaben bündeln');
  nah(rechnen({ realisierbarkeit: 1, taetigkeiten: t([['A', 1]]) }, { wochenstunden: 19.5 }).vzae, 0.5);
  assert.equal(rechnen({ realisierbarkeit: 1, taetigkeiten: t([['A', 1]]) }, { wochenstunden: 41 }).vzae, 1);
  nah(rechnen({ realisierbarkeit: 1, taetigkeiten: t([['A', 0.49], ['D', 0.49]]) }).anteil, 0.4); // normiert
  assert.equal(rechnen({ realisierbarkeit: 1.7, taetigkeiten: t([['A', 1]]) }).real, 1);
  assert.equal(rechnen({ realisierbarkeit: 0, taetigkeiten: [] }).potenzial, 0);
});

test('Regression PoC Schwerte: 5,99 → 1,08 VZÄ, 76.438 €', () => {
  // Tätigkeiten, VZÄ, Realisierbarkeit und Entgeltgruppen aus Nachbesetzungs-Check_Schwerte_PoC.xlsx
  const poc = [
    ['S1', 'E 9c', 1, 0.8, [['A', 0.2], ['B', 0.2], ['B', 0.1], ['C', 0.2], ['D', 0.15], ['C', 0.1], ['A', 0.05]]],
    ['S2', 'N', 1, 0, [['D', 0.7], ['D', 0.15], ['B', 0.1], ['D', 0.05]]],
    ['S3', 'E 5', 30 / 39, 0.3, [['B', 0.15], ['B', 0.15], ['A', 0.05], ['D', 0.55], ['D', 0.1]]],
    ['S4', 'S 8b', 1, 0.5, [['D', 0.5], ['B', 0.15], ['C', 0.1], ['C', 0.2], ['A', 0.05]]],
    ['S5', 'E 6', 1, 0.5, [['C', 0.2], ['B', 0.15], ['B', 0.1], ['B', 0.1], ['A', 0.15], ['A', 0.1], ['B', 0.1], ['D', 0.1]]],
    ['S6', 'E 8', 28 / 39, 1, [['A', 0.35], ['A', 0.15], ['B', 0.15], ['A', 0.15], ['B', 0.1], ['C', 0.1]]],
    ['S7', 'E 10', 0.5, 0.8, [['C', 0.35], ['C', 0.25], ['B', 0.15], ['B', 0.15], ['B', 0.1]]],
  ].map(([id, eg, vzae, real, tt]) => ({ id, ...rechnen({ entgeltgruppe: eg, vzae, realisierbarkeit: real, taetigkeiten: t(tt) }) }));
  const sum = (k) => poc.reduce((a, s) => a + s[k], 0);
  nah(sum('vzae'), 5.987, 0.001);
  nah(sum('potenzial'), 1.0821, 0.0005);
  nah(sum('pk'), 76438, 50);
  assert.deepEqual(poc.filter((s) => s.empfehlung === 'Nachbesetzung prüfen').map((s) => s.id), ['S1', 'S6']);
});
