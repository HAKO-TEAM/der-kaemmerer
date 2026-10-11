// Tragfähigkeitsanalyse – Oberfläche. Ansichten, Formular für den vollständigen Antrag, SVG-Diagramme.
import { rechne, sensitivitaet, szenarien, personalkosten, KGST, KG_NAMEN } from './rechnung.js';
import { MUSTER, MASSNAHMEN } from './muster.js';

const klon = (o) => JSON.parse(JSON.stringify(o));
let st = klon(MUSTER);
const START_MASSNAHMEN = ['qm', 'miete', 'energie', 'kita'];
const aktiv = new Set(START_MASSNAHMEN);
let ansicht = 'ueberblick';

// ── Formatierung
const de = (x, d = 0) => (x == null || isNaN(x) ? '–' : Number(x).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }));
const eur = (x) => `${de(x)} €`;
const teur = (x) => `${de(x / 1000)} T€`;
const mio = (x, d = 2) => `${de(x / 1e6, d)} Mio. €`;
const pct = (x, d = 0) => `${de(x * 100, d)} %`;
const vz = (x) => (x > 0 ? '+ ' : x < 0 ? '− ' : '') + teur(Math.abs(x));
const AMPEL = { rot: 'Tragfähigkeit nur mit Gegenfinanzierung', gelb: 'Tragfähig mit Auflagen', gruen: 'Tragfähig' };
const mitMassnahmen = (s) => { const c = klon(s); MASSNAHMEN.filter((m) => aktiv.has(m.id)).forEach((m) => m.an(c)); return c; };

// ── SVG-Diagramme
const FARBEN = ['#172840', '#2563eb', '#60a5fa', '#93c5fd', '#ca8a04', '#f59e0b', '#16a34a', '#7c3aed', '#94a3b8'];
function balken({ labels, reihen, hoehe = 260, gestapelt = true, linie = null, nullLinie = true }) {
  const B = 760, H = hoehe, L = 58, R = 12, T = 12, U = 28, n = labels.length, bw = (B - L - R) / n;
  const werte = labels.map((_, i) => {
    const pos = reihen.reduce((a, r) => a + Math.max(0, r.werte[i]), 0), neg = reihen.reduce((a, r) => a + Math.min(0, r.werte[i]), 0);
    return gestapelt ? [neg, pos] : [Math.min(0, ...reihen.map((r) => r.werte[i])), Math.max(0, ...reihen.map((r) => r.werte[i]))];
  });
  let lo = Math.min(0, ...werte.map((w) => w[0]), ...(linie ? linie.werte : [])), hi = Math.max(0, ...werte.map((w) => w[1]), ...(linie ? linie.werte : []));
  if (hi === lo) hi = lo + 1;
  const y = (v) => T + (hi - v) / (hi - lo) * (H - T - U);
  let s = `<svg viewBox="0 0 ${B} ${H}" width="100%" role="img">`;
  const schritt = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4))), st = Math.ceil((hi - lo) / 4 / schritt) * schritt;
  for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) s += `<line x1="${L}" x2="${B - R}" y1="${y(v)}" y2="${y(v)}" stroke="#eef2f7"/><text x="${L - 6}" y="${y(v) + 4}" font-size="10" text-anchor="end" fill="#64748b">${de(v / 1000)}</text>`;
  if (nullLinie) s += `<line x1="${L}" x2="${B - R}" y1="${y(0)}" y2="${y(0)}" stroke="#94a3b8"/>`;
  labels.forEach((lab, i) => {
    const x = L + i * bw; let auf = 0, ab = 0;
    reihen.forEach((r, k) => {
      const v = r.werte[i]; if (!v) return;
      const bx = gestapelt ? x + bw * 0.15 : x + bw * 0.12 + k * (bw * 0.76 / reihen.length), bb = gestapelt ? bw * 0.7 : bw * 0.76 / reihen.length;
      let y1, y2; if (gestapelt) { if (v >= 0) { y1 = y(auf + v); y2 = y(auf); auf += v; } else { y1 = y(ab); y2 = y(ab + v); ab += v; } } else { y1 = y(Math.max(0, v)); y2 = y(Math.min(0, v)); }
      s += `<rect x="${bx}" y="${y1}" width="${bb}" height="${Math.max(0.5, y2 - y1)}" fill="${r.farbe}" rx="1.5"><title>${lab} · ${r.name}: ${teur(v)}</title></rect>`;
    });
    if (n <= 30 && (n <= 14 || i % 2 === 0)) s += `<text x="${x + bw / 2}" y="${H - 9}" font-size="10" text-anchor="middle" fill="#64748b">${lab}</text>`;
  });
  if (linie) s += `<polyline fill="none" stroke="${linie.farbe}" stroke-width="2.5" points="${linie.werte.map((v, i) => `${L + i * bw + bw / 2},${y(v)}`).join(' ')}"/>` + linie.werte.map((v, i) => `<circle cx="${L + i * bw + bw / 2}" cy="${y(v)}" r="3" fill="${linie.farbe}"><title>${labels[i]} · ${linie.name}: ${teur(v)}</title></circle>`).join('');
  s += `<text x="4" y="${T + 6}" font-size="10" fill="#64748b">T€</text></svg>`;
  const leg = [...reihen, ...(linie ? [linie] : [])].map((r) => `<span><i style="background:${r.farbe}"></i>${r.name}</span>`).join('');
  return s + `<div class="leg">${leg}</div>`;
}
function linien({ labels, reihen, hoehe = 260, markierungen = [] }) {
  const B = 760, H = hoehe, L = 58, R = 12, T = 12, U = 28, n = labels.length;
  const alle = reihen.flatMap((r) => r.werte); let lo = Math.min(0, ...alle), hi = Math.max(...alle); if (hi === lo) hi = lo + 1;
  const x = (i) => L + i * (B - L - R) / Math.max(1, n - 1), y = (v) => T + (hi - v) / (hi - lo) * (H - T - U);
  let s = `<svg viewBox="0 0 ${B} ${H}" width="100%" role="img">`;
  const schritt = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4))), stp = Math.ceil((hi - lo) / 4 / schritt) * schritt;
  for (let v = Math.ceil(lo / stp) * stp; v <= hi; v += stp) s += `<line x1="${L}" x2="${B - R}" y1="${y(v)}" y2="${y(v)}" stroke="#eef2f7"/><text x="${L - 6}" y="${y(v) + 4}" font-size="10" text-anchor="end" fill="#64748b">${de(v / 1e6, 1)}</text>`;
  markierungen.forEach((m) => { const i = labels.indexOf(m.jahr); if (i >= 0) s += `<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - U}" stroke="${m.farbe}" stroke-dasharray="4 3"/><text x="${x(i) + 4}" y="${T + 10}" font-size="10" fill="${m.farbe}" font-weight="700">${m.text}</text>`; });
  reihen.forEach((r) => { s += `<polyline fill="none" stroke="${r.farbe}" stroke-width="2.5" ${r.strich ? 'stroke-dasharray="6 4"' : ''} points="${r.werte.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>`; });
  labels.forEach((l, i) => { if (n <= 14 || i % 3 === 0) s += `<text x="${x(i)}" y="${H - 9}" font-size="10" text-anchor="middle" fill="#64748b">${l}</text>`; });
  s += `<text x="4" y="${T + 6}" font-size="10" fill="#64748b">Mio. €</text></svg>`;
  return s + `<div class="leg">${reihen.map((r) => `<span><i style="background:${r.farbe}"></i>${r.name}</span>`).join('')}</div>`;
}
function ring(teile, mitte) {
  const sum = teile.reduce((a, t) => a + t.wert, 0); let w = -Math.PI / 2; let s = '<svg viewBox="0 0 200 200" width="190" role="img">';
  teile.forEach((t) => { const a = t.wert / sum * Math.PI * 2, x1 = 100 + 80 * Math.cos(w), y1 = 100 + 80 * Math.sin(w); w += a; const x2 = 100 + 80 * Math.cos(w), y2 = 100 + 80 * Math.sin(w);
    s += `<path d="M${x1} ${y1} A80 80 0 ${a > Math.PI ? 1 : 0} 1 ${x2} ${y2}" stroke="${t.farbe}" stroke-width="30" fill="none"><title>${t.name}: ${teur(t.wert)}</title></path>`; });
  return s + `<text x="100" y="98" text-anchor="middle" font-size="22" font-weight="800" fill="#172840">${mitte[0]}</text><text x="100" y="118" text-anchor="middle" font-size="11" fill="#64748b">${mitte[1]}</text></svg>`;
}
function tornado(daten) {
  const B = 760, zeile = 34, H = daten.length * zeile + 30, M = 400, max = Math.max(...daten.flatMap((d) => [Math.abs(d.hoch), Math.abs(d.tief)]), 1), sk = (v) => v / max * 170;
  let s = `<svg viewBox="0 0 ${B} ${H}" width="100%" role="img"><line x1="${M}" x2="${M}" y1="4" y2="${H - 22}" stroke="#94a3b8"/>`;
  daten.forEach((d, i) => { const y = 8 + i * zeile;
    [['hoch', d.hoch], ['tief', d.tief]].forEach(([k, v]) => { const w = sk(v); s += `<rect x="${w >= 0 ? M : M + w}" y="${y}" width="${Math.abs(w)}" height="${zeile - 12}" rx="3" fill="${v >= 0 ? '#ef4444' : '#22c55e'}" opacity="${k === 'hoch' ? 1 : .75}"><title>${d.name} (${k === 'hoch' ? 'oben' : 'unten'}): ${vz(v)} p. a.</title></rect>`; });
    s += `<text x="${M - 184}" y="${y + 15}" font-size="12" text-anchor="end" fill="#0f172a">${d.name}</text><text x="${M + 184}" y="${y + 15}" font-size="11" fill="#475569">${vz(Math.max(d.hoch, d.tief))} / ${vz(Math.min(d.hoch, d.tief))}</text>`; });
  return s + `<text x="${M}" y="${H - 6}" font-size="10" text-anchor="middle" fill="#64748b">Änderung der Ø jährlichen Belastung (Jahre 1–10 nach Inbetriebnahme)</text></svg>`;
}

// ── Ansichten
const ANSICHTEN = [['ueberblick', 'Überblick'], ['antrag', 'Antrag'], ['investition', 'Investition & Finanzierung'], ['folgekosten', 'Folgekosten'],
  ['haushalt', 'Haushaltswirkung'], ['sensitivitaet', 'Sensitivität & Szenarien'], ['massnahmen', 'Maßnahmen'], ['votum', 'Kämmerer-Votum'], ['methodik', 'Rechenweg & Methodik']];

function kopf(r) {
  document.getElementById('fall').innerHTML = `<b>${st.kommune.name}</b> · ${de(st.kommune.einwohner)} EW · ${st.kommune.statusText}<br>${st.antrag.aktenzeichen} · ${st.projekt.titel.split(' – ')[0]}<br><span class="pill ${r.ampel}">${AMPEL[r.ampel]}</span>`;
  document.getElementById('nav').innerHTML = ANSICHTEN.map(([id, t]) => `<button data-a="${id}" class="${id === ansicht ? 'an' : ''}">${t}</button>`).join('');
}
function urteil(r, titel) {
  const t = r.mit.ersterTrigger;
  return `<div class="karte urteil"><div class="ampel"><i class="rot ${r.ampel === 'rot' ? 'an' : ''}"></i><i class="gelb ${r.ampel === 'gelb' ? 'an' : ''}"></i><i class="gruen ${r.ampel === 'gruen' ? 'an' : ''}"></i></div>
  <div><h2>${titel || AMPEL[r.ampel]}: ${teur(r.oeBelastung)} Belastung im Jahr</h2><p>Ø der ersten zehn vollen Betriebsjahre: ${eur(r.jeEw)} je Einwohner, entspricht ${de(r.hebesatzPunkte)} Hebesatzpunkten der Grundsteuer B.
  ${t && !r.ohne.ersterTrigger ? `<b class="neg">Das Vorhaben löst ${t.jahr} die Pflicht zum Haushaltssicherungskonzept aus</b> (§ 76 Abs. 1 GO NRW: ${t.regel}).` : r.ohne.ersterTrigger ? `Die Pflicht zum Haushaltssicherungskonzept besteht bereits ohne das Vorhaben (${r.ohne.ersterTrigger.jahr}).` : 'Die Pflicht zum Haushaltssicherungskonzept wird im Planungszeitraum nicht ausgelöst.'}</p></div></div>`;
}

function vUeberblick(r) {
  const kp = [
    ['Gesamtkosten', mio(r.gesamt), `${pct(r.nichtFoerderfaehig / r.gesamt, 1)} nicht förderfähig`, ''],
    ['Förderung', mio(r.foerderung), `Quote ${pct(st.projekt.foerderquote)} der förderfähigen Kosten`, ''],
    ['Eigenanteil', mio(r.eigenanteil), `${pct(st.projekt.finanzierung.kreditanteil)} kreditfinanziert`, ''],
    ['Ø Belastung p. a.', teur(r.oeBelastung), `${eur(r.jeEw)} je Einwohner`, r.ampel],
    ['Barwert Folgelast', mio(r.barwert, 1), `über ${st.projekt.zweckbindung} Jahre Zweckbindung`, r.ampel],
  ];
  const zj = r.zeilen.filter((z) => z.jahr >= st.projekt.inbetriebnahme).slice(0, 12);
  return urteil(r) + `<div class="raster r5">${kp.map(([a, b, c, k]) => `<div class="karte kpi ${k}"><span>${a}</span><b>${b}</b><small>${c}</small></div>`).join('')}</div>
  <div class="raster r21" style="margin-top:16px"><div class="karte"><h3>Wirkung auf den Ergebnishaushalt je Jahr</h3>${balken({ labels: zj.map((z) => z.jahr), reihen: [
    { name: 'Betrieb und Personal', farbe: '#172840', werte: zj.map((z) => -z.betrieb) }, { name: 'Abschreibung netto', farbe: '#2563eb', werte: zj.map((z) => -(z.afa - z.sp)) },
    { name: 'Zinsen', farbe: '#60a5fa', werte: zj.map((z) => -z.zinsen) }, { name: 'Erlöse', farbe: '#16a34a', werte: zj.map((z) => z.erloese) }], linie: { name: 'Saldo', farbe: '#dc2626', werte: zj.map((z) => z.ergebnis) } })}</div>
  <div class="karte"><h3>Auflagen aus der Prüfung</h3>${r.auflagen.slice(0, 4).map((a) => `<div class="auflage p${a.prio}">${a.text}</div>`).join('')}<p class="hinweis">Alle Auflagen in der Ansicht „Kämmerer-Votum“.</p></div></div>
  <div class="raster r3" style="margin-top:16px">
    <div class="karte"><h3>Allgemeine Rücklage</h3><p style="margin:0">Ohne Vorhaben Ende ${st.kommune.ergebnisplan ? Math.max(...Object.keys(st.kommune.ergebnisplan)) : ''}: <b>${mio(r.ohne.reihe.find((o) => o.jahr === Math.max(...Object.keys(st.kommune.ergebnisplan).map(Number))).allg, 1)}</b><br>Mit Vorhaben: <b>${mio(r.mit.reihe.find((o) => o.jahr === Math.max(...Object.keys(st.kommune.ergebnisplan).map(Number))).allg, 1)}</b></p><p class="hinweis">Reichweite in der Fortschreibung: ohne ${r.ohne.reichweite || 'über die Zweckbindung hinaus'}, mit ${r.mit.reichweite || 'über die Zweckbindung hinaus'}.</p></div>
    <div class="karte"><h3>Kostendeckung im Betrieb</h3><p style="margin:0;font-size:26px;font-weight:800;color:${r.deckung < 0.5 ? '#dc2626' : '#16a34a'}">${pct(r.deckung)}</p><p class="hinweis">Anteil der Betriebskosten, den Mieten, Pachten und Entgelte decken (Jahre 1–10).</p></div>
    <div class="karte"><h3>Ersatzinvestitionen in der Zweckbindung</h3><p style="margin:0;font-size:26px;font-weight:800;color:#172840">${mio(r.ersatz.reduce((a, e) => a + e.wert, 0), 1)}</p><p class="hinweis">${r.ersatz.map((e) => `${e.jahr}: ${KG_NAMEN[e.key].split(' ').slice(0, 2).join(' ')}`).join(' · ')} – nicht gefördert.</p></div>
  </div>`;
}

// Antrag-Formular: Pfad → Wert
const hol = (pfad) => pfad.split('.').reduce((o, k) => o?.[k], st);
const setz = (pfad, wert) => { const t = pfad.split('.'); const l = t.pop(); const o = t.reduce((a, k) => a[k], st); o[l] = wert; };
function feld(label, pfad, art = 'zahl', hilfe = '') {
  const v = hol(pfad);
  const wert = art === 'pct' ? de(v * 100, 2) : art === 'text' ? v : art === 'jahr' ? v : de(v, art === 'dez' ? 2 : 0);
  return `<label class="feld"><span>${label}${hilfe ? `<br><small style="color:#64748b">${hilfe}</small>` : ''}</span><input type="${art === 'text' ? 'text' : 'text'}" inputmode="decimal" data-pfad="${pfad}" data-art="${art}" value="${wert}"></label>`;
}
const zahl = (s) => Number(String(s).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
function vAntrag(r) {
  const p = st.projekt, k = st.kommune, b = st.betrieb;
  return `<h2>Antrag und Haushaltsdaten</h2><p class="unter">Alle Angaben des Förderantrags und der Haushaltsplanung. Jede Änderung rechnet das Cockpit sofort neu. Der Antrag lässt sich als Datei sichern und wieder laden.</p>
  <p class="nichtdruck"><button class="knopf" id="export">Antrag als Datei sichern</button><label class="knopf hell" style="cursor:pointer">Antrag laden<input type="file" id="import" accept=".json" hidden></label><button class="knopf hell" id="muster">Muster wiederherstellen</button></p>
  <div class="raster r2">
    <div class="karte"><h3>1 · Antrag</h3>
      <label class="feld lang"><span>Vorhaben</span><input type="text" data-pfad="projekt.titel" data-art="text" value="${p.titel}"></label>
      ${feld('Aktenzeichen', 'antrag.aktenzeichen', 'text')}${feld('Förderprogramm', 'antrag.programm', 'text')}${feld('Antragseingang', 'antrag.eingang', 'text')}${feld('Stand im Verfahren', 'antrag.stern', 'text')}
      <label class="feld lang"><span>Ziele und Nutzung</span><textarea rows="3" data-pfad="antrag.ziele" data-art="text">${st.antrag.ziele}</textarea></label>
      ${feld('Baubeginn (Jahr)', 'projekt.baubeginn', 'jahr')}${feld('Inbetriebnahme (Jahr)', 'projekt.inbetriebnahme', 'jahr')}${feld('Betriebsmonate im ersten Jahr', 'projekt.monateErstesJahr')}${feld('Zweckbindungsfrist (Jahre)', 'projekt.zweckbindung')}
    </div>
    <div class="karte"><h3>2 · Ausgaben- und Finanzierungsplan</h3>
      ${Object.keys(KG_NAMEN).map((kk) => feld(KG_NAMEN[kk], `projekt.kosten.${kk}`, 'zahl', 'in €')).join('')}
      ${feld('davon nicht förderfähig', 'projekt.nichtFoerderfaehig', 'zahl', 'in €')}${feld('Förderquote', 'projekt.foerderquote', 'pct', 'in % der förderfähigen Kosten')}${feld('Drittmittel', 'projekt.drittmittel', 'zahl', 'in €')}
      ${feld('Eigenanteil kreditfinanziert', 'projekt.finanzierung.kreditanteil', 'pct')}${feld('Zinssatz', 'projekt.finanzierung.zins', 'pct')}${feld('Kreditlaufzeit (Jahre)', 'projekt.finanzierung.laufzeit')}
      <h3 style="margin-top:14px">Mittelabfluss (Anteil je Jahr)</h3>${Object.keys(p.mittelabfluss).map((j) => feld(`Jahr ${j}`, `projekt.mittelabfluss.${j}`, 'pct')).join('')}
    </div>
    <div class="karte"><h3>3 · Betriebs- und Nutzungskonzept</h3>
      ${feld('Bruttogrundfläche (m²)', 'betrieb.flaeche')}${feld('Energie (€ je m² und Jahr)', 'betrieb.energie', 'dez')}${feld('Reinigung (€ je m² und Jahr)', 'betrieb.reinigung', 'dez')}${feld('Wartung, Versicherung (€ je m² und Jahr)', 'betrieb.wartung', 'dez')}
      ${feld('Bauunterhaltung (% der Bauwerkskosten p. a.)', 'betrieb.bauunterhaltung', 'pct')}${feld('Pflege Außenanlagen (% p. a.)', 'betrieb.pflegeAussen', 'pct')}${feld('Sachkosten Programm (€ p. a.)', 'betrieb.sachkosten')}
      <h3 style="margin-top:14px">Personal</h3><table class="tabin"><tr><th>Funktion</th><th>EG</th><th class="z">VZÄ</th><th class="z">KGSt je VZÄ</th></tr>
      ${b.personal.map((x, i) => `<tr><td><input type="text" data-pfad="betrieb.personal.${i}.funktion" data-art="text" value="${x.funktion}"></td><td><select data-pfad="betrieb.personal.${i}.eg" data-art="text">${Object.keys(KGST).map((e) => `<option ${e === x.eg ? 'selected' : ''}>${e}</option>`).join('')}</select></td><td><input data-pfad="betrieb.personal.${i}.vza" data-art="dez" value="${de(x.vza, 2)}"></td><td class="z">${eur(personalkosten(x.eg))}</td></tr>`).join('')}</table>
      <h3 style="margin-top:14px">Erlöse (€ p. a.)</h3><table class="tabin"><tr><th>Art</th><th class="z">Betrag</th><th class="z">Auslastung</th></tr>
      ${b.erloese.map((x, i) => `<tr><td><input type="text" data-pfad="betrieb.erloese.${i}.art" data-art="text" value="${x.art}"></td><td><input data-pfad="betrieb.erloese.${i}.betrag" data-art="zahl" value="${de(x.betrag)}"></td><td><input data-pfad="betrieb.erloese.${i}.auslastung" data-art="pct" value="${de((x.auslastung ?? 1) * 100)}"></td></tr>`).join('')}</table>
    </div>
    <div class="karte"><h3>4 · Haushalt der Kommune</h3>
      ${feld('Kommune', 'kommune.name', 'text')}${feld('Einwohner', 'kommune.einwohner')}
      <label class="feld"><span>Haushaltsstatus (NRW)</span><select data-pfad="kommune.haushaltsstatus" data-art="zahl">${[[1, 'ausgeglichen'], [2, 'fiktiv ausgeglichen'], [3, 'Verringerung allg. Rücklage'], [4, 'Fehlbetragsvortrag'], [5, 'HSK genehmigt'], [6, 'HSK nicht genehmigt'], [7, 'vorläufige Haushaltsführung']].map(([v, t]) => `<option value="${v}" ${v === k.haushaltsstatus ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      ${feld('Ausgleichsrücklage (€)', 'kommune.ausgleichsruecklage')}${feld('Allgemeine Rücklage (€)', 'kommune.allgemeineRuecklage')}${feld('Kassenkredite (€)', 'kommune.kassenkredite')}
      ${feld('Aufkommen Grundsteuer B (€)', 'kommune.grundsteuerB')}${feld('Hebesatz Grundsteuer B (%)', 'kommune.hebesatzB')}
      <h3 style="margin-top:14px">Ergebnisplan (Jahresergebnis, mittelfristige Planung)</h3>${Object.keys(k.ergebnisplan).map((j) => feld(`Jahr ${j}`, `kommune.ergebnisplan.${j}`)).join('')}
      ${feld('Fortschreibung nach dem Planungszeitraum', 'kommune.fortschreibung', 'pct', 'jährliche Veränderung des Ergebnisses')}
      <h3 style="margin-top:14px">Nutzungsdauern (Jahre)</h3>${Object.keys(st.nutzungsdauer).map((kk) => feld(KG_NAMEN[kk].split(' ').slice(0, 2).join(' ') + ' ' + KG_NAMEN[kk].split(' ').slice(2).join(' '), `nutzungsdauer.${kk}`)).join('')}
      <h3 style="margin-top:14px">Preisentwicklung p. a.</h3>${feld('Personal', 'indexierung.personal', 'pct')}${feld('Sach- und Energiekosten', 'indexierung.sach', 'pct')}${feld('Erlöse', 'indexierung.erloese', 'pct')}${feld('Baupreise (Ersatzinvestitionen)', 'indexierung.bau', 'pct')}
    </div>
  </div>`;
}

function vInvestition(r) {
  const p = st.projekt, farben = ['#94a3b8', '#172840', '#2563eb', '#16a34a', '#ca8a04', '#7c3aed'];
  const teile = Object.keys(p.kosten).map((k, i) => ({ name: KG_NAMEN[k], wert: p.kosten[k], farbe: farben[i] }));
  const bauJ = r.zeilen.filter((z) => z.investition > 0);
  const zj = r.zeilen.filter((z) => z.jahr >= p.inbetriebnahme).slice(0, 30);
  return `<h2>Investition und Finanzierung</h2><p class="unter">Kosten nach DIN 276, Finanzierung aus Förderung, Drittmitteln und Eigenanteil, Mittelabfluss und Kreditdienst.</p>
  <div class="raster r12"><div class="karte" style="text-align:center">${ring(teile, [mio(r.gesamt, 1), 'Gesamtkosten'])}<div class="leg" style="justify-content:center">${teile.map((t) => `<span><i style="background:${t.farbe}"></i>${t.name.split(' ').slice(0, 2).join(' ')}</span>`).join('')}</div></div>
  <div class="karte"><h3>Ausgaben- und Finanzierungsplan</h3><table><tr><th>Kostengruppe</th><th class="z">Kosten</th><th class="z">Anteil</th><th class="z">Nutzungsdauer</th></tr>
    ${Object.keys(p.kosten).map((k) => `<tr><td>${KG_NAMEN[k]}</td><td class="z">${eur(p.kosten[k])}</td><td class="z">${pct(p.kosten[k] / r.gesamt, 1)}</td><td class="z">${st.nutzungsdauer[k] ? st.nutzungsdauer[k] + ' J.' : 'anteilig KG 300/400'}</td></tr>`).join('')}
    <tr class="summe"><td>Gesamtkosten</td><td class="z">${eur(r.gesamt)}</td><td class="z">100 %</td><td></td></tr>
    <tr><td>davon nicht förderfähig</td><td class="z neg">${eur(r.nichtFoerderfaehig)}</td><td></td><td></td></tr>
    <tr><td>Förderung (${pct(p.foerderquote)} von ${eur(r.foerderfaehig)})</td><td class="z pos">${eur(r.foerderung)}</td><td class="z">${pct(r.foerderung / r.gesamt, 1)}</td><td></td></tr>
    <tr><td>Drittmittel</td><td class="z">${eur(r.dritte)}</td><td></td><td></td></tr>
    <tr class="summe"><td>Eigenanteil der Kommune</td><td class="z">${eur(r.eigenanteil)}</td><td class="z">${pct(r.eigenanteil / r.gesamt, 1)}</td><td></td></tr>
    <tr><td>· davon Kredit (${pct(p.finanzierung.zins, 2)}, ${p.finanzierung.laufzeit} Jahre)</td><td class="z">${eur(r.kredit)}</td><td></td><td></td></tr>
    <tr><td>· davon Eigenmittel</td><td class="z">${eur(r.eigenmittel)}</td><td></td><td></td></tr></table></div></div>
  <div class="raster r2" style="margin-top:16px"><div class="karte"><h3>Mittelabfluss und Förderung je Jahr</h3>${balken({ labels: bauJ.map((z) => z.jahr), gestapelt: false, reihen: [{ name: 'Auszahlungen', farbe: '#172840', werte: bauJ.map((z) => z.investition) }, { name: 'Förderung (Einzahlung)', farbe: '#16a34a', werte: bauJ.map((z) => z.foerderungEin) }] })}<p class="hinweis">Vereinfachung: Förderung fließt im Verhältnis des Mittelabflusses; in der Praxis nach Mittelanforderung und Verwendungsnachweis.</p></div>
  <div class="karte"><h3>Kreditdienst über die Zweckbindung</h3>${balken({ labels: zj.map((z) => z.jahr), reihen: [{ name: 'Zinsen', farbe: '#60a5fa', werte: zj.map((z) => z.zinsen) }, { name: 'Tilgung', farbe: '#172840', werte: zj.map((z) => z.tilgung) }] })}<p class="hinweis">Zinsen ab Inbetriebnahme (Bauzeitzinsen vereinfacht nicht angesetzt); Ersatzinvestitionen anteilig kreditfinanziert.</p></div></div>`;
}

function vFolgekosten(r) {
  const zj = r.zeilen.filter((z) => z.jahr >= st.projekt.inbetriebnahme);
  const z1 = r.betriebsjahre[0] || zj[0];
  const posten = [['Energie', 'energie'], ['Reinigung', 'reinigung'], ['Wartung, Versicherung', 'wartung'], ['Bauunterhaltung', 'unterhaltung'], ['Pflege Außenanlagen', 'pflege'], ['Personal', 'personal'], ['Sachkosten Programm', 'sach']];
  return `<h2>Folgekosten über ${st.projekt.zweckbindung} Jahre Zweckbindung</h2><p class="unter">Was nach der Förderung im Haushalt bleibt: Betrieb, Personal, Unterhaltung, Abschreibungen abzüglich der Auflösung der Sonderposten, Zinsen und Ersatzinvestitionen – mit Preissteigerung.</p>
  <div class="karte"><h3>Ergebniswirkung je Jahr</h3>${balken({ labels: zj.map((z) => z.jahr), hoehe: 300, reihen: [
    { name: 'Personal', farbe: '#172840', werte: zj.map((z) => -z.personal) }, { name: 'Bewirtschaftung', farbe: '#334e7a', werte: zj.map((z) => -(z.energie + z.reinigung + z.wartung + z.sach)) },
    { name: 'Unterhaltung und Pflege', farbe: '#60a5fa', werte: zj.map((z) => -(z.unterhaltung + z.pflege)) }, { name: 'Abschreibung netto', farbe: '#ca8a04', werte: zj.map((z) => -(z.afa - z.sp)) },
    { name: 'Zinsen', farbe: '#f59e0b', werte: zj.map((z) => -z.zinsen) }, { name: 'Erlöse', farbe: '#16a34a', werte: zj.map((z) => z.erloese) }], linie: { name: 'Saldo', farbe: '#dc2626', werte: zj.map((z) => z.ergebnis) } })}</div>
  <div class="raster r2" style="margin-top:16px"><div class="karte"><h3>Erstes volles Betriebsjahr ${z1.jahr}</h3><table><tr><th>Posten</th><th class="z">€ p. a.</th><th class="z">je EW</th></tr>
    ${posten.map(([n, k]) => `<tr><td>${n}</td><td class="z">${eur(z1[k])}</td><td class="z">${de(z1[k] / st.kommune.einwohner, 2)} €</td></tr>`).join('')}
    <tr class="summe"><td>Betriebskosten</td><td class="z">${eur(z1.betrieb)}</td><td class="z">${de(z1.betrieb / st.kommune.einwohner, 2)} €</td></tr>
    <tr><td>Abschreibungen brutto</td><td class="z">${eur(z1.afa)}</td><td></td></tr><tr><td>Auflösung Sonderposten (Förderung)</td><td class="z pos">− ${eur(z1.sp)}</td><td></td></tr>
    <tr><td>Zinsen</td><td class="z">${eur(z1.zinsen)}</td><td></td></tr><tr><td>Erlöse</td><td class="z pos">− ${eur(z1.erloese)}</td><td></td></tr>
    <tr class="summe"><td>Belastung des Ergebnishaushalts</td><td class="z neg">${eur(-z1.ergebnis)}</td><td class="z">${de(-z1.ergebnis / st.kommune.einwohner, 2)} €</td></tr></table></div>
  <div class="karte"><h3>Abschreibung nach Anlagengruppe</h3><table><tr><th>Anlage</th><th class="z">aktiviert</th><th class="z">ND</th><th class="z">AfA p. a.</th><th class="z">netto</th></tr>
    ${r.anlagen.map((a) => `<tr><td>${KG_NAMEN[a.key].split(' – ').pop().replace(/^KG \d+ /, '')}</td><td class="z">${teur(a.wert)}</td><td class="z">${a.nd}</td><td class="z">${teur(a.wert / a.nd)}</td><td class="z">${teur(a.wert / a.nd * (1 - (r.foerderung + r.dritte) / r.gesamt))}</td></tr>`).join('')}</table>
    <p class="hinweis">Baunebenkosten (KG 700) anteilig auf das Bauwerk aktiviert. Die Förderung wird als Sonderposten passiviert und parallel zur Abschreibung aufgelöst – netto belastet nur der nicht geförderte Anteil.</p>
    <h3 style="margin-top:14px">Ersatzinvestitionen (nicht gefördert)</h3><table>${r.ersatz.map((e) => `<tr><td>${e.jahr}</td><td>${KG_NAMEN[e.key]}</td><td class="z">${eur(e.wert)}</td></tr>`).join('') || '<tr><td>keine innerhalb der Zweckbindung</td></tr>'}</table></div></div>`;
}

function vHaushalt(r) {
  const k = st.kommune, jahre = r.mit.reihe.map((o) => o.jahr), planEnde = Math.max(...Object.keys(k.ergebnisplan).map(Number));
  const markier = []; if (r.mit.ersterTrigger) markier.push({ jahr: r.mit.ersterTrigger.jahr, farbe: '#dc2626', text: 'HSK-Pflicht' }); markier.push({ jahr: planEnde, farbe: '#64748b', text: 'Ende Planung' });
  return `<h2>Haushaltswirkung</h2><p class="unter">Jahresergebnis laut mittelfristiger Ergebnisplanung, danach fortgeschrieben – mit und ohne Vorhaben. Verzehr der allgemeinen Rücklage und Prüfung der Pflicht zum Haushaltssicherungskonzept nach § 76 Abs. 1 GO NRW.</p>
  ${urteil(r)}
  <div class="raster"><div class="karte"><h3>Allgemeine Rücklage</h3>${linien({ labels: jahre, reihen: [{ name: 'ohne Vorhaben', farbe: '#94a3b8', strich: true, werte: r.ohne.reihe.map((o) => o.allg) }, { name: 'mit Vorhaben', farbe: '#172840', werte: r.mit.reihe.map((o) => o.allg) }], markierungen: markier })}</div>
  <div class="karte"><h3>Jahresergebnis</h3>${balken({ labels: jahre.slice(0, 12), gestapelt: false, reihen: [{ name: 'ohne Vorhaben', farbe: '#94a3b8', werte: r.ohne.reihe.slice(0, 12).map((o) => o.ergebnis) }, { name: 'mit Vorhaben', farbe: '#172840', werte: r.mit.reihe.slice(0, 12).map((o) => o.ergebnis) }] })}</div></div>
  <div class="karte" style="margin-top:16px"><h3>Prüfung § 76 Abs. 1 GO NRW im Planungszeitraum</h3><div class="scroll"><table><tr><th>Jahr</th><th class="z">Ergebnis ohne</th><th class="z">Ergebnis mit</th><th class="z">Allg. Rücklage mit</th><th class="z">Verringerung</th><th>Schwelle 1/20 (5 %)</th><th>Schwelle 1/4 (25 %)</th></tr>
    ${r.mit.reihe.filter((o) => o.imPlan).map((o, i) => { const oh = r.ohne.reihe[i]; return `<tr><td>${o.jahr}</td><td class="z">${teur(oh.ergebnis)}</td><td class="z">${teur(o.ergebnis)}</td><td class="z">${mio(o.allg, 2)}</td><td class="z ${o.quote > 0.05 ? 'neg' : ''}">${pct(o.quote, 1)}</td><td>${o.quote > 0.05 ? '<b class="neg">überschritten</b>' : 'eingehalten'}</td><td>${o.quote > 0.25 ? '<b class="neg">überschritten</b>' : 'eingehalten'}</td></tr>`; }).join('')}</table></div>
    <p class="hinweis">Regeln: Pflicht zum HSK, wenn die allgemeine Rücklage in einem Jahr um mehr als ein Viertel sinkt, in zwei aufeinanderfolgenden Jahren um jeweils mehr als ein Zwanzigstel sinken soll oder innerhalb der mittelfristigen Planung aufgebraucht wird. ${r.mit.trigger.length ? 'Ausgelöst: ' + r.mit.trigger.map((t) => `${t.jahr} (${t.regel})`).join('; ') : 'Im Planungszeitraum nicht ausgelöst.'}</p></div>`;
}

function vSensitivitaet(r) {
  const sens = sensitivitaet(st), sz = szenarien(st, mitMassnahmen);
  return `<h2>Sensitivität und Szenarien</h2><p class="unter">Welche Annahmen das Ergebnis am stärksten bewegen – und wie das Vorhaben unter vorsichtigen Annahmen und mit Maßnahmen dasteht.</p>
  <div class="karte"><h3>Tornado: Ø Belastung bei ±-Änderung je Treiber</h3>${tornado(sens)}</div>
  <div class="raster r3" style="margin-top:16px">${sz.map((s) => `<div class="karte kpi ${s.r.ampel}"><span>${s.name}</span><b>${teur(s.r.oeBelastung)} p. a.</b><small>${eur(s.r.jeEw)} je EW · ${de(s.r.hebesatzPunkte)} Hebesatzpunkte · ${s.r.mit.ersterTrigger && !s.r.ohne.ersterTrigger ? `HSK-Pflicht ${s.r.mit.ersterTrigger.jahr}` : 'keine HSK-Pflicht im Planungszeitraum'}</small>${s.hinweis ? `<p class="hinweis">${s.hinweis}</p>` : ''}</div>`).join('')}</div>`;
}

function vMassnahmen(r) {
  const basis = rechne(st);
  return `<h2>Maßnahmen</h2><p class="unter">Mit welchen Änderungen am Nutzungs- und Betriebskonzept das Vorhaben tragfähig wird. Auswahl wirkt auf das Szenario „Mit Maßnahmen“ und auf das Votum.</p>
  ${MASSNAHMEN.map((m) => { const c = klon(st); m.an(c); const d = rechne(c).oeBelastung - basis.oeBelastung; return `<label class="mass"><input type="checkbox" data-mass="${m.id}" ${aktiv.has(m.id) ? 'checked' : ''}><div><b>${m.titel}</b><span>${m.text}</span></div><em class="${d < 0 ? 'pos' : 'neg'}">${vz(d)} p. a.</em></label>`; }).join('')}
  ${urteil(rechne(mitMassnahmen(st)), 'Mit gewählten Maßnahmen')}`;
}

function vVotum(r) {
  const rm = rechne(mitMassnahmen(st)), heute = new Date().toLocaleDateString('de-DE'), z = r.betriebsjahre[0];
  const plan = r.mit.reihe.filter((o) => o.imPlan), ohne = r.ohne.reihe;
  const hsk = r.mit.ersterTrigger && !r.ohne.ersterTrigger;
  const empf = rm.ampel === 'rot' ? 'Bewilligung erst nach Vorlage eines tragfähigen Betriebs- und Finanzierungskonzepts.' : rm.ampel === 'gelb' ? 'Bewilligung mit den genannten Auflagen; Folgekosten im Haushalt verbindlich veranschlagen und jährlich berichten.' : 'Bewilligung ohne zusätzliche haushaltsrechtliche Auflagen.';
  return `<p class="nichtdruck"><button class="knopf" id="pdf">PDF herunterladen (eine Seite A4)</button><button class="knopf hell" onclick="window.print()">Drucken</button></p>
  <div class="va">
    <div class="va-kopf"><div><div class="va-marke">Der <span>Kämmerer</span><small>KÄMMERER-VOTUM ZUR TRAGFÄHIGKEIT</small></div></div>
      <div class="va-meta"><b>MUSTERFALL · FIKTIVE GEMEINDE</b><br>${st.kommune.name} · ${de(st.kommune.einwohner)} Einwohner<br>${st.antrag.aktenzeichen} · Stand ${heute}</div></div>
    <div class="va-inhalt">
      <h1 class="va-h1">${st.projekt.titel}</h1>
      <p class="va-sub">${st.antrag.programm} · Zweckbindung ${st.projekt.zweckbindung} Jahre ab ${st.projekt.inbetriebnahme} · Haushaltsstatus: ${st.kommune.statusText}</p>
      <div class="va-urteil ${r.ampel}"><div class="va-ampel"><i class="rot ${r.ampel === 'rot' ? 'an' : ''}"></i><i class="gelb ${r.ampel === 'gelb' ? 'an' : ''}"></i><i class="gruen ${r.ampel === 'gruen' ? 'an' : ''}"></i></div>
        <div><b>${AMPEL[r.ampel]}</b><p>Ø ${eur(r.oeBelastung)} Belastung des Ergebnishaushalts je Jahr in den ersten zehn Betriebsjahren${hsk ? ` – das Vorhaben <strong>löst ${r.mit.ersterTrigger.jahr} die Pflicht zum Haushaltssicherungskonzept aus</strong> (§ 76 Abs. 1 GO NRW)` : ''}. Mit Maßnahmen: ${eur(rm.oeBelastung)} (${AMPEL[rm.ampel]}${rm.mit.ersterTrigger && !rm.ohne.ersterTrigger ? '' : ', keine HSK-Pflicht'}).</p></div></div>
      <div class="va-kpis">
        <div><span>Gesamtkosten</span><b>${mio(r.gesamt)}</b><small>Förderung ${mio(r.foerderung)} (${pct(st.projekt.foerderquote)})</small></div>
        <div><span>Eigenanteil</span><b>${mio(r.eigenanteil)}</b><small>${pct(st.projekt.finanzierung.kreditanteil)} Kredit, ${pct(st.projekt.finanzierung.zins, 1)}</small></div>
        <div><span>Belastung je Einwohner</span><b>${eur(r.jeEw)}</b><small>je Jahr, Ø Jahre 1–10</small></div>
        <div><span>Grundsteuer B</span><b>${de(r.hebesatzPunkte)} Punkte</b><small>1 Punkt = ${eur(r.punktwert)}</small></div>
        <div><span>Barwert Folgelast</span><b>${mio(r.barwert, 1)}</b><small>über ${st.projekt.zweckbindung} Jahre</small></div>
      </div>
      <div class="va-zwei">
        <div><h2>Folgekosten im ersten vollen Betriebsjahr ${z.jahr}</h2><table>
          <tr><td>Betrieb, Bewirtschaftung, Unterhaltung</td><td class="z">${eur(z.betrieb - z.personal)}</td></tr>
          <tr><td>Personal (KGSt-Vollkosten)</td><td class="z">${eur(z.personal)}</td></tr>
          <tr><td>Abschreibungen brutto</td><td class="z">${eur(z.afa)}</td></tr>
          <tr><td>− Auflösung Sonderposten (Förderung)</td><td class="z pos">− ${eur(z.sp)}</td></tr>
          <tr><td>Zinsen auf den Eigenanteil</td><td class="z">${eur(z.zinsen)}</td></tr>
          <tr><td>− Erlöse (Mieten, Pacht, Entgelte)</td><td class="z pos">− ${eur(z.erloese)}</td></tr>
          <tr class="summe"><td>Belastung des Ergebnishaushalts</td><td class="z neg">${eur(-z.ergebnis)}</td></tr></table>
          <p class="va-klein">Kostendeckung durch Erlöse ${pct(r.deckung)}; Ersatzinvestitionen in der Zweckbindung ${mio(r.ersatz.reduce((a, e) => a + e.wert, 0), 1)}, nicht gefördert.</p></div>
        <div><h2>Allgemeine Rücklage – Prüfung § 76 GO NRW</h2><table>
          <tr><th>Jahr</th><th class="z">Ergebnis mit</th><th class="z">Rücklage</th><th class="z">Verringerung</th></tr>
          ${plan.map((o, i) => `<tr><td>${o.jahr}</td><td class="z">${teur(o.ergebnis)}</td><td class="z">${mio(o.allg, 1)}</td><td class="z ${o.quote > 0.05 ? 'neg' : ''}">${pct(o.quote, 1)}${o.quote > 0.05 ? ' ▲' : ''}</td></tr>`).join('')}</table>
          <p class="va-klein">Ohne Vorhaben höchstens ${pct(Math.max(...ohne.filter((o) => o.imPlan).map((o) => o.quote)), 1)} je Jahr. Schwelle: zwei Folgejahre über 5 % oder ein Jahr über 25 %.</p></div>
      </div>
      <h2>Auflagen vor der Bewilligung</h2><ol class="va-auflagen">${r.auflagen.map((a) => `<li class="p${a.prio}">${a.text}</li>`).join('')}</ol>
      <div class="va-zwei va-schluss">
        <div class="va-box"><h2>Mit Maßnahmen</h2><p>${MASSNAHMEN.filter((m) => aktiv.has(m.id)).map((m) => m.titel).join(' · ') || 'keine gewählt'}</p><p><b>${eur(rm.oeBelastung)} je Jahr · ${eur(rm.jeEw)} je Einwohner</b> – ${AMPEL[rm.ampel]}${rm.mit.ersterTrigger && !rm.ohne.ersterTrigger ? `, HSK-Pflicht ${rm.mit.ersterTrigger.jahr}` : ', keine HSK-Pflicht im Planungszeitraum'}.</p></div>
        <div class="va-box va-empf"><h2>Empfehlung</h2><p>${empf}</p></div>
      </div>
    </div>
    <div class="va-fuss"><span>Rechenweg: Abschreibung je Kostengruppe abzüglich Sonderposten, Zins des Eigenanteils, Betrieb und Personal (KGSt 8/2025) mit Preissteigerung, Ersatzinvestitionen, Erlöse; Haushaltswirkung auf Basis der mittelfristigen Ergebnisplanung.</span><span>Der Kämmerer · HAKO Beteiligungsgesellschaft mbH · Dresden · revier.derkaemmerer.de/tragfaehigkeit</span></div>
  </div>`;
}

function rechenweg() {
  const r = rechne(st), p = st.projekt, z = r.betriebsjahre[0], rm = rechne(mitMassnahmen(st));
  const plan = r.mit.reihe.filter((o) => o.imPlan), ohne = r.ohne.reihe;
  const rate = r.kredit > 0 ? r.kredit * p.finanzierung.zins / (1 - Math.pow(1 + p.finanzierung.zins, -p.finanzierung.laufzeit)) : 0;
  return `<div class="karte methode" style="margin-bottom:16px"><h2>Rechenweg am Musterfall ${st.kommune.name}</h2>
  <p class="unter">Die Zahlen unten kommen live aus dem Rechenkern – ändern Sie den Antrag, ändert sich der Rechenweg.</p>
  <h3>Schritt 1 · Was gefördert wird</h3><p>Gesamtkosten ${eur(r.gesamt)}, davon ${eur(r.nichtFoerderfaehig)} nicht förderfähig → förderfähig ${eur(r.foerderfaehig)}. Förderung ${pct(p.foerderquote)} davon = <b>${eur(r.foerderung)}</b>. Eigenanteil = ${eur(r.gesamt)} − ${eur(r.foerderung)} = <b>${eur(r.eigenanteil)}</b>, finanziert über einen Kredit von ${eur(r.kredit)} (${pct(p.finanzierung.zins, 2)}, ${p.finanzierung.laufzeit} Jahre) – Annuität ${eur(rate)} im Jahr.</p>
  <h3>Schritt 2 · Was jedes Jahr bleibt (erstes volles Betriebsjahr ${z.jahr})</h3>
  <table style="max-width:720px"><tr><td>Betriebskosten (Energie, Reinigung, Wartung, Unterhaltung, Pflege, Sachkosten)</td><td class="z">${eur(z.betrieb - z.personal)}</td></tr>
  <tr><td>Personal nach KGSt-Vollkosten (${st.betrieb.personal.map((x) => `${de(x.vza, 2)} ${x.funktion} ${x.eg}`).join(', ')})</td><td class="z">${eur(z.personal)}</td></tr>
  <tr><td>Abschreibungen brutto</td><td class="z">${eur(z.afa)}</td></tr><tr><td>− Auflösung Sonderposten (geförderter Anteil ${pct((r.foerderung + r.dritte) / r.gesamt, 1)})</td><td class="z pos">− ${eur(z.sp)}</td></tr>
  <tr><td>Zinsen auf den Eigenanteil</td><td class="z">${eur(z.zinsen)}</td></tr><tr><td>− Erlöse (Mieten, Pacht, Saal)</td><td class="z pos">− ${eur(z.erloese)}</td></tr>
  <tr class="summe"><td>Belastung des Ergebnishaushalts ${z.jahr}</td><td class="z neg">${eur(-z.ergebnis)}</td></tr></table>
  <p>Der Eigenanteil von ${eur(r.eigenanteil)} ist also nicht das Problem – <b>die Last liegt im Betrieb</b>: Personal und Bewirtschaftung machen ${pct((z.betrieb) / (-z.ergebnis + z.erloese))} der Bruttobelastung aus. Im Durchschnitt der ersten zehn Jahre sind es <b>${eur(r.oeBelastung)}</b> im Jahr, ${eur(r.jeEw)} je Einwohner oder ${de(r.hebesatzPunkte)} Punkte Grundsteuer B (1 Punkt = ${eur(r.punktwert)}).</p>
  <h3>Schritt 3 · Was das für den Haushalt heißt</h3>
  <p>${st.kommune.name} plant ohne Vorhaben Fehlbeträge von ${plan.map((o, i) => teur(-ohne[i].ergebnis)).join(', ')} (${plan[0].jahr}–${plan[plan.length - 1].jahr}); die allgemeine Rücklage von ${mio(st.kommune.allgemeineRuecklage, 1)} sinkt dabei jährlich um höchstens ${pct(Math.max(...ohne.filter((o) => o.imPlan).map((o) => o.quote)), 1)} – unter der Schwelle von 5 %.
  Mit Vorhaben steigt die Verringerung auf ${plan.map((o) => pct(o.quote, 1)).join(', ')}. ${r.mit.ersterTrigger && !r.ohne.ersterTrigger ? `In ${r.mit.trigger.filter((t) => t.jahr === r.mit.ersterTrigger.jahr).length ? r.mit.ersterTrigger.jahr - 1 : ''} und ${r.mit.ersterTrigger.jahr} liegt sie über einem Zwanzigstel – <b>das löst ${r.mit.ersterTrigger.jahr} die Pflicht zum Haushaltssicherungskonzept aus</b> (§ 76 Abs. 1 Nr. 2 GO NRW). Ein Projekt mit 90 % Förderung bringt die Gemeinde damit in die Haushaltssicherung.` : 'Die Schwellen des § 76 werden eingehalten.'}</p>
  <h3>Schritt 4 · Wie es tragfähig wird</h3>
  <p>Mit den Maßnahmen ${MASSNAHMEN.filter((m) => aktiv.has(m.id)).map((m) => `„${m.titel}“`).join(', ') || '(keine gewählt)'} sinkt die Belastung auf <b>${eur(rm.oeBelastung)}</b> im Jahr (${eur(rm.jeEw)} je Einwohner); ${rm.mit.ersterTrigger && !rm.ohne.ersterTrigger ? `die HSK-Pflicht bleibt (${rm.mit.ersterTrigger.jahr})` : 'die HSK-Pflicht wird nicht mehr ausgelöst'} – Ampel <span class="pill ${rm.ampel}">${AMPEL[rm.ampel]}</span>. Genau diese Auflagen gehören vor die Bewilligung in den Antrag.</p></div>`;
}

function vMethodik() {
  return rechenweg() + `<div class="karte methode"><h2>Methodik der Tragfähigkeitsanalyse</h2>
  <p>Die Analyse beantwortet eine Frage, die kein Förderbescheid stellt: <b>Kann die Kommune das Vorhaben über die gesamte Zweckbindungsfrist tragen?</b> Gefördert wird die Investition; Betrieb, Personal, Unterhaltung, der nicht geförderte Teil der Abschreibung, Zinsen und Ersatzinvestitionen bleiben im Haushalt.</p>
  <h3>1 · Investition und Finanzierung</h3><p>Kosten nach DIN 276 (KG 200–700). Förderung = Förderquote × förderfähige Kosten; Eigenanteil = Gesamtkosten − Förderung − Drittmittel, finanziert über Kredit (Annuität) und/oder Eigenmittel. Baunebenkosten (KG 700) werden anteilig auf das Bauwerk aktiviert.</p>
  <h3>2 · Ergebniswirkung</h3><p>Abschreibung je Anlagengruppe nach Nutzungsdauer; Fördermittel und Drittmittel werden als Sonderposten passiviert und parallel aufgelöst – netto wirkt nur der nicht geförderte Anteil. Hinzu kommen Zinsen, Betriebskosten (Energie, Reinigung, Wartung je m²), Bauunterhaltung und Pflege als Anteil der Herstellkosten, Personal nach KGSt-Vollkosten und Sachkosten, jeweils mit Preissteigerung; Erlöse mindern die Belastung. Ersatzinvestitionen fallen an, wenn die Nutzungsdauer einer Anlagengruppe innerhalb der Zweckbindung endet.</p>
  <h3>3 · Haushaltswirkung</h3><p>Die Ergebniswirkung wird zum Jahresergebnis der mittelfristigen Ergebnisplanung addiert (danach fortgeschrieben). Fehlbeträge mindern erst die Ausgleichsrücklage, dann die allgemeine Rücklage. Geprüft werden die drei Tatbestände des § 76 Abs. 1 GO NRW im Planungszeitraum.</p>
  <h3>4 · Urteil</h3><p>Rot, wenn das Vorhaben die HSK-Pflicht auslöst oder vorzieht oder die Belastung je Einwohner die obere Schwelle überschreitet; gelb ab der unteren Schwelle; sonst grün. Schwellen je nach Haushaltslage: bei Rücklagenverzehr oder Haushaltssicherung 10 / 40 € je Einwohner und Jahr, sonst 25 / 75 €. Zusätzlich: Barwert der Folgelast, Hebesatzpunkte der Grundsteuer B, Kostendeckung im Betrieb.</p>
  <h3>5 · Grenzen</h3><p>Vereinfachungen: Förderung fließt im Verhältnis des Mittelabflusses; Bauzeitzinsen und Liquiditätskosten während der Bauphase sind nicht angesetzt; Fortschreibung des Haushalts nach dem Planungszeitraum als Trend. Die Analyse ersetzt keine Prüfung durch die Bewilligungsbehörde; sie macht die Folgen für den Haushalt sichtbar, bevor bewilligt wird.</p>
  <p class="hinweis">Musterfall „Gemeinde Musterbach“: fiktive Kommune mit realistischen Größenordnungen. Für einen echten Antrag werden die Felder in der Ansicht „Antrag“ aus Antrag, Kostenberechnung und Haushaltsplan übernommen.</p></div>`;
}

// ── PDF ohne Druckdialog: Votum als Bild auf genau eine A4-Seite
const skript = (src) => new Promise((ok, fehl) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const t = document.createElement('script'); t.src = src; t.onload = ok; t.onerror = fehl; document.head.appendChild(t); });
async function pdfLaden(knopf) {
  const alt = knopf.textContent; knopf.textContent = 'PDF wird erstellt …'; knopf.disabled = true;
  try {
    await skript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await skript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const el = document.querySelector('.va'); el.classList.add('va-fix');
    // html2canvas scheitert an CSS-Großschreibung mit „ß“ (wird zu „SS“): Text vorher selbst groß schreiben
    el.querySelectorAll('*').forEach((n) => { if (getComputedStyle(n).textTransform === 'uppercase') { n.childNodes.forEach((c) => { if (c.nodeType === 3) c.nodeValue = c.nodeValue.toUpperCase(); }); n.style.textTransform = 'none'; } });
    const bild = await window.html2canvas(el, { scale: 2.5, backgroundColor: '#ffffff', useCORS: true, windowWidth: 1200 });
    el.classList.remove('va-fix');
    const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    let b = 210, h = bild.height / bild.width * 210; if (h > 297) { h = 297; b = bild.width / bild.height * 297; }
    pdf.addImage(bild.toDataURL('image/jpeg', 0.92), 'JPEG', (210 - b) / 2, 0, b, h);
    pdf.setProperties({ title: `Kämmerer-Votum ${st.antrag.aktenzeichen}`, author: 'Der Kämmerer' });
    pdf.save(`Kaemmerer-Votum-${st.antrag.aktenzeichen}.pdf`);
  } catch (err) { alert('Das PDF konnte nicht erstellt werden – bitte „Drucken“ verwenden.'); }
  zeigen();
}

// ── Steuerung
function zeigen() {
  const r = rechne(st);
  kopf(r);
  const f = { ueberblick: vUeberblick, antrag: vAntrag, investition: vInvestition, folgekosten: vFolgekosten, haushalt: vHaushalt, sensitivitaet: vSensitivitaet, massnahmen: vMassnahmen, votum: vVotum, methodik: vMethodik }[ansicht];
  document.getElementById('ansicht').innerHTML = f(r);
  try { history.replaceState(null, '', `#${ansicht}`); } catch {}
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('nav button'); if (b) { ansicht = b.dataset.a; zeigen(); window.scrollTo({ top: 0 }); return; }
  if (e.target.id === 'muster') { st = klon(MUSTER); aktiv.clear(); START_MASSNAHMEN.forEach((m) => aktiv.add(m)); zeigen(); }
  if (e.target.id === 'pdf') { pdfLaden(e.target); return; }
  if (e.target.id === 'export') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(st, null, 1)], { type: 'application/json' })); a.download = `tragfaehigkeit-${st.antrag.aktenzeichen}.json`; a.click(); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.mass) { t.checked ? aktiv.add(t.dataset.mass) : aktiv.delete(t.dataset.mass); zeigen(); return; }
  if (t.id === 'import' && t.files[0]) { t.files[0].text().then((x) => { try { st = JSON.parse(x); zeigen(); } catch { alert('Die Datei ist kein gültiger Antrag.'); } }); return; }
  if (t.dataset.pfad) {
    const art = t.dataset.art; let v = t.value;
    if (art === 'zahl' || art === 'jahr' || art === 'dez') v = zahl(v); else if (art === 'pct') v = zahl(v) / 100;
    if (art !== 'text' && isNaN(v)) return;
    setz(t.dataset.pfad, v);
    const pos = window.scrollY; zeigen(); window.scrollTo({ top: pos });
  }
});
const start = location.hash.slice(1); if (ANSICHTEN.some(([id]) => id === start)) ansicht = start;
zeigen();
