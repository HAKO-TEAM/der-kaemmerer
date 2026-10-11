// Übersetzt den amtlichen Programmablaufplan (PAP) Lohnsteuer des BMF/ITZBund (XML-Pseudocode) in ein JavaScript-Modul.
// Quelle: https://www.bmf-steuerrechner.de/javax.faces.resource/daten/xmls/Lohnsteuer2026.xml.xhtml (Stand 2025-10-23)
// Aufruf: node scripts/pap-uebersetzen.mjs 2026  → src/lib/rechner/lohnsteuer2026.mjs
// Die erzeugte Datei nicht von Hand ändern – bei einem neuen PAP die XML ersetzen und neu übersetzen.
import { readFileSync, writeFileSync } from 'node:fs';

const jahr = process.argv[2] || '2026';
const xml = readFileSync(new URL(`../src/data/steuer/Lohnsteuer${jahr}.xml`, import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const ent = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

// Java-Ausdruck → JavaScript
const js = (s) => ent(s)
  .replace(/BigDecimal\.valueOf/g, 'BD.valueOf')
  .replace(/BigDecimal\.ZERO/g, 'BD.ZERO').replace(/BigDecimal\.ONE/g, 'BD.ONE')
  .replace(/BigDecimal\.ROUND_DOWN/g, 'BD.DOWN').replace(/BigDecimal\.ROUND_UP/g, 'BD.UP')
  .replace(/\bnew BigDecimal\b/g, 'BD.valueOf');

// Tokenizer für die Elemente des PAP
const tokens = [...xml.matchAll(/<(\/?)([A-Z]+)((?:\s+[a-zA-Z]+\s*=\s*"[^"]*")*)\s*(\/?)>/g)].map((m) => ({
  zu: m[1] === '/', name: m[2], leer: m[4] === '/',
  attr: Object.fromEntries([...m[3].matchAll(/([a-zA-Z]+)\s*=\s*"([^"]*)"/g)].map((a) => [a[1], a[2]])),
}));
let i = 0;
function block(ende) {   // liest Anweisungen bis zum schließenden Tag `ende`
  const zeilen = [];
  while (i < tokens.length) {
    const t = tokens[i++];
    if (t.zu && t.name === ende) return zeilen;
    if (t.zu) continue;
    if (t.name === 'EVAL') zeilen.push(`${js(t.attr.exec)};`);
    else if (t.name === 'EXECUTE') zeilen.push(`${t.attr.method}();`);
    else if (t.name === 'IF') {
      let dann = [], sonst = null;
      while (i < tokens.length) {
        const u = tokens[i++];
        if (u.zu && u.name === 'IF') break;
        if (!u.zu && u.name === 'THEN') dann = block('THEN');
        else if (!u.zu && u.name === 'ELSE') sonst = block('ELSE');
      }
      zeilen.push(`if (${js(t.attr.expr)}) {`, ...dann.map((z) => '  ' + z), ...(sonst ? ['} else {', ...sonst.map((z) => '  ' + z)] : []), '}');
    }
  }
  return zeilen;
}

const deklaration = [], eingaben = [], ausgaben = [], methoden = [];
let main = [];
while (i < tokens.length) {
  const t = tokens[i++];
  if (t.zu) continue;
  if (['INPUT', 'OUTPUT', 'INTERNAL'].includes(t.name)) {
    const start = t.attr.default ? js(t.attr.default) : (t.attr.type === 'BigDecimal' ? 'BD.ZERO' : '0');
    deklaration.push(`let ${t.attr.name} = ${start};`);
    if (t.name === 'INPUT') eingaben.push([t.attr.name, t.attr.type]);
    if (t.name === 'OUTPUT') ausgaben.push(t.attr.name);
  } else if (t.name === 'CONSTANT') {
    deklaration.push(`const ${t.attr.name} = ${js(t.attr.value).replace(/^\{/, '[').replace(/\}$/, ']')};`);
  } else if (t.name === 'MAIN') {
    main = block('MAIN');
  } else if (t.name === 'METHOD') {
    methoden.push(`function ${t.attr.name}() {`, ...block('METHOD').map((z) => '  ' + z), '}');
  }
}

const code = `// AUTOMATISCH ERZEUGT aus dem amtlichen PAP Lohnsteuer ${jahr} (BMF/ITZBund) durch scripts/pap-uebersetzen.mjs – nicht von Hand ändern.
// Quelle: src/data/steuer/Lohnsteuer${jahr}.xml
import { BD } from './bigdecimal.mjs';

/**
 * Lohnsteuer, Solidaritätszuschlag und Bemessungsgrundlage Kirchensteuer nach PAP ${jahr}.
 * Eingaben wie im PAP (Beträge in Cent), z. B. { LZZ: 2, RE4: 409767, STKL: 1, ZKF: 0, R: 0, KVZ: 2.9, PVZ: 1, PVS: 0, PVA: 0 }.
 * Ergebnis: alle Ausgaben des PAP als Zahl (Cent), z. B. LSTLZZ, SOLZLZZ, BK.
 */
export function lohnsteuer${jahr}(werte = {}) {
${deklaration.map((z) => '  ' + z).join('\n')}
  const TYP = ${JSON.stringify(Object.fromEntries(eingaben))};
  for (const [k, v] of Object.entries(werte)) {
    if (!(k in TYP)) throw new Error('Unbekannte Eingabe: ' + k);
    const wert = TYP[k] === 'BigDecimal' ? BD.valueOf(v) : Number(v);
    switch (k) {
${eingaben.map(([n]) => `      case '${n}': ${n} = wert; break;`).join('\n')}
    }
  }
${methoden.map((z) => '  ' + z).join('\n')}
${main.map((z) => '  ' + z).join('\n')}
  return { ${ausgaben.map((a) => `${a}: ${a} instanceof BD ? ${a}.toNumber() : ${a}`).join(', ')} };
}
`;
writeFileSync(new URL(`../src/lib/rechner/lohnsteuer${jahr}.mjs`, import.meta.url), code);
console.log(`PAP ${jahr}: ${eingaben.length} Eingaben, ${ausgaben.length} Ausgaben, ${methoden.filter((z) => z.startsWith('function')).length} Methoden übersetzt`);
