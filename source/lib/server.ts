import { env } from 'cloudflare:workers';
import { seedProducts, categories, defaultSettings } from './catalog';
export function database() { if (!env.DB)
    throw new Error('پایگاه داده در دسترس نیست؛ دوباره تلاش کنید.'); return env.DB; }
export async function initialize() {
    const db = database();
    if (await db.prepare("SELECT value FROM settings WHERE key='portfolio-20260917'").first())
        return;
    const qs: any[] = [db.prepare("UPDATE products SET active=0 WHERE id IN ('hoodie-essential','shirt-oxford','jacket-city','tee-everyday','sweat-relaxed','belt-classic','zip-weekend','hoodie-stone')")];
    for (const c of categories)
        qs.push(db.prepare('INSERT OR IGNORE INTO categories(name) VALUES(?)').bind(c));
    for (const p of seedProducts) {
        qs.push(db.prepare('INSERT OR IGNORE INTO products(id,name,category,price,old_price,description,material,fit,wash,images,active,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(p.id, p.name, p.category, p.price, p.oldPrice, p.description, p.material, p.fit, p.wash, JSON.stringify(p.images), 1, p.createdAt));
        for (const v of p.variants)
            qs.push(db.prepare('INSERT OR IGNORE INTO variants(id,product_id,color,size,stock) VALUES(?,?,?,?,?)').bind(v.id, v.productId, v.color, v.size, v.stock));
    }
    qs.push(db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').bind('store', JSON.stringify(defaultSettings)));
    qs.push(db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('portfolio-20260917','1')"));
    qs.push(db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('seeded','1')"));
    await db.batch(qs);
}
export async function catalog(all = false) { await initialize(); const db = database(); const ps = (await db.prepare("SELECT products.*, (SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN variants v ON v.id=oi.variant_id WHERE v.product_id=products.id AND o.payment_status='mock_paid' AND o.status<>'لغو شده') sold FROM products" + (all ? '' : ' WHERE active=1') + ' ORDER BY created_at DESC').all()).results; const vs = (await db.prepare('SELECT * FROM variants').all()).results; return ps.map((p: any) => ({ ...p, oldPrice: p.old_price, createdAt: p.created_at, images: JSON.parse(p.images), variants: vs.filter((v: any) => v.product_id === p.id).map((v: any) => ({ ...v, productId: v.product_id })) })); }
export async function config() { await initialize(); const r: any = await database().prepare("SELECT value FROM settings WHERE key='store'").first(); return { ...defaultSettings, ...JSON.parse(r.value) }; }
export function identity(req: Request) { return req.headers.get('oai-authenticated-user-id') || ''; }
export async function isAdmin(req: Request) { const u = identity(req); return !!u && !!await database().prepare('SELECT id FROM admin WHERE user_id=?').bind(u).first(); }
export async function requireAdmin(req: Request) { if (!await isAdmin(req))
    throw new HttpError('دسترسی مدیریت لازم است.', 403); }
export class HttpError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
export async function rate(key: string, max = 30) { const db = database(); const now = Date.now(); await db.prepare('INSERT INTO rate_limits(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END, until=CASE WHEN until<? THEN excluded.until ELSE until END').bind(key, now + 60000, now, now).run(); const r: any = await db.prepare('SELECT count FROM rate_limits WHERE key=?').bind(key).first(); if (r.count > max)
    throw new HttpError('تعداد درخواست‌ها زیاد است. یک دقیقه دیگر تلاش کنید.', 429); }
export const normalize = (v: string) => v.replace(/[۰-۹٠-٩]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.includes(c) ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(c) : '٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
