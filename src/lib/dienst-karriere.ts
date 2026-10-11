// Veröffentlichte Beiträge des Ressorts „Dienst & Karriere“ (Entwürfe ausgeschlossen, Runbook C.6)
import { getCollection } from 'astro:content';
export async function dkArtikel() {
  return (await getCollection('dienstKarriere', (a: any) => !a.data.draft))
    .sort((a: any, b: any) => (b.data.datum || '').localeCompare(a.data.datum || ''));
}
