// Ergänzt in Markdown-Artikeln den abschließenden Schrägstrich bei internen Links (Runbook 2.1),
// damit neue Beiträge der Artikel-Routine keine Weiterleitungen erzeugen.
const fix = (p) => {
  if (!p || !p.startsWith('/') || p.startsWith('//')) return p;
  const [, basis, rest] = p.match(/^([^?#]*)(.*)$/);
  const letztes = basis.split('/').pop() || '';
  return basis.endsWith('/') || letztes.includes('.') || basis.startsWith('/api/') ? p : `${basis}/${rest}`;
};
export function rehypeSlash() {
  return (baum) => {
    const lauf = (k) => {
      if (k.type === 'element' && k.tagName === 'a' && typeof k.properties?.href === 'string') k.properties.href = fix(k.properties.href);
      (k.children || []).forEach(lauf);
    };
    lauf(baum);
  };
}
