// Gemeindeverzeichnis: sprechende Adressen /gemeinden/<land>/<gemeinde>/ für alle Gemeinden (Destatis GV-ISys).
// Gleichnamige Gemeinden in einem Land erhalten den Kreis als Zusatz (z. B. neustadt-landkreis-coburg).

export const LAND_LANG = { BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg', HE: 'Hessen', MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen', RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen' };

export const slug = (s = '') => s.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const LAND_SLUG = Object.fromEntries(Object.entries(LAND_LANG).map(([k, v]) => [k, slug(v)]));
export const LAND_AUS_SLUG = Object.fromEntries(Object.entries(LAND_SLUG).map(([k, v]) => [v, k]));

/** {pfad je AGS, AGS je pfad} – deterministisch aus der Gemeindeliste. */
export function verzeichnis(gemeinden) {
  const zaehl = {};
  for (const g of gemeinden) { const k = `${g.land}/${slug(g.name)}`; zaehl[k] = (zaehl[k] || 0) + 1; }
  const pfad = {}, ags = {};
  for (const g of gemeinden) {
    let s = slug(g.name);
    if (zaehl[`${g.land}/${s}`] > 1) s = `${s}-${slug(g.kreis || g.ags)}`;
    if (ags[`${LAND_SLUG[g.land]}/${s}`]) s = `${s}-${g.ags}`;   // letzte Rettung: gleicher Name im selben Kreis
    const p = `${LAND_SLUG[g.land]}/${s}`;
    pfad[g.ags] = p; ags[p] = g.ags;
  }
  return { pfad, ags };
}

export const gemeindeUrl = (p) => `/gemeinden/${p}/`;

/** „in Bayern“, aber „im Saarland“. */
export const imLand = (name) => (name === 'Saarland' ? 'im Saarland' : `in ${name}`);
