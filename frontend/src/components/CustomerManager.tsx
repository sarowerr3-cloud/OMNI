'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  MessageSquare,
  Send,
  Smartphone,
  Search,
  Trash2,
  Edit3,
  Copy,
  Sparkles,
  FolderPlus,
  Tag,
  MapPin,
  Mail,
  X,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
  Plus,
  Phone,
  Coins,
  Package,
  Calendar,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { ProductItem } from '@/components/ProductListBuilder';
import { Customer, CustomerGroup, CustomerOrder, CustomerOrderPayload, CustomerPayload, GroupPayload } from '@/types/customer';
import { customerApi, normalizePhoneNumber } from '@/services/customerApi';
import {
  formatWhatsappPhone,
  getWhatsappShareUrl,
  getSmsShareUrl
} from '@/utils/customerMessaging';
import { WHATSAPP_GROUP_URL } from '@/config/whatsapp';
import { inputStyle, buttonActionStyle } from './customers/customerStyles';
import CustomerFormModal from './customers/CustomerFormModal';
import GroupFormModal from './customers/GroupFormModal';
import PersonalMessageModal from './customers/PersonalMessageModal';
import BroadcastModal from './customers/BroadcastModal';
import CustomerProfileModal from './customers/CustomerProfileModal';
import CustomerOrderModal from './customers/CustomerOrderModal';
import UniversalCustomerSearch from './customers/UniversalCustomerSearch';
import MonthlyExcelModal from './customers/MonthlyExcelModal';

export type { Customer, CustomerGroup };

interface CustomerManagerProps {
  apiUrl: string;
  productListItems?: ProductItem[];
  showToast: (msg: string) => void;
  initialSelectedProduct?: ProductItem | null;
  selectedCustomerId?: string | null;
  onClearSelectedCustomer?: () => void;
}

export default function CustomerManager({
  apiUrl,
  productListItems = [],
  showToast,
  initialSelectedProduct = null,
  selectedCustomerId = null,
  onClearSelectedCustomer
}: CustomerManagerProps) {
  // Customers & Groups State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('All');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [prefillQuery, setPrefillQuery] = useState<string>('');
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [showPersonalMsgModal, setShowPersonalMsgModal] = useState<boolean>(false);
  const [targetCustomerForMsg, setTargetCustomerForMsg] = useState<Customer | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [showMonthlyExcelModal, setShowMonthlyExcelModal] = useState<boolean>(false);

  // Profile & Order Modals
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<Customer | null>(null);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [targetCustomerForOrder, setTargetCustomerForOrder] = useState<Customer | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<CustomerOrder | null>(null);

  // Loading States for Operations
  const [savingCustomer, setSavingCustomer] = useState<boolean>(false);
  const [savingGroup, setSavingGroup] = useState<boolean>(false);

  // Fetch Customers & Groups from Backend API
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [custData, grpData] = await Promise.all([
        customerApi.getCustomers(apiUrl),
        customerApi.getGroups(apiUrl)
      ]);
      setCustomers(custData);
      setGroups(grpData);

      // If a customer was opened by ID
      if (selectedCustomerId) {
        const found = custData.find((c) => c.id === selectedCustomerId);
        if (found) setSelectedProfileCustomer(found);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
      showToast('⚠️ Could not connect to customer server. Check backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [apiUrl, selectedCustomerId]);

  // Sync selectedProfileCustomer with updated customer state
  useEffect(() => {
    if (selectedProfileCustomer) {
      const current = customers.find((c) => c.id === selectedProfileCustomer.id);
      if (current) setSelectedProfileCustomer(current);
    }
  }, [customers]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (selectedGroupFilter !== 'All' && c.group.toLowerCase() !== selectedGroupFilter.toLowerCase()) {
        return false;
      }
      if (selectedCategoryFilter !== 'All' && c.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const qDigits = normalizePhoneNumber(q);
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.toLowerCase().includes(q) || (!!qDigits && normalizePhoneNumber(c.phone).includes(qDigits));
        const matchNotes = c.notes ? c.notes.toLowerCase().includes(q) : false;
        const matchCity = c.city ? c.city.toLowerCase().includes(q) : false;
        const matchAddr = c.address ? c.address.toLowerCase().includes(q) : false;
        const matchOrder = (c.orders || []).some(
          (o) => o.product_name.toLowerCase().includes(q) || (o.notes && o.notes.toLowerCase().includes(q))
        );
        if (!matchName && !matchPhone && !matchNotes && !matchCity && !matchAddr && !matchOrder) {
          return false;
        }
      }
      return true;
    });
  }, [customers, selectedGroupFilter, selectedCategoryFilter, searchQuery]);

  // Modal Triggers
  const handleOpenAdd = (prefill?: string) => {
    setEditingCustomer(null);
    setPrefillQuery(prefill || '');
    setShowAddModal(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setPrefillQuery('');
    setShowAddModal(true);
  };

  const handleOpenProfile = (customer: Customer) => {
    setSelectedProfileCustomer(customer);
  };

  const handleOpenNewOrder = (customer: Customer) => {
    setTargetCustomerForOrder(customer);
    setOrderToEdit(null);
    setShowOrderModal(true);
  };

  const handleOpenEditOrder = (order: CustomerOrder) => {
    if (selectedProfileCustomer) {
      setTargetCustomerForOrder(selectedProfileCustomer);
      setOrderToEdit(order);
      setShowOrderModal(true);
    }
  };

  // Customer Form Submit (Create or Update)
  const handleSaveCustomer = async (payload: CustomerPayload) => {
    setSavingCustomer(true);
    try {
      if (editingCustomer) {
        const updated = await customerApi.updateCustomer(apiUrl, editingCustomer.id, payload);
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (selectedProfileCustomer && selectedProfileCustomer.id === updated.id) {
          setSelectedProfileCustomer(updated);
        }
        showToast(`✅ Profile for "${updated.name}" updated!`);
      } else {
        const created = await customerApi.createCustomer(apiUrl, payload);
        setCustomers((prev) => [created, ...prev]);
        showToast(`🎉 Customer Profile created for "${created.name}"!`);
        // Open their profile
        setSelectedProfileCustomer(created);
      }
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to save customer:', err);
      showToast('❌ Error saving customer profile.');
    } finally {
      setSavingCustomer(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete profile for "${name}" and all associated orders?`)) {
      return;
    }
    try {
      await customerApi.deleteCustomer(apiUrl, id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      if (selectedProfileCustomer?.id === id) {
        setSelectedProfileCustomer(null);
      }
      showToast(`🗑️ Deleted profile for "${name}".`);
    } catch (err) {
      console.error('Failed to delete customer:', err);
      showToast('❌ Could not delete customer.');
    }
  };

  // Order CRUD Handlers
  const handleSaveOrder = async (orderPayload: CustomerOrderPayload, orderId?: string) => {
    if (!targetCustomerForOrder) return;

    if (orderId) {
      const updatedOrder = await customerApi.updateCustomerOrder(apiUrl, targetCustomerForOrder.id, orderId, orderPayload);
      await fetchAllData();
      showToast('✅ Order updated successfully!');
    } else {
      const createdOrder = await customerApi.addCustomerOrder(apiUrl, targetCustomerForOrder.id, orderPayload);
      await fetchAllData();
      showToast('✅ Order saved to customer profile!');
    }
  };

  const handleToggleOrderStatus = async (order: CustomerOrder, isDelivered: boolean, isCancelled: boolean) => {
    if (!selectedProfileCustomer) return;
    try {
      await customerApi.updateCustomerOrder(apiUrl, selectedProfileCustomer.id, order.id, {
        is_delivered: isDelivered,
        is_cancelled: isCancelled
      });
      await fetchAllData();
      showToast(isDelivered ? '📦 Order marked as Delivered!' : (isCancelled ? '❌ Order marked as Cancelled!' : '🔄 Order status updated.'));
    } catch {
      showToast('⚠️ Could not update order status.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!selectedProfileCustomer) return;
    try {
      await customerApi.deleteCustomerOrder(apiUrl, selectedProfileCustomer.id, orderId);
      await fetchAllData();
      showToast('🗑️ Order deleted from customer profile.');
    } catch {
      showToast('⚠️ Could not delete order.');
    }
  };

  // Create Group Form Submit
  const handleCreateGroup = async (payload: GroupPayload) => {
    setSavingGroup(true);
    try {
      const createdGrp = await customerApi.createGroup(apiUrl, payload);
      setGroups((prev) => [...prev, createdGrp]);
      showToast(`📁 Created new customer group "${createdGrp.name}"!`);
      setShowGroupModal(false);
    } catch (err) {
      console.error('Failed to create group:', err);
      showToast('❌ Error creating group.');
    } finally {
      setSavingGroup(false);
    }
  };

  // Broadcast handlers & tracking
  const [sentCustomerIds, setSentCustomerIds] = useState<Record<string, boolean>>({});

  const handleSendBroadcastWhatsapp = (customer: Customer, text: string) => {
    const url = getWhatsappShareUrl(customer.phone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`🟢 WhatsApp chat opened for ${customer.name}!`);
    setSentCustomerIds((prev) => ({ ...prev, [customer.id]: true }));
  };

  const handleCopyMessage = (customer: Customer, text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`📋 Copied tailored text for ${customer.name}!`);
  };

  const handleCopyGroupPhones = (targetGroup: string) => {
    const targetCusts = targetGroup === 'All' ? customers : customers.filter((c) => c.group.toLowerCase() === targetGroup.toLowerCase());
    const phones = targetCusts.map((c) => c.phone).join(', ');
    navigator.clipboard.writeText(phones);
    showToast(`📋 Copied ${targetCusts.length} phone numbers!`);
  };

  // WhatsApp helper
  const handleOpenWhatsapp = (customer: Customer) => {
    const url = getWhatsappShareUrl(
      formatWhatsappPhone(customer.phone),
      `Assalamu Alaikum ${customer.name}, greeting from OMNI Sourcing:`
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem', padding: '0 1rem' }}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. UNIVERSAL SEARCH PANEL (PROMINENT AT TOP) */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--neu-rim)',
          borderRadius: '20px',
          padding: '1.5rem',
          boxShadow: 'var(--neu-flat-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--omni-red)', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Sparkles size={14} />
              <span>Universal Customer Finder & Order Entry</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
              Universal Customer Search
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
              Search via <strong>Phone Number</strong>, <strong>Customer Name</strong>, or <strong>Delivery Address</strong> to access profile and input order details.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowMonthlyExcelModal(true)}
              style={{
                ...buttonActionStyle,
                background: '#107c41',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                padding: '8px 16px',
                boxShadow: '0 4px 12px rgba(16, 124, 65, 0.35)',
              }}
              title="Generate monthly orders Excel sheet matching template and separate customer sheets"
            >
              <FileSpreadsheet size={15} />
              <span>Monthly Excel Sheet</span>
            </button>

            <button
              onClick={() => handleOpenAdd()}
              style={{
                ...buttonActionStyle,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                padding: '8px 16px',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
              }}
            >
              <UserPlus size={15} />
              <span>+ Create Profile</span>
            </button>

            <button
              onClick={fetchAllData}
              title="Refresh database"
              style={{ ...buttonActionStyle, padding: '8px 10px' }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Universal Search Input Bar with Live Popover Results */}
        <UniversalCustomerSearch
          apiUrl={apiUrl}
          onSelectCustomer={handleOpenProfile}
          onOpenNewOrder={handleOpenNewOrder}
          onCreateNewCustomer={handleOpenAdd}
          showToast={showToast}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SUMMARY METRICS CARDS */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: 'var(--neu-flat-sm)',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#3b82f6',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Customer Profiles
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {customers.length}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: 'var(--neu-flat-sm)',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--omni-red)',
            }}
          >
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Stored Orders
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {customers.reduce((acc, c) => acc + (c.orders?.length || 0), 0)}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: 'var(--neu-flat-sm)',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Delivered Orders
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>
              {customers.reduce((acc, c) => acc + (c.orders?.filter((o) => o.is_delivered).length || 0), 0)}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: 'var(--neu-flat-sm)',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#f59e0b',
            }}
          >
            <Coins size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Balance Due
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b' }}>
              ৳{customers.reduce((acc, c) => acc + (c.total_due || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. CUSTOMER PROFILES DIRECTORY */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--neu-rim)',
          borderRadius: '20px',
          padding: '1.5rem',
          boxShadow: 'var(--neu-flat-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Header & Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--omni-red)' }} />
              <span>Customer Profiles & Orders ({filteredCustomers.length})</span>
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Every customer profile stores their name, phone, address, special notes, and order history.
            </div>
          </div>

          {/* Group and In-Table Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Segment:</span>
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                style={{
                  ...inputStyle,
                  width: 'auto',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <option value="All">All Groups ({customers.length})</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.name}>{g.name} ({g.member_count})</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowGroupModal(true)}
              style={{ ...buttonActionStyle, padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <FolderPlus size={14} style={{ color: '#3b82f6' }} />
              <span>Groups</span>
            </button>

            <button
              onClick={() => setShowBroadcastModal(true)}
              style={{
                ...buttonActionStyle,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <Send size={13} />
              <span>Broadcast</span>
            </button>

            <button
              onClick={() => setShowMonthlyExcelModal(true)}
              style={{
                ...buttonActionStyle,
                background: '#107c41',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(16, 124, 65, 0.35)',
              }}
              title="Export monthly Excel sheet matching template with separate customer sheets"
            >
              <FileSpreadsheet size={13} />
              <span>Monthly Excel</span>
            </button>
          </div>
        </div>

        {/* CUSTOMER PROFILES GRID (INDEPENDENT SECTIONS - NO OVERLAPPING) */}
        {filteredCustomers.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px dashed var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Users size={36} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No customer profiles match the current filter.
            </div>
            <button
              onClick={() => handleOpenAdd(searchQuery)}
              style={{
                ...buttonActionStyle,
                background: 'var(--omni-red)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
              }}
            >
              <UserPlus size={15} />
              <span>Create Customer Profile</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredCustomers.map((cust) => {
              const activeCount = cust.orders?.filter((o) => !o.is_delivered && !o.is_cancelled).length || 0;
              const deliveredCount = cust.orders?.filter((o) => o.is_delivered).length || 0;
              const totalOrders = cust.orders?.length || 0;

              return (
                <div
                  key={cust.id}
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    padding: '18px',
                    boxShadow: 'var(--neu-flat-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    transition: 'all 0.18s ease',
                  }}
                  className="hover-neu-lift"
                >
                  {/* Top: Customer Avatar, Name, Group Badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)',
                          flexShrink: 0,
                        }}
                      >
                        {cust.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.2' }}>
                          {cust.name}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '3px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--omni-red)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                          }}
                        >
                          {cust.group}
                        </span>
                      </div>
                    </div>

                    {/* Quick WhatsApp Link */}
                    <button
                      onClick={() => handleOpenWhatsapp(cust)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                      title="Open direct WhatsApp conversation"
                    >
                      <MessageSquare size={13} />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  {/* Contact & Address Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      <Phone size={13} style={{ color: 'var(--omni-red)', flexShrink: 0 }} />
                      <a href={`tel:${cust.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {cust.phone}
                      </a>
                    </div>

                    {cust.address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        <MapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ lineHeight: '1.3' }}>{cust.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Special Requirements / Brief Notes (if present) */}
                  {cust.notes && (
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: '10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--neu-inset-border)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                      }}
                    >
                      <FileText size={13} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontStyle: 'italic', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {cust.notes}
                      </span>
                    </div>
                  )}

                  {/* Stored Orders Summary Strip */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      background: 'var(--bg-surface)',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Orders</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {totalOrders}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>Delivered</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>
                        {deliveredCount}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.65rem', color: cust.total_due > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                        Balance Due
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: cust.total_due > 0 ? '#ef4444' : '#10b981' }}>
                        ৳{cust.total_due.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    {/* View Profile & Orders */}
                    <button
                      onClick={() => handleOpenProfile(cust)}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--neu-rim)',
                        boxShadow: 'var(--neu-flat-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                      title="Open Profile & View All Orders"
                    >
                      <Package size={14} style={{ color: 'var(--omni-red)' }} />
                      <span>View Orders ({totalOrders})</span>
                    </button>

                    {/* Quick Input Order */}
                    <button
                      onClick={() => handleOpenNewOrder(cust)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                      }}
                      title="Input new order for this customer"
                    >
                      <Plus size={14} />
                      <span>Order</span>
                    </button>

                    {/* Edit Profile */}
                    <button
                      onClick={() => handleOpenEdit(cust)}
                      style={{
                        padding: '7px 9px',
                        borderRadius: '10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--neu-rim)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                      title="Edit Customer Profile"
                    >
                      <Edit3 size={13} />
                    </button>

                    {/* Delete Customer */}
                    <button
                      onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                      style={{
                        padding: '7px 9px',
                        borderRadius: '10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--neu-rim)',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                      title="Delete Customer Profile"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MODALS (INDEPENDENT LAYERS, NO OVERLAPPING) */}
      {/* ------------------------------------------------------------- */}
      
      {/* Customer Form Modal (Create / Edit) */}
      <CustomerFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        editingCustomer={editingCustomer}
        groups={groups}
        prefilledQuery={prefillQuery}
        onSave={handleSaveCustomer}
        isSaving={savingCustomer}
      />

      {/* Customer Profile & All Stored Orders Modal */}
      {selectedProfileCustomer && (
        <CustomerProfileModal
          isOpen={!!selectedProfileCustomer}
          onClose={() => {
            setSelectedProfileCustomer(null);
            if (onClearSelectedCustomer) onClearSelectedCustomer();
          }}
          customer={selectedProfileCustomer}
          onUpdateProfile={async (cid, payload) => {
            const updated = await customerApi.updateCustomer(apiUrl, cid, payload);
            setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelectedProfileCustomer(updated);
          }}
          onAddNewOrder={(cust) => handleOpenNewOrder(cust)}
          onEditOrder={(order) => handleOpenEditOrder(order)}
          onToggleOrderStatus={handleToggleOrderStatus}
          onDeleteOrder={handleDeleteOrder}
          onEditCustomerProfile={(cust) => handleOpenEdit(cust)}
          showToast={showToast}
        />
      )}

      {/* Customer Order Details Input Modal */}
      {showOrderModal && targetCustomerForOrder && (
        <CustomerOrderModal
          isOpen={showOrderModal}
          onClose={() => {
            setShowOrderModal(false);
            setOrderToEdit(null);
          }}
          customer={targetCustomerForOrder}
          orderToEdit={orderToEdit}
          onSaveOrder={handleSaveOrder}
          showToast={showToast}
        />
      )}

      {/* Manage Groups Modal */}
      <GroupFormModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        groups={groups}
        customers={customers}
        onSaveGroup={handleCreateGroup}
        isSaving={savingGroup}
      />

      {/* Broadcast Modal */}
      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        customers={customers}
        groups={groups}
        productListItems={productListItems}
        initialSelectedProduct={initialSelectedProduct}
        onSendWhatsapp={handleSendBroadcastWhatsapp}
        onCopyMessage={handleCopyMessage}
        onCopyGroupPhones={handleCopyGroupPhones}
        sentCustomerIds={sentCustomerIds}
      />

      {/* Monthly Excel Sheet & Customer Ledgers Modal */}
      <MonthlyExcelModal
        isOpen={showMonthlyExcelModal}
        onClose={() => setShowMonthlyExcelModal(false)}
        customers={customers}
        showToast={showToast}
      />
    </div>
  );
}
