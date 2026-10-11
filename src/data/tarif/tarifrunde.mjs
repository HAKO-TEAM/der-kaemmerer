// Tarifrunden-Hub TVöD (Runbook 4.3) – vorbereitet, NICHT live, bis `aktiv: true` gesetzt wird.
// Geltender Abschluss: Tarifeinigung Bund/VKA vom 06.04.2025, Entgelttabelle VKA gültig bis 31.03.2027
// (Quelle: src/data/tarif/tvoed_vka_2026.json, Feld gueltig_bis). Vor Aktivierung Laufzeit/Kündigungstermin bei VKA bzw. ver.di prüfen.
export const TARIFRUNDE = {
  aktiv: false,                      // erst nach Veröffentlichung der Forderung und Freigabe der Geschäftsführung
  laufzeitBis: '2027-03-31',
  forderung: null,                   // z. B. { prozent: 0, mindestbetrag: 0, laufzeitMonate: 0, quelle: '', stand: '' } – nur aus amtlicher Quelle
  termine: [],                       // [{ datum: 'JJJJ-MM-TT', text: '1. Verhandlungsrunde, Potsdam', quelle: '' }]
  ergebnis: null,
};

/** „Was bringt die Forderung?“ – Monatsplus je Entgeltgruppe/Stufe: max(prozent, Mindestbetrag). */
export function forderungWirkung(monat, { prozent, mindestbetrag = 0 }) {
  const plus = Math.max(Math.round(monat * prozent) / 100, mindestbetrag);
  return { plus: Math.round(plus * 100) / 100, neu: Math.round((monat + plus) * 100) / 100 };
}
