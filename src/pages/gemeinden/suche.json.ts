// Suchindex für das Gemeindeverzeichnis: [Name, Kreis, Land (kurz), Pfad] – statisch erzeugt.
import gemeinden from '../../data/spiegel/gemeinden.json';
import { verzeichnis } from '../../lib/gemeinden.mjs';

export function GET() {
  const { pfad } = verzeichnis(gemeinden as any[]);
  const daten = (gemeinden as any[]).map((g) => [g.name, g.kreis && g.kreis !== g.name ? g.kreis : '', g.land, pfad[g.ags], g.einwohner || 0]);
  return new Response(JSON.stringify(daten), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
