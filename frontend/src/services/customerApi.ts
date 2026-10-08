import { Customer, CustomerGroup } from '@/components/CustomerManager';

export interface CustomerPayload {
  name: string;
  phone: string;
  email?: string | null;
  group: string;
  category: string;
  city?: string;
  address?: string | null;
  notes?: string | null;
  preferred_contact?: string;
}

export interface GroupPayload {
  name: string;
  category: string;
  description?: string | null;
  color: string;
}

/**
 * Service for handling customer and group API requests
 */
export const customerApi = {
  async getCustomers(apiUrl: string): Promise<Customer[]> {
    const res = await fetch(`${apiUrl}/customers`);
    if (!res.ok) {
      throw new Error(`Failed to fetch customers: ${res.statusText}`);
    }
    return res.json();
  },

  async getGroups(apiUrl: string): Promise<CustomerGroup[]> {
    const res = await fetch(`${apiUrl}/customers/groups/list`);
    if (!res.ok) {
      throw new Error(`Failed to fetch customer groups: ${res.statusText}`);
    }
    return res.json();
  },

  async createCustomer(apiUrl: string, payload: CustomerPayload): Promise<Customer> {
    const res = await fetch(`${apiUrl}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Failed to create customer: ${res.statusText}`);
    }
    return res.json();
  },

  async updateCustomer(apiUrl: string, id: string, payload: CustomerPayload): Promise<Customer> {
    const res = await fetch(`${apiUrl}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Failed to update customer: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteCustomer(apiUrl: string, id: string): Promise<boolean> {
    const res = await fetch(`${apiUrl}/customers/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Failed to delete customer: ${res.statusText}`);
    }
    return true;
  },

  async createGroup(apiUrl: string, payload: GroupPayload): Promise<CustomerGroup> {
    const res = await fetch(`${apiUrl}/customers/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Failed to create group: ${res.statusText}`);
    }
    return res.json();
  }
};
