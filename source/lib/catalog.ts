export type Variant = {
    id: string;
    productId: string;
    color: string;
    size: string;
    stock: number;
};
export type Product = {
    sold?: number;
    id: string;
    name: string;
    category: string;
    price: number;
    oldPrice: number;
    description: string;
    material: string;
    fit: string;
    wash: string;
    images: string[];
    active: number;
    createdAt: number;
    variants: Variant[];
};
export const categories = ['هودی', 'دورس', 'پیراهن', 'کمربند', 'کاپشن', 'سویشرت', 'تیشرت'];
export const money = (v: number) => new Intl.NumberFormat('fa-IR').format(v) + ' تومان';
export const num = (v: number) => new Intl.NumberFormat('fa-IR').format(v);
export const statuses = ['جدید', 'تأیید شده', 'آماده ارسال', 'ارسال شده', 'تحویل شده', 'لغو شده'];
const portfolioProducts = [
  {
    "id": "dook-5547",
    "name": "هودی نیکس بژ",
    "category": "هودی",
    "price": 1790000,
    "oldPrice": 0,
    "description": "هودی کلاه‌دار با جیب کانگورویی و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5547.jpeg"
    ]
  },
  {
    "id": "dook-5551",
    "name": "دورس نیم‌زیپ سبز",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس نیم‌زیپ با یقه ایستاده و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5551.jpeg"
    ]
  },
  {
    "id": "dook-5567",
    "name": "دورس ساده آبی",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس یقه‌گرد با آستین بلند و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5567.jpeg"
    ]
  },
  {
    "id": "dook-5564",
    "name": "هودی ساده مشکی",
    "category": "هودی",
    "price": 1790000,
    "oldPrice": 0,
    "description": "هودی کلاه‌دار با جیب کانگورویی و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5564.jpeg"
    ]
  },
  {
    "id": "dook-5545",
    "name": "دورس رانینگ آبی روشن",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس یقه‌گرد با آستین بلند و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5545.jpeg",
      "/images/shop-5546.jpeg"
    ]
  },
  {
    "id": "dook-5548",
    "name": "هودی نیکس طوسی",
    "category": "هودی",
    "price": 1790000,
    "oldPrice": 0,
    "description": "هودی کلاه‌دار با جیب کانگورویی و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5548.jpeg"
    ]
  },
  {
    "id": "dook-5549",
    "name": "هودی نیکس کرم",
    "category": "هودی",
    "price": 1790000,
    "oldPrice": 0,
    "description": "هودی کلاه‌دار با جیب کانگورویی و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5549.jpeg"
    ]
  },
  {
    "id": "dook-5550",
    "name": "هودی نیکس قهوه‌ای",
    "category": "هودی",
    "price": 1790000,
    "oldPrice": 0,
    "description": "هودی کلاه‌دار با جیب کانگورویی و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5550.jpeg"
    ]
  },
  {
    "id": "dook-5552",
    "name": "دورس نیم‌زیپ کرم",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس نیم‌زیپ با یقه ایستاده و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5552.jpeg"
    ]
  },
  {
    "id": "dook-5553",
    "name": "دورس نیم‌زیپ مشکی",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس نیم‌زیپ با یقه ایستاده و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5553.jpeg"
    ]
  },
  {
    "id": "dook-5554",
    "name": "دورس نیم‌زیپ آبی روشن",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس نیم‌زیپ با یقه ایستاده و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5554.jpeg"
    ]
  },
  {
    "id": "dook-5555",
    "name": "دورس نیم‌زیپ سفید",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس نیم‌زیپ با یقه ایستاده و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5555.jpeg"
    ]
  },
  {
    "id": "dook-5556",
    "name": "دورس نیم‌زیپ قهوه‌ای",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس نیم‌زیپ با یقه ایستاده و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5556.jpeg"
    ]
  },
  {
    "id": "dook-5560",
    "name": "هودی ساده طوسی",
    "category": "هودی",
    "price": 1790000,
    "oldPrice": 0,
    "description": "هودی کلاه‌دار با جیب کانگورویی و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5560.jpeg"
    ]
  },
  {
    "id": "dook-5563",
    "name": "هودی ساده کرم",
    "category": "هودی",
    "price": 1790000,
    "oldPrice": 0,
    "description": "هودی کلاه‌دار با جیب کانگورویی و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5563.jpeg"
    ]
  },
  {
    "id": "dook-5565",
    "name": "دورس ساده قهوه‌ای",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس یقه‌گرد با آستین بلند و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5565.jpeg"
    ]
  },
  {
    "id": "dook-5566",
    "name": "دورس ساده کرم",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس یقه‌گرد با آستین بلند و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5566.jpeg"
    ]
  },
  {
    "id": "dook-5568",
    "name": "دورس ساده طوسی روشن",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس یقه‌گرد با آستین بلند و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5568.jpeg"
    ]
  },
  {
    "id": "dook-5571",
    "name": "دورس ساده مشکی",
    "category": "دورس",
    "price": 1390000,
    "oldPrice": 0,
    "description": "دورس یقه‌گرد با آستین بلند و لبه‌های کشباف.",
    "material": "—",
    "fit": "آزاد",
    "wash": "طبق برچسب شست‌وشوی لباس عمل کنید.",
    "images": [
      "/images/shop-5571.jpeg"
    ]
  }
];
export const seedProducts: Product[] = portfolioProducts.map((p, i) => ({ ...p, active: 1, createdAt: Date.now() - i * 86400000, variants: ['S', 'M', 'L', 'XL'].map((size, j) => ({ id: p.id + '-' + size, productId: p.id, color: ({"dook-5547": "بژ", "dook-5551": "سبز", "dook-5567": "آبی", "dook-5564": "مشکی", "dook-5545": "آبی روشن", "dook-5548": "طوسی", "dook-5549": "کرم", "dook-5550": "قهوه‌ای", "dook-5552": "کرم", "dook-5553": "مشکی", "dook-5554": "آبی روشن", "dook-5555": "سفید", "dook-5556": "قهوه‌ای", "dook-5560": "طوسی", "dook-5563": "کرم", "dook-5565": "قهوه‌ای", "dook-5566": "کرم", "dook-5568": "طوسی روشن", "dook-5571": "مشکی"} as Record<string,string>)[p.id] || '', size, stock: [2, 4, 1, 0][j] })) }));
export const defaultSettings = { post: 79000, tipax: 119000, shipping: 'ارسال به سراسر کشور با پست پیشتاز یا تیپاکس. زمان تحویل پس از هماهنگی فروشگاه مشخص می‌شود.', returns: 'شرایط نهایی تعویض توسط فروشگاه اعلام می‌شود. پیش از خرید، سایز و مشخصات محصول را بررسی کنید.', contact: 'اطلاعات تماس فروشگاه به‌زودی تکمیل می‌شود.' };
