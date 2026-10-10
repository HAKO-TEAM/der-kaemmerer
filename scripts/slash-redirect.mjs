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
// personal.derkaemmerer.de → Personal-Cockpit (/ = Produktseite, /<token>/ = Cockpit)
const host = [{ type: 'host', value: 'personal.derkaemmerer.de' }];
const personal = [
  { src: '^/([a-f0-9]{8,32}/?)?$', has: host, dest: '/personal-cockpit/$1', check: true },
];
// revier.derkaemmerer.de → Haushaltslage Rheinisches Revier (übrige Pfade wie auf der Hauptdomain)
const revier = [{ src: '^/$', has: [{ type: 'host', value: 'revier.derkaemmerer.de' }], dest: '/revier/rheinisches-revier/', check: true }];
const gleich = (x, r) => x.src === r.src && x.has?.[0]?.value === r.has[0].value;
for (const r of [...personal, ...revier].reverse()) if (!config.routes.some((x) => gleich(x, r))) config.routes.unshift(r);
if (!config.routes.some((r) => r.src === regel.src)) {
  const i = config.routes.findIndex((r) => r.handle === 'filesystem');
  config.routes.splice(i < 0 ? 0 : i, 0, regel);
}
writeFileSync(datei, JSON.stringify(config, null, 2));
console.log('slash-redirect: Weiterleitung auf Schrägstrich eingetragen');
