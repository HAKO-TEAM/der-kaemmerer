import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { zugang } from '../../lib/markt/zugang.mjs';
import { htmlZuText } from '../../lib/markt/merkmale.mjs';

export const prerender = false;

const antwort = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const Vorschlag = z.object({
  titel: z.string(),
  einleitung: z.string(),
  aufgaben: z.array(z.string()),
  profil: z.array(z.string()),
  wir_bieten: z.array(z.string()),
  hinweise_gestaltung: z.array(z.string()),
  offene_punkte: z.array(z.string()),
});

const SYSTEM = `Du überarbeitest Stellenausschreibungen deutscher Kommunen für das Personal-Cockpit von Der Kämmerer.
Ziel: Die Ausschreibung soll im Wettbewerb um Bewerber besser abschneiden – klar, konkret, ansprechend, rechtssicher.

Regeln:
- Übernimm ausschließlich Tatsachen aus der Originalausschreibung. Erfinde keine Leistungen, Zahlen, Entgeltgruppen, Fristen, Namen oder Zusagen.
- Marktübliche Leistungen, die im Original fehlen, schreibst du NICHT in den Text. Sie gehören als Prüfauftrag in "offene_punkte" (z. B. „Prüfen, ob mobiles Arbeiten angeboten werden kann – 71 % der Vergleichsstellen nennen es“).
- "hinweise_gestaltung": Hebel zur Ausgestaltung der Stelle (Entgelt, Befristung, Homeoffice, Frist), knapp begründet mit den gelieferten Marktdaten.
- Sprache: Deutsch, Sie-Form, aktiv, positiv formuliert, ohne Floskeln wie „spannende Herausforderung“ oder „dynamisches Team“. Geschlechtergerecht (m/w/d bzw. neutrale Formen).
- Aufgaben, Profil und Wir-bieten je 4–7 Punkte, jeweils ein vollständiger kurzer Satz oder eine klare Wortgruppe.
- Der Titel bleibt sachlich (Funktion + m/w/d), höchstens präziser als im Original.`;

export const POST: APIRoute = async ({ request }) => {
  let daten: { token?: string; text?: string; hebel?: { titel: string; text: string }[]; kennzahlen?: string };
  try { daten = await request.json(); } catch { return antwort({ fehler: 'Ungültige Anfrage.' }, 400); }
  const zg = zugang(daten.token);
  if (!zg?.kommunalflat) return antwort({ fehler: 'Der KI-Vorschlag ist Teil der KommunalFlat.', gesperrt: true }, 403);
  if (!import.meta.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return antwort({ fehler: 'Der KI-Vorschlag wird gerade eingerichtet.', ohneKI: true }, 503);
  }
  const text = htmlZuText(daten.text || '').slice(0, 30000);
  if (text.split(/\s+/).length < 60) return antwort({ fehler: 'Text zu kurz.' }, 422);

  const hebel = (daten.hebel || []).slice(0, 8).map((h) => `- ${h.titel}: ${h.text}`).join('\n');
  const client = new Anthropic({ apiKey: import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY });
  try {
    const r = await client.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 8000,
      output_config: { effort: 'low', format: zodOutputFormat(Vorschlag) },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Arbeitgeber: ${zg.org}\n\nMarktvergleich (Personal-Cockpit, ${daten.kennzahlen || 'kommunaler Stellenmarkt'}):\n${hebel || '- keine Auffälligkeiten'}\n\n<ausschreibung>\n${text}\n</ausschreibung>`,
      }],
    });
    if (r.stop_reason === 'refusal' || !r.parsed_output) return antwort({ fehler: 'Für diesen Text konnte kein Vorschlag erstellt werden.' }, 422);
    return antwort({ vorschlag: r.parsed_output });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return antwort({ fehler: 'Gerade viele Anfragen – bitte in einer Minute erneut versuchen.' }, 429);
    if (e instanceof Anthropic.APIError) return antwort({ fehler: 'Der KI-Dienst ist kurz nicht erreichbar.' }, 502);
    return antwort({ fehler: 'Unerwarteter Fehler.' }, 500);
  }
};
