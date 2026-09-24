"""Validate all linked routes and local media against the local built Worker."""
import urllib.request,urllib.error,urllib.parse,json
from html.parser import HTMLParser
base='http://127.0.0.1:8787';opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
class Links(HTMLParser):
 def __init__(self):super().__init__();self.paths=set()
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  for k in ('href','src'):
   s=attrs.get(k,'')
   if s.startswith('/') and not s.startswith('//') and not s.startswith('/signin-') and not s.startswith('/_next/'):
    self.paths.add(s.split('#')[0])
parser=Links();paths={'/','/shop','/search?q=hoodie','/cart','/checkout','/tracking','/admin','/admin/products','/admin/inventory','/admin/orders','/admin/customers','/admin/settings','/robots.txt','/sitemap.xml'}
for p in list(paths):
 r=opener.open(base+p,timeout=20);assert r.code==200,(p,r.code)
 if 'text/html' in r.headers.get('Content-Type',''):parser.feed(r.read().decode())
paths|=parser.paths
for p in paths:
 url=base+urllib.parse.quote(p,safe='/%?=&')
 r=opener.open(url,timeout=20);assert r.code==200,(p,r.code)
try:opener.open(base+'/missing-page')
except urllib.error.HTTPError as e:assert e.code==404
else:raise AssertionError('Missing route must return 404')
p=opener.open(base+'/product/dook-5547').read().decode();assert 'application/ld+json' in p and 'priceCurrency' in p and 'IRR' in p
print(f'PASS: {len(paths)} routes/assets, product JSON-LD and 404 handling.')
