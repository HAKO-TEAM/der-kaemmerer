// Nachbesetzungs-Check – Schnellbefund je Ausschreibung (Personal-Cockpit, KommunalFlat).
// Das Modell klassifiziert nur die Tätigkeiten; gerechnet wird hier, deterministisch.
// Logik und Werte identisch mit der Pipeline ~/nachbesetzungs-check (parameter.py, rechnen.py).

// Automatisierungsgrad je Klasse
export const GRAD = { A: 0.8, B: 0.4, C: 0.05, D: 0 };
export const SCHWELLE_PRUEFEN = 0.25; // VZÄ-Potenzial je Stelle
export const SCHWELLE_BUENDELN = 0.1;

// KGSt-Bericht 8/2025 „Kosten eines Arbeitsplatzes (2025/2026)“, Vollkosten je Stunde
// (Anlage 2 Verwaltungskostensatzung Gemeinde Schkopau, 1. Änderung 02.09.2025; Werte wie veröffentlicht).
const STUNDEN_TARIF = 1561, STUNDEN_BEAMTE = 1602, SACHKOSTEN = 9700, GEMEINKOSTEN = 0.2;
export const STUNDENSATZ = {
  'E 2': 47.19, 'E 3': 48.96, 'E 4': 55.49, 'E 5': 55.18, 'E 6': 54.18, 'E 7': 54.64, 'E 8': 57.26,
  'E 9a': 63.02, 'E 9b': 67.79, 'E 9c': 68.33, 'E 10': 73.48, 'E 11': 78.55, 'E 12': 85.16, 'E 13': 82.24,
  'E 14': 92.7, 'E 15': 101.46,
  'A 6': 56.84, 'A 7': 62.01, 'A 8': 69.5, 'A 9': 73.32, 'A 10': 74.82, 'A 11': 83.96, 'A 12': 93.47,
  'A 13': 106.05, 'A 14': 112.42, 'A 15': 124.56, 'A 16': 142.46,
};

/** Personalkosten p. a. je VZÄ: (Stundensatz × Jahresstunden − Sachkosten) / (1 + Gemeinkosten). */
export function personalkosten(eg) {
  const h = eg.startsWith('A') ? STUNDEN_BEAMTE : STUNDEN_TARIF;
  return (STUNDENSATZ[eg] * h - SACHKOSTEN) / (1 + GEMEINKOSTEN);
}

/** Niveauwert aus markt.json (E-Äquivalent, 9.0/9.3/9.6 = 9a/b/c) → Kostengruppe. */
export function egAusNiveau(n) {
  if (n == null) return 'E 9a';
  if (n >= 15.5) return 'E 15';
  const g = Math.floor(n + 1e-9);
  if (g === 9) { const r = n - 9; return r > 0.55 ? 'E 9c' : r > 0.25 ? 'E 9b' : 'E 9a'; }
  return `E ${Math.min(15, Math.max(2, Math.round(n)))}`;
}

/** Kostengruppe: Entgeltgruppe aus dem Modell, sonst Niveau aus dem Markt. → { eg, hinweis } */
export function kostenEg(text = '', niveau = null) {
  const s = String(text).replace(/Entgeltgruppe|EG/g, 'E');
  let m = s.match(/\bE\s?(\d{1,2})\s?([abc])?\b/);
  if (m) {
    const g = +m[1];
    if (g === 9) return { eg: `E 9${m[2] || 'a'}`, hinweis: null };
    if (g >= 2 && g <= 15) return { eg: `E ${g}`, hinweis: null };
  }
  m = s.match(/\bA\s?(\d{1,2})\b/);
  if (m && STUNDENSATZ[`A ${+m[1]}`]) return { eg: `A ${+m[1]}`, hinweis: null };
  if (m && +m[1] < 6) return { eg: 'A 6', hinweis: 'unter A 6: Satz A 6' };
  if (/\bS\s?\d/.test(s)) return { eg: niveau != null ? egAusNiveau(niveau) : 'E 8', hinweis: 'S-Tabelle: Näherung über E-Äquivalent' };
  if (niveau == null) return { eg: 'E 9a', hinweis: 'Entgeltgruppe unbekannt: E 9a angesetzt' };
  return { eg: egAusNiveau(niveau), hinweis: 'Entgeltgruppe aus Marktdaten' };
}

export function empfehlung(pot) {
  return pot >= SCHWELLE_PRUEFEN ? 'Nachbesetzung prüfen' : pot >= SCHWELLE_BUENDELN ? 'Aufgaben bündeln' : 'Nachbesetzen';
}

/** Rechnung je Stelle aus der Klassifizierung. wochenstunden/niveau aus der Ausschreibung, falls bekannt. */
export function rechnen(k, { wochenstunden = null, niveau = null } = {}) {
  const t = k.taetigkeiten || [];
  const summe = t.reduce((a, x) => a + x.zeitanteil, 0);
  const anteil = summe ? t.reduce((a, x) => a + x.zeitanteil * (GRAD[x.klasse] ?? 0), 0) / summe : 0;
  const vzae = wochenstunden ? Math.min(1, wochenstunden / 39) : Math.min(1, Math.max(0, +k.vzae || 1));
  const real = Math.max(0, Math.min(1, +k.realisierbarkeit || 0));
  const potenzial = vzae * anteil * real;
  const { eg, hinweis } = kostenEg(k.entgeltgruppe, niveau);
  return { anteil, vzae, real, potenzial, eg, egHinweis: hinweis, pk: potenzial * personalkosten(eg), empfehlung: empfehlung(potenzial) };
}

// System-Prompt (identisch mit ~/nachbesetzungs-check/system_prompt.txt)
export const SYSTEM = `Rolle: Organisationsprüfer für Kommunalverwaltungen. Aufgabe: Vor der Nachbesetzung einer Stelle
den Anteil der Arbeitszeit bestimmen, der bei vorhandener IT-Unterstützung entfällt.

Eingabe:
- Ausschreibungstext und/oder Stellenbeschreibung (Arbeitsvorgänge mit Zeitanteilen)
- Entgeltgruppe, Stellenumfang (Wochenstunden), Organisationseinheit
- optional: IT-Stand (vorhandene Fachverfahren, aktive Online-Leistungen)

Vorgehen:
1. Tätigkeiten extrahieren. Arbeitsvorgänge aus der Stellenbeschreibung haben Vorrang.
   Fehlt eine Stellenbeschreibung, Tätigkeiten aus dem Ausschreibungstext ableiten und
   Zeitanteile schätzen. Summe der Zeitanteile = 100 %.
2. Jede Tätigkeit genau einer Klasse zuordnen:
   A Regelbasiert/standardisiert – eindeutige Regeln, strukturierte Daten, kein Ermessen
   B Teilautomatisierbar – Vorschlag durch System/KI, Prüfung und Zeichnung durch Mensch
   C Ermessen/Beratung/Entscheidung – rechtliche Würdigung, Einzelfall, Beziehungsarbeit, Führung
   D Physisch/Präsenz/Einsatz – körperliche Arbeit, Präsenzpflicht, Einsatzdienst
3. Für jede Tätigkeit der Klassen A und B die technische Voraussetzung benennen
   (Fachverfahren, Schnittstelle, Online-Leistung). Ist der IT-Stand bekannt und die
   Voraussetzung nicht erfüllt, Tätigkeit als "Voraussetzung fehlt" kennzeichnen.
4. Realisierbarkeit (0–1) festlegen und begründen. Absenken bei Mindestbesetzung,
   Schichtdienst, Öffnungszeiten, Einzelstelle, gesetzlicher Präsenzpflicht.
5. Nicht klassifizieren als A oder B:
   - hoheitliche Entscheidungen mit Ermessen
   - Beurkundung persönlicher Erklärungen
   - Tätigkeiten mit unmittelbarem Kontakt zu Kindern, Patient*innen, Hilfebedürftigen
   - Führung und Vertretung von Leitung
6. Keine personenbezogenen Daten verarbeiten. Keine Aussagen zu Stelleninhaber*innen.

Ausgabe ausschließlich als JSON nach Schema: 3–8 Tätigkeiten, Zeitanteile als Dezimalzahl (Summe 1,00),
zeitanteil_geschaetzt = true bei Ausschreibungstexten, voraussetzung_erfuellt = null bei unbekanntem IT-Stand.
Sei realistisch und eher vorsichtig: A nur für wirklich regelbasierte Massenvorgänge mit strukturierten Daten.`;
