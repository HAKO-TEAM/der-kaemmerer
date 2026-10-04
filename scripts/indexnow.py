#!/usr/bin/env python3
"""Meldet URLs per IndexNow an Bing/DuckDuckGo/Yandex (Google nutzt IndexNow nicht).
Aufruf: python3 scripts/indexnow.py https://derkaemmerer.de/pfad/ [...]"""
import json, sys, urllib.request
KEY = "0be8993824f3763c2c0310b0337537e4"
urls = sys.argv[1:]
body = json.dumps({"host": "derkaemmerer.de", "key": KEY,
                   "keyLocation": f"https://derkaemmerer.de/{KEY}.txt", "urlList": urls}).encode()
req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body,
                             headers={"Content-Type": "application/json; charset=utf-8"})
with urllib.request.urlopen(req, timeout=20) as r:
    print(r.status, len(urls), "URLs gemeldet")
