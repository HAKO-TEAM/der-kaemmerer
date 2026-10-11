// Gemeinsame Angaben für schema.org/Dataset (Runbook 2.3).
// Quelle der Hebesätze und Schulden: Statistische Ämter des Bundes und der Länder, Regionaldatenbank Deutschland
// (https://www.regionalstatistik.de/), Lizenz Datenlizenz Deutschland – Namensnennung 2.0.
export const LIZENZ_DL_BY = 'https://www.govdata.de/dl-de/by-2-0';
export const REGIONALSTATISTIK = 'https://www.regionalstatistik.de/';
export const URHEBER = { '@type': 'NewsMediaOrganization', '@id': 'https://derkaemmerer.de/#verlag', name: 'Der Kämmerer', url: 'https://derkaemmerer.de/' };

/** Dataset-Objekt; nur übergebene Felder werden gesetzt. */
export function datensatz({ name, description, url, raum, zeitraum, quelle, lizenz, geaendert }) {
  const d = { '@context': 'https://schema.org', '@type': 'Dataset', name, description, url, creator: URHEBER, isAccessibleForFree: true, inLanguage: 'de-DE' };
  if (raum) d.spatialCoverage = { '@type': 'Place', name: raum };
  if (zeitraum) d.temporalCoverage = zeitraum;
  if (quelle) d.isBasedOn = quelle;
  if (lizenz) d.license = lizenz;
  if (geaendert) d.dateModified = geaendert;
  return d;
}
