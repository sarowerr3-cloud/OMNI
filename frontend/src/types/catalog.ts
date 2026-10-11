export interface CategoryDefinition {
  id: string;
  name: string;
  name_bn?: string;
  icon: string;
  color: string;
  description: string;
}

export const PRODUCT_CATEGORIES: CategoryDefinition[] = [
  // Photo 1
  { id: 'automotive', name: 'Automotive', name_bn: 'অটোমোটিভ ও গাড়ির যন্ত্রাংশ', icon: '🚗', color: '#ef4444', description: 'Car parts, accessories, electronics, bike gear & tools' },
  { id: 'appliances', name: 'Appliances', name_bn: 'গৃহস্থালি যন্ত্রপাতি', icon: '🧊', color: '#06b6d4', description: 'Kitchen & home appliances, blenders, coolers & heaters' },
  { id: 'womens_clothing', name: "Women's Clothing", name_bn: 'মেয়েদের পোশাক', icon: '👗', color: '#ec4899', description: 'Dresses, tops, ethnic wear, activewear & outerwear' },
  { id: 'mens_clothing', name: "Men's Clothing", name_bn: 'ছেলেদের পোশাক', icon: '👔', color: '#3b82f6', description: 'Shirts, t-shirts, pants, jackets & sportswear' },
  { id: 'toys_games', name: 'Toys & Games', name_bn: 'খেলনা ও গেমস', icon: '🎮', color: '#f59e0b', description: 'Video games, board games, puzzles, RC toys & consoles' },
  { id: 'beauty_health', name: 'Beauty & Health', name_bn: 'সৌন্দর্য ও স্বাস্থ্য', icon: '💄', color: '#a855f7', description: 'Cosmetics, skincare, haircare, personal care & health' },
  { id: 'electronics', name: 'Electronics', name_bn: 'ইলেকট্রনিক্স', icon: '📷', color: '#0ea5e9', description: 'Cameras, audio, headphones, wearables & smart home' },
  { id: 'home_living', name: 'Home & Living', name_bn: 'হোম ও লিভিং', icon: '🏠', color: '#10b981', description: 'Home decor, bedding, lighting, kitchenware & storage' },
  { id: 'furniture', name: 'Furniture', name_bn: 'ফার্নিচার ও আসবাবপত্র', icon: '🛋️', color: '#8b5cf6', description: 'Chairs, tables, sofas, desks & modular home furniture' },
  { id: 'tools_home_improvement', name: 'Tools & Home Improvement', name_bn: 'টুলস ও হোম ইম্প্রুভমেন্ট', icon: '🔨', color: '#f97316', description: 'Power tools, hand tools, hardware, fixtures & paint' },
  { id: 'jewelry_accessories', name: 'Jewelry & Accessories', name_bn: 'জুয়েলারি ও এক্সেসরিজ', icon: '💍', color: '#eab308', description: 'Necklaces, rings, earrings, watches & fashion jewelry' },

  // Photo 2
  { id: 'phones_accessories', name: 'Cell Phones & Accessories', name_bn: 'মোবাইল ও এক্সেসরিজ', icon: '📱', color: '#6366f1', description: 'Cases, chargers, cables, screen protectors & mounts' },
  { id: 'shoes', name: 'Shoes', name_bn: 'জুতো ও স্নিকার্স', icon: '👟', color: '#14b8a6', description: 'Sneakers, boots, formal shoes, sandals & slippers' },
  { id: 'sports_outdoors', name: 'Sports & Outdoors', name_bn: 'খেলাধুলা ও আউটডোর', icon: '🏀', color: '#22c55e', description: 'Fitness equipment, camping gear, cycling & team sports' },
  { id: 'pet_supplies', name: 'Pet Supplies', name_bn: 'পোষা প্রাণীর সামগ্রী', icon: '🐾', color: '#d97706', description: 'Pet food, toys, collars, beds, grooming & travel gear' },
  { id: 'hair_extensions_wigs', name: 'Hair Extensions & Wigs', name_bn: 'হেয়ার এক্সটেনশন ও উইগ', icon: '💇', color: '#db2777', description: 'Human hair wigs, synthetic hair, weaves & styling tools' },
  { id: 'bags_luggage', name: 'Bags & Luggage', name_bn: 'ব্যাগ ও লাগেজ', icon: '🎒', color: '#4f46e5', description: 'Backpacks, suitcases, duffels, handbags & wallets' },
  { id: 'novelty_special_use', name: 'Novelty & Special Use', name_bn: 'নভেলটি ও স্পেশাল আইটেম', icon: '🎭', color: '#9333ea', description: 'Costumes, cosplay, party goods, uniform & novelty gifts' },
  { id: 'food_grocery', name: 'Food & Grocery', name_bn: 'খাদ্য ও গ্রোসারি', icon: '🥫', color: '#84cc16', description: 'Packaged foods, snacks, beverages & pantry essentials' },
  { id: 'arts_crafts_sewing', name: 'Arts, Crafts & Sewing', name_bn: 'আর্টস, ক্রাফটস ও সেলাই', icon: '🎨', color: '#e11d48', description: 'Fabrics, yarn, painting, DIY craft kits & sewing notions' },
  { id: 'baby_maternity', name: 'Baby & Maternity', name_bn: 'বেবি ও মাতৃত্বকালীন পণ্য', icon: '🍼', color: '#fb7185', description: 'Strollers, diapers, nursing, baby clothes & nursery' },
  { id: 'motorcycles_powersports', name: 'Motorcycles & Powersports', name_bn: 'মোটরসাইকেল ও স্পোর্টস', icon: '🏍️', color: '#ea580c', description: 'Motorcycle helmets, riding gear, parts & accessories' },

  // Photo 3
  { id: 'office_school_supplies', name: 'Office & School Supplies', name_bn: 'অফিস ও স্কুল সামগ্রী', icon: '🖥️', color: '#2563eb', description: 'Stationery, notebooks, desk organizers & school supplies' },
  { id: 'business_industry_science', name: 'Business, Industry & Science', name_bn: 'ইন্ডাস্ট্রি ও সায়েন্স', icon: '🔬', color: '#059669', description: 'Industrial equipment, lab supplies, packaging & safety' },
  { id: 'books_media', name: 'Books & Media', name_bn: 'বই ও মিডিয়া', icon: '📚', color: '#7c3aed', description: 'Books, educational materials, music & media' },

  // Fallback
  { id: 'other', name: 'Custom & Other', name_bn: 'অন্যান্য পণ্য', icon: '📦', color: '#64748b', description: 'General import items and custom sourced merchandise' },
];

export const CATEGORY_ALIASES: Record<string, string> = {
  fashion: 'womens_clothing',
  home: 'home_living',
  beauty: 'beauty_health',
  toys: 'toys_games',
  bags: 'bags_luggage',
  tools: 'tools_home_improvement',
};

export const getCategoryDefinition = (categoryId: string): CategoryDefinition => {
  const resolvedId = CATEGORY_ALIASES[categoryId] || categoryId;
  return (
    PRODUCT_CATEGORIES.find((c) => c.id === resolvedId || c.id === categoryId) || {
      id: categoryId,
      name: categoryId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      icon: '📦',
      color: '#64748b',
      description: 'Custom category',
    }
  );
};

export interface CategorizedProduct {
  id: string;
  title: string;
  category: string;
  platform: '1688' | 'Taobao' | 'Pinduoduo' | 'AliExpress' | 'Factory Direct' | 'Other';
  source_price: number; // In currency
  currency: 'RMB' | 'USD';
  weight_val: number; // Value in weight_unit
  weight_unit: 'gm' | 'kg';
  weight_kg: number; // Normalized to kg
  moq: number;
  product_url?: string;
  image_url?: string;
  images?: string[];
  notes?: string;
  sku?: string;
  target_selling_price: number; // In BDT
  created_at: string;
  
  // Computed landed cost fields (based on user rate settings)
  computed_landed_cost?: number;
  computed_profit?: number;
  computed_margin?: number;
}

export const INITIAL_SAMPLE_PRODUCTS: CategorizedProduct[] = [
  {
    id: 'prod-sample-1',
    title: 'Smart Watch Ultra 9 AMOLED Display',
    category: 'electronics',
    platform: '1688',
    source_price: 45.0,
    currency: 'RMB',
    weight_val: 180,
    weight_unit: 'gm',
    weight_kg: 0.18,
    moq: 10,
    target_selling_price: 2150,
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
    notes: 'Comes with wireless charger & silicone strap.',
    sku: 'EL-SW-U9',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-2',
    title: 'Wireless Bluetooth ANC Earbuds Pro',
    category: 'electronics',
    platform: 'Pinduoduo',
    source_price: 28.0,
    currency: 'RMB',
    weight_val: 110,
    weight_unit: 'gm',
    weight_kg: 0.11,
    moq: 20,
    target_selling_price: 1350,
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80',
    notes: 'Dual mic noise cancelling, 30h battery life.',
    sku: 'EL-EB-ANC',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-3',
    title: 'Minimalist Waterproof Travel Backpack',
    category: 'bags_luggage',
    platform: '1688',
    source_price: 36.0,
    currency: 'RMB',
    weight_val: 550,
    weight_unit: 'gm',
    weight_kg: 0.55,
    moq: 5,
    target_selling_price: 2450,
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80',
    notes: 'Laptop sleeve up to 15.6 inch, USB charging port.',
    sku: 'BG-TR-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-4',
    title: 'Electric Portable Vegetable Food Chopper',
    category: 'home_living',
    platform: 'Taobao',
    source_price: 22.0,
    currency: 'RMB',
    weight_val: 320,
    weight_unit: 'gm',
    weight_kg: 0.32,
    moq: 15,
    target_selling_price: 1250,
    image_url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=400&q=80',
    notes: 'Rechargeable wireless garlic and spice grinder.',
    sku: 'HM-CH-02',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-5',
    title: 'Facial Cleansing Sonic Brush (Silicone)',
    category: 'beauty_health',
    platform: '1688',
    source_price: 14.5,
    currency: 'RMB',
    weight_val: 130,
    weight_unit: 'gm',
    weight_kg: 0.13,
    moq: 30,
    target_selling_price: 850,
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80',
    notes: 'Waterproof IPX7, 5 adjustable vibration levels.',
    sku: 'BT-FC-05',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-6',
    title: 'Breathable Casual Mesh Running Sneakers',
    category: 'shoes',
    platform: 'Pinduoduo',
    source_price: 42.0,
    currency: 'RMB',
    weight_val: 680,
    weight_unit: 'gm',
    weight_kg: 0.68,
    moq: 10,
    target_selling_price: 2650,
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
    notes: 'Lightweight EVA sole, sizes 39-44, non-slip design.',
    sku: 'SH-RN-08',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-7',
    title: 'High-Definition Dual Dash Cam with Night Vision',
    category: 'automotive',
    platform: '1688',
    source_price: 58.0,
    currency: 'RMB',
    weight_val: 340,
    weight_unit: 'gm',
    weight_kg: 0.34,
    moq: 5,
    target_selling_price: 3200,
    image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80',
    notes: '1080P front and rear recording, G-sensor parking monitor.',
    sku: 'AU-DC-10',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-8',
    title: 'Remote Control High-Speed Stunt Drift Car',
    category: 'toys_games',
    platform: 'Pinduoduo',
    source_price: 32.0,
    currency: 'RMB',
    weight_val: 450,
    weight_unit: 'gm',
    weight_kg: 0.45,
    moq: 12,
    target_selling_price: 1850,
    image_url: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=400&q=80',
    notes: '2.4GHz remote, 360-degree rotation, LED lights.',
    sku: 'TY-RC-04',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-9',
    title: 'Magnetic Wireless Fast Charging Car Mount',
    category: 'phones_accessories',
    platform: '1688',
    source_price: 19.5,
    currency: 'RMB',
    weight_val: 160,
    weight_unit: 'gm',
    weight_kg: 0.16,
    moq: 25,
    target_selling_price: 1150,
    image_url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&q=80',
    notes: '15W MagSafe compatible with air vent clamp.',
    sku: 'PH-MG-15',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-10',
    title: 'Thermal Insulation Stainless Steel Baby Bottle',
    category: 'baby_maternity',
    platform: 'Taobao',
    source_price: 26.0,
    currency: 'RMB',
    weight_val: 280,
    weight_unit: 'gm',
    weight_kg: 0.28,
    moq: 10,
    target_selling_price: 1450,
    image_url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&q=80',
    notes: 'BPA-free medical silicone nipple, 300ml volume.',
    sku: 'BB-BT-02',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-11',
    title: 'Titanium Steel Waterproof Luxury Men Watch',
    category: 'jewelry_accessories',
    platform: '1688',
    source_price: 38.0,
    currency: 'RMB',
    weight_val: 210,
    weight_unit: 'gm',
    weight_kg: 0.21,
    moq: 10,
    target_selling_price: 2350,
    image_url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&q=80',
    notes: 'Quartz chronograph movement with gift box.',
    sku: 'JW-WT-09',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-sample-12',
    title: 'Cordless Rechargeable Power Drill Set (21V)',
    category: 'tools_home_improvement',
    platform: '1688',
    source_price: 75.0,
    currency: 'RMB',
    weight_val: 1400,
    weight_unit: 'gm',
    weight_kg: 1.4,
    moq: 4,
    target_selling_price: 4200,
    image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80',
    notes: 'Includes 2 batteries, charger, and 24-piece drill bit kit.',
    sku: 'TL-DR-21',
    created_at: new Date().toISOString(),
  },
];
