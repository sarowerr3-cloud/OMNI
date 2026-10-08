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
} from 'lucide-react';
import { ProductItem } from '@/components/ProductListBuilder';
import { customerApi, CustomerPayload, GroupPayload } from '@/services/customerApi';
import {
  formatWhatsappPhone,
  getWhatsappShareUrl,
  getSmsShareUrl
} from '@/utils/customerMessaging';
import { inputStyle, buttonActionStyle } from './customers/customerStyles';
import CustomerFormModal from './customers/CustomerFormModal';
import GroupFormModal from './customers/GroupFormModal';
import PersonalMessageModal from './customers/PersonalMessageModal';
import BroadcastModal from './customers/BroadcastModal';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  group: string;
  category: string;
  city?: string;
  address?: string;
  notes?: string;
  preferred_contact: string;
  total_orders: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerGroup {
  id: string;
  name: string;
  category: string;
  description?: string;
  color: string;
  member_count: number;
}

interface CustomerManagerProps {
  apiUrl: string;
  productListItems?: ProductItem[];
  showToast: (msg: string) => void;
  initialSelectedProduct?: ProductItem | null;
}

export default function CustomerManager({
  apiUrl,
  productListItems = [],
  showToast,
  initialSelectedProduct = null
}: CustomerManagerProps) {
  // Customers & Groups State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('All');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [showPersonalMsgModal, setShowPersonalMsgModal] = useState<boolean>(false);
  const [targetCustomerForMsg, setTargetCustomerForMsg] = useState<Customer | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);

  // Loading States for Operations
  const [savingCustomer, setSavingCustomer] = useState<boolean>(false);
  const [savingGroup, setSavingGroup] = useState<boolean>(false);

  // Broadcast & outreach tracking
  const [sentCustomerIds, setSentCustomerIds] = useState<Record<string, boolean>>({});

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
    } catch (err) {
      console.error('Failed to load customers:', err);
      showToast('⚠️ Could not connect to customer server. Check backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [apiUrl]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (selectedGroupFilter !== 'All' && c.group.toLowerCase() !== selectedGroupFilter.toLowerCase()) {
        return false;
      }
      if (selectedCategoryFilter !== 'All' && c.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
        return false;
      }
      if (selectedCityFilter !== 'All' && c.city?.toLowerCase() !== selectedCityFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.toLowerCase().includes(q);
        const matchNotes = c.notes?.toLowerCase().includes(q);
        const matchCity = c.city?.toLowerCase().includes(q);
        const matchAddr = c.address?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchNotes && !matchCity && !matchAddr) {
          return false;
        }
      }
      return true;
    });
  }, [customers, selectedGroupFilter, selectedCategoryFilter, selectedCityFilter, searchQuery]);

  // Unique lists for filter dropdowns
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [customers]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.city) set.add(c.city);
    });
    return Array.from(set);
  }, [customers]);

  // Open 1-on-1 WhatsApp Chat
  const handleSendWhatsapp = (customer: Customer, text: string) => {
    const url = getWhatsappShareUrl(customer.phone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`🟢 WhatsApp chat opened for ${customer.name}!`);
    setSentCustomerIds((prev) => ({ ...prev, [customer.id]: true }));
  };

  // Open 1-on-1 SMS App
  const handleSendSms = (customer: Customer, text: string) => {
    const url = getSmsShareUrl(customer.phone, text);
    window.location.href = url;
    showToast(`💬 SMS app opened for ${customer.name}!`);
  };

  // Copy Message Text
  const handleCopyMessage = (customer: Customer, text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`📋 Formatted message copied for ${customer.name}!`);
  };

  // Copy All Phone Numbers for Selected Group
  const handleCopyGroupPhones = (targetGroup: string) => {
    const groupMembers = customers.filter(
      (c) => targetGroup === 'All' || c.group.toLowerCase() === targetGroup.toLowerCase()
    );
    const phones = groupMembers.map((c) => formatWhatsappPhone(c.phone)).join(', ');
    navigator.clipboard.writeText(phones);
    showToast(`📋 Copied ${groupMembers.length} phone numbers for ${targetGroup}!`);
  };

  // Add / Edit Customer Form Submit
  const handleSaveCustomer = async (payload: CustomerPayload) => {
    setSavingCustomer(true);
    try {
      if (editingCustomer) {
        const updated = await customerApi.updateCustomer(apiUrl, editingCustomer.id, payload);
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        showToast(`✏️ Updated "${updated.name}" successfully!`);
        setShowAddModal(false);
        setEditingCustomer(null);
      } else {
        const created = await customerApi.createCustomer(apiUrl, payload);
        setCustomers((prev) => [created, ...prev]);
        showToast(`✅ Registered customer "${created.name}"!`);
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Failed to save customer:', err);
      showToast('❌ Error saving customer. Check API server.');
    } finally {
      setSavingCustomer(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowAddModal(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setShowAddModal(true);
  };

  // Delete Customer
  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from customer list?`)) {
      return;
    }
    try {
      await customerApi.deleteCustomer(apiUrl, id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      showToast(`🗑️ Removed customer "${name}"`);
    } catch (err) {
      console.error('Delete customer error:', err);
      showToast('❌ Error deleting customer.');
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

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER & CONTROL BAR */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          background: 'rgba(24, 24, 27, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.45)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1.25rem', borderBottom: '1px solid #27272a' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              <Sparkles style={{ width: '16px', height: '16px' }} />
              <span>Customer Segmentation & Direct Outreach</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users style={{ width: '28px', height: '28px', color: '#dc2626' }} />
              Retail Customers & Group Messaging
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
              Organize retail clients into targeted groups, send 1-on-1 personal WhatsApp & SMS pitches, or broadcast new product arrivals.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleOpenAdd} style={{ ...buttonActionStyle, backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#ffffff', fontWeight: 700 }}>
              <UserPlus style={{ width: '16px', height: '16px' }} />
              <span>+ Add Customer</span>
            </button>

            <button onClick={() => setShowGroupModal(true)} style={buttonActionStyle}>
              <FolderPlus style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
              <span>Manage Groups</span>
            </button>

            <button
              onClick={() => setShowBroadcastModal(true)}
              style={{
                ...buttonActionStyle,
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Send style={{ width: '16px', height: '16px' }} />
              <span>📢 Broadcast to Group</span>
            </button>

            <button
              onClick={fetchAllData}
              title="Refresh data"
              aria-label="Refresh customer and group data"
              style={{ ...buttonActionStyle, padding: '9px' }}
            >
              <RefreshCw style={{ width: '16px', height: '16px', color: '#a1a1aa' }} />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TOP STATS CARDS */}
        {/* ------------------------------------------------------------- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          <div style={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}>
              <Users style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Total Customers</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                {customers.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#a1a1aa' }}>retailers</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}>
              <Tag style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Segments & Groups</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>
                {groups.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#a1a1aa' }}>active</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
              <Smartphone style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>WhatsApp Direct</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>
                100% <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#a1a1aa' }}>connected</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#f87171' }}>
              <ShoppingBag style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Sourcing Products</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171' }}>
                {productListItems.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#a1a1aa' }}>ready to pitch</span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* GROUP TABS BAR */}
        {/* ------------------------------------------------------------- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginTop: '1.5rem', borderBottom: '1px solid #27272a' }}>
          <button
            onClick={() => setSelectedGroupFilter('All')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: selectedGroupFilter === 'All' ? '#dc2626' : '#09090b',
              color: '#ffffff',
              border: '1px solid',
              borderColor: selectedGroupFilter === 'All' ? '#dc2626' : '#27272a',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            All Customers ({customers.length})
          </button>

          {groups.map((grp) => {
            const count = customers.filter((c) => c.group.toLowerCase() === grp.name.toLowerCase()).length;
            const isSelected = selectedGroupFilter.toLowerCase() === grp.name.toLowerCase();
            return (
              <button
                key={grp.id}
                onClick={() => setSelectedGroupFilter(grp.name)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: isSelected ? grp.color : '#09090b',
                  color: '#ffffff',
                  border: '1px solid',
                  borderColor: isSelected ? grp.color : '#27272a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: grp.color }} />
                <span>{grp.name}</span>
                <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '10px', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SEARCH & FILTERS BAR */}
        {/* ------------------------------------------------------------- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#71717a' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone, city, notes..."
              style={{ ...inputStyle, paddingLeft: '36px' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <X style={{ width: '14px', height: '14px' }} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              style={{ ...inputStyle, width: '160px', backgroundColor: '#09090b' }}
            >
              <option value="All">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={selectedCityFilter}
              onChange={(e) => setSelectedCityFilter(e.target.value)}
              style={{ ...inputStyle, width: '140px', backgroundColor: '#09090b' }}
            >
              <option value="All">All Cities</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {selectedGroupFilter !== 'All' && (
            <button
              onClick={() => handleCopyGroupPhones(selectedGroupFilter)}
              title="Copy numbers of current group for SMS blast"
              style={{ ...buttonActionStyle, padding: '9px 12px', fontSize: '0.8rem' }}
            >
              <Copy style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
              <span>Copy Numbers ({filteredCustomers.length})</span>
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CUSTOMER DIRECTORY LIST / TABLE */}
        {/* ------------------------------------------------------------- */}
        <div style={{ marginTop: '1.25rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
              Loading customers and groups...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ backgroundColor: '#09090b', border: '1px dashed #27272a', borderRadius: '12px', padding: '3rem 1rem', textAlign: 'center' }}>
              <Users style={{ width: '48px', height: '48px', color: '#3f3f46', margin: '0 auto 12px auto' }} />
              <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1rem', margin: 0 }}>No customers matched your filter</p>
              <p style={{ color: '#71717a', fontSize: '0.85rem', marginTop: '6px', margin: 0 }}>
                Try selecting &quot;All Customers&quot; or click &quot;+ Add Customer&quot; above to register new retailers.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredCustomers.map((cust) => {
                const groupObj = groups.find((g) => g.name.toLowerCase() === cust.group.toLowerCase());
                const groupColor = groupObj?.color || '#3b82f6';
                const isSent = sentCustomerIds[cust.id];

                return (
                  <div
                    key={cust.id}
                    style={{
                      backgroundColor: '#09090b',
                      border: '1px solid #27272a',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px', flex: 1 }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          backgroundColor: `${groupColor}20`,
                          border: `1px solid ${groupColor}50`,
                          color: groupColor,
                          fontWeight: 800,
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {cust.name.substring(0, 2).toUpperCase()}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                            {cust.name}
                          </h4>
                          {cust.city && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600, backgroundColor: '#18181b', color: '#a1a1aa', border: '1px solid #27272a' }}>
                              <MapPin style={{ width: '10px', height: '10px', color: '#f87171' }} />
                              {cust.city}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <a
                            href={`https://wa.me/${formatWhatsappPhone(cust.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.8rem', color: '#34d399', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                          >
                            <Smartphone style={{ width: '12px', height: '12px' }} />
                            <span>{cust.phone}</span>
                          </a>

                          {cust.email && (
                            <span style={{ fontSize: '0.75rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Mail style={{ width: '11px', height: '11px' }} />
                              {cust.email}
                            </span>
                          )}
                        </div>

                        {cust.notes && (
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                            &ldquo;{cust.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor: `${groupColor}20`,
                          color: groupColor,
                          border: `1px solid ${groupColor}40`,
                          textTransform: 'uppercase'
                        }}
                      >
                        {cust.group}
                      </span>

                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: '#18181b',
                          color: '#e2e8f0',
                          border: '1px solid #3f3f46'
                        }}
                      >
                        {cust.category}
                      </span>

                      <div style={{ textAlign: 'right', minWidth: '65px' }}>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#71717a', fontWeight: 700 }}>Orders</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24' }}>
                          {cust.total_orders} orders
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => {
                          setTargetCustomerForMsg(cust);
                          setShowPersonalMsgModal(true);
                        }}
                        aria-label={`Send direct message to ${cust.name}`}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: isSent ? '#047857' : '#10b981',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        {isSent ? <CheckCircle2 style={{ width: '14px', height: '14px' }} /> : <MessageSquare style={{ width: '14px', height: '14px' }} />}
                        <span>{isSent ? 'Sent' : 'Direct Msg'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(cust)}
                        title="Edit Customer"
                        aria-label={`Edit customer ${cust.name}`}
                        style={{ padding: '8px', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}
                      >
                        <Edit3 style={{ width: '14px', height: '14px' }} />
                      </button>

                      <button
                        onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                        title="Delete Customer"
                        aria-label={`Delete customer ${cust.name}`}
                        style={{ padding: '8px', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#f87171', cursor: 'pointer' }}
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modular Sub-component Modals */}
      <CustomerFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingCustomer(null);
        }}
        editingCustomer={editingCustomer}
        groups={groups}
        onSave={handleSaveCustomer}
        isSaving={savingCustomer}
      />

      <GroupFormModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        groups={groups}
        customers={customers}
        onSaveGroup={handleCreateGroup}
        isSaving={savingGroup}
      />

      <PersonalMessageModal
        isOpen={showPersonalMsgModal}
        onClose={() => {
          setShowPersonalMsgModal(false);
          setTargetCustomerForMsg(null);
        }}
        targetCustomer={targetCustomerForMsg}
        productListItems={productListItems}
        initialSelectedProduct={initialSelectedProduct}
        onCopyMessage={handleCopyMessage}
        onSendWhatsapp={handleSendWhatsapp}
        onSendSms={handleSendSms}
      />

      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        customers={customers}
        groups={groups}
        productListItems={productListItems}
        initialSelectedProduct={initialSelectedProduct}
        onSendWhatsapp={handleSendWhatsapp}
        onCopyMessage={handleCopyMessage}
        onCopyGroupPhones={handleCopyGroupPhones}
        sentCustomerIds={sentCustomerIds}
      />
    </div>
  );
}
