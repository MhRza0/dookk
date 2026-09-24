import Store from './store';
import { catalog } from '@/lib/server';
export const dynamic = 'force-dynamic';
export default async function Home() { let products; try {
    products = await catalog();
}
catch { } return <Store path="/" initialProducts={products as any}/>; }
