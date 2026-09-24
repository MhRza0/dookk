import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, createReadStream, statSync, readdirSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { spawn } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
process.chdir(root);
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) throw Error('Install Node.js 22.13 or newer, then run START.cmd again.');
const data = resolve(process.env.DATA_DIR || resolve(root, 'data'));
const renderMode = process.env.RENDER === 'true';
let envPassword = process.env.ADMIN_PASSWORD;
if (renderMode && !envPassword) throw Error('Set ADMIN_PASSWORD in Render Environment before starting.');
if (envPassword && (envPassword.length < 6 || envPassword.length > 256)) throw Error('ADMIN_PASSWORD must contain 6 to 256 characters.');
mkdirSync(data, { recursive: true });
const passwordFile = resolve(data, 'admin-password.json');
const hash = (password, salt) => scryptSync(password, salt, 64);
async function askPassword(label) {
  if (!process.stdin.isTTY) throw Error('Run this command in an interactive terminal.');
  let muted = false;
  const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write(label);
  muted = true;
  try { return await rl.question(''); }
  finally { muted = false; rl.close(); process.stdout.write('\n'); }
}
if (envPassword) {
  const salt = randomBytes(32).toString('hex');
  writeFileSync(passwordFile, JSON.stringify({ salt, hash: hash(envPassword, salt).toString('hex') }), { mode: 0o600 });
  delete process.env.ADMIN_PASSWORD; envPassword = undefined;
}
if (!existsSync(passwordFile) || process.argv.includes('--password')) {
  console.log('\nDOOK - Set your administrator password (typing is hidden).');
  let first;
  while (true) {
    first = await askPassword('New password (at least 6 characters): ');
    if (first.length < 6 || first.length > 256) { console.log('Please use between 6 and 256 characters.'); continue; }
    if (first !== await askPassword('Confirm password: ')) { console.log('Passwords do not match. Try again.'); continue; }
    break;
  }
  const salt = randomBytes(32).toString('hex');
  writeFileSync(passwordFile, JSON.stringify({ salt, hash: hash(first, salt).toString('hex') }), { mode: 0o600 });
  first = undefined;
  console.log('Password saved as a salted hash.');
  if (process.argv.includes('--password')) { console.log('Restart START.cmd to use the new password.'); process.exit(0); }
}
const credential = JSON.parse(readFileSync(passwordFile, 'utf8'));
const { Miniflare } = await import('miniflare');
const serverRoot = resolve('runtime/server');
const modulePaths = readdirSync(serverRoot, { recursive: true }).filter(p => /\.m?js$/.test(p));
modulePaths.sort((a,b) => a === 'index.js' ? -1 : b === 'index.js' ? 1 : a.localeCompare(b));
const mf = new Miniflare({
  host: '127.0.0.1', port: 0, inspectorPort: 0,
  modulesRoot: serverRoot,
  modules: modulePaths.map(p => ({ type: 'ESModule', path: resolve(serverRoot,p), contents: readFileSync(resolve(serverRoot,p),'utf8') })),
  compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'],
  d1Databases: { DB: 'dook-portable-db' }, d1Persist: resolve(data, 'database'),
  r2Buckets: ['BUCKET'], r2Persist: resolve(data, 'uploads'),
  bindings: { ADMIN_SETUP_KEY: randomBytes(32).toString('hex') },
});
let server;
let closing = false;
async function close() { if (closing) return; closing = true; server?.close(); await mf.dispose(); process.exit(0); }
process.on('SIGINT', close); process.on('SIGTERM', close);
try {
  await mf.ready;
  const db = await mf.getD1Database('DB');
  const schema = readFileSync('schema.sql', 'utf8').split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  await db.batch(schema.map(sql => db.prepare(sql)));
  await db.prepare("INSERT OR IGNORE INTO users(id,email,name) VALUES('portable-admin','','مدیر دوک')").run();
  await db.prepare("INSERT OR IGNORE INTO admin(id,user_id) VALUES(1,'portable-admin')").run();
  await mf.dispatchFetch('http://localhost/api/catalog');
} catch (e) { await mf.dispose(); throw e; }
const sessions = new Map();
const attempts = new Map();
const challenges = new Map();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || (renderMode ? '0.0.0.0' : '127.0.0.1');
const publicOrigin = new URL(process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`).origin;
const secure = publicOrigin.startsWith('https:');
const cookie = (key, value, age) => `${key}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
function getCookie(req, key) { return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(key + '='))?.slice(key.length + 1); }
const token = () => randomBytes(32).toString('hex');
const escape = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function page(content) { return `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مدیریت دوک</title><style>@font-face{font-family:V;src:url('/fonts/vazirmatn.ttf')}*{box-sizing:border-box}body{background:#141414;color:#eee;font-family:V,Tahoma,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;padding:22px}main{width:100%;max-width:420px;border:1px solid #494333;padding:32px}h1{font-size:27px;font-weight:500}p{line-height:2;color:#aaa}label{display:block;margin:18px 0 7px}input,button{font:inherit;width:100%;padding:13px;border:1px solid #59513f;background:#20201e;color:#eee}button{margin-top:20px;background:#bca16b;color:#111;cursor:pointer}a{color:#c5ad7d}.brand{font:36px Georgia;color:#c5ad7d;letter-spacing:3px}.error{color:#ffb7ad}input:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid #dcc391;outline-offset:4px}</style><main><div class="brand">DOOK</div>${content}</main></html>`; }
function html(res, content, status=200, cookies=[]) { res.writeHead(status, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff','Set-Cookie':cookies});res.end(content); }
function login(res, error='') {
  const csrf=token(); challenges.set(csrf,Date.now()+600000);
  html(res,page(`<h1>ورود به مدیریت</h1><p>رمز مدیریت فروشگاه را وارد کن.</p>${error?`<p class="error">${escape(error)}</p>`:''}<form method="post" action="/portable/login"><input type="hidden" name="csrf" value="${csrf}"><label for="password">رمز مدیریت</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus maxlength="256"><button>ورود به مدیریت</button></form><p><a href="/">بازگشت به فروشگاه</a></p>`),200,[cookie('dook_login',csrf,600)]);
}
function redirect(res, location, cookies=[]) { res.writeHead(303,{'Location':location,'Cache-Control':'no-store','Set-Cookie':cookies});res.end(); }
async function body(req, limit=6*1024*1024) { let total=0;const chunks=[];for await(const chunk of req){total+=chunk.length;if(total>limit)throw Error('Request too large');chunks.push(chunk);}return Buffer.concat(chunks); }
const types={'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.ico':'image/x-icon','.txt':'text/plain','.json':'application/json'};
const assets=resolve('runtime/client');
const sweep=setInterval(()=>{for(const map of [sessions,challenges])for(const [key,end] of map)if(end<Date.now())map.delete(key);for(const [key,v] of attempts)if(v.until<Date.now())attempts.delete(key);},60000);sweep.unref();
server=createServer(async(req,res)=>{
 try {
  // Trust only the configured origin, never browser-supplied forwarding or identity headers.
  const allowedHosts=new Set([new URL(publicOrigin).host,`127.0.0.1:${port}`,`localhost:${port}`]);
  if(!allowedHosts.has(req.headers.host)){res.writeHead(400);return res.end('Invalid host');}
  if (req.url === '/healthz' && ['GET','HEAD'].includes(req.method)) { res.writeHead(200, {'Content-Type':'text/plain'}); return res.end('ok'); }
  const origin=publicOrigin;
  const url=new URL(req.url,origin);
  if(!['GET','HEAD'].includes(req.method) && req.headers.origin && req.headers.origin!==origin){res.writeHead(403);return res.end('Invalid origin');}
  const sessionId=getCookie(req,'dook_admin');
  const authenticated=!!sessionId && (sessions.get(sessionId)||0)>Date.now();
  if(url.pathname==='/portable/login' && req.method==='POST'){
    const form=new URLSearchParams((await body(req,4096)).toString());
    const csrf=getCookie(req,'dook_login');
    if(!csrf||csrf!==form.get('csrf')||(challenges.get(csrf)||0)<Date.now()){res.writeHead(403);return res.end('Reload the login page and try again.');}
    challenges.delete(csrf);
    const ip=req.socket.remoteAddress;const now=Date.now();
    let attempt=attempts.get(ip);if(!attempt||attempt.until<now)attempt={count:0,until:now+600000};
    attempts.set(ip,attempt);
    if(attempt.count>=10){res.writeHead(429,{'Retry-After':'600'});return res.end('Too many attempts. Try again in 10 minutes.');}
    attempt.count++;
    const password=form.get('password')||'';
    if(password.length>256||!timingSafeEqual(hash(password,credential.salt),Buffer.from(credential.hash,'hex')))return login(res,'رمز مدیریت صحیح نیست.');
    attempts.delete(ip);if(sessionId)sessions.delete(sessionId);
    const next=token();sessions.set(next,now+8*3600000);
    return redirect(res,'/admin',[cookie('dook_admin',next,8*3600),cookie('dook_login','',0)]);
  }
  if(url.pathname==='/portable/logout'){
    if(req.method==='POST'){sessions.delete(sessionId);return redirect(res,'/',[cookie('dook_admin','',0)]);}
    return html(res,page('<h1>خروج از مدیریت</h1><form method="post"><button>خروج</button></form><p><a href="/admin">بازگشت به مدیریت</a></p>'));
  }
  if(url.pathname.startsWith('/admin') && !authenticated)return login(res);
  if(url.pathname==='/signin-with-chatgpt')return redirect(res,'/admin');
  if(url.pathname.startsWith('/api/admin')&&!authenticated){res.writeHead(403,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'ابتدا با رمز مدیریت وارد شوید.'}));}
  if(url.pathname==='/api/admin/setup'){res.writeHead(403);return res.end('Update ADMIN_PASSWORD and restart the service.');}
  if(url.pathname.startsWith('/cdn-cgi/')){res.writeHead(404);return res.end();}
  if(['GET','HEAD'].includes(req.method)){
    const file=resolve(assets,'.'+decodeURIComponent(url.pathname));
    if(file.startsWith(assets+sep)&&existsSync(file)&&statSync(file).isFile()){
      res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')return res.end();createReadStream(file).pipe(res);return;
    }
  }
  const headers={};
  for(const [key,value]of Object.entries(req.headers))if(value && !key.startsWith('oai-')&&!key.startsWith('cf-')&&!key.startsWith('x-forwarded-')&&!['host','connection','content-length','accept-encoding','forwarded','transfer-encoding'].includes(key))headers[key]=Array.isArray(value)?value.join(', '):value;
  headers['cf-connecting-ip']=req.socket.remoteAddress;
  if(authenticated){headers['oai-authenticated-user-id']='portable-admin';headers['oai-authenticated-user-email']='';}
  const payload=['GET','HEAD'].includes(req.method)?undefined:await body(req);
  const response=await mf.dispatchFetch(url.href,{method:req.method,headers,body:payload,redirect:'manual'});
  const responseHeaders={};for(const [key,value]of response.headers)if(!['set-cookie','content-length','content-encoding','transfer-encoding','connection'].includes(key))responseHeaders[key]=value;
  responseHeaders['set-cookie']=response.headers.getSetCookie();
  res.writeHead(response.status,responseHeaders);
  if(req.method==='HEAD')return res.end();
  for await(const chunk of response.body||[])res.write(chunk);res.end();
 }catch(e){console.error('Request error:',e.message);if(!res.headersSent)res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});res.end('خطا در اجرای درخواست؛ گزارش خطای سرور را بررسی کنید.');}
});
server.on('error',async e=>{console.error(e.code==='EADDRINUSE'?'Port in use. Close the previous app or set PORT to another number.':e);await mf.dispose();process.exit(1);});
server.listen(port,host,()=>{
 console.log(`\nDOOK is ready: ${publicOrigin}\nAdmin: ${publicOrigin}/admin\nLogout: ${publicOrigin}/portable/logout\nKeep this window open. Stop with Ctrl+C.\n`);
 if(process.platform==='win32'&&!process.argv.includes('--no-open'))spawn('cmd.exe',['/d','/c','start','',publicOrigin],{stdio:'ignore'});
});
