// Suchindex der Stellenbörse (MK 15.10.2026: Freitextsuche über alle laufenden Stellen, nicht nur Land/Rubrik).
// Enthält genau die Felder, die die Suchleiste in StellenSeite.astro zum Filtern und für die Trefferkarten braucht.
import { aktiveStellen } from '../../lib/stellen';
export const prerender = true;

export async function GET() {
  const stellen = (await aktiveStellen()).map((s) => ({
    id: s.id, t: s.data.title, o: s.data.organisation, ot: s.data.orgtyp || '', ort: s.data.ort, plz: s.data.plz || '',
    land: s.data.bundesland, ls: s.landSlug, f: s.feld.slug, e: s.data.entgelt || '', b: s.data.beschaeftigung || '',
    bf: s.data.befristung || '', sw: (s.data.schlagwoerter || []).slice(0, 6), fr: String(s.data.bewerbungsschluss).slice(0, 10),
    p: s.paketLower, pk: s.data.paket,
  }));
  return new Response(JSON.stringify(stellen), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
}
