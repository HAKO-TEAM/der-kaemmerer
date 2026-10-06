#!/usr/bin/env python3
"""Recherchierte Stellen (JSON) als Markdown in src/content/jobs anlegen.

Aufruf: python3 scripts/jobs_import.py <json> [<json> ...] [--dry]
Prüft Pflichtfelder, Bewerbungsschluss (>= heute + 7 Tage), https-Link und Dubletten.
"""
import json, re, sys, unicodedata
from datetime import date, timedelta
from pathlib import Path

ZIEL = Path(__file__).resolve().parent.parent / 'src/content/jobs'
MIN_SCHLUSS = date.today() + timedelta(days=7)
PFLICHT = ['title', 'organisation', 'ort', 'bundesland', 'bewerbungsschluss', 'bewerbungslink']


def slug(s, n=40):
    s = s.lower().replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:n].strip('-')


def q(s):
    return '"' + str(s).replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ').strip() + '"'


def liste(xs):
    return '\n'.join('- ' + str(x).strip().lstrip('-•').strip() for x in xs if str(x).strip())


def markdown(j):
    tags = ', '.join(q(t) for t in (j.get('schlagwoerter') or [])[:6])
    teile = [
        '---',
        f"title: {q(j['title'])}",
        f"organisation: {q(j['organisation'])}",
        f"orgtyp: {q(j.get('orgtyp') or 'Kommune')}",
        f"ort: {q(j['ort'])}",
        f"bundesland: {q(j['bundesland'])}",
        f"entgelt: {q(j.get('entgelt') or 'nach TVöD')}",
        f"beschaeftigung: {q(j.get('beschaeftigung') or 'Vollzeit')}",
        f"befristung: {q(j.get('befristung') or 'Unbefristet')}",
        f"startdatum: {q(j.get('startdatum') or 'zum nächstmöglichen Zeitpunkt')}",
        f"bewerbungsschluss: {q(j['bewerbungsschluss'])}",
        f"bewerbungslink: {q(j['bewerbungslink'])}",
        f"schlagwoerter: [{tags}]",
        f"paket: {q(j.get('paket') or 'Basis')}",
        'aktiv: true',
        f"datum: {q(date.today().isoformat())}",
        'featured: false',
        '---', '',
        (j.get('kurzbeschreibung') or '').strip(), '',
        '## Ihre Aufgaben', '', liste(j.get('aufgaben') or []), '',
        '## Ihr Profil', '', liste(j.get('profil') or []), '',
    ]
    if j.get('wirbieten'):
        teile += ['## Wir bieten', '', liste(j['wirbieten']), '']
    teile += [f"*Quelle: Stellenausschreibung {j['organisation']}, geprüft am "
              f"{j.get('quelle_geprueft_am', date.today().isoformat())}. "
              f"Bewerbung ausschließlich über das Portal des Arbeitgebers.*", '']
    return '\n'.join(teile)


def main():
    dry = '--dry' in sys.argv
    dateien = [a for a in sys.argv[1:] if a != '--dry']
    vorhanden = {p.stem for p in ZIEL.glob('*.md')}
    links = set()
    for p in ZIEL.glob('*.md'):
        m = re.search(r'^bewerbungslink: "(.*)"', p.read_text(), re.M)
        if m:
            links.add(m.group(1).rstrip('/'))
    neu, verworfen = [], []
    kontakte = []
    for f in dateien:
        for j in json.load(open(f)):
            fehlt = [k for k in PFLICHT if not j.get(k)]
            if fehlt:
                verworfen.append((j.get('organisation'), 'fehlt ' + ','.join(fehlt))); continue
            try:
                schluss = date.fromisoformat(j['bewerbungsschluss'])
            except ValueError:
                verworfen.append((j['organisation'], 'Datum ' + j['bewerbungsschluss'])); continue
            if schluss < (date.today() + timedelta(days=1) if j.get('paket') == 'KommunalFlat' else MIN_SCHLUSS):  # Kundenstellen bis zum Vortag der Frist
                verworfen.append((j['organisation'], f'Schluss {schluss}')); continue
            if not j['bewerbungslink'].startswith('https://'):
                verworfen.append((j['organisation'], 'Link ohne https')); continue
            link = j['bewerbungslink'].rstrip('/')
            if link in links:
                verworfen.append((j['organisation'], 'Dublette Link')); continue
            s = f"{slug(j['title'])}-{slug(j['organisation'], 30)}-{schluss.year}"
            if s in vorhanden:
                verworfen.append((j['organisation'], 'Dublette Slug ' + s)); continue
            vorhanden.add(s); links.add(link)
            neu.append((s, j))
            if not dry:
                (ZIEL / f'{s}.md').write_text(markdown(j))
            # Ansprechperson (nur intern, wird NICHT veröffentlicht) für das KommunalFlat-Angebot
            if j.get('kontakt_email') and (j.get('paket') or 'Basis') != 'KommunalFlat':  # Kunden bekommen keine Angebotsmails
                kontakte.append({'slug': s, 'title': j['title'], 'org': j['organisation'], 'ort': j['ort'],
                                 'kontakt_name': j.get('kontakt_name', ''), 'anrede': j.get('kontakt_anrede', ''),
                                 'email': j['kontakt_email'], 'frist': schluss.isoformat()})
    print(f'neu: {len(neu)}  verworfen: {len(verworfen)}  mit Ansprechperson: {len(kontakte)}')
    if kontakte and not dry:
        ziel = Path(f'/tmp/derkaemmerer_stellen_kontakte_{date.today().isoformat()}.json')
        alt = json.loads(ziel.read_text()) if ziel.exists() else []
        ziel.write_text(json.dumps(alt + kontakte, ensure_ascii=False, indent=1))
        print(f'Ansprechpersonen → {ziel}')
    for o, g in verworfen:
        print('  -', o, '→', g)


if __name__ == '__main__':
    main()
