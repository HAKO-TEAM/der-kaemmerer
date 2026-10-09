import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { zugang, eigeneStellen, MARKT } from '../../lib/markt/zugang.mjs';
import { htmlZuText } from '../../lib/markt/merkmale.mjs';
import { SYSTEM, rechnen } from '../../lib/markt/nachbesetzung.mjs';

// Schnellbefund Nachbesetzungs-Check: Welcher Anteil der Stelle entfällt mit vorhandener IT-Unterstützung?
// Eingabe: { token, id } für eine eigene Stelle aus dem Marktbestand oder { token, text } für eine neue Ausschreibung.

export const prerender = false;

const antwort = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const Befund = z.object({
  stelle: z.string(),
  entgeltgruppe: z.string(),
  vzae: z.number(),
  datenbasis: z.enum(['stellenbeschreibung', 'ausschreibung']),
  taetigkeiten: z.array(z.object({
    bezeichnung: z.string(),
    klasse: z.enum(['A', 'B', 'C', 'D']),
    zeitanteil: z.number(),
    zeitanteil_geschaetzt: z.boolean(),
    voraussetzung: z.string(),
    voraussetzung_erfuellt: z.boolean().nullable(),
  })),
  realisierbarkeit: z.number(),
  begruendung_realisierbarkeit: z.string(),
  unsicherheiten: z.array(z.string()),
});

// Volltext einer eigenen Stelle bei der Quelle holen (der Markt hält nur Kennzahlen)
async function volltext(id: string): Promise<{ text: string; stunden: number | null }> {
  if (id.startsWith('ia')) {
    const r = await fetch(`https://api.interamt.de/query/stellenangebot/${id.slice(2)}`,
      { headers: { 'X-REMOTE-APPLICATION': 'Interamtb2c' }, signal: AbortSignal.timeout(15000) });
    const d = (await r.json())?.data || {};
    const bv = (d.beschaeftigungsverhaeltnisse || [])[0] || {};
    return { text: htmlZuText(d.stellenbeschreibung || ''), stunden: bv.wochenarbeitszeit ? +bv.wochenarbeitszeit : null };
  }
  const r = await fetch(`https://api.karriere.nrw/v1.0/combined-jobs/${id.slice(2)}/`, { signal: AbortSignal.timeout(15000) });
  const d = await r.json();
  return { text: htmlZuText(`${d?.stellenbeschreibung || ''}\n${d?.ergaenzende_inhalte || ''}`), stunden: null };
}

export const POST: APIRoute = async ({ request }) => {
  let daten: { token?: string; id?: string; text?: string; titel?: string };
  try { daten = await request.json(); } catch { return antwort({ fehler: 'Ungültige Anfrage.' }, 400); }
  const zg = zugang(daten.token);
  if (!zg) return antwort({ fehler: 'Zugang nicht gefunden.' }, 403);
  if (!zg.kommunalflat) return antwort({ fehler: 'Der Schnellbefund ist Teil der KommunalFlat.', gesperrt: true }, 403);
  const key = import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) return antwort({ fehler: 'Der Schnellbefund wird gerade eingerichtet.', ohneKI: true }, 503);

  let text = '', titel = daten.titel || 'Ausschreibung', stunden: number | null = null, niveau: number | null = null;
  if (daten.id) {
    // nur eigene Stellen des Zugangs – keine fremden Ausschreibungen über diesen Weg
    const s = eigeneStellen(zg.org, MARKT.stellen).find((x: any) => x.id === daten.id);
    if (!s) return antwort({ fehler: 'Diese Stelle gehört nicht zu Ihrem Zugang.' }, 404);
    titel = s.t; niveau = s.nm ?? s.n; stunden = s.az ?? null;
    try { const v = await volltext(s.id); text = v.text; stunden = stunden ?? v.stunden; }
    catch { return antwort({ fehler: 'Der Ausschreibungstext ließ sich gerade nicht abrufen.' }, 502); }
  } else {
    text = htmlZuText(daten.text || '').slice(0, 30000);
  }
  if (text.split(/\s+/).length < 60) return antwort({ fehler: 'Der Ausschreibungstext ist zu kurz für einen Befund.' }, 422);

  const client = new Anthropic({ apiKey: key });
  try {
    const r = await client.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 6000,
      output_config: { effort: 'low', format: zodOutputFormat(Befund) },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Stelle: ${titel}\nOrganisationseinheit / Träger: ${zg.org}\nStellenumfang: ${stunden ? `${stunden} Wochenstunden` : 'k. A. (Vollzeit annehmen, VZÄ 1,0)'}\nIT-Stand: unbekannt (voraussetzung_erfuellt = null)\n\n<ausschreibung>\n${text.slice(0, 30000)}\n</ausschreibung>`,
      }],
    });
    if (r.stop_reason === 'refusal' || !r.parsed_output) return antwort({ fehler: 'Für diesen Text konnte kein Befund erstellt werden.' }, 422);
    const befund = r.parsed_output;
    return antwort({ befund, rechnung: rechnen(befund, { wochenstunden: stunden, niveau }) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return antwort({ fehler: 'Gerade viele Anfragen – bitte in einer Minute erneut versuchen.' }, 429);
    if (e instanceof Anthropic.APIError) return antwort({ fehler: 'Der KI-Dienst ist kurz nicht erreichbar.' }, 502);
    return antwort({ fehler: 'Unerwarteter Fehler.' }, 500);
  }
};
