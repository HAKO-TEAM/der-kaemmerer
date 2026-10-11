// Alle redaktionellen Artikel für RSS-Feed und Google-News-Sitemap, neueste zuerst.
import { getCollection } from 'astro:content';

export const RESSORTS = ['haushalt', 'einnahmen', 'ausgaben', 'praxis', 'recht', 'analyse', 'sozialkosten'] as const;
export const SITE = 'https://derkaemmerer.de';

export async function alleArtikel() {
  const listen = await Promise.all(RESSORTS.map(async (r) => (await getCollection(r)).map((a: any) => ({
    titel: a.data.title as string,
    beschreibung: (a.data.beschreibung || '') as string,
    datum: (a.data.datum || '') as string,
    url: `${SITE}/${r}/${a.id}/`,
    ressort: r,
  }))));
  return listen.flat().filter((a) => a.datum).sort((a, b) => b.datum.localeCompare(a.datum) || a.titel.localeCompare(b.titel));
}

export const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
