// Interne Links immer mit abschließendem Schrägstrich (Runbook 2.1) – vermeidet die 308-Weiterleitung je Klick/Crawl.
// Ausnahmen: externe URLs, mailto:/tel:, reine Anker, Dateien mit Endung (…/rss.xml, …/logo.png).
export function href(pfad: string): string {
  if (!pfad || !pfad.startsWith('/') || pfad.startsWith('//')) return pfad;
  const m = pfad.match(/^([^?#]*)(.*)$/)!;
  const [, basis, rest] = m;
  const letztes = basis.split('/').pop() || '';
  if (basis.endsWith('/') || letztes.includes('.')) return pfad;
  return `${basis}/${rest}`;
}
