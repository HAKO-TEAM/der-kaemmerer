// Welche Fachartikel nennen welche Gemeinde? Einmal je Funktionsinstanz berechnet (Gemeindeprofile, SSR).
import { getCollection } from 'astro:content';
import { genannteGemeinden } from './gemeinde-links.mjs';

const RESSORTS = ['haushalt', 'einnahmen', 'ausgaben', 'praxis', 'recht', 'analyse', 'sozialkosten'] as const;
export type ArtikelKurz = { titel: string; url: string; datum: string; ressort: string };
let cache: Promise<{ jeAgs: Map<string, ArtikelKurz[]>; neueste: ArtikelKurz[] }> | null = null;

export function artikelIndex(gemeinden: any[]) {
  cache ??= (async () => {
    const jeAgs = new Map<string, ArtikelKurz[]>();
    const alle: ArtikelKurz[] = [];
    for (const ressort of RESSORTS) {
      for (const e of await getCollection(ressort)) {
        const a = { titel: e.data.title, url: `/${ressort}/${(e.id as string).split('/').pop()!.replace('.md', '')}/`, datum: String(e.data.datum), ressort };
        alle.push(a);
        for (const ags of genannteGemeinden(`${e.data.title} ${e.body}`, gemeinden)) {
          if (!jeAgs.has(ags)) jeAgs.set(ags, []);
          jeAgs.get(ags)!.push(a);
        }
      }
    }
    const neu = (x: ArtikelKurz[]) => x.sort((a, b) => b.datum.localeCompare(a.datum));
    for (const v of jeAgs.values()) neu(v);
    return { jeAgs, neueste: neu(alle).slice(0, 4) };
  })();
  return cache;
}
