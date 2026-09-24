import {refundStatements,expireReservations} from '@/lib/inventory';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { catalog, config, database, initialize, identity, isAdmin, requireAdmin, HttpError, rate, normalize } from '@/lib/server';
import { statuses } from '@/lib/catalog';
import { paymentProvider } from '@/lib/payments';
export const dynamic = 'force-dynamic';
const safeImage = z.string().max(500).refine(v => /^\/images\/[a-zA-Z0-9_.-]+$/.test(v) || /^\/api\/media\/[a-zA-Z0-9_.-]+$/.test(v), 'تصویر باید از فایل‌های بارگذاری‌شده انتخاب شود.');
const productSchema = z.object({ id: z.string().regex(/^[a-z0-9-]+$/).max(100), name: z.string().min(2).max(150), category: z.string().min(1).max(60), price: z.number().int().positive().max(100000000), oldPrice: z.number().int().min(0).max(100000000), description: z.string().max(5000), material: z.string().max(500), fit: z.string().max(300), wash: z.string().max(1000), images: z.array(safeImage).min(1).max(12), active: z.number().int().min(0).max(1), variants: z.array(z.object({ id: z.string().max(150), color: z.string().min(1).max(40), size: z.string().min(1).max(20), stock: z.number().int().min(0).max(100000), expectedStock: z.number().int().min(0).optional() })).min(1).max(100) }).refine(p => !p.oldPrice || p.oldPrice >= p.price, 'قیمت قبلی باید بیشتر از قیمت فروش باشد.');
async function handle(req: Request) {
    const db = database();
    await initialize();
    await expireReservations(db);
    const url = new URL(req.url);
    const path = decodeURIComponent(url.pathname.slice(5));
    const method = req.method;
    const existing = req.headers.get('cookie')?.match(/(?:^|; )dook_cart=([a-f0-9-]{36})/)?.[1];
    const session = existing || crypto.randomUUID();
    const owner = session;
    const reply = (data: any, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...(!existing ? { 'Set-Cookie': `dook_cart=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${url.protocol === 'https:' ? '; Secure' : ''}` } : {}) } });
    if (method !== 'GET') {
        const origin = req.headers.get('origin');
        if (origin && origin !== url.origin)
            throw new HttpError('درخواست نامعتبر است.', 403);
        await rate((identity(req) || req.headers.get('cf-connecting-ip') || session) + ':write', 60);
    }
    const body = async () => { if (Number(req.headers.get('content-length') || 0) > 200000)
        throw new HttpError('حجم درخواست زیاد است.', 413); return req.json() as Promise<any>; };
    const cartItems = async () => { const r = await db.prepare('SELECT c.id,c.quantity,v.id variantId,v.size,v.color,v.stock,p.id productId,p.name,p.price,p.images,p.active FROM cart c JOIN variants v ON v.id=c.variant_id JOIN products p ON p.id=v.product_id WHERE c.owner=?').bind(owner).all(); return r.results.map((r: any) => ({ ...r, image: JSON.parse(r.images)[0] })); };
    if (path === 'catalog' && method === 'GET')
        return reply({ products: await catalog(), categories: (await db.prepare('SELECT name FROM categories ORDER BY rowid').all()).results.map((c: any) => c.name), settings: await config() });
    if (path === 'session' && method === 'GET')
        return reply({ signedIn: !!identity(req), admin: await isAdmin(req), needsSetup: !await db.prepare('SELECT id FROM admin LIMIT 1').first() });
    if (path === 'admin/setup' && method === 'POST') {
        if (!identity(req))
            throw new HttpError('ابتدا وارد حساب شوید.', 401);
        await rate('setup:' + identity(req), 5);
        const b = await body();
        const secret = (env as any).ADMIN_SETUP_KEY;
        if (!secret || b.key !== secret)
            throw new HttpError('کد راه‌اندازی صحیح نیست.', 403);
        if (await db.prepare('SELECT id FROM admin LIMIT 1').first())
            throw new HttpError('مدیریت قبلاً فعال شده است.', 409);
        await db.batch([db.prepare('INSERT OR IGNORE INTO users(id,email,name) VALUES(?,?,?)').bind(identity(req), req.headers.get('oai-authenticated-user-email') || '', 'مدیر دوک'), db.prepare('INSERT INTO admin(id,user_id) VALUES(1,?)').bind(identity(req))]);
        return reply({ ok: true });
    }
    if (path === 'cart' && method === 'GET')
        return reply({ items: await cartItems() });
    if (path === 'cart' && method === 'POST') {
        const b = z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(20), replace: z.boolean().optional() }).parse(await body());
        const v: any = await db.prepare('SELECT v.*,p.active FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=?').bind(b.variantId).first();
        const c: any = await db.prepare('SELECT quantity FROM cart WHERE owner=? AND variant_id=?').bind(owner, b.variantId).first();
        const qty = b.replace ? b.quantity : (c?.quantity || 0) + b.quantity;
        if (!v || !v.active || qty > v.stock)
            throw new HttpError('موجودی این سایز کافی نیست.', 409);
        await db.prepare('INSERT INTO cart(id,owner,variant_id,quantity) VALUES(?,?,?,?) ON CONFLICT(owner,variant_id) DO UPDATE SET quantity=excluded.quantity').bind(crypto.randomUUID(), owner, b.variantId, qty).run();
        return reply({ items: await cartItems() });
    }
    if (path === 'cart' && method === 'DELETE') {
        const b = await body();
        await db.prepare('DELETE FROM cart WHERE owner=? AND variant_id=?').bind(owner, String(b.variantId)).run();
        return reply({ items: await cartItems() });
    }
    if (path === 'orders' && method === 'POST') {
        const b = z.object({ name: z.string().trim().min(3).max(100), phone: z.string().transform(normalize).pipe(z.string().regex(/^09\d{9}$/)), address: z.string().trim().min(15).max(1000), postal: z.string().transform(normalize).pipe(z.string().regex(/^\d{10}$/)), shipping: z.enum(['post', 'tipax']), payment: z.enum(['online', 'snapp']), idempotency: z.string().uuid() }).parse(await body());
        await rate('orders:' + owner, 10);
        const prev: any = await db.prepare('SELECT id FROM orders WHERE idempotency=? AND owner=?').bind(b.idempotency, owner).first();
        if (prev)
            return reply(prev);
        const items = await cartItems();
        if (!items.length)
            throw new HttpError('سبد خرید خالی است.');
        if (items.some((i: any) => !i.active || i.quantity > i.stock))
            throw new HttpError('موجودی سبد تغییر کرده است. سبد را بررسی کنید.', 409);
        const settings = await config();
        const fee = settings[b.shipping];
        const total = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0) + fee;
        const id = 'DOOK-' + crypto.randomUUID().slice(0, 13).replace('-', '').toUpperCase();
        const qs = [db.prepare('INSERT INTO orders(id,owner,idempotency,name,phone,address,postal,shipping,shipping_cost,payment,total,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, owner, b.idempotency, b.name, b.phone, b.address, b.postal, b.shipping, fee, b.payment, total, Date.now())];
        for (const i of items) {
            qs.push(db.prepare('UPDATE variants SET stock=CASE WHEN EXISTS(SELECT 1 FROM products WHERE id=variants.product_id AND active=1 AND price=?) THEN stock-? ELSE -1 END WHERE id=?').bind(i.price,i.quantity,i.variantId));
            qs.push(db.prepare('INSERT INTO order_items(id,order_id,variant_id,name,image,size,color,price,quantity) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), id, i.variantId, i.name, i.image, i.size, i.color, i.price, i.quantity));
            qs.push(db.prepare('INSERT INTO inventory(id,variant_id,delta,reason,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),i.variantId,-i.quantity,'order reservation',Date.now()));
        }
        qs.push(db.prepare('INSERT INTO payments(id,order_id,provider,status,amount,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), id, b.payment, 'pending', total, Date.now()));
        try {
            await db.batch(qs);
        }
        catch (e) {
            if (String(e).includes('stock'))
                throw new HttpError('موجودی یا قیمت محصول تغییر کرده است. سبد را بازبینی کنید.', 409);
            throw e;
        }
        return reply({ id });
    }
    if (path.startsWith('orders/') && method === 'GET') {
        const id = path.split('/')[1];
        const order: any = await db.prepare('SELECT * FROM orders WHERE id=? AND owner=?').bind(id, owner).first();
        if (!order)
            throw new HttpError('سفارش پیدا نشد.', 404);
        return reply({ ...order, items: (await db.prepare('SELECT * FROM order_items WHERE order_id=?').bind(id).all()).results });
    }
    if (path.startsWith('payment/') && method === 'POST') {
        const id = path.split('/')[1];
        const b = z.object({ outcome: z.enum(['success', 'cancel']) }).parse(await body());
        const o: any = await db.prepare('SELECT * FROM orders WHERE id=? AND owner=?').bind(id, owner).first();
        if (!o)
            throw new HttpError('سفارش پیدا نشد.', 404);
        if (o.payment_status !== 'pending' || o.status === 'لغو شده')
            return reply({ id, status: o.payment_status });
        const result = await paymentProvider(o.payment).verify({ orderId: id, amount: o.total, outcome: b.outcome });
        const qs = b.outcome==='cancel'?refundStatements(db,id,true):[];
        qs.push(db.prepare("UPDATE orders SET payment_status=?,status=? WHERE id=? AND payment_status='pending' AND status<>'لغو شده'").bind(result.status,b.outcome==='cancel'?'لغو شده':'جدید',id));
        qs.push(db.prepare('UPDATE payments SET status=(SELECT payment_status FROM orders WHERE id=?) WHERE order_id=?').bind(id,id));
        if(b.outcome==='success')qs.push(db.prepare("DELETE FROM cart WHERE owner=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND payment_status='mock_paid' AND status<>'لغو شده')").bind(owner,id));
        await db.batch(qs);
        const current:any=await db.prepare('SELECT payment_status FROM orders WHERE id=?').bind(id).first();
        return reply({id,status:current.payment_status});
    }

    if (path === 'tracking' && method === 'POST') {
        await rate('track:' + (req.headers.get('cf-connecting-ip') || owner), 8);
        const b = z.object({ id: z.string().max(50), phone: z.string().max(20) }).parse(await body());
        const o: any = await db.prepare('SELECT id,status,payment_status,shipping,tracking,created_at FROM orders WHERE id=? AND phone=?').bind(b.id.trim().toUpperCase(), normalize(b.phone)).first();
        if (!o)
            throw new HttpError('سفارشی با این شماره و موبایل پیدا نشد.', 404);
        return reply(o);
    }
    if (path.startsWith('media/') && method === 'GET') {
        const key = path.split('/')[1];
        if (!/^[a-zA-Z0-9_.-]+$/.test(key))
            throw new HttpError('فایل نامعتبر', 400);
        const f = await env.BUCKET?.get(key);
        if (!f)
            throw new HttpError('تصویر پیدا نشد.', 404);
        return new Response(f.body, { headers: { 'Content-Type': f.httpMetadata?.contentType || 'image/jpeg', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public,max-age=86400' } });
    }
    if (path.startsWith('admin/')) {
        await requireAdmin(req);
        if (path === 'admin/data' && method === 'GET') {
            const orders = (await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1000').all()).results;
            const items = (await db.prepare('SELECT * FROM order_items').all()).results;
            return reply({ products: await catalog(true), orders: orders.map((o: any) => ({ ...o, items: items.filter((i: any) => i.order_id === o.id) })), settings: await config(), categories: (await db.prepare('SELECT name FROM categories').all()).results.map((c: any) => c.name) });
        }
        if (path === 'admin/products' && method === 'POST') {
            const p = productSchema.parse(await body());
            const qs = [db.prepare('INSERT OR IGNORE INTO categories(name) VALUES(?)').bind(p.category), db.prepare('INSERT INTO products(id,name,category,price,old_price,description,material,fit,wash,images,active,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,price=excluded.price,old_price=excluded.old_price,description=excluded.description,material=excluded.material,fit=excluded.fit,wash=excluded.wash,images=excluded.images,active=excluded.active').bind(p.id, p.name, p.category, p.price, p.oldPrice, p.description, p.material, p.fit, p.wash, JSON.stringify(p.images), p.active, Date.now())];
            for (const v of p.variants) {
                const old: any = await db.prepare('SELECT product_id,stock FROM variants WHERE id=?').bind(v.id).first();
                if (old && old.product_id !== p.id)
                    throw new HttpError('شناسه تنوع معتبر نیست.');
                qs.push(db.prepare('INSERT INTO variants(id,product_id,color,size,stock) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET color=excluded.color,size=excluded.size,stock=CASE WHEN ? IS NULL THEN variants.stock WHEN variants.stock=? THEN excluded.stock ELSE -1 END').bind(v.id,p.id,v.color,v.size,v.stock,v.expectedStock??null,v.expectedStock??null));
                qs.push(db.prepare('INSERT INTO inventory(id,variant_id,delta,reason,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), v.id, old?(v.expectedStock===undefined?0:v.stock-v.expectedStock):v.stock, 'admin adjustment', Date.now()));
            }
            try { await db.batch(qs); } catch(e) { if(String(e).includes('stock_nonnegative')) throw new HttpError('موجودی هنگام ویرایش تغییر کرده است. فرم را ببندید و دوباره باز کنید.',409); throw e; }
            return reply({ ok: true });
        }
        if (path === 'admin/products' && method === 'DELETE') {
            const b = await body();
            await db.prepare('UPDATE products SET active=0 WHERE id=?').bind(String(b.id)).run();
            return reply({ ok: true });
        }
        if (path === 'admin/inventory' && method === 'POST') {
            const b = z.object({ id: z.string(), stock: z.number().int().min(0).max(100000), previous: z.number().int().min(0) }).parse(await body());
            const r = await db.prepare('UPDATE variants SET stock=? WHERE id=? AND stock=?').bind(b.stock, b.id, b.previous).run();
            if (!r.meta.changes)
                throw new HttpError('موجودی تغییر کرده؛ صفحه را تازه کنید.', 409);
            await db.prepare('INSERT INTO inventory(id,variant_id,delta,reason,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), b.id, b.stock - b.previous, 'admin adjustment', Date.now()).run();
            return reply({ ok: true });
        }
        if (path === 'admin/orders' && method === 'POST') {
            const b = z.object({ id: z.string(), status: z.string(), tracking: z.string().max(100) }).parse(await body());
            if (!statuses.includes(b.status))
                throw new HttpError('وضعیت معتبر نیست.');
            const o: any = await db.prepare('SELECT * FROM orders WHERE id=?').bind(b.id).first();
            if (!o)
                throw new HttpError('سفارش پیدا نشد.', 404);
            if (o.status === 'لغو شده' && b.status !== 'لغو شده')
                throw new HttpError('سفارش لغوشده قابل بازگشایی نیست.');
            if (b.status !== 'لغو شده' && o.payment_status === 'pending')
                throw new HttpError('ابتدا پرداخت سفارش تکمیل شود.');
            const qs=b.status==='لغو شده'?refundStatements(db,b.id):[];
            qs.push(db.prepare("UPDATE orders SET status=?,tracking=?,payment_status=CASE WHEN ?='لغو شده' AND payment_status='pending' THEN 'cancelled' ELSE payment_status END WHERE id=? AND (status<>'لغو شده' OR ?='لغو شده')").bind(b.status, b.tracking, b.status, b.id, b.status));
            qs.push(db.prepare('UPDATE payments SET status=(SELECT payment_status FROM orders WHERE id=?) WHERE order_id=?').bind(b.id,b.id));
            await db.batch(qs);
            return reply({ ok: true });
        }
        if (path === 'admin/settings' && method === 'POST') {
            const b = z.object({ post: z.number().int().min(0).max(10000000), tipax: z.number().int().min(0).max(10000000), shipping: z.string().max(3000), returns: z.string().max(3000), contact: z.string().max(1000) }).parse(await body());
            await db.prepare("UPDATE settings SET value=? WHERE key='store'").bind(JSON.stringify(b)).run();
            return reply({ ok: true });
        }
        if (path === 'admin/categories' && method === 'POST') {
            const b = z.object({ name: z.string().trim().min(1).max(60) }).parse(await body());
            await db.prepare('INSERT OR IGNORE INTO categories(name) VALUES(?)').bind(b.name).run();
            return reply({ ok: true });
        }
        if (path === 'admin/upload' && method === 'POST') {
            if (!env.BUCKET)
                throw new HttpError('ذخیره‌سازی تصاویر در دسترس نیست.', 503);
            if (Number(req.headers.get('content-length') || 0) > 5500000)
                throw new HttpError('حداکثر حجم تصویر ۵ مگابایت است.');
            const f = (await req.formData()).get('file');
            if (!(f instanceof File) || f.size > 5000000)
                throw new HttpError('فایل تصویر معتبر نیست.');
            const bytes = new Uint8Array(await f.arrayBuffer());
            const type = bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg' : bytes[0] === 137 && bytes[1] === 80 ? 'image/png' : String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP' ? 'image/webp' : '';
            if (!type)
                throw new HttpError('فقط JPEG، PNG و WebP پشتیبانی می‌شود.');
            const key = crypto.randomUUID() + '.' + type.split('/')[1];
            await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: type } });
            return reply({ url: '/api/media/' + key });
        }
    }
    throw new HttpError('مسیر پیدا نشد.', 404);
}
async function route(req: Request) { try {
    return await handle(req);
}
catch (e) {
    if (e instanceof HttpError)
        return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError)
        return Response.json({ error: 'اطلاعات واردشده معتبر نیست. فیلدها را بررسی کنید.', details: e.issues.map(i => i.path.join('.')) }, { status: 400 });
    console.error('DOOK API', e);
    return Response.json({ error: 'انجام درخواست ممکن نشد. اطلاعات شما حفظ شده؛ دوباره تلاش کنید.' }, { status: 503 });
} }
export const GET = route;
export const POST = route;
export const DELETE = route;
