// Personal-Cockpit – Zugänge und Zuordnung der eigenen Stellen.
// KommunalFlat-Kunden: src/data/personal-cockpit/zugaenge.json (voller Umfang).
// Angeschriebene Kommunen: Token der Profil-Vorschau (src/data/arbeitgeber-vorschau/*.json)
// → Marktvergleich der eigenen Stellen; Upload und KI-Vorschlag nur mit KommunalFlat.

import zugaenge from '../../data/personal-cockpit/zugaenge.json';
import markt from '../../data/markt/markt.json';

const vorschauDateien = import.meta.glob('../../data/arbeitgeber-vorschau/*.json', { eager: true, import: 'default' });

export const MARKT = markt;

export function zugang(token) {
  if (!token || !/^[a-f0-9]{8,32}$/i.test(token)) return null;
  const k = zugaenge.find((z) => z.token === token);
  if (k) return { org: k.org, kommunalflat: !!k.kommunalflat, art: 'kunde' };
  for (const d of Object.values(vorschauDateien)) {
    if (d?.token === token) return { org: d.name, kommunalflat: false, art: 'vorschau', profil: `/vorschau/${token}/` };
  }
  return null;
}

// „Stadt Bamberg“, „Stadtverwaltung Bamberg“, „Große Kreisstadt X“ → gleicher Kern
export function kern(name = '') {
  return name.toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(große kreisstadt|grosse kreisstadt|universitätsstadt|hansestadt|landeshauptstadt|kreisstadt|stadtverwaltung|gemeindeverwaltung|kreisverwaltung|verwaltung der|magistrat der stadt|der magistrat der|stadt|gemeinde|markt|landratsamt|landkreis|kreis|bezirksamt|samtgemeinde|verbandsgemeinde|amt|zweckverband|eigenbetrieb)\b/g, ' ')
    .replace(/[^a-zäöüß]+/g, ' ').trim();
}

export function eigeneStellen(org, stellen = markt.stellen) {
  const k = kern(org);
  if (!k) return [];
  const istKreis = /landkreis|landratsamt|kreisverwaltung|\bkreis\b/i.test(org);
  return stellen.filter((s) => {
    if (kern(s.o) !== k) return false;
    const sKreis = /landkreis|landratsamt|kreisverwaltung|\bkreis\b/i.test(s.o);
    return sKreis === istKreis;
  });
}
