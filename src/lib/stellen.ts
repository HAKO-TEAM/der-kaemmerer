// Gemeinsame Logik der Stellenbörse (Runbook 3.3): aktive Stellen, Landingpages, Kennzahlen für Einleitungen.
import { getCollection } from 'astro:content';
import { berufsfeld, BERUFSFELDER, ALLGEMEIN } from '../data/berufsfelder.mjs';
import { gehaltsSpanne, euro } from './tvoed.mjs';

export const JE_SEITE = 50;
export const MIN_INDEX = 5;   // Landingpages mit weniger Stellen: noindex
export const FELDER = [...BERUFSFELDER, ALLGEMEIN];

export const slugLand = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const heute = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const tageDiff = (schluss: string) => Math.ceil((new Date(schluss).getTime() - Date.now()) / 86400000);
const fmt = (d: string) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
function fristText(tage: number, schluss: string) {
  if (tage <= 0) return 'Heute!';
  if (tage === 1) return 'Noch 1 Tag';
  if (tage < 8) return 'Noch ' + tage + ' Tage';
  return 'bis ' + fmt(schluss);
}

/** Alle laufenden Stellen, KommunalFlat zuerst, dann neueste. Mit vorberechneten Anzeigewerten. */
export async function aktiveStellen() {
  const h = heute();
  const rank: Record<string, number> = { KommunalFlat: 0, Exklusiv: 1, Premium: 2, Basis: 3 };
  const roh = (await getCollection('jobs'))
    .filter((j) => j.data.aktiv && new Date(j.data.bewerbungsschluss) >= h)
    .sort((a, b) => (rank[a.data.paket] - rank[b.data.paket]) || (new Date(b.data.datum).getTime() - new Date(a.data.datum).getTime()));
  return roh.map((job) => {
    const tage = tageDiff(job.data.bewerbungsschluss);
    const pk = job.data.paket.toLowerCase();
    const feld = berufsfeld(job.data);
    return {
      ...job, tage, feld, landSlug: slugLand(job.data.bundesland),
      cardClass: 'st-card' + (pk !== 'basis' ? ' ' + pk : ''),
      badgeClass: 'st-card-badge ' + pk,
      deadlineClass: 'st-card-deadline' + (tage < 8 ? ' urgent' : ''),
      deadlineTxt: fristText(tage, job.data.bewerbungsschluss),
      paketLower: pk,
    };
  });
}
export type Stelle = Awaited<ReturnType<typeof aktiveStellen>>[number];

/** Einleitung aus Daten: Anzahl, Median der TVöD-Spannen, größte Arbeitgeber. */
export function kennzahlen(stellen: Stelle[]) {
  const mitten = stellen.map((s) => gehaltsSpanne(s.data.entgelt)).filter(Boolean).map((g: any) => (g.min + g.max) / 2).sort((a, b) => a - b);
  const median = mitten.length ? (mitten.length % 2 ? mitten[(mitten.length - 1) / 2] : (mitten[mitten.length / 2 - 1] + mitten[mitten.length / 2]) / 2) : null;
  const zaehl = new Map<string, number>();
  for (const s of stellen) zaehl.set(s.data.organisation, (zaehl.get(s.data.organisation) || 0) + 1);
  const arbeitgeber = [...zaehl].filter(([, z]) => z >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3);
  return { anzahl: stellen.length, median, medianBasis: mitten.length, arbeitgeber };
}

export function einleitung(stellen: Stelle[], wo: string) {
  const k = kennzahlen(stellen);
  const teile = [`${wo} sind aktuell ${k.anzahl} ${k.anzahl === 1 ? 'Stelle' : 'Stellen'} ausgeschrieben.`];
  if (k.median) teile.push(`Die Mitte der tariflichen Monatsentgelte liegt bei rund ${euro(Math.round(k.median / 50) * 50)} brutto (Median der TVöD-Spannen Stufe 1–6 aus ${k.medianBasis} Anzeigen mit eindeutiger Entgeltgruppe).`);
  if (k.arbeitgeber.length) teile.push(`Mehrere Ausschreibungen kommen von ${k.arbeitgeber.map(([n, z]) => `${n} (${z})`).join(', ')}.`);
  return teile.join(' ');
}

export const LAENDER = (stellen: Stelle[]) => [...new Map(stellen.map((s) => [s.landSlug, s.data.bundesland])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'de'));
