export interface ChecklistTask {
  id: string;
  text: string;
  completed: boolean;
  category?: 'sourcing' | 'payment' | 'shipping' | 'delivery' | 'custom';
}

export const DEFAULT_SOURCING_CHECKLIST: ChecklistTask[] = [
  { id: 'task-1', text: 'Supplier / Factory stock confirmed (1688 / Taobao / Factory Direct)', completed: false, category: 'sourcing' },
  { id: 'task-2', text: 'Sample photos & product specifications verified with supplier', completed: false, category: 'sourcing' },
  { id: 'task-3', text: 'Customer advance deposit received & receipt issued', completed: false, category: 'payment' },
  { id: 'task-4', text: 'Cargo freight rate & logistics route confirmed with agent', completed: false, category: 'shipping' },
  { id: 'task-5', text: 'Goods arrived at China warehouse & inspected for damages', completed: false, category: 'shipping' },
  { id: 'task-6', text: 'Package weighed, boxed & gross weight verified', completed: false, category: 'shipping' },
  { id: 'task-7', text: 'Air / Sea Cargo booked & transit tracking generated', completed: false, category: 'delivery' },
  { id: 'task-8', text: 'Customs clearance completed in Bangladesh warehouse', completed: false, category: 'delivery' },
  { id: 'task-9', text: 'Final customer payment collected & parcel dispatched', completed: false, category: 'payment' },
];

export interface ProductItem {
  id: string;
  title: string;
  details?: string;
  price: number;
  currency: string;
  price_bdt: number;
  weight_kg: number;
  quantity: number;
  image_url?: string;
  images?: string[];
  product_url?: string;
  platform?: string;
  notes?: string;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: 'paid' | 'partial' | 'unpaid';
  // Weight Price / Freight fields
  weight_price_bdt?: number;
  line_weight_price_bdt?: number;
  combined_unit_price_bdt?: number;
  combined_line_total_bdt?: number;
  // Sourcing checklist check state
  is_checked?: boolean;
}

export interface SavedProductList {
  id: string;
  name: string;
  brand_name?: string;
  date: string;
  items: ProductItem[];
  total_price_bdt: number;
  total_weight_kg: number;
  total_items_count: number;
  total_quantity: number;
  total_paid_bdt?: number;
  total_due_bdt?: number;
  total_weight_price_bdt?: number;
  grand_total_bdt?: number;
  freight_rate?: number;
  freight_unit?: string;
  payment_status?: string;
  notes?: string;
  checklist?: ChecklistTask[];
  created_at?: string;
  updated_at?: string;
}

export interface LightboxState {
  title: string;
  images: string[];
  currentIndex: number;
  productUrl?: string;
}
