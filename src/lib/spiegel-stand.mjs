// Monatsstand des Lageberichts: Kennwerte je Kommune festhalten und mit dem Vormonat vergleichen.
// Stände liegen als src/data/spiegel/stand/<JJJJ-MM-TT>.json ({ags: kennwerte}).

const norm = (s = '') => s.toLowerCase().replace(/[^a-zäöüß]+/g, ' ').trim();

export function kennwerte(s) {
  const { gemeinde: g, personal: p, haushalt: h, finanzen: f } = s;
  const fremd = h.naechste.filter((x) => norm(x.kommune) !== norm(g.name));
  return {
    anzahl: p.anzahl, arbeitgeber: p.arbeitgeberZahl, finanz: p.finanz, median: p.median,
    sperrenLand: h.imLand, sperrenBund: h.bundesweit,
    naechsteKm: fremd[0]?.km ?? null, naechsteKommune: fremd[0]?.kommune ?? null,
    gstB: f.grundsteuerB.wert, gstBPlatz: f.grundsteuerB.rangLand?.platz ?? null, gstBVon: f.grundsteuerB.rangLand?.von ?? null,
  };
}

/** Jüngster Stand, der mindestens `abstandTage` alt ist: {datum, werte} oder null. */
export function vormonat(staende, heute = new Date(), abstandTage = 20) {
  const grenze = new Date(heute.getTime() - abstandTage * 864e5).toISOString().slice(0, 10);
  const datum = Object.keys(staende).filter((d) => d <= grenze).sort().pop();
  return datum ? { datum, werte: staende[datum] } : null;
}

export const differenz = (jetzt, alt) => (jetzt == null || alt == null ? null : jetzt - alt);
export const mitVorzeichen = (d) => (d == null ? '' : d > 0 ? `+${d.toLocaleString('de-DE')}` : d < 0 ? `−${Math.abs(d).toLocaleString('de-DE')}` : '±0');
export const datumKurz = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
