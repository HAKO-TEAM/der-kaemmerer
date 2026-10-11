// Google-News-Sitemap: nur Artikel der letzten zwei Tage (Vorgabe Google News).
import { alleArtikel, xml } from '../lib/artikel-feed';
export const prerender = true;

export async function GET() {
  const grenze = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const neu = (await alleArtikel()).filter((a) => a.datum >= grenze);
  const urls = neu.map((a) => `  <url>
    <loc>${a.url}</loc>
    <news:news>
      <news:publication><news:name>Der Kämmerer</news:name><news:language>de</news:language></news:publication>
      <news:publication_date>${a.datum}T06:00:00+02:00</news:publication_date>
      <news:title>${xml(a.titel)}</news:title>
    </news:news>
  </url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
