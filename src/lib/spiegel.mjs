// „Personal- und Haushaltslage Ihrer Kommune – diese Woche“ (Kommunal-Spiegel)
// Rechnet für eine Gemeinde (AGS) Personalmarkt im Umkreis, Haushaltslage im Umfeld
// sowie Hebesätze und Verschuldung im Vergleich. Alle Werte aus amtlichen bzw. eigenen, belegten Daten.

import { km } from './markt/benchmark.mjs';
import { FELD_NAMEN, LEISTUNGEN, niveauText } from './markt/merkmale.mjs';

const median = (a) => { const s = a.filter((x) => x != null && !isNaN(x)).sort((x, y) => x - y); if (!s.length) return null; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const anteil = (a, f) => (a.length ? a.filter(f).length / a.length : null);
const rangVon = (werte, wert, hochIstOben = true) => { // Platz 1 = höchster Wert
  const s = werte.filter((x) => x != null).sort((x, y) => (hochIstOben ? y - x : x - y));
  return wert == null || !s.length ? null : { platz: s.findIndex((x) => (hochIstOben ? x <= wert : x >= wert)) + 1, von: s.length };
};
const LAND_LANG = { BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg', HE: 'Hessen', MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen', RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen' };
const norm = (s = '') => s.toLowerCase().replace(/\(.*?\)|landkreis|kreis|stadt|gemeinde|hansestadt|universitätsstadt|große kreisstadt/g, '').replace(/[^a-zäöüß]+/g, ' ').trim();
const istFinanz = (f) => ['kaemmerei', 'kasse', 'steuern', 'controlling', 'pruefung'].includes(f);

export function kalenderwoche(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - tag);
  return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7);
}

export function spiegel(ags, { gemeinden, markt, sperren, hebesaetze = {}, schulden = {} }) {
  const g = gemeinden.find((x) => x.ags === ags);
  if (!g) return null;
  const ort = { la: g.lat, lo: g.lon };

  // ── Personalmarkt im Umkreis von 50 km
  const umkreis = markt.stellen.filter((s) => s.la != null && km(ort, s) <= 50);
  const eigene = umkreis.filter((s) => norm(s.o) === norm(g.name) && km(ort, s) <= 15);
  const andere = umkreis.filter((s) => !eigene.includes(s));
  const finanz = andere.filter((s) => istFinanz(s.f));
  const felder = Object.entries(andere.reduce((m, s) => ((m[s.f] = (m[s.f] || 0) + 1), m), {}))
    .map(([k, n]) => ({ name: FELD_NAMEN[k] || k, n })).sort((a, b) => b.n - a.n).slice(0, 5);
  const arbeitgeber = Object.entries(andere.reduce((m, s) => ((m[s.o] = (m[s.o] || 0) + 1), m), {}))
    .map(([o, n]) => ({ o, n })).sort((a, b) => b.n - a.n).slice(0, 8);
  const LBIT = Object.fromEntries(LEISTUNGEN.map(([k], i) => [k, 1 << i]));
  const leistungen = LEISTUNGEN.map(([k, name]) => ({ name, anteil: anteil(andere, (s) => s.k & LBIT[k]) }))
    .sort((a, b) => b.anteil - a.anteil).slice(0, 5);
  const personal = {
    anzahl: andere.length, arbeitgeberZahl: new Set(andere.map((s) => s.o)).size,
    finanz: finanz.length, finanzMedian: median(finanz.map((s) => s.n)),
    median: median(andere.map((s) => s.n)), homeoffice: anteil(andere, (s) => s.h), befristet: anteil(andere, (s) => s.b),
    felder, arbeitgeber, leistungen,
    finanzStellen: finanz.sort((a, b) => km(ort, a) - km(ort, b)).slice(0, 12)
      .map((s) => ({ t: s.t, o: s.o, n: s.n, u: s.u, km: Math.round(km(ort, s)), frist: s.s, h: s.h })),
    eigene: eigene.map((s) => ({ t: s.t, n: s.n, u: s.u, frist: s.s })),
    wiederausschreibungen: andere.filter((s) => s.wa).length,
  };

  // ── Haushaltslage im Umfeld (belegte Haushaltssperren, Stand der Redaktion)
  const mitOrt = sperren.faelle.map((f) => {
    const treffer = f.ebene === 'kreis'
      ? gemeinden.find((x) => norm(x.kreis || '') === norm(f.kreisname || f.kommune) && x.land === f.land && x.ags.slice(0, 5) === x.kreis_ags?.slice(0, 5)) // Kreissitz ≈ eine Gemeinde des Kreises
      : gemeinden.find((x) => norm(x.name) === norm(f.anzeige || f.kommune) && x.land === f.land);
    return { ...f, km: treffer && g.lat != null ? Math.round(km(ort, { la: treffer.lat, lo: treffer.lon })) : null };
  });
  const imLand = [...new Map(mitOrt.filter((f) => f.land === g.land).map((f) => [f.anzeige || f.kommune, f])).values()];
  const gesehen = new Set();
  const naechste = mitOrt.filter((f) => f.km != null).sort((a, b) => a.km - b.km)
    .filter((f) => { const k = f.anzeige || f.kommune; if (gesehen.has(k)) return false; gesehen.add(k); return true; })
    .map((f) => ({ ...f, kommune: f.anzeige || f.kommune })).slice(0, 6);
  const haushalt = { imLand: imLand.length, bundesweit: new Set(sperren.faelle.map((f) => f.anzeige || f.kommune)).size, naechste, stand: sperren.stand,
    eigeneSperre: mitOrt.find((f) => f.ebene !== 'kreis' && norm(f.anzeige || f.kommune) === norm(g.name) && f.land === g.land) || null };

  // ── Hebesätze und Verschuldung im Vergleich (Kreis, Land, Größenklasse ±50 %)
  const peers = (f) => gemeinden.filter(f).map((x) => x.ags);
  const kreisfrei = /kreisfrei/i.test(g.typ || '');
  const kreisAgs = kreisfrei ? peers((x) => x.land === g.land && /kreisfrei/i.test(x.typ || '')) : peers((x) => x.kreis_ags && x.kreis_ags === g.kreis_ags);
  const landAgs = peers((x) => x.land === g.land);
  const groesseAgs = peers((x) => x.land === g.land && x.einwohner >= g.einwohner * 0.5 && x.einwohner <= g.einwohner * 1.5);
  const vergleich = (quelle, feld, hochIstOben = true) => {
    const eigen = quelle[ags]?.[feld] ?? null;
    const w = (liste) => liste.map((a) => quelle[a]?.[feld]).filter((x) => x != null);
    return { wert: eigen, jahr: quelle[ags]?.jahr ?? null,
      kreis: median(w(kreisAgs)), land: median(w(landAgs)), groesse: median(w(groesseAgs)),
      rangLand: rangVon(w(landAgs), eigen, hochIstOben) };
  };
  const finanzen = {
    grundsteuerA: vergleich(hebesaetze, 'grundsteuer_a'), grundsteuerB: vergleich(hebesaetze, 'grundsteuer_b'), gewerbesteuer: vergleich(hebesaetze, 'gewerbesteuer'),
    schulden: vergleich(schulden, 'schulden_je_ew'), kassenkredite: vergleich(schulden, 'kassenkredite_je_ew'),
    beteiligungen: vergleich(schulden, 'beteiligungen_je_ew'), kreisLabel: kreisfrei ? 'Kreisfreie Städte' : 'Kreis',
  };

  // ── Einordnung in drei Sätzen (nur aus den Zahlen abgeleitet)
  const saetze = [];
  if (personal.anzahl) saetze.push(`Im Umkreis von 50 km suchen derzeit ${personal.arbeitgeberZahl} kommunale Arbeitgeber ${personal.anzahl} Fachkräfte${personal.finanz ? `, davon ${personal.finanz} im Finanzwesen` : ''}${personal.median ? ` – Median-Entgelt ${niveauText(personal.median)}` : ''}.`);
  const fremd = haushalt.naechste.filter((f) => f !== haushalt.eigeneSperre && norm(f.kommune) !== norm(g.name));
  if (haushalt.eigeneSperre) saetze.push(`${g.name} gehört zu den ${haushalt.imLand} Kommunen in ${LAND_LANG[g.land] || g.land}, für die die Redaktion seit 2025 eine Haushaltssperre belegt hat${fremd[0] && fremd[0].km <= 60 ? `; die nächste weitere liegt ${fremd[0].km} km entfernt (${fremd[0].kommune})` : ''}.`);
  else if (fremd.length && fremd[0].km <= 60) saetze.push(`Die nächste belegte Haushaltssperre liegt ${fremd[0].km} km entfernt (${fremd[0].kommune}); in ${LAND_LANG[g.land] || g.land} hat die Redaktion ${haushalt.imLand} Fälle seit 2025 belegt.`);
  const gb = finanzen.grundsteuerB;
  if (gb.wert != null && gb.kreis != null) saetze.push(`Der Hebesatz der Grundsteuer B liegt mit ${gb.wert} % ${gb.wert > gb.kreis + 5 ? 'über' : gb.wert < gb.kreis - 5 ? 'unter' : 'auf Höhe'} dem Median ${kreisfrei ? 'der kreisfreien Städte im Land' : 'Ihres Kreises'} (${Math.round(gb.kreis)} %, ${gb.jahr}).`);

  return { gemeinde: { ...g, landLang: LAND_LANG[g.land] || g.land }, personal, haushalt, finanzen, saetze };
}
