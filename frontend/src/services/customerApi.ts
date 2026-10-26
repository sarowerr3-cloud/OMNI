import { 
  Customer, 
  CustomerGroup, 
  CustomerOrder, 
  CustomerOrderPayload, 
  CustomerPayload, 
  GroupPayload 
} from '@/types/customer';

export type { Customer, CustomerGroup, CustomerOrder, CustomerOrderPayload, CustomerPayload, GroupPayload };

const LOCAL_STORAGE_CUSTOMERS_KEY = 'omni_customers_cache_v2';

/**
 * Auth token retrieval and management for protected API endpoints
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('omni_auth_token') || localStorage.getItem('access_token');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('omni_auth_token', token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('omni_auth_token');
  localStorage.removeItem('access_token');
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Helper to normalize phone number for search
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

/**
 * Service for handling customer, customer orders, and CRM requests with offline fallback
 */
export const customerApi = {
  async getCustomers(apiUrl: string, search?: string, phone?: string): Promise<Customer[]> {
    let queryParams: string[] = [];
    if (search && search.trim()) queryParams.push(`search=${encodeURIComponent(search.trim())}`);
    if (phone && phone.trim()) queryParams.push(`phone=${encodeURIComponent(phone.trim())}`);
    const qs = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    try {
      const res = await fetch(`${apiUrl}/customers${qs}`, { 
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(4000) 
      });
      if (res.ok) {
        const data: Customer[] = await res.json();
        try {
          if (!search && !phone) {
            localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(data));
          }
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn('API fetch failed for getCustomers, checking localStorage fallback:', err);
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
      if (stored) {
        let list: Customer[] = JSON.parse(stored);
        if (search) {
          const q = search.toLowerCase().trim();
          const qDigits = normalizePhoneNumber(q);
          list = list.filter((c) => {
            const nameMatch = c.name.toLowerCase().includes(q);
            const addrMatch = c.address ? c.address.toLowerCase().includes(q) : false;
            const notesMatch = c.notes ? c.notes.toLowerCase().includes(q) : false;
            const phoneMatch = c.phone.toLowerCase().includes(q) || (qDigits && normalizePhoneNumber(c.phone).includes(qDigits));
            const orderMatch = (c.orders || []).some(
              (o) => o.product_name.toLowerCase().includes(q) || (o.notes && o.notes.toLowerCase().includes(q))
            );
            return nameMatch || addrMatch || notesMatch || phoneMatch || orderMatch;
          });
        }
        if (phone) {
          const pNorm = normalizePhoneNumber(phone);
          list = list.filter((c) => normalizePhoneNumber(c.phone).includes(pNorm));
        }
        return list;
      }
    } catch {}

    return [];
  },

  async getCustomer(apiUrl: string, id: string): Promise<Customer> {
    try {
      const res = await fetch(`${apiUrl}/customers/${id}`, { 
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(4000) 
      });
      if (res.ok) {
        return res.json();
      }
    } catch (err) {
      console.warn('API getCustomer failed, trying local fallback:', err);
    }

    const cached = await this.getCustomers(apiUrl);
    const found = cached.find((c) => c.id === id);
    if (found) return found;
    throw new Error('Customer not found');
  },

  async getCustomerByPhone(apiUrl: string, phone: string): Promise<Customer | null> {
    const pNorm = normalizePhoneNumber(phone);
    if (!pNorm) return null;

    try {
      const res = await fetch(`${apiUrl}/customers/by-phone/${encodeURIComponent(phone)}`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return res.json();
      }
    } catch (err) {
      console.warn('API getCustomerByPhone failed, trying list search:', err);
    }

    // Try finding via listCustomers
    const all = await this.getCustomers(apiUrl);
    const match = all.find((c) => {
      const cNorm = normalizePhoneNumber(c.phone);
      return cNorm === pNorm || cNorm.endsWith(pNorm) || pNorm.endsWith(cNorm);
    });
    return match || null;
  },

  async createCustomer(apiUrl: string, payload: CustomerPayload): Promise<Customer> {
    try {
      const res = await fetch(`${apiUrl}/customers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created: Customer = await res.json();
        this._updateLocalCustomer(created);
        return created;
      }
    } catch (err) {
      console.warn('API createCustomer failed, performing local creation:', err);
    }

    // Offline creation fallback
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      address: payload.address?.trim() || null,
      notes: payload.notes?.trim() || null,
      email: payload.email?.trim() || null,
      group: payload.group || 'Retail Gadgets',
      category: payload.category || 'Electronics',
      city: payload.city || 'Dhaka',
      preferred_contact: payload.preferred_contact || 'whatsapp',
      orders: [],
      total_orders: 0,
      total_spent: 0,
      total_due: 0,
      active_orders_count: 0,
      delivered_orders_count: 0,
      cancelled_orders_count: 0,
      created_at: now,
      updated_at: now,
    };
    this._updateLocalCustomer(newCustomer);
    return newCustomer;
  },

  async updateCustomer(apiUrl: string, id: string, payload: Partial<CustomerPayload>): Promise<Customer> {
    try {
      const res = await fetch(`${apiUrl}/customers/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated: Customer = await res.json();
        this._updateLocalCustomer(updated);
        return updated;
      }
    } catch (err) {
      console.warn('API updateCustomer failed, using local update:', err);
    }

    const all = await this.getCustomers(apiUrl);
    const idx = all.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const now = new Date().toISOString();
      const updated: Customer = {
        ...all[idx],
        ...payload,
        updated_at: now
      };
      all[idx] = updated;
      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(all));
      } catch {}
      return updated;
    }
    throw new Error('Customer not found for update');
  },

  async deleteCustomer(apiUrl: string, id: string): Promise<boolean> {
    try {
      const res = await fetch(`${apiUrl}/customers/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        this._removeLocalCustomer(id);
        return true;
      }
    } catch (err) {
      console.warn('API deleteCustomer failed, removing locally:', err);
    }

    this._removeLocalCustomer(id);
    return true;
  },

  // -------------------------------------------------------------
  // CUSTOMER ORDERS CRUD
  // -------------------------------------------------------------
  async addCustomerOrder(
    apiUrl: string,
    customerId: string,
    payload: CustomerOrderPayload
  ): Promise<CustomerOrder> {
    try {
      const res = await fetch(`${apiUrl}/customers/${customerId}/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newOrder: CustomerOrder = await res.json();
        // Refresh customer locally
        try {
          const custRes = await fetch(`${apiUrl}/customers/${customerId}`, {
            headers: getAuthHeaders()
          });
          if (custRes.ok) {
            const updatedCust = await custRes.json();
            this._updateLocalCustomer(updatedCust);
          }
        } catch {}
        return newOrder;
      }
    } catch (err) {
      console.warn('API addCustomerOrder failed, applying local fallback:', err);
    }

    // Local fallback order creation
    const qty = payload.quantity && payload.quantity > 0 ? payload.quantity : 1;
    const unitPrice = payload.price || 0;
    const total = payload.total_amount !== undefined ? payload.total_amount : unitPrice * qty;
    const advance = payload.advance_payment || 0;
    const rem = Math.max(0, total - advance);

    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (advance >= total && total > 0) paymentStatus = 'paid';
    else if (advance > 0) paymentStatus = 'partial';

    let orderStatus: 'active' | 'delivered' | 'cancelled' = 'active';
    if (payload.is_cancelled) orderStatus = 'cancelled';
    else if (payload.is_delivered) orderStatus = 'delivered';

    const now = new Date();
    const dtFormatted = payload.date_time || now.toISOString().slice(0, 16).replace('T', ' ');

    const newOrder: CustomerOrder = {
      id: `ord_${Date.now()}`,
      customer_id: customerId,
      product_name: payload.product_name,
      product_image: payload.product_image || null,
      product_link: payload.product_link || null,
      weight: payload.weight || 0,
      weight_unit: payload.weight_unit || 'kg',
      price: unitPrice,
      quantity: qty,
      total_amount: total,
      advance_payment: advance,
      remaining_balance: rem,
      payment_status: paymentStatus,
      date_time: dtFormatted,
      is_delivered: !!payload.is_delivered,
      is_cancelled: !!payload.is_cancelled,
      status: orderStatus,
      notes: payload.notes || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const all = await this.getCustomers(apiUrl);
    const targetCust = all.find((c) => c.id === customerId);
    if (targetCust) {
      targetCust.orders = [newOrder, ...(targetCust.orders || [])];
      this._recalcAndSaveCustomer(targetCust, all);
    }

    return newOrder;
  },

  async updateCustomerOrder(
    apiUrl: string,
    customerId: string,
    orderId: string,
    payload: Partial<CustomerOrderPayload>
  ): Promise<CustomerOrder> {
    try {
      const res = await fetch(`${apiUrl}/customers/${customerId}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated: CustomerOrder = await res.json();
        try {
          const custRes = await fetch(`${apiUrl}/customers/${customerId}`, {
            headers: getAuthHeaders()
          });
          if (custRes.ok) {
            const updatedCust = await custRes.json();
            this._updateLocalCustomer(updatedCust);
          }
        } catch {}
        return updated;
      }
    } catch (err) {
      console.warn('API updateCustomerOrder failed, applying local fallback:', err);
    }

    // Local fallback order update
    const all = await this.getCustomers(apiUrl);
    const targetCust = all.find((c) => c.id === customerId);
    if (!targetCust) throw new Error('Customer not found');

    const orderIdx = (targetCust.orders || []).findIndex((o) => o.id === orderId);
    if (orderIdx === -1) throw new Error('Order not found');

    const curr = targetCust.orders[orderIdx];
    const updatedOrder: CustomerOrder = {
      ...curr,
      ...payload,
      updated_at: new Date().toISOString()
    };

    // Re-evaluate calculations
    const qty = updatedOrder.quantity || 1;
    const unitPrice = updatedOrder.price || 0;
    const tot = payload.total_amount !== undefined ? payload.total_amount : unitPrice * qty;
    const adv = updatedOrder.advance_payment || 0;
    const rem = Math.max(0, tot - adv);

    let pStat: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (adv >= tot && tot > 0) pStat = 'paid';
    else if (adv > 0) pStat = 'partial';

    let ordStat: 'active' | 'delivered' | 'cancelled' = 'active';
    if (updatedOrder.is_cancelled) ordStat = 'cancelled';
    else if (updatedOrder.is_delivered) ordStat = 'delivered';

    updatedOrder.total_amount = tot;
    updatedOrder.advance_payment = adv;
    updatedOrder.remaining_balance = rem;
    updatedOrder.payment_status = pStat;
    updatedOrder.status = ordStat;

    targetCust.orders[orderIdx] = updatedOrder;
    this._recalcAndSaveCustomer(targetCust, all);

    return updatedOrder;
  },

  async deleteCustomerOrder(apiUrl: string, customerId: string, orderId: string): Promise<boolean> {
    try {
      const res = await fetch(`${apiUrl}/customers/${customerId}/orders/${orderId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        try {
          const custRes = await fetch(`${apiUrl}/customers/${customerId}`, {
            headers: getAuthHeaders()
          });
          if (custRes.ok) {
            const updatedCust = await custRes.json();
            this._updateLocalCustomer(updatedCust);
          }
        } catch {}
        return true;
      }
    } catch (err) {
      console.warn('API deleteCustomerOrder failed, removing locally:', err);
    }

    const all = await this.getCustomers(apiUrl);
    const targetCust = all.find((c) => c.id === customerId);
    if (targetCust) {
      targetCust.orders = (targetCust.orders || []).filter((o) => o.id !== orderId);
      this._recalcAndSaveCustomer(targetCust, all);
      return true;
    }
    return false;
  },

  // -------------------------------------------------------------
  // GROUPS & OUTREACH
  // -------------------------------------------------------------
  async getGroups(apiUrl: string): Promise<CustomerGroup[]> {
    try {
      const res = await fetch(`${apiUrl}/customers/groups/list`, { 
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(3000) 
      });
      if (res.ok) return res.json();
    } catch {}

    return [
      { id: 'grp_wholesale', name: 'Wholesale Buyers', category: 'Electronics', description: 'Bulk buyers', color: '#3b82f6', member_count: 0 },
      { id: 'grp_retail_gadgets', name: 'Retail Gadgets', category: 'Electronics', description: 'Retail shop owners', color: '#10b981', member_count: 0 },
      { id: 'grp_watch_lovers', name: 'Watch Retailers', category: 'Smart Watches', description: 'Luxury smart watches', color: '#f59e0b', member_count: 0 },
      { id: 'grp_vip', name: 'VIP Clients', category: 'High Volume', description: 'Top recurring clients', color: '#dc2626', member_count: 0 },
      { id: 'grp_dropship', name: 'Dropshippers', category: 'E-Commerce', description: 'Online & Daraz sellers', color: '#8b5cf6', member_count: 0 },
    ];
  },

  async createGroup(apiUrl: string, payload: GroupPayload): Promise<CustomerGroup> {
    const res = await fetch(`${apiUrl}/customers/groups`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to create group: ${res.statusText}`);
    return res.json();
  },

  // Internal Helpers for Cache
  _updateLocalCustomer(customer: Customer) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
      let list: Customer[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex((c) => c.id === customer.id);
      if (idx !== -1) {
        list[idx] = customer;
      } else {
        list.unshift(customer);
      }
      localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(list));
    } catch {}
  },

  _removeLocalCustomer(customerId: string) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
      if (stored) {
        const list: Customer[] = JSON.parse(stored);
        const filtered = list.filter((c) => c.id !== customerId);
        localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(filtered));
      }
    } catch {}
  },

  _recalcAndSaveCustomer(cust: Customer, all: Customer[]) {
    const orders = cust.orders || [];
    cust.total_orders = orders.length;
    cust.total_spent = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    cust.total_due = orders.reduce((sum, o) => sum + (o.is_cancelled ? 0 : (o.remaining_balance || 0)), 0);
    cust.active_orders_count = orders.filter((o) => !o.is_delivered && !o.is_cancelled).length;
    cust.delivered_orders_count = orders.filter((o) => o.is_delivered).length;
    cust.cancelled_orders_count = orders.filter((o) => o.is_cancelled).length;
    cust.updated_at = new Date().toISOString();

    const idx = all.findIndex((c) => c.id === cust.id);
    if (idx !== -1) all[idx] = cust;
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(all));
    } catch {}
  }
};
