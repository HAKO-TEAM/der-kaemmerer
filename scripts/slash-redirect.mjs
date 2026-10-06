// Nach dem Build: Seiten-URLs ohne Schrägstrich per 308 auf die Fassung mit Schrägstrich leiten,
// damit Google nicht zwei Adressen je Seite führt. /api/*, /_* und Dateien (mit Punkt) bleiben unberührt.
import { readFileSync, writeFileSync } from 'node:fs';

const datei = '.vercel/output/config.json';
const config = JSON.parse(readFileSync(datei, 'utf8'));
const regel = {
  src: '^/(?!api/|_)((?:[^/]+/)*[^/.]+)$',
  headers: { Location: '/$1/' },
  status: 308,
};
if (!config.routes.some((r) => r.src === regel.src)) {
  const i = config.routes.findIndex((r) => r.handle === 'filesystem');
  config.routes.splice(i < 0 ? 0 : i, 0, regel);
  writeFileSync(datei, JSON.stringify(config, null, 2));
}
console.log('slash-redirect: Weiterleitung auf Schrägstrich eingetragen');
