"""Coleta dados públicos para o guia (tamanho das fotos no Commons, rotas a pé/de carro no OSM e consultas Overpass).

Lê um pedido em JSON e grava o resultado em JSON. Roda no GitHub Actions, que tem acesso à internet.
"""
import json, sys, time, urllib.parse
import requests

UA = 'europa-central-guide/1.0 (personal travel guide; https://github.com/marcelodominguestomaz-afk/europa-central-2026)'
S = requests.Session()
S.headers['User-Agent'] = UA
req = json.load(open(sys.argv[1]))
out = {'requested': req.get('id'), 'commons': {}, 'routes': {}, 'overpass': {}, 'get': {}, 'errors': []}


def commons(files):
    for i in range(0, len(files), 40):
        batch = files[i:i + 40]
        try:
            r = S.get('https://commons.wikimedia.org/w/api.php', params={
                'action': 'query', 'titles': '|'.join(batch), 'prop': 'imageinfo',
                'iiprop': 'size|url|mime|extmetadata', 'iiextmetadatafilter': 'LicenseShortName|Artist|ImageDescription|DateTimeOriginal',
                'format': 'json', 'formatversion': '2', 'redirects': '1'}, timeout=60)
            r.raise_for_status()
            data = r.json()['query']
            norm = {n['to']: n['from'] for n in data.get('normalized', [])}
            redir = {n['to']: n['from'] for n in data.get('redirects', [])}
            for p in data.get('pages', []):
                title = p.get('title')
                key = redir.get(title, title)
                key = norm.get(key, key)
                ii = (p.get('imageinfo') or [{}])[0]
                out['commons'][key] = {'title': title, 'missing': p.get('missing', False), 'width': ii.get('width'), 'height': ii.get('height'),
                                       'url': ii.get('url'), 'mime': ii.get('mime'),
                                       'meta': {k: v.get('value') for k, v in (ii.get('extmetadata') or {}).items()}}
        except Exception as e:
            out['errors'].append(f'commons {i}: {e}')
        time.sleep(1)


def routes(legs):
    for leg in legs:
        prof = {'foot': 'routed-foot', 'car': 'routed-car', 'bike': 'routed-bike'}[leg.get('profile', 'foot')]
        coords = ';'.join(f'{lon},{lat}' for lat, lon in leg['coords'])
        url = f'https://routing.openstreetmap.de/{prof}/route/v1/driving/{coords}'
        try:
            r = S.get(url, params={'overview': 'full', 'geometries': 'geojson', 'steps': 'false'}, timeout=60)
            r.raise_for_status()
            j = r.json()
            rt = j['routes'][0]
            out['routes'][leg['id']] = {'distance': rt['distance'], 'duration': rt['duration'],
                                        'coords': [[round(lat, 5), round(lon, 5)] for lon, lat in rt['geometry']['coordinates']],
                                        'legs': [{'distance': l['distance'], 'duration': l['duration']} for l in rt.get('legs', [])]}
        except Exception as e:
            out['errors'].append(f"route {leg['id']}: {e}")
        time.sleep(1.2)


def overpass(queries):
    hosts = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter',
             'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
    for q in queries:
        done = False
        for attempt in range(3):
            for host in hosts:
                try:
                    r = S.post(host, data={'data': q['q']}, timeout=200)
                    if r.status_code in (429, 504, 502, 503):
                        raise RuntimeError(f'{r.status_code}')
                    r.raise_for_status()
                    out['overpass'][q['id']] = r.json().get('elements', [])
                    done = True
                    break
                except Exception as e:
                    out['errors'].append(f"overpass {q['id']} {host} try {attempt}: {e}")
                    time.sleep(8)
            if done:
                break
            time.sleep(30)
        time.sleep(12)


def get(urls):
    for u in urls:
        try:
            r = S.get(u, timeout=60)
            out['get'][u] = {'status': r.status_code, 'type': r.headers.get('content-type'), 'text': r.text[:200000]}
        except Exception as e:
            out['errors'].append(f'get {u}: {e}')
        time.sleep(1)


if req.get('commons'): commons(req['commons'])
if req.get('routes'): routes(req['routes'])
if req.get('overpass'): overpass(req['overpass'])
if req.get('get'): get(req['get'])
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
print('commons', len(out['commons']), 'routes', len(out['routes']), 'overpass', len(out['overpass']), 'get', len(out['get']), 'errors', len(out['errors']))
for e in out['errors']:
    print('ERR', e)
