import os
"""Admin integration test; injects a local-only identity fixture, never hosted data."""
import sqlite3,pathlib,json,urllib.request,urllib.error,uuid
f=next(p for p in (pathlib.Path(os.environ.get('DOOK_QA_STATE','.wrangler/state')) / 'v3/d1').rglob('*.sqlite') if p.name!='metadata.sqlite')
db=sqlite3.connect(f);db.execute("INSERT OR IGNORE INTO users(id,email,name) VALUES('qa-admin','qa@example.test','مدیر آزمایشی')");db.execute("INSERT OR REPLACE INTO admin(id,user_id) VALUES(1,'qa-admin')");db.commit()
base='http://127.0.0.1:8787';headers={'oai-authenticated-user-id':'qa-admin','oai-authenticated-user-email':'qa@example.test'}
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def call(path,method='GET',body=None,expected=200):
 req=urllib.request.Request(base+'/api/'+path,method=method,data=json.dumps(body).encode() if body is not None else None,headers={**headers,**({'Content-Type':'application/json'} if body is not None else {})})
 try:r=opener.open(req,timeout=20)
 except urllib.error.HTTPError as e:r=e
 text=r.read().decode();assert r.code==expected,(path,r.code,text[:300]);return json.loads(text)
try:
 assert call('session')['admin']
 data=call('admin/data');p=data['products'][0];v=p['variants'][0]
 call('admin/inventory','POST',{'id':v['id'],'previous':v['stock'],'stock':v['stock']+2})
 call('admin/inventory','POST',{'id':v['id'],'previous':v['stock'],'stock':v['stock']+3},409)
 call('admin/inventory','POST',{'id':v['id'],'previous':v['stock']+2,'stock':v['stock']})
 original=p['name'];p['name']='محصول ویرایش آزمایشی';call('admin/products','POST',p)
 assert next(x for x in call('admin/data')['products'] if x['id']==p['id'])['name']==p['name']
 p['name']=original;call('admin/products','POST',p)
 call('admin/products','DELETE',{'id':p['id']});assert p['id'] not in [x['id'] for x in call('catalog')['products']]
 p['active']=1;call('admin/products','POST',p)
 setting=data['settings'];new={**setting,'post':89000};call('admin/settings','POST',new);assert call('catalog')['settings']['post']==89000;call('admin/settings','POST',setting)
 paid=next(o for o in data['orders'] if o['payment_status']=='mock_paid' and o['status']!='لغو شده')
 call('admin/orders','POST',{'id':paid['id'],'status':'ارسال شده','tracking':'QA-12345'})
 assert next(o for o in call('admin/data')['orders'] if o['id']==paid['id'])['tracking']=='QA-12345'
 call('admin/orders','POST',{'id':paid['id'],'status':'لغو شده','tracking':''})
 call('admin/orders','POST',{'id':paid['id'],'status':'تأیید شده','tracking':''},400)
 boundary='dook-'+uuid.uuid4().hex;img=pathlib.Path('public/images/tee.jpg').read_bytes();body=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode()+img+f'\r\n--{boundary}--\r\n'.encode())
 req=urllib.request.Request(base+'/api/admin/upload',data=body,method='POST',headers={**headers,'Content-Type':'multipart/form-data; boundary='+boundary});r=opener.open(req);out=json.load(r);image=opener.open(base+out['url']);assert image.headers['Content-Type']=='image/jpeg' and len(image.read())==len(img)
 print('PASS: admin role, product edit/archive/reactivate, stock optimistic conflict, shipping settings, order status, cancellation lock, R2 upload/read.')
finally:
 db.execute("DELETE FROM admin WHERE user_id='qa-admin'");db.execute("DELETE FROM users WHERE id='qa-admin'");db.commit();db.close()
