import Store from '../store';
import type { Metadata } from 'next';
import { seedProducts } from '@/lib/catalog';
import { catalog } from '@/lib/server';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
const origin = 'https://dook-boutique.hesam9090.chatgpt.site';
async function getProducts() { try {
    return await catalog();
}
catch {
    return seedProducts;
} }
export async function generateMetadata({ params }: {
    params: Promise<{
        path: string[];
    }>;
}): Promise<Metadata> { const { path } = await params; const p = path[0] === 'product' ? (await getProducts()).find(p => p.id === path[1]) : null; const title = (p?.name || ({ 'shop': 'فروشگاه', 'cart': 'سبد خرید', 'checkout': 'تکمیل خرید', 'tracking': 'پیگیری سفارش', 'admin': 'مدیریت فروشگاه', 'search': 'جستجو', 'category': decodeURIComponent(path[1] || 'دسته‌بندی') } as any)[path[0]] || 'بوتیک مردانه') + ' | DOOK'; return { title, description: p?.description || 'انتخاب پوشاک و اکسسوری مردانه در بوتیک دوک', alternates: { canonical: origin + '/' + path.map(encodeURIComponent).join('/') }, openGraph: { title, description: p?.description || 'بوتیک مردانه دوک' }, robots: ['admin', 'checkout', 'payment', 'order-success', 'cart', 'tracking'].includes(path[0]) ? { index: false, follow: false } : undefined }; }
export default async function Page({ params }: {
    params: Promise<{
        path: string[];
    }>;
}) { const { path } = await params; const ps = await getProducts(); const p = path[0] === 'product' ? ps.find(p => p.id === path[1]) : null; if (path[0] === 'product' && !p)
    notFound(); if (!['shop', 'category', 'product', 'search', 'cart', 'checkout', 'payment', 'order-success', 'tracking', 'admin', 'info'].includes(path[0]))
    notFound(); const json = p ? { '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description, image: p.images.map((i: string) => origin + i), sku: p.id, brand: { '@type': 'Brand', name: 'DOOK' }, offers: { '@type': 'Offer', url: origin + '/product/' + p.id, priceCurrency: 'IRR', price: p.price * 10, availability: p.variants.some((v: any) => v.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } } : null; return <>{json && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }}/>}<Store path={'/' + path.join('/')} initialProducts={ps as any}/></>; }
