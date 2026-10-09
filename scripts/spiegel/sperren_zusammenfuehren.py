#!/usr/bin/env python3
"""Recherche-Ergebnisse (je Bundesland eine JSON-Liste) in src/data/haushaltslage/sperren.json übernehmen.

  python3 scripts/spiegel/sperren_zusammenfuehren.py <ordner> [--dry]

Prüft je Fall: Pflichtfelder, Land-Kürzel, Dublette gegen den Bestand (Land + Name), Quelle erreichbar (HTTP < 400).
Fälle ohne erreichbare Quelle werden nicht übernommen, sondern gelistet.
"""
import json, os, re, sys, glob, datetime, urllib.request, ssl

REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
ZIEL = os.path.join(REPO, 'src/data/haushaltslage/sperren.json')
PILLAR = '/haushalt/haushaltssperre-2026-stadte/'
LAENDER = {'BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'}
norm = lambda s: re.sub(r'[^a-zäöüß]+', ' ', re.sub(r'\(.*?\)|landkreis|kreis|stadt|gemeinde|hansestadt', '', (s or '').lower())).strip()

def erreichbar(url):
    for methode in ('HEAD', 'GET'):
        try:
            req = urllib.request.Request(url, method=methode, headers={'User-Agent': 'Mozilla/5.0 (Macintosh) DerKaemmerer-Quellenpruefung'})
            with urllib.request.urlopen(req, timeout=20, context=ssl.create_default_context()) as r:
                return r.status < 400
        except urllib.error.HTTPError as e:
            if e.code in (403, 405, 429) and methode == 'HEAD': continue
            return e.code in (403, 429)   # Bot-Sperre: Seite existiert
        except Exception:
            if methode == 'HEAD': continue
            return False
    return False

def main():
    ordner, dry = sys.argv[1], '--dry' in sys.argv
    daten = json.load(open(ZIEL, encoding='utf-8'))
    bestand = {(f['land'], norm(f.get('anzeige') or f['kommune'])) for f in daten['faelle']}
    neu, abgelehnt = [], []
    for datei in sorted(glob.glob(os.path.join(ordner, '*.json'))):
        try: liste = json.load(open(datei, encoding='utf-8'))
        except Exception as e: abgelehnt.append((os.path.basename(datei), f'Datei unlesbar: {e}')); continue
        for f in liste:
            name = f.get('anzeige') or f.get('kommune')
            if not name or f.get('land') not in LAENDER or not f.get('art') or not f.get('quellen'):
                abgelehnt.append((name, 'Pflichtfeld fehlt')); continue
            k = (f['land'], norm(name))
            if k in bestand: abgelehnt.append((name, 'schon erfasst')); continue
            quellen = [q for q in f['quellen'] if isinstance(q, str) and q.startswith('http') and erreichbar(q)]
            if not quellen: abgelehnt.append((name, 'keine erreichbare Quelle')); continue
            eintrag = {'kommune': f['kommune'], 'land': f['land'], 'art': f['art'].strip(), 'anlass': (f.get('anlass') or '').strip(),
                       'quellen': quellen, 'artikel': PILLAR, 'ebene': 'kreis' if f.get('ebene') == 'kreis' else 'gemeinde', 'anzeige': name}
            if eintrag['ebene'] == 'kreis': eintrag['kreisname'] = f.get('kreisname') or re.sub(r'^(Landkreis|Kreis)\s+', '', name)
            if not eintrag['anlass']: del eintrag['anlass']
            neu.append(eintrag)   # mehrere Sperren derselben Kommune aus der Recherche bleiben getrennte Fälle
    print(f'{len(neu)} neue Fälle übernommen, {len(abgelehnt)} nicht übernommen')
    for n, g in abgelehnt: print(f'  – {n}: {g}')
    if not dry and neu:
        daten['faelle'] += neu
        daten['stand'] = datetime.date.today().isoformat()
        json.dump(daten, open(ZIEL, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    print('je Land:', dict(Counter(f['land'] for f in neu)))

if __name__ == '__main__':
    main()
