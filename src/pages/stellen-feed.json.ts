// Maschinenlesbarer Stellenbestand für den Job-Alert (api/jobalert-versand.js): alle laufenden eigenen Anzeigen
// mit Berufsfeld, Land und PLZ. Wird bei jedem Build (täglich nach der Stellen-Routine) neu erzeugt.
import { aktiveStellen } from '../lib/stellen';
export const prerender = true;

export async function GET() {
  const stellen = (await aktiveStellen()).map((s) => ({
    id: s.id, t: s.data.title, o: s.data.organisation, ort: s.data.ort, land: s.data.bundesland,
    plz: s.data.plz || '', feld: s.feld.slug, entgelt: s.data.entgelt || '', frist: String(s.data.bewerbungsschluss).slice(0, 10),
    datum: String(s.data.datum).slice(0, 10), paket: s.data.paket,
  }));
  return new Response(JSON.stringify({ stand: new Date().toISOString(), stellen }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
}
