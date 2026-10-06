// Personal-Cockpit: Merkmale einer Stellenausschreibung erkennen.
// Wird von der täglichen Markterfassung (scripts/markt/erfassen.mjs) und von der
// Upload-Auswertung (/api/personal-cockpit/analyse) gleichermaßen genutzt.

// ── Funktionsfelder (aus dem Stellentitel, Reihenfolge = Vorrang) ─────────────
export const FELDER = [
  ['kaemmerei', 'Kämmerei & Haushalt', /k(ä|ae)mmer|haushalt|finanzverwaltung|finanzwesen|finanzmanagement|fachbereich(sleitung)? (\w+ )?finanz|finanzbuchhalt|bilanzbuchhalt|anlagenbuchhalt|rechnungswesen|finanz(en)?\b|doppik|jahresabschluss|kreditor|debitor/i],
  ['kasse', 'Kasse & Vollstreckung', /kasse|vollstreck|vollziehung|forderungsmanagement|mahnwesen/i],
  ['steuern', 'Steuern & Abgaben', /steuer|abgaben|gebühren|beitr(ä|ae)ge|umsatzsteuer|§ ?2b|tax/i],
  ['controlling', 'Controlling & Beteiligungen', /controll|beteiligung|steuerungsunterst|revision|innenrevision/i],
  ['pruefung', 'Rechnungsprüfung', /rechnungspr(ü|ue)f|prüfer|pruefer|prüfungsamt/i],
  ['personal', 'Personal & Organisation', /personal|organisation|recruit|ausbildungsleit|entgelt|bezüge|bezuege|besoldung|gehalt/i],
  ['it', 'IT & Digitalisierung', /\bit\b|it-|informat|digital|software|netzwerk|system(administr|betreu)|e-government|datenschutz|informationssicherheit|egovernment|anwendungsbetreu/i],
  ['bau', 'Bau, Planung & Liegenschaften', /bau|planung|planer|architekt|ingenieur|stadtentwickl|liegenschaft|gebäude|gebaeude|vermessung|tiefbau|hochbau|straßen|strassen|verkehr|immobil/i],
  ['gesundheit', 'Gesundheit & Rettungsdienst', /notfallsanit|rettungs|sanitäter|sanitaeter|ärzt|aerzt|arzt\b|fachärzt|hygiene|gesundheitsamt|gesundheitsaufsicht|pflegefach|pflegekr|krankenpfleg|psychiat|veterinär|veterinaer|lebensmittelkontroll|amtliche fachassist|praxisanleit|zahnärzt/i],
  ['ordnung', 'Ordnung, Feuerwehr & Bürgerservice', /ordnung|bürger|buerger|standesamt|melde|ausländer|auslaender|feuerwehr|brandschutz|brandmeister|brandinspekt|leitstelle|gewerbe|wahlen|bußgeld|bussgeld|verkehrsüberwach|parkraum/i],
  ['soziales', 'Jugend & Soziales', /jugend|sozial|eingliederung|hilfe zur|asd|kinderschutz|pflege|teilhabe|integration|wohngeld|unterhalt|betreuungsbeh|sgb|vergütung|leistungen und/i],
  ['kita', 'Kita, Schule & Bildung', /kita|erzieh|pädagog|paedagog|kindertages|hort|schulsozial|kinderpfleg|schulleit|schule|lehrkr|lehrer|musikschul|volkshochschul|bildung/i],
  ['umwelt', 'Umwelt, Klima & Energie', /klima|umwelt|energie|natur|abfall|wasser|abwasser|grün|gruen|forst/i],
  ['wirtschaft', 'Wirtschaft, Kultur & Tourismus', /wirtschaftsf|tourism|kultur|marketing|museum|bibliothek|veranstalt|presse|kommunikation|öffentlichkeitsarbeit/i],
  ['recht', 'Recht & Vergabe', /recht|jurist|justiziar|vergabe|einkauf|beschaffung|zentrale dienste|hauptamt|verwaltungsleit|büroleit|bueroleit|geschäftsleit|geschaeftsleit|sitzungsdienst|gremien/i],
  ['technik', 'Technik & Handwerk', /techniker|elektr|mechanik|hausmeister|handwerk|bauhof|gärtner|gaertner|fahrer|kfz|schlosser|klärwerk|klaerwerk|facharbeiter|reinigung|bäderbetrieb|baederbetrieb|schwimmmeister|hausdienst|friedhof|werkstatt/i],
  ['verwaltung', 'Allgemeine Verwaltung', /sachbearbeit|verwaltungsfach|verwaltungsangestellt|verwaltungswirt|verwaltungsmitarbeit|nachwuchskraft|public management|berufseinsteiger|mitarbeiter(in)? (bzw\.|für die|im)|assistenz|sekretariat|sachgebiet|verwaltungskraft|bürokraft|buerokraft|kaufm(ä|ae)nnisch/i],
];

export const FELD_NAMEN = Object.fromEntries(FELDER.map(([k, n]) => [k, n]));
FELD_NAMEN.sonstiges = 'Sonstige Verwaltung';

export function funktionsfeld(titel = '') {
  for (const [k, , re] of FELDER) if (re.test(titel)) return k;
  return 'sonstiges';
}

export function istLeitung(titel = '') {
  return /leit(er|ung|erin)|chef|amtsleit|fachbereichsleit|dezernent|beigeordnet|bürgermeister|buergermeister|kämmerer(?!ei)|stadtkämmer|geschäftsführ|geschaeftsfuehr|direktor|vorstand|referatsleit|abteilungsleit|sachgebietsleit|teamleit|bereichsleit/i.test(titel);
}

// ── Entgeltniveau (TVöD-Äquivalent, Näherung) ────────────────────────────────
// E-Gruppen numerisch; A-Besoldung grob auf das E-Niveau abgebildet.
const A_ZU_E = { 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9.3, 10: 9.6, 11: 10, 12: 11, 13: 12.5, 14: 14, 15: 15, 16: 15.5 };
export function niveau(str = '') {
  if (!str) return null;
  const s = String(str).replace(/\s+/g, ' ');
  let m = s.match(/\b(?:S|SuE)\s?(\d{1,2})/i); // Sozial- und Erziehungsdienst
  if (/s\s?\d/i.test(s) && m && !/E\s?\d/.test(s)) {
    const n = +m[1];
    return Math.min(15, Math.max(4, n <= 4 ? 5 : n <= 8 ? 8 : n <= 12 ? 9.3 : n <= 15 ? 10 : 11));
  }
  m = s.match(/\bE(?:G)?\s?(\d{1,2})\s?([abc])?\b/i) || s.match(/TV(?:ö|oe)D[^\d]{0,12}(\d{1,2})\s?([abc])?/i);
  if (m) return +m[1] + ({ a: 0, b: 0.3, c: 0.6 }[(m[2] || '').toLowerCase()] || 0);
  m = s.match(/\bA\s?(\d{1,2})\b/);
  if (m && A_ZU_E[+m[1]]) return A_ZU_E[+m[1]];
  m = s.match(/\bB\s?(\d{1,2})\b/);
  if (m) return 16 + Math.min(+m[1], 6) * 0.3;
  return null;
}

export function niveauText(n) {
  if (n == null) return 'k. A.';
  if (n >= 16) return 'B-Besoldung';
  const g = Math.floor(n + 1e-9);
  const r = n - g;
  if (g !== 9) return 'EG ' + Math.round(n);
  return 'EG 9' + (r > 0.55 ? 'c' : r > 0.25 ? 'b' : 'a');
}

// ── Arbeitgeberleistungen (aus dem Ausschreibungstext) ───────────────────────
export const LEISTUNGEN = [
  ['homeoffice', 'Homeoffice / mobiles Arbeiten', /home.?office|mobile[ns]? arbeit|mobiles arbeiten|telearbeit|remote|ortsunabh/i],
  ['gleitzeit', 'Gleitzeit / flexible Arbeitszeit', /gleitzeit|gleitende arbeitszeit|flexible arbeitszeit|flexibler arbeitszeit|arbeitszeitkonto|vertrauensarbeitszeit/i],
  ['ticket', 'Jobticket / Deutschlandticket', /jobticket|job-ticket|deutschlandticket|deutschland-ticket|firmenticket|fahrtkostenzusch|öpnv-zusch|oepnv/i],
  ['rad', 'Fahrradleasing / JobRad', /jobrad|job-rad|fahrrad-?leasing|dienstrad|e-bike-leasing|bikeleasing|radleasing|fahrradleasing/i],
  ['fortbildung', 'Fort- und Weiterbildung', /fortbildung|weiterbildung|qualifizierung|entwicklungsmöglich|entwicklungsmoeglich|personalentwicklung|weiterentwicklung/i],
  ['gesundheit', 'Gesundheitsmanagement / Sport', /gesundheitsmanagement|gesundheitsförder|gesundheitsfoerder|\bbgm\b|firmenfitness|urban sports|egym|wellpass|hansefit|sportangebot|betriebssport/i],
  ['familie', 'Familienfreundlichkeit / Kinderbetreuung', /familienfreundl|vereinbarkeit|kinderbetreuung|familie und beruf|beruf und familie|eltern-kind|ferienbetreuung/i],
  ['leistungsentgelt', 'Leistungsentgelt / Jahressonderzahlung', /leistungsentgelt|leistungsorientiert|leistungsprämie|leistungspraemie|jahressonderzahlung/i],
  ['zulage', 'Zulage / Fachkräftegewinnung', /zulage|fachkräftegewinnung|fachkraeftegewinnung|arbeitsmarktzulage|vorweggewährung|vorweggewaehrung|höhere erfahrungsstufe|hoehere erfahrungsstufe|stufenvorweg/i],
  ['verbeamtung', 'Verbeamtung möglich', /verbeamtung|beamtenverhältnis|beamtenverhaeltnis|übernahme ins beamten/i],
  ['einarbeitung', 'Strukturierte Einarbeitung / Mentoring', /einarbeitung|mentor|pate|patenschaft|onboarding/i],
  ['urlaub', '30 Tage Urlaub / Zusatzfreie Tage', /30 (arbeits)?tage? urlaub|30 urlaubstage|24\.\s?(und|\/)\s?31\.\s?dez|heiligabend|silvester (sind )?(arbeits)?frei/i],
  ['altersvorsorge', 'Betriebliche Altersvorsorge', /altersvorsorge|zusatzversorgung|betriebsrente|zvk|vbl/i],
  ['sabbatical', 'Sabbatical / Langzeitkonto', /sabbatical|langzeitkonto|lebensarbeitszeitkonto/i],
  ['vergünstigung', 'Mitarbeitervorteile / Rabatte', /corporate benefits|mitarbeiterrabatt|vergünstigung|verguenstigung|mitarbeitervorteil|benefit-?plattform/i],
  ['kantine', 'Kantine / Verpflegungszuschuss', /kantine|betriebsrestaurant|essenszuschuss|verpflegungszuschuss|mensa/i],
  ['parken', 'Parkplatz / gute Erreichbarkeit', /parkpl(a|ä)tz|parkmöglich|parkmoeglich|tiefgarage|zentrale lage|gute erreichbarkeit|verkehrsgünstig|verkehrsguenstig/i],
  ['ausstattung', 'Moderne Arbeitsplatzausstattung', /moderne[nrs]? (arbeitsplatz|ausstattung|büro|buero)|höhenverstellbar|hoehenverstellbar|laptop|notebook|digitale arbeitsmittel/i],
];
export const LEISTUNG_NAMEN = Object.fromEntries(LEISTUNGEN.map(([k, n]) => [k, n]));

export function htmlZuText(html = '') {
  return String(html)
    .replace(/<(br|\/p|\/li|\/h\d|\/div)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü').replace(/&szlig;/g, 'ß')
    .replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü').replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

export function leistungen(text = '') {
  return LEISTUNGEN.filter(([, , re]) => re.test(text)).map(([k]) => k);
}

// ── Weitere Textmerkmale ─────────────────────────────────────────────────────
export function textMerkmale(text = '') {
  const t = String(text);
  const woerter = (t.match(/\S+/g) || []).length;
  return {
    woerter,
    befristet: /befristet(?! zu besetzen)|befristung|zeitlich begrenzt|elternzeitvertretung|mutterschutzvertretung|krankheitsvertretung|projektstelle/i.test(t) && !/unbefristet/i.test(t),
    teilzeit: /teilzeit|teilbar|job-?sharing/i.test(t),
    entgeltGenannt: niveau(t) != null,
    gender: /\((m|w|d|gn)[/|,]\s?(m|w|d)|\*in|:in\b|_in\b|\(all genders?\)/i.test(t),
    ansprechpartner: /ansprechp|fragen (zum|zur|beantwortet|richten)|für fragen|fuer fragen|telefon|tel\.|e-mail/i.test(t),
    duzen: /\b(du|dich|dein|deine|dir)\b/.test(t),
    wirBieten: /wir bieten|unser angebot|was wir (ihnen|dir) bieten|darauf können sie sich freuen|ihre vorteile|das erwartet sie/i.test(t),
  };
}

// ── Bundesland aus Postleitzahl (Leitregionen, Näherung) ─────────────────────
const PLZ = [
  [1000, 1999, 'SN'], [2000, 2999, 'SN'], [3000, 3999, 'BB'], [4000, 4999, 'SN'], [6000, 6999, 'ST'],
  [7000, 7999, 'TH'], [8000, 9999, 'SN'], [10000, 14199, 'BE'], [14400, 16999, 'BB'], [17000, 19999, 'MV'],
  [20000, 21149, 'HH'], [21150, 21999, 'NI'], [22000, 22999, 'HH'], [23000, 25999, 'SH'], [26000, 27499, 'NI'],
  [27500, 28999, 'HB'], [29000, 31999, 'NI'], [32000, 33999, 'NW'], [34000, 36999, 'HE'], [37000, 38999, 'NI'],
  [39000, 39999, 'ST'], [40000, 48999, 'NW'], [49000, 49999, 'NI'], [50000, 53999, 'NW'], [54000, 56999, 'RP'],
  [57000, 59999, 'NW'], [60000, 65999, 'HE'], [66000, 66999, 'SL'], [67000, 67999, 'RP'], [68000, 69999, 'BW'],
  [70000, 79999, 'BW'], [80000, 87999, 'BY'], [88000, 89999, 'BW'], [90000, 96999, 'BY'], [97000, 97999, 'BY'],
  [98000, 99999, 'TH'],
];
export const LAENDER = { BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg', HE: 'Hessen', MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen', RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen' };
export function land(plz) {
  const p = parseInt(plz, 10);
  if (!p) return null;
  for (const [a, b, l] of PLZ) if (p >= a && p <= b) return l;
  return null;
}

// ── Kommunaler Arbeitgeber? (Behördenname) ───────────────────────────────────
export function istKommunal(name = '') {
  const n = name.toLowerCase();
  if (/bundes|landesamt|landesbetrieb|ministerium|regierungspräsid|regierungspraesid|bezirksregierung|polizei|universit|hochschule|finanzamt|zoll|bundeswehr|landgericht|amtsgericht|oberlandes|staatlich|deutsche rentenversicherung|agentur für arbeit|jobcenter|krankenkasse|\baok\b|klinik|universitätsklinik|forschungs|fraunhofer|max-planck|helmholtz|leibniz/.test(n)) return false;
  return /stadt|gemeinde|landkreis|kreis\b|kreis |kreisverwaltung|landratsamt|markt |verbandsgemeinde|samtgemeinde|amt |zweckverband|bezirksamt|magistrat|verwaltungsgemeinschaft|eigenbetrieb|kommunal|städt|bezirk |region |regionalverband|landschaftsverband|kreisstadt|hansestadt|ortsgemeinde|gemeindeverwaltung|stadtverwaltung|abwasserverband|wasserverband|aör|anstalt des öffentlichen rechts/.test(n);
}

// ── Gesamter Merkmalsatz aus Text (für Upload und Detailtexte) ───────────────
export function merkmaleAusText(text, { titel = '', entgelt = '' } = {}) {
  const t = htmlZuText(text);
  const tm = textMerkmale(t);
  const tit = titel || (t.split('\n').find(z => /\(m\/w\/d\)|\(w\/m\/d\)|\(d\/m\/w\)|m\/w\/d/i.test(z)) || t.split('\n')[0] || '').slice(0, 160);
  return {
    titel: tit.trim(),
    feld: funktionsfeld(tit),
    leitung: istLeitung(tit),
    niveau: niveau(entgelt) ?? niveau(t),
    homeoffice: /home.?office|mobile[ns]? arbeit|mobiles arbeiten|telearbeit|remote/i.test(t) ? 1 : 0,
    leistungen: leistungen(t),
    ...tm,
  };
}
