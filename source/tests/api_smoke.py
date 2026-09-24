import os
"""Run only against local disposable test data: python tests/api_smoke.py."""
import uuid,concurrent.futures,json,urllib.request,urllib.error,http.cookiejar
class Result:
 def __init__(self,r):self.status_code=r.code;self.text=r.read().decode()
 def json(self):return json.loads(self.text)
class Session:
 def __init__(self):self.opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def request(self,method,url,json=None,headers=None,timeout=20):
  data=__import__('json').dumps(json).encode() if json is not None else None
  req=urllib.request.Request(url,data=data,method=method,headers={**({'Content-Type':'application/json'} if data else {}),**(headers or {})})
  try:return Result(self.opener.open(req,timeout=timeout))
  except urllib.error.HTTPError as e:return Result(e)
 def post(self,url,**kw):return self.request('POST',url,**kw)
class requests:
 Session=Session
BASE='http://127.0.0.1:8787'
s=requests.Session()
def call(path,method='GET',body=None,client=s,expected=200,headers=None):
 r=client.request(method,BASE+'/api/'+path,json=body,headers=headers,timeout=20)
 assert r.status_code==expected,(path,r.status_code,r.text[:300])
 return r.json()
c=call('catalog');assert len(c['products'])==19
assert call('session')['admin']==False
call('admin/data',expected=403)
call('admin/products','POST',{},expected=403)
call('cart','POST',{'variantId':'dook-5547-XL','quantity':1},expected=409)
call('cart','POST',{'variantId':'dook-5547-L','quantity':1})
call('cart','POST',{'variantId':'dook-5547-L','quantity':2,'replace':True},expected=409)
assert len(call('cart')['items'])==1
body={'name':'مشتری آزمایشی','phone':'۰۹۱۲۳۴۵۶۷۸۹','address':'نشانی آزمایشی، شهر نمونه، خیابان تست، پلاک ۱','postal':'۱۲۳۴۵۶۷۸۹۰','shipping':'post','payment':'online','idempotency':str(uuid.uuid4())}
call('orders','POST',{**body,'phone':'123'},expected=400)
# Two customers try the final unit. Exactly one reservation may commit.
s2=requests.Session();call('cart',client=s2);call('cart','POST',{'variantId':'dook-5547-L','quantity':1},client=s2)
def place(pair):
 client,b=pair;return client.post(BASE+'/api/orders',json=b,timeout=20)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
 rs=list(ex.map(place,[(s,body),(s2,{**body,'idempotency':str(uuid.uuid4())})]))
assert sorted(r.status_code for r in rs)==[200,409],[(r.status_code,r.text) for r in rs]
winner=s if rs[0].status_code==200 else s2
order=next(r.json() for r in rs if r.status_code==200);oid=order['id']
assert next(v for p in call('catalog')['products'] for v in p['variants'] if v['id']=='dook-5547-L')['stock']==0
call('orders/'+oid,client=requests.Session(),expected=404)
call('payment/'+oid,'POST',{'outcome':'cancel'},client=winner)
call('payment/'+oid,'POST',{'outcome':'cancel'},client=winner)
assert next(v for p in call('catalog')['products'] for v in p['variants'] if v['id']=='dook-5547-L')['stock']==1
# Successful mock payment is durable and idempotent.
b={**body,'payment':'snapp','shipping':'tipax','idempotency':str(uuid.uuid4())}
r=call('orders','POST',b);assert call('orders','POST',b)['id']==r['id']
paid=call('payment/'+r['id'],'POST',{'outcome':'success'});assert paid['status']=='mock_paid'
assert call('payment/'+r['id'],'POST',{'outcome':'success'})['status']=='mock_paid'
assert not call('cart')['items']
o=call('orders/'+r['id']);assert o['total']==1790000+c['settings']['tipax']
t=call('tracking','POST',{'id':r['id'],'phone':'09123456789'});assert t['status']=='جدید' and 'address' not in t
call('tracking','POST',{'id':r['id'],'phone':'09000000000'},expected=404)
call('cart','POST',{'variantId':'dook-5567-S','quantity':1},headers={'Origin':'https://untrusted.example'},expected=403)
# Expired unpaid reservations restore inventory exactly once.
import sqlite3,pathlib,time
fresh=requests.Session();call('cart',client=fresh)
start=next(v for p in call('catalog')['products'] for v in p['variants'] if v['id']=='dook-5547-S')['stock']
call('cart','POST',{'variantId':'dook-5547-S','quantity':1},client=fresh)
expired=call('orders','POST',{**body,'idempotency':str(uuid.uuid4())},client=fresh)['id']
f=next(p for p in (pathlib.Path(os.environ.get('DOOK_QA_STATE','.wrangler/state')) / 'v3/d1').rglob('*.sqlite') if p.name!='metadata.sqlite');d=sqlite3.connect(f);d.execute('UPDATE orders SET created_at=? WHERE id=?',(int(time.time()*1000)-31*60000,expired));d.commit();d.close()
call('catalog');call('catalog')
assert call('orders/'+expired,client=fresh)['payment_status']=='cancelled'
assert next(v for p in call('catalog')['products'] for v in p['variants'] if v['id']=='dook-5547-S')['stock']==start
print('PASS: catalog, persistent cart, validation, concurrent last-stock reservation, cancellation/expiry recovery, idempotent mock payments, tracking privacy, admin authorization, cross-origin rejection.')
