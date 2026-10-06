import type { APIRoute } from 'astro';
import { zugang, MARKT } from '../../lib/markt/zugang.mjs';
import { merkmaleAusText, htmlZuText, LEISTUNGEN, land as landAusPlz } from '../../lib/markt/merkmale.mjs';
import { bewerten } from '../../lib/markt/benchmark.mjs';

export const prerender = false;

const IA = { 'X-REMOTE-APPLICATION': 'Interamtb2c' };
const LBIT = Object.fromEntries(LEISTUNGEN.map(([k], i) => [k, 1 << i]));
const antwort = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Text einer Ausschreibung von einer URL holen (interamt über die Schnittstelle, sonst HTML)
async function textVonUrl(url: string): Promise<{ text: string; titel?: string; entgelt?: string; plz?: string }> {
  const ia = url.match(/interamt\.de\/.*[?&]id=(\d+)/);
  if (ia) {
    const r = await fetch(`https://api.interamt.de/query/stellenangebot/${ia[1]}`, { headers: IA, signal: AbortSignal.timeout(15000) });
    const d = (await r.json())?.data;
    if (d) {
      const bv = (d.beschaeftigungsverhaeltnisse || [])[0] || {};
      return { text: d.stellenbeschreibung || '', titel: d.stellenbezeichnung, plz: d.plz,
        entgelt: [bv.entgeltgruppeVon, bv.besoldungVon].filter(Boolean).join(' ') };
    }
  }
  const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 (Personal-Cockpit derkaemmerer.de)' } });
  const html = await r.text();
  const titel = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>|<header[\s\S]*?<\/header>/gi, ' ');
  return { text: body, titel: titel ? htmlZuText(titel) : undefined };
}

export const POST: APIRoute = async ({ request }) => {
  let daten: { token?: string; text?: string; url?: string; plz?: string };
  try { daten = await request.json(); } catch { return antwort({ fehler: 'Ungültige Anfrage.' }, 400); }

  const z = zugang(daten.token);
  if (!z) return antwort({ fehler: 'Zugang nicht gefunden.' }, 403);
  if (!z.kommunalflat) return antwort({ fehler: 'Die Prüfung eigener Ausschreibungen ist Teil der KommunalFlat.', gesperrt: true }, 403);

  let roh = (daten.text || '').slice(0, 60000), titel: string | undefined, entgelt: string | undefined, plz = daten.plz;
  if (!roh.trim() && daten.url) {
    if (!/^https:\/\//.test(daten.url)) return antwort({ fehler: 'Bitte eine https-Adresse angeben.' }, 400);
    try { const t = await textVonUrl(daten.url); roh = t.text; titel = t.titel; entgelt = t.entgelt; plz = plz || t.plz; }
    catch { return antwort({ fehler: 'Die Seite ließ sich nicht abrufen. Bitte den Text direkt einfügen.' }, 422); }
  }
  const text = htmlZuText(roh);
  if (text.split(/\s+/).length < 60) return antwort({ fehler: 'Der Text ist zu kurz für eine Auswertung – bitte die vollständige Ausschreibung einfügen.' }, 422);

  const m = merkmaleAusText(text, { titel, entgelt });
  // Standort: angegebene PLZ, sonst erste PLZ im Text, sonst Sitz der Kommune aus dem Marktbestand
  plz = plz || (text.match(/\b(\d{5})\b/) || [])[1];
  const ref = MARKT.stellen.find((s: any) => (plz && s.p === plz)) || MARKT.stellen.find((s: any) => s.o === z.org);
  const stelle = {
    id: 'upload', t: m.titel, o: z.org, p: plz || ref?.p || '', l: (plz && landAusPlz(plz)) || ref?.l || null,
    la: ref?.la ?? null, lo: ref?.lo ?? null, f: m.feld, L: m.leitung ? 1 : 0, n: m.niveau, nm: null,
    h: m.homeoffice, b: m.befristet ? 1 : 0, tz: m.teilzeit ? 1 : 0,
    k: m.leistungen.reduce((s: number, k: string) => s | (LBIT[k] || 0), 0),
    fr: null, w: m.woerter, g: m.ansprechpartner ? 1 : 0,
  };
  const b = bewerten(stelle, MARKT.stellen);
  return antwort({ stelle, bewertung: { ...b, kz: { ...b.kz, leistungenWerte: undefined } }, merkmale: m, volltext: text.slice(0, 30000), stand: MARKT.kopf.stand });
};
