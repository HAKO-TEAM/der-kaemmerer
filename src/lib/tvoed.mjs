// TVöD-Gehaltsatlas: Entgelttabelle VKA plus Stellenmarkt je Entgeltgruppe.
// Niveauwerte in markt.json sind E-Äquivalente (9.0/9.3/9.6 = 9a/9b/9c, ab 16 Besoldung B).
import tarif from '../data/tarif/tvoed_vka_2026.json';

export const TARIF = tarif;
/** Reihenfolge von unten nach oben; Ü-Gruppen nur in der Gesamttabelle. */
export const GRUPPEN = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9a', 'E9b', 'E9c', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15'];
export const egName = (k) => k.replace(/^E(\d+)/, 'E $1').replace('Ü', ' Ü');
export const egSlug = (k) => `tvoed-${k.toLowerCase().replace('ü', 'ue')}`;
export const EG_AUS_SLUG = Object.fromEntries(GRUPPEN.map((k) => [egSlug(k), k]));

/** Jahresbrutto: zwölf Monatsentgelte plus Jahressonderzahlung (vereinfacht auf Basis desselben Monatsentgelts). */
export const jahr = (m) => (m == null ? null : m * (12 + tarif.jahressonderzahlung));
/** Stundenentgelt nach § 24 Abs. 3 TVöD: Monatsentgelt ÷ (4,348 × Wochenstunden). */
export const stunde = (m) => (m == null ? null : m / (4.348 * tarif.wochenstunden));
/** Jahre bis zum Erreichen der Stufe (Stufe 1 = 0). */
export const jahreBisStufe = (s) => tarif.stufenlaufzeit.slice(0, s - 1).reduce((a, b) => a + b, 0);

/** Niveauwert einer Ausschreibung → Entgeltgruppe (null bei Besoldung B oder unbekannt). */
export function egVonNiveau(n) {
  if (n == null || n >= 16) return null;
  if (n < 1.5) return 'E1';
  const g = Math.floor(n + 1e-9);
  if (g === 9) { const r = n - 9; return r > 0.45 ? 'E9c' : r > 0.15 ? 'E9b' : 'E9a'; }
  return `E${Math.min(15, Math.round(n))}`;
}

export const euro = (x, d = 0) => (x == null ? '–' : x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' €');

/**
 * Monatliche Gehaltsspanne (Stufe 1 bis 6 laut TVöD-VKA-Tabelle) aus dem Entgelt-Text einer Anzeige,
 * z. B. „EG 11 TVöD“, „TVöD E 9c“, „EG 10–11 TVöD“, „EG 11 TVoeD / A 12 LBesGBW“.
 * Nur bei eindeutiger TVöD-Entgeltgruppe; „bis EG …“, nur Besoldung, AT und Sonderverträge → null.
 */
export function gehaltsSpanne(entgelt) {
  const t = String(entgelt || '');
  if (!/TV[öo]e?D/i.test(t)) return null;
  const m = t.match(/\b(?:Entgeltgruppe|EG|E)\s?(\d{1,2})\s?([abc])?\b(?:\s?(?:[–-]|bis)\s?(?:Entgeltgruppe|EG|E)?\s?(\d{1,2})\s?([abc])?\b)?/i);
  if (!m || /\bbis\s*$/i.test(t.slice(0, m.index))) return null; // „bis EG …“: Untergrenze offen
  const k1 = `E${m[1]}${(m[2] || '').toLowerCase()}`;
  const k2 = m[3] ? `E${m[3]}${(m[4] || '').toLowerCase()}` : k1;
  const z1 = tarif.tabelle[k1], z2 = tarif.tabelle[k2];
  if (!z1 || !z2) return null;
  const werte = (z) => z.filter((x) => x != null);
  return { min: Math.min(...werte(z1)), max: Math.max(...werte(z2)), gruppe: k1 === k2 ? k1 : `${k1}–${k2}` };
}
