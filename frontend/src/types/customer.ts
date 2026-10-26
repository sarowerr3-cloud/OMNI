export interface CustomerOrder {
  id: string;
  customer_id: string;
  product_name: string;
  product_image?: string | null;
  product_link?: string | null;
  weight: number;
  weight_unit: 'kg' | 'gm';
  price: number;
  quantity: number;
  delivery_cost?: number;
  packing_cost?: number;
  total_amount: number;
  advance_payment: number;
  remaining_balance: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  date_time: string;
  is_delivered: boolean;
  is_cancelled: boolean;
  status: 'active' | 'delivered' | 'cancelled';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerOrderPayload {
  product_name: string;
  product_image?: string | null;
  product_link?: string | null;
  weight?: number;
  weight_unit?: 'kg' | 'gm';
  price: number;
  quantity?: number;
  delivery_cost?: number;
  packing_cost?: number;
  total_amount?: number;
  advance_payment?: number;
  remaining_balance?: number;
  payment_status?: 'paid' | 'partial' | 'unpaid';
  date_time?: string;
  is_delivered?: boolean;
  is_cancelled?: boolean;
  status?: 'active' | 'delivered' | 'cancelled';
  notes?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  notes?: string | null;
  email?: string | null;
  group: string;
  category: string;
  city?: string;
  preferred_contact: string;
  default_delivery_cost?: number;
  default_packing_cost?: number;
  orders: CustomerOrder[];
  total_orders: number;
  total_spent: number;
  total_due: number;
  active_orders_count?: number;
  delivered_orders_count?: number;
  cancelled_orders_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerPayload {
  name: string;
  phone: string;
  address?: string | null;
  notes?: string | null;
  email?: string | null;
  group?: string;
  category?: string;
  city?: string;
  preferred_contact?: string;
  default_delivery_cost?: number;
  default_packing_cost?: number;
}

export interface CustomerGroup {
  id: string;
  name: string;
  category: string;
  description?: string;
  color: string;
  member_count: number;
}

export interface GroupPayload {
  name: string;
  category: string;
  description?: string | null;
  color: string;
}
