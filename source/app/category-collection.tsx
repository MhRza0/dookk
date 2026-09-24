import { ArrowLeft, ArrowUpLeft } from 'lucide-react';
import type { Product } from '@/lib/catalog';

const portraits: Record<string, { file: string; alt: string }> = {
  'هودی': { file: 'hoodie', alt: 'هودی قهوه‌ای با کلاه و جیب کانگورویی' },
  'دورس': { file: 'crewneck', alt: 'دورس زغالی یقه‌گرد' },
  'پیراهن': { file: 'shirt', alt: 'پیراهن مردانه آکسفورد روشن' },
  'کمربند': { file: 'belt', alt: 'کمربند چرم مشکی با سگک فلزی' },
  'کاپشن': { file: 'jacket', alt: 'کاپشن پافر مشکی' },
  'سویشرت': { file: 'zip-sweatshirt', alt: 'سویشرت زیپ‌دار طوسی' },
  'تیشرت': { file: 'tshirt', alt: 'تیشرت ساده مشکی یقه‌گرد' },
};

export function CategoryCollection({ categories, products }: { categories: string[]; products: Product[] }) {
  return <section id="collection" className="collection wrap" aria-labelledby="collection-title">
    <div className="collection-heading">
      <div><span className="eyebrow">THE COLLECTION</span><h2 id="collection-title">انتخاب از کمد دوک</h2></div>
      <a className="text-link" href="/shop">همه محصولات <ArrowLeft size={18} /></a>
    </div>
    <div className="collection-grid">
      {categories.map(category => {
        const portrait = portraits[category];
        const product = products.find(item => item.category === category && item.images[0]);
        const src = portrait ? `/images/collection/${portrait.file}.webp` : product?.images[0];
        return <a className={'collection-card' + (!src ? ' collection-card-text' : '')} href={'/category/' + encodeURIComponent(category)} key={category} aria-label={`مشاهده محصولات ${category}`}>
          {src && <div className="collection-photo"><img src={src} alt={portrait?.alt || category} width="1254" height="1254" loading="lazy" decoding="async" /></div>}
          <div className="collection-caption"><div><h3>{category}</h3><span>مشاهده محصولات</span></div><span className="collection-arrow" aria-hidden="true"><ArrowUpLeft size={21} /></span></div>
        </a>;
      })}
    </div>
  </section>;
}
