import { createHmac } from 'node:crypto';
import { BERUFSFELDER, ALLGEMEIN } from '../src/data/berufsfelder.mjs';

// Gemeinsame Werte für den Job-Alert (Anmeldung, Versand, Abmeldung).
export const LAENDER = ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern',
  'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'];
export const FELDER = Object.fromEntries([...BERUFSFELDER, ALLGEMEIN].map((f) => [f.slug, f.name]));

/** Prüfsumme für den Abmeldelink (eigener Zweck, damit sie nicht mit der Anmeldebestätigung austauschbar ist). */
export const abmeldeSig = (email, key) => createHmac('sha256', key).update(`jobalert-abmelden|${String(email).toLowerCase()}`).digest('hex').slice(0, 32);

/** Wunsch eines Abonnenten aus den Brevo-Merkmalen. */
export function wunsch(a = {}) {
  const felder = String(a.JA_FELDER || '').split(',').map((s) => s.trim()).filter((s) => s in FELDER);
  return { land: LAENDER.includes(a.JA_LAND) ? a.JA_LAND : '', plz: /^\d{2}$/.test(a.JA_PLZ || '') ? a.JA_PLZ : '', felder };
}

/** Passende neue Stellen für einen Wunsch. */
export function treffer(stellen, w, seit) {
  return stellen.filter((s) => s.datum >= seit
    && (!w.land || s.land === w.land)
    && (!w.plz || String(s.plz).startsWith(w.plz))
    && (!w.felder.length || w.felder.includes(s.feld)));
}
