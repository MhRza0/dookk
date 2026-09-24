'use client';
import { uuid } from '@/lib/id';
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Package, Boxes, ShoppingBag, Users, Settings, Plus, ArrowLeft, Trash2, Pencil, Upload, ArrowUp, ArrowDown, Bell, Check, Search } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api, Choice, Field } from './store';
import { Product, money, num, statuses, defaultSettings } from '@/lib/catalog';
const sections = [['', 'داشبورد', LayoutDashboard], ['products', 'محصولات', Package], ['inventory', 'موجودی', Boxes], ['orders', 'سفارش‌ها', ShoppingBag], ['customers', 'مشتریان', Users], ['settings', 'تنظیمات', Settings]] as const;
export default function Admin({ path, onRefresh }: {
    path: string;
    onRefresh: () => void;
}) {
    const section = path.split('/')[2] || '';
    const [session, setSession] = useState<any>(null), [data, setData] = useState<any>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [query, setQuery] = useState(''), [edit, setEdit] = useState<Product | null>(null), [remove, setRemove] = useState<Product | null>(null), [order, setOrder] = useState<any>(null), [customer, setCustomer] = useState<any>(null), [busy, setBusy] = useState(false), [filter, setFilter] = useState('');
    const load = async () => { try {
        const s = await api('session');
        setSession(s);
        if (s.admin)
            setData(await api('admin/data'));
    }
    catch (e: any) {
        setError(e.message);
    } };
    useEffect(() => { load(); }, []);
    useEffect(() => { if (!session?.admin)
        return; const t = setInterval(() => { api('admin/data').then(setData).catch(() => { }); }, 30000); return () => clearInterval(t); }, [session?.admin]);
    const action = async (path: string, method: string, b: any) => { setBusy(true); setError(''); setMessage(''); try {
        await api(path, method, b);
        setData(await api('admin/data'));
        onRefresh();
        setMessage('تغییرات ذخیره شد.');
        return true;
    }
    catch (e: any) {
        setError(e.message);
        return false;
    }
    finally {
        setBusy(false);
    } };
    if (!session)
        return <div className="empty"><h1>مدیریت دوک</h1><p>{error || 'در حال بررسی دسترسی…'}</p>{error && <button className="btn" onClick={load}>تلاش دوباره</button>}</div>;
    if (!session.admin)
        return <section className="wrap inner-page"><div className="tracking-panel"><span className="eyebrow">DOOK / STORE MANAGEMENT</span><h1>ورود به مدیریت</h1>{!session.signedIn ? <><p>برای دسترسی به مدیریت، با حساب خود وارد شوید.</p><a className="btn" href="/signin-with-chatgpt?return_to=/admin" target="_top">ورود با ChatGPT <ArrowLeft size={18}/></a></> : session.needsSetup ? <><p>کد راه‌اندازی مدیر را وارد کنید. این اتصال فقط یک‌بار انجام می‌شود.</p><form onSubmit={async (e) => { e.preventDefault(); setBusy(true); try {
            await api('admin/setup', 'POST', { key: new FormData(e.currentTarget).get('key') });
            await load();
        }
        catch (e: any) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        } }}><Field label="کد راه‌اندازی"><input type="password" name="key" required autoComplete="off"/></Field><button className="btn" disabled={busy}>فعال‌سازی مدیریت</button></form></> : <p>این حساب دسترسی مدیریت ندارد. با حساب مدیر فروشگاه وارد شوید.</p>}{error && <p className="error">{error}</p>}</div></section>;
    if (!data)
        return <div className="empty"><p>{error || 'در حال دریافت اطلاعات…'}</p><button className="btn outline" onClick={load}>تلاش دوباره</button></div>;
    const orders: any[] = data.orders, products: Product[] = data.products;
    const paid = orders.filter(o => o.payment_status === 'mock_paid' && o.status !== 'لغو شده');
    const revenue = paid.reduce((s, o) => s + o.total, 0);
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' });
    const today = day.format(Date.now());
    const month = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'numeric', timeZone: 'Asia/Tehran' });
    const thisMonth = month.format(Date.now());
    const todaySales = paid.filter(o => day.format(o.created_at) === today).reduce((s, o) => s + o.total, 0);
    const monthlySales = paid.filter(o => month.format(o.created_at) === thisMonth).reduce((s, o) => s + o.total, 0);
    const newOrders = orders.filter(o => o.status === 'جدید' && o.payment_status !== 'cancelled');
    const customers = Object.values(orders.reduce((acc: any, o) => { if (!acc[o.phone])
        acc[o.phone] = { name: o.name, phone: o.phone, address: o.address, orders: [], total: 0 }; acc[o.phone].orders.push(o); if (o.payment_status === 'mock_paid' && o.status !== 'لغو شده')
        acc[o.phone].total += o.total; return acc; }, {})) as any[];
    const low = products.flatMap(p => p.variants.filter(v => v.stock <= 2).map(v => ({ ...v, name: p.name })));
    const search = (v: string) => v.includes(query);
    const navTitle = sections.find(s => s[0] === section)?.[1] || 'داشبورد';
    const orderTable = (list: any[]) => <div className="table-scroll"><table><thead><tr><th>شماره سفارش</th><th>مشتری</th><th>مبلغ</th><th>وضعیت</th><th>پرداخت</th><th>جزئیات</th></tr></thead><tbody>{list.map(o => <tr key={o.id}><td><bdi>{o.id}</bdi><small>{new Date(o.created_at).toLocaleDateString('fa-IR')}</small></td><td>{o.name}<small><bdi>{o.phone}</bdi></small></td><td>{money(o.total)}</td><td><span className={'status ' + (o.status === 'لغو شده' ? 'cancelled' : '')}>{o.status}</span></td><td>{o.payment_status === 'mock_paid' ? 'موفق (آزمایشی)' : o.payment_status === 'pending' ? 'در انتظار' : 'لغو شده'}</td><td><button className="text-link" onClick={() => setOrder(o)}>مشاهده <ArrowLeft size={15}/></button></td></tr>)}</tbody></table>{!list.length && <div className="empty">هنوز سفارشی وجود ندارد.</div>}</div>;
    return <SidebarProvider dir="rtl" style={{ '--sidebar-width': '15rem' } as React.CSSProperties}><Sidebar side="right" collapsible="offcanvas" className="admin-sidebar"><SidebarHeader><span className="eyebrow">DOOK / ADMIN</span><h2>مدیریت فروشگاه</h2></SidebarHeader><SidebarContent><SidebarMenu>{sections.map(([slug, label, Icon]) => <SidebarMenuItem key={slug}><SidebarMenuButton asChild isActive={section === slug}><a href={'/admin' + (slug ? '/' + slug : '')}><Icon size={18}/><span>{label}</span>{slug === 'orders' && newOrders.length > 0 && <b className="nav-count">{num(newOrders.length)}</b>}</a></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent></Sidebar><SidebarInset className="admin-main"><div className="admin-heading"><div className="admin-title"><SidebarTrigger /><h1>{navTitle}</h1></div><button className="notification" onClick={() => location.href = '/admin/orders'}><Bell size={19}/><span>{num(newOrders.length)} سفارش جدید</span></button></div>{error && <p className="error" role="alert">{error}</p>}{message && <p className="save-message" role="status"><Check size={17}/>{message}</p>}
    {section === '' && <><p className="notice">تمام مبالغ این نسخه از پرداخت‌های آزمایشی هستند و درآمد واقعی محسوب نمی‌شوند.</p><div className="stats">{[['فروش امروز', money(todaySales)], ['فروش این ماه', money(monthlySales)], ['تعداد سفارش‌ها', num(orders.length)], ['مشتریان', num(customers.length)]].map(([l, v]) => <div key={l}><span>{l}</span><strong>{v}</strong></div>)}</div><div className="admin-grid"><section className="admin-panel"><h2>فروش ۷ روز گذشته</h2><div className="sales-chart" aria-label="نمودار فروش آزمایشی هفت روز گذشته">{Array.from({ length: 7 }, (_, i) => { const date = Date.now() - (6 - i) * 86400000; const sum = paid.filter(o => day.format(o.created_at) === day.format(date)).reduce((s, o) => s + o.total, 0); return <div key={i}><span title={money(sum)} style={{ height: Math.max(2, Math.min(140, revenue ? sum / revenue * 140 : 0)) + 'px' }}/><small>{new Date(date).toLocaleDateString('fa-IR', { weekday: 'short' })}</small><b>{num(sum)}</b></div>; })}</div><p className="muted">جمع فروش آزمایشی: {money(revenue)}</p></section><section className="admin-panel"><h2>موجودی رو به پایان <span className="gold">{num(low.length)}</span></h2>{low.slice(0, 5).map(v => <div className="list-row" key={v.id}><span>{v.name}<small>{v.color} / {v.size}</small></span><b>{num(v.stock)} عدد</b></div>)}<a href="/admin/inventory" className="text-link">مدیریت موجودی <ArrowLeft size={17}/></a></section></div><section className="admin-panel"><div className="section-top"><h2>آخرین سفارش‌ها</h2><a href="/admin/orders" className="text-link">همه سفارش‌ها <ArrowLeft size={17}/></a></div>{orderTable(orders.slice(0, 5))}</section><section className="admin-panel"><h2>محصولات پرفروش</h2>{paid.length ? Object.entries(paid.flatMap(o => o.items).reduce((a: any, i: any) => ({ ...a, [i.name]: (a[i.name] || 0) + i.quantity }), {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([name, n]: any) => <div className="list-row" key={name}><span>{name}</span><b>{num(n)} عدد</b></div>) : <p className="muted">پس از تکمیل سفارش، محصولات پرفروش اینجا نمایش داده می‌شوند.</p>}</section></>}
    {section === 'products' && <><div className="admin-toolbar"><div className="shop-search"><Search size={18}/><input placeholder="جستجوی محصول…" value={query} onChange={e => setQuery(e.target.value)}/></div><button className="btn" onClick={() => setEdit({ id: 'product-' + uuid().slice(0, 8), name: '', category: data.categories[0], price: 0, oldPrice: 0, description: '', material: '', fit: '', wash: '', images: [], active: 1, createdAt: Date.now(), variants: ['S', 'M', 'L', 'XL'].map(size => ({ id: uuid(), productId: '', size, color: 'مشکی', stock: 0 })) })}><Plus size={18}/> محصول جدید</button></div><div className="table-scroll admin-panel"><table><thead><tr><th>محصول</th><th>دسته‌بندی</th><th>قیمت</th><th>موجودی</th><th>وضعیت</th><th>مدیریت</th></tr></thead><tbody>{products.filter(p => search(p.name + p.category)).map(p => <tr key={p.id}><td><div className="table-product"><img src={p.images[0]} alt=""/><span>{p.name}<small>{p.id}</small></span></div></td><td>{p.category}</td><td>{money(p.price)}</td><td>{num(p.variants.reduce((s, v) => s + v.stock, 0))}</td><td>{p.active ? 'فعال' : 'غیرفعال'}</td><td><div className="table-actions"><button aria-label={'ویرایش ' + p.name} onClick={() => setEdit(structuredClone(p))}><Pencil size={17}/></button><button aria-label={'حذف ' + p.name} onClick={() => setRemove(p)}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div></>}
    {section === 'inventory' && <><p className="muted">موجودی هر رنگ و سایز جداگانه ذخیره می‌شود. مقدار صفر، خرید آن تنوع را متوقف می‌کند.</p><div className="admin-toolbar"><div className="shop-search"><Search size={18}/><input placeholder="نام محصول یا رنگ…" value={query} onChange={e => setQuery(e.target.value)}/></div><Choice label="نمایش موجودی" value={filter} onChange={setFilter} options={[{ value: '', label: 'همه موجودی‌ها' }, { value: 'low', label: 'موجودی کم' }, { value: 'zero', label: 'ناموجود' }]}/></div><div className="table-scroll admin-panel"><table><thead><tr><th>محصول</th><th>رنگ</th><th>سایز</th><th>موجودی فعلی</th><th>اصلاح موجودی</th></tr></thead><tbody>{products.flatMap(p => p.variants.map(v => ({ ...v, name: p.name }))).filter(v => search(v.name + v.color) && (!filter || (filter === 'low' ? v.stock <= 2 : v.stock === 0))).map(v => <tr key={v.id}><td>{v.name}</td><td>{v.color}</td><td>{v.size}</td><td className={v.stock <= 2 ? 'gold' : ''}>{num(v.stock)}</td><td><InventoryInput key={v.id + '-' + v.stock} stock={v.stock} busy={busy} save={stock => action('admin/inventory', 'POST', { id: v.id, stock, previous: v.stock })}/></td></tr>)}</tbody></table></div></>}
    {section === 'orders' && <><div className="admin-toolbar"><div className="shop-search"><Search size={18}/><input placeholder="شماره سفارش، نام یا موبایل…" value={query} onChange={e => setQuery(e.target.value)}/></div><Choice label="وضعیت سفارش" value={filter} onChange={setFilter} options={[{ value: '', label: 'همه سفارش‌ها' }, ...statuses.map(s => ({ value: s, label: s }))]}/></div><section className="admin-panel">{orderTable(orders.filter(o => search(o.id + o.name + o.phone) && (!filter || o.status === filter)))}</section></>}
    {section === 'customers' && <><div className="shop-search"><Search size={18}/><input placeholder="نام یا موبایل مشتری…" value={query} onChange={e => setQuery(e.target.value)}/></div><section className="admin-panel table-scroll"><table><thead><tr><th>مشتری</th><th>شماره موبایل</th><th>تعداد سفارش</th><th>خرید آزمایشی</th><th>جزئیات</th></tr></thead><tbody>{customers.filter(c => search(c.name + c.phone)).map(c => <tr key={c.phone}><td>{c.name}</td><td><bdi>{c.phone}</bdi></td><td>{num(c.orders.length)}</td><td>{money(c.total)}</td><td><button className="text-link" onClick={() => setCustomer(c)}>مشاهده</button></td></tr>)}</tbody></table>{!customers.length && <div className="empty">پس از اولین سفارش، اطلاعات مشتری اینجا نمایش داده می‌شود.</div>}</section></>}
    {section === 'settings' && <SettingsForm data={data} busy={busy} save={(b: any) => action('admin/settings', 'POST', b)} addCategory={(name: string) => action('admin/categories', 'POST', { name })}/>}
    </SidebarInset><Dialog open={!!edit} onOpenChange={v => !v && setEdit(null)}><DialogContent className="admin-dialog" dir="rtl"><DialogTitle>{edit?.name || 'محصول جدید'}</DialogTitle><DialogDescription>اطلاعات، تصاویر و موجودی محصول را ویرایش کنید.</DialogDescription>{edit && <ProductEditor initial={edit} cats={data.categories} save={async (p) => { const ok = await action('admin/products', 'POST', p); if (ok)
        setEdit(null); return ok; }}/>}</DialogContent></Dialog><AlertDialog open={!!remove} onOpenChange={v => !v && setRemove(null)}><AlertDialogContent dir="rtl"><AlertDialogTitle>حذف از فروشگاه؟</AlertDialogTitle><AlertDialogDescription>«{remove?.name}» از فروشگاه خارج می‌شود. سوابق سفارش حفظ می‌شود و از بخش ویرایش می‌توانید دوباره آن را فعال کنید.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>انصراف</AlertDialogCancel><AlertDialogAction onClick={() => remove && action('admin/products', 'DELETE', { id: remove.id })}>حذف از فروشگاه</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><Dialog open={!!order} onOpenChange={v => !v && setOrder(null)}><DialogContent className="admin-dialog" dir="rtl"><DialogTitle>جزئیات سفارش</DialogTitle><DialogDescription><bdi>{order?.id}</bdi></DialogDescription>{order && <OrderEditor order={order} save={async (b) => { const ok = await action('admin/orders', 'POST', b); if (ok)
        setOrder(null); return ok; }}/>}</DialogContent></Dialog><Dialog open={!!customer} onOpenChange={v => !v && setCustomer(null)}><DialogContent dir="rtl"><DialogTitle>{customer?.name}</DialogTitle><DialogDescription>اطلاعات مشتری و سوابق سفارش</DialogDescription>{customer && <><p><bdi>{customer.phone}</bdi></p><p>{customer.address}</p>{customer.orders.map((o: any) => <div className="list-row" key={o.id}><bdi>{o.id}</bdi><span>{o.status}</span></div>)}</>}</DialogContent></Dialog></SidebarProvider>;
}
function InventoryInput({ stock, busy, save }: {
    stock: number;
    busy: boolean;
    save: (n: number) => Promise<boolean>;
}) { const [value, setValue] = useState(stock); return <form className="inventory-input" onSubmit={e => { e.preventDefault(); save(value); }}><input aria-label="موجودی جدید" type="number" value={value} onChange={e => setValue(Number(e.target.value))} min="0" max="100000" required/><button className="btn small" disabled={busy || stock === value}>ذخیره</button></form>; }
function ProductEditor({ initial, cats, save }: {
    initial: Product;
    cats: string[];
    save: (p: Product) => Promise<boolean>;
}) { const [p, setP] = useState(initial), [busy, setBusy] = useState(false), [err, setErr] = useState(''); const set = (k: string, v: any) => setP(s => ({ ...s, [k]: v })); const upload = async (e: React.ChangeEvent<HTMLInputElement>) => { const files = Array.from(e.target.files || []); setBusy(true); setErr(''); try {
    const urls: string[] = [];
    for (const f of files) {
        const form = new FormData();
        form.set('file', f);
        urls.push((await api('admin/upload', 'POST', form)).url);
    }
    setP(s => ({ ...s, images: [...s.images, ...urls].slice(0, 12) }));
}
catch (e: any) {
    setErr(e.message);
}
finally {
    setBusy(false);
} }; const reorder = (i: number, d: number) => { const imgs = [...p.images]; [imgs[i], imgs[i + d]] = [imgs[i + d], imgs[i]]; set('images', imgs); }; return <form onSubmit={async (e) => { e.preventDefault(); if (!p.images.length) {
    setErr('حداقل یک تصویر بارگذاری کنید.');
    return;
} setBusy(true); const ok = await save({...p,variants:p.variants.map(v=>{const old=initial.variants.find(i=>i.id===v.id);return {...v,...(old&&old.stock!==v.stock?{expectedStock:old.stock}:{})}})}); if (!ok)
    setErr('ذخیره انجام نشد. اطلاعات و موجودی‌ها را بررسی کنید.'); setBusy(false); }}><Tabs defaultValue="info" dir="rtl"><TabsList><TabsTrigger value="info">مشخصات</TabsTrigger><TabsTrigger value="images">تصاویر</TabsTrigger><TabsTrigger value="variants">رنگ و سایز</TabsTrigger></TabsList><TabsContent value="info"><div className="form-grid"><Field label="نام محصول"><input value={p.name} onChange={e => set('name', e.target.value)} required minLength={2}/></Field><Field label="دسته‌بندی"><Choice label="دسته‌بندی" value={p.category} onChange={v => set('category', v)} options={cats.map(c => ({ value: c, label: c }))}/></Field><Field label="قیمت فروش (تومان)"><input value={p.price || ''} type="number" min="1" max="100000000" onChange={e => set('price', Number(e.target.value))} required/></Field><Field label="قیمت قبل از تخفیف (صفر: بدون تخفیف)"><input value={p.oldPrice} type="number" min="0" max="100000000" onChange={e => set('oldPrice', Number(e.target.value))}/></Field><Field label="جنس"><input value={p.material} onChange={e => set('material', e.target.value)}/></Field><Field label="فرم / Fit"><input value={p.fit} onChange={e => set('fit', e.target.value)}/></Field></div><Field label="توضیحات"><textarea value={p.description} onChange={e => set('description', e.target.value)}/></Field><Field label="شست‌وشو"><textarea value={p.wash} onChange={e => set('wash', e.target.value)}/></Field><label className="check-line"><Switch checked={!!p.active} onCheckedChange={v => set('active', v ? 1 : 0)}/> نمایش در فروشگاه</label></TabsContent><TabsContent value="images"><label className="upload-zone"><Upload size={28}/><span>افزودن تصاویر محصول</span><small>JPEG، PNG یا WebP · حداکثر ۵ مگابایت</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} disabled={busy}/></label><div className="upload-grid">{p.images.map((img, i) => <div key={img}><img src={img} alt={'تصویر ' + num(i + 1)}/><span>{i === 0 ? 'تصویر اصلی' : 'تصویر ' + num(i + 1)}</span><div><button type="button" aria-label="جلو بردن تصویر" disabled={i === 0} onClick={() => reorder(i, -1)}><ArrowUp size={17}/></button><button type="button" aria-label="عقب بردن تصویر" disabled={i === p.images.length - 1} onClick={() => reorder(i, 1)}><ArrowDown size={17}/></button><button type="button" aria-label="حذف تصویر" onClick={() => set('images', p.images.filter((_, n) => n !== i))}><Trash2 size={17}/></button></div></div>)}</div></TabsContent><TabsContent value="variants"><p className="muted">موجودی صفر، این رنگ و سایز را ناموجود می‌کند.</p><div className="table-scroll"><table><thead><tr><th>رنگ</th><th>سایز</th><th>موجودی</th></tr></thead><tbody>{p.variants.map((v, i) => <tr key={v.id}>{(['color', 'size', 'stock'] as const).map(k => <td key={k}><input aria-label={k === 'color' ? 'رنگ' : k === 'size' ? 'سایز' : 'موجودی'} value={v[k]} type={k === 'stock' ? 'number' : 'text'} min="0" required onChange={e => set('variants', p.variants.map((a, n) => n === i ? { ...a, [k]: k === 'stock' ? Number(e.target.value) : e.target.value } : a))}/></td>)}</tr>)}</tbody></table></div><button type="button" className="text-link" onClick={() => set('variants', [...p.variants, { id: uuid(), productId: p.id, color: '', size: '', stock: 0 }])}><Plus size={18}/> افزودن رنگ / سایز</button></TabsContent></Tabs>{err && <p className="error">{err}</p>}<button className="btn editor-save" disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیره محصول'}<Check size={18}/></button></form>; }
function OrderEditor({ order, save }: {
    order: any;
    save: (b: any) => Promise<boolean>;
}) { const [status, setStatus] = useState(order.status), [tracking, setTracking] = useState(order.tracking), [busy, setBusy] = useState(false), [err, setErr] = useState(''); return <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); const ok = await save({ id: order.id, status, tracking }); if (!ok)
    setErr('تغییر وضعیت ممکن نشد. سفارش لغوشده قابل بازگشایی نیست و سفارش پرداخت‌نشده باید ابتدا تکمیل شود.'); setBusy(false); }}><div className="order-customer"><h3>{order.name} · <bdi>{order.phone}</bdi></h3><p>{order.address}</p><p>کد پستی: <bdi>{order.postal}</bdi></p></div>{order.items.map((i: any) => <div className="cart-row" key={i.id}><img src={i.image} alt=""/><div><b>{i.name}</b><p>{i.color} / {i.size} × {num(i.quantity)}</p></div><span>{money(i.price * i.quantity)}</span></div>)}<div className="list-row"><span>{order.shipping === 'post' ? 'پست پیشتاز' : 'تیپاکس'} / {order.payment === 'snapp' ? 'اسنپ‌پی' : 'درگاه آنلاین'} (آزمایشی)</span><strong>{money(order.total)}</strong></div><Field label="وضعیت سفارش"><Choice value={status} onChange={setStatus} label="وضعیت" options={statuses.map(s => ({ value: s, label: s }))}/></Field><Field label="کد رهگیری مرسوله"><input value={tracking} onChange={e => setTracking(e.target.value)} maxLength={100}/></Field>{status === 'لغو شده' && <p className="notice">با لغو سفارش، موجودی رزروشده به انبار بازمی‌گردد.</p>}{err && <p className="error">{err}</p>}<button className="btn" disabled={busy}>ذخیره وضعیت</button></form>; }
function SettingsForm({ data, busy, save, addCategory }: {
    data: any;
    busy: boolean;
    save: (b: any) => Promise<boolean>;
    addCategory: (s: string) => Promise<boolean>;
}) { const [s, setS] = useState(data.settings), [name, setName] = useState(''); return <div className="admin-grid"><form className="admin-panel" onSubmit={e => { e.preventDefault(); save(s); }}><h2>ارسال و اطلاعات فروشگاه</h2><Field label="هزینه پست پیشتاز (تومان)"><input type="number" min="0" value={s.post} onChange={e => setS({ ...s, post: Number(e.target.value) })}/></Field><Field label="هزینه تیپاکس (تومان)"><input type="number" min="0" value={s.tipax} onChange={e => setS({ ...s, tipax: Number(e.target.value) })}/></Field>{[['shipping', 'توضیحات ارسال'], ['returns', 'شرایط تعویض'], ['contact', 'اطلاعات تماس فروشگاه']].map(([k, l]) => <Field key={k} label={l}><textarea value={s[k]} onChange={e => setS({ ...s, [k]: e.target.value })}/></Field>)}<button className="btn" disabled={busy}>ذخیره تنظیمات</button></form><div><section className="admin-panel"><h2>دسته‌بندی‌ها</h2><div className="category-tags">{data.categories.map((c: string) => <span key={c}>{c}</span>)}</div><form onSubmit={async (e) => { e.preventDefault(); if (await addCategory(name))
    setName(''); }}><Field label="نام دسته‌بندی جدید"><input required maxLength={60} value={name} onChange={e => setName(e.target.value)}/></Field><button className="btn outline" disabled={busy}><Plus size={18}/> افزودن دسته‌بندی</button></form></section><section className="admin-panel"><h2>پرداخت</h2><p>درگاه آنلاین و اسنپ‌پی در حالت آزمایشی فعال‌اند. اتصال واقعی به تأیید پذیرندگی و کلیدهای سمت سرور نیاز دارد.</p><p className="muted">هیچ کلید پرداختی در مرورگر ذخیره نمی‌شود.</p></section></div></div>; }
