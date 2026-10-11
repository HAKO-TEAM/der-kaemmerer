import { alleArtikel, xml, SITE } from '../lib/artikel-feed';
export const prerender = true;

const RESSORT_NAME: Record<string, string> = {
  haushalt: 'Haushalt & Finanzen', einnahmen: 'Einnahmen', ausgaben: 'Ausgaben', praxis: 'Best Practice',
  recht: 'Recht & Vergabe', analyse: 'Analyse & Meinung', sozialkosten: 'Sozialkosten', 'dienst-karriere': 'Dienst & Karriere',
};

export async function GET() {
  const artikel = (await alleArtikel()).slice(0, 50);
  const items = artikel.map((a) => `    <item>
      <title>${xml(a.titel)}</title>
      <link>${a.url}</link>
      <guid isPermaLink="true">${a.url}</guid>
      <pubDate>${new Date(a.datum + 'T06:00:00+02:00').toUTCString()}</pubDate>
      <category>${xml(RESSORT_NAME[a.ressort] || a.ressort)}</category>
      <description>${xml(a.beschreibung)}</description>
    </item>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Der Kämmerer</title>
    <link>${SITE}/</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Das unabhängige Briefing für Kämmerer, Oberbürgermeister und Finanzdezernenten: Analysen, Maßnahmen und Daten zu kommunalen Haushalten.</description>
    <language>de-DE</language>
    <copyright>HAKO Beteiligungsgesellschaft mbH</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
