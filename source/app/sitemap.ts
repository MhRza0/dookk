import {seedProducts,categories} from '@/lib/catalog';
import {catalog} from '@/lib/server';
const origin='https://dook-boutique.hesam9090.chatgpt.site';
export default async function sitemap(){let ps=seedProducts;try{ps=await catalog() as any}catch{}return ['','/shop',...categories.map(c=>'/category/'+encodeURIComponent(c)),...ps.map(p=>'/product/'+p.id)].map(path=>({url:origin+path,lastModified:new Date(),changeFrequency:'weekly' as const,priority:path===''?1:0.8}))}
