'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  MessageSquare,
  Send,
  Smartphone,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Check,
  Copy,
  Sparkles,
  FolderPlus,
  Tag,
  MapPin,
  Phone,
  Mail,
  FileText,
  X,
  ShoppingBag,
  Share2,
  CheckCircle2,
  RefreshCw,
  Building,
  SlidersHorizontal
} from 'lucide-react';
import { ProductItem } from '@/components/ProductListBuilder';

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

  // Form State for Adding / Editing Customer
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formGroup, setFormGroup] = useState<string>('Wholesale Buyers');
  const [formCategory, setFormCategory] = useState<string>('Electronics');
  const [formCity, setFormCity] = useState<string>('Dhaka');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [savingCustomer, setSavingCustomer] = useState<boolean>(false);

  // Form State for Creating New Group
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupCategory, setNewGroupCategory] = useState<string>('Electronics');
  const [newGroupDesc, setNewGroupDesc] = useState<string>('');
  const [newGroupColor, setNewGroupColor] = useState<string>('#3b82f6');
  const [savingGroup, setSavingGroup] = useState<boolean>(false);

  // Messaging State (Product attachment & templates)
  const [selectedProductAttachment, setSelectedProductAttachment] = useState<string>('custom');
  const [msgProductTitle, setMsgProductTitle] = useState<string>('');
  const [msgProductPriceBdt, setMsgProductPriceBdt] = useState<string>('');
  const [msgProductUrl, setMsgProductUrl] = useState<string>('');
  const [msgTemplateType, setMsgTemplateType] = useState<'new_arrival' | 'discount_offer' | 'restock_preorder' | 'custom'>('new_arrival');
  const [customMsgBody, setCustomMsgBody] = useState<string>('');

  // Group Broadcast Tracker State
  const [broadcastTargetGroup, setBroadcastTargetGroup] = useState<string>('Wholesale Buyers');
  const [sentCustomerIds, setSentCustomerIds] = useState<Record<string, boolean>>({});

  // Fetch Customers & Groups from Backend API
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resCust, resGrp] = await Promise.all([
        fetch(`${apiUrl}/customers`),
        fetch(`${apiUrl}/customers/groups/list`)
      ]);

      if (resCust.ok) {
        const custData = await resCust.json();
        setCustomers(custData);
      }
      if (resGrp.ok) {
        const grpData = await resGrp.json();
        setGroups(grpData);
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
  }, [apiUrl]);

  // If an initial product was provided (e.g. from Sourcing list or search card)
  useEffect(() => {
    if (initialSelectedProduct) {
      setMsgProductTitle(initialSelectedProduct.title);
      setMsgProductPriceBdt(String(initialSelectedProduct.price_bdt));
      setMsgProductUrl(initialSelectedProduct.product_url || '');
      setSelectedProductAttachment(initialSelectedProduct.id);
    }
  }, [initialSelectedProduct]);

  // Sync selected product from ProductListBuilder dropdown
  const handleSelectProductAttachment = (productId: string) => {
    setSelectedProductAttachment(productId);
    if (productId === 'custom' || productId === 'none') {
      return;
    }
    const found = productListItems.find((p) => p.id === productId);
    if (found) {
      setMsgProductTitle(found.title);
      setMsgProductPriceBdt(String(found.price_bdt));
      setMsgProductUrl(found.product_url || '');
    }
  };

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

  // Helpers for WhatsApp phone formatting
  const formatWhatsappPhone = (phone: string): string => {
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.startsWith('01') && cleaned.length === 11) {
      return '88' + cleaned;
    } else if (cleaned.startsWith('880') && cleaned.length === 13) {
      return cleaned;
    }
    return cleaned;
  };

  // Generate Message Text for a Customer
  const generateMessageText = (customer: Customer): string => {
    const pTitle = msgProductTitle.trim() || 'Exclusive China Factory Product';
    const pPrice = msgProductPriceBdt.trim() ? `৳${Number(msgProductPriceBdt).toLocaleString()} BDT` : 'Factory Wholesale Rate';
    const pUrl = msgProductUrl.trim() || 'https://omni-sourcing.bd';

    if (msgTemplateType === 'new_arrival') {
      return (
        `Assalamu Alaikum ${customer.name}! 🚀\n\n` +
        `We just sourced an exciting new product directly from China factories:\n` +
        `📦 *${pTitle}*\n` +
        `💰 Special Client Price: *${pPrice}*\n` +
        (pUrl ? `🔗 Product Details: ${pUrl}\n\n` : '\n') +
        `Pre-orders and direct air shipment slots are open now for ${customer.city || 'Dhaka'} delivery.\n` +
        `Please reply to this message to reserve your batch units! ✨`
      );
    } else if (msgTemplateType === 'discount_offer') {
      return (
        `Hello ${customer.name}! 🔥\n\n` +
        `Exclusive Flash Offer for our *${customer.group}* partners:\n` +
        `🏷️ Product: *${pTitle}*\n` +
        `💵 Offer Price: *${pPrice}* (Limited Batch)\n` +
        (pUrl ? `🔗 Check Details: ${pUrl}\n\n` : '\n') +
        `First come, first served. Let us know how many units you want to lock in today!`
      );
    } else if (msgTemplateType === 'restock_preorder') {
      return (
        `Dear ${customer.name},\n\n` +
        `Our next scheduled China cargo shipment is finalizing this week.\n` +
        `Are you restocking *${pTitle}* for your ${customer.category} inventory?\n` +
        `Factory Landed Rate: ${pPrice}\n` +
        (pUrl ? `Specs Link: ${pUrl}\n\n` : '\n') +
        `Drop us a message if you want to include your volume in this batch.`
      );
    } else if (msgTemplateType === 'custom') {
      if (customMsgBody.trim()) {
        return customMsgBody
          .replace(/\{name\}/g, customer.name)
          .replace(/\{group\}/g, customer.group)
          .replace(/\{category\}/g, customer.category)
          .replace(/\{city\}/g, customer.city || 'Dhaka')
          .replace(/\{product\}/g, pTitle)
          .replace(/\{price\}/g, pPrice)
          .replace(/\{url\}/g, pUrl);
      }
      return `Assalamu Alaikum ${customer.name}! Update regarding ${pTitle}: ${pPrice}.`;
    }

    return `Assalamu Alaikum ${customer.name}! New update for ${pTitle}: ${pPrice}.`;
  };

  // Open 1-on-1 WhatsApp Chat
  const handleSendWhatsapp = (customer: Customer) => {
    const text = generateMessageText(customer);
    const cleanPhone = formatWhatsappPhone(customer.phone);
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`🟢 WhatsApp chat opened for ${customer.name}!`);
    setSentCustomerIds((prev) => ({ ...prev, [customer.id]: true }));
  };

  // Open 1-on-1 SMS App
  const handleSendSms = (customer: Customer) => {
    const text = generateMessageText(customer);
    const cleanPhone = formatWhatsappPhone(customer.phone);
    const url = `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
    window.location.href = url;
    showToast(`💬 SMS app opened for ${customer.name}!`);
  };

  // Copy Message Text
  const handleCopyMessage = (customer: Customer) => {
    const text = generateMessageText(customer);
    navigator.clipboard.writeText(text);
    showToast(`📋 Formatted message copied for ${customer.name}!`);
  };

  // Add / Edit Customer Form Submit
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      showToast('⚠️ Please enter customer name and phone number!');
      return;
    }

    setSavingCustomer(true);
    try {
      const payload = {
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim() || null,
        group: formGroup.trim(),
        category: formCategory.trim(),
        city: formCity.trim() || 'Dhaka',
        address: formAddress.trim() || null,
        notes: formNotes.trim() || null,
        preferred_contact: 'whatsapp'
      };

      if (editingCustomer) {
        const res = await fetch(`${apiUrl}/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const updated = await res.json();
          setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          showToast(`✏️ Updated "${updated.name}" successfully!`);
          setShowAddModal(false);
          setEditingCustomer(null);
        } else {
          throw new Error('Update failed');
        }
      } else {
        const res = await fetch(`${apiUrl}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const created = await res.json();
          setCustomers((prev) => [created, ...prev]);
          showToast(`✅ Registered customer "${created.name}"!`);
          setShowAddModal(false);
        } else {
          throw new Error('Create failed');
        }
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
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormEmail(customer.email || '');
    setFormGroup(customer.group);
    setFormCategory(customer.category);
    setFormCity(customer.city || 'Dhaka');
    setFormAddress(customer.address || '');
    setFormNotes(customer.notes || '');
    setShowAddModal(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('+8801');
    setFormEmail('');
    setFormGroup(groups.length > 0 ? groups[0].name : 'Wholesale Buyers');
    setFormCategory('Electronics');
    setFormCity('Dhaka');
    setFormAddress('');
    setFormNotes('');
    setShowAddModal(true);
  };

  // Delete Customer
  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from customer list?`)) {
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        showToast(`🗑️ Removed customer "${name}"`);
      }
    } catch (err) {
      console.error('Delete customer error:', err);
      showToast('❌ Error deleting customer.');
    }
  };

  // Create Group Form Submit
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      showToast('⚠️ Please enter group name!');
      return;
    }

    setSavingGroup(true);
    try {
      const payload = {
        name: newGroupName.trim(),
        category: newGroupCategory.trim() || 'General',
        description: newGroupDesc.trim() || null,
        color: newGroupColor
      };

      const res = await fetch(`${apiUrl}/customers/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const createdGrp = await res.json();
        setGroups((prev) => [...prev, createdGrp]);
        showToast(`📁 Created new customer group "${createdGrp.name}"!`);
        setNewGroupName('');
        setNewGroupDesc('');
        setShowGroupModal(false);
      }
    } catch (err) {
      console.error('Failed to create group:', err);
      showToast('❌ Error creating group.');
    } finally {
      setSavingGroup(false);
    }
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

  // Common Styles
  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#09090b',
    border: '1px solid #3f3f46',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '0.9rem',
    color: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px'
  };

  const buttonActionStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: '10px',
    backgroundColor: '#18181b',
    color: '#f8fafc',
    fontSize: '0.85rem',
    fontWeight: 600,
    border: '1px solid #3f3f46',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
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
              onClick={() => {
                if (productListItems.length > 0 && !msgProductTitle) {
                  const first = productListItems[0];
                  setMsgProductTitle(first.title);
                  setMsgProductPriceBdt(String(first.price_bdt));
                  setMsgProductUrl(first.product_url || '');
                  setSelectedProductAttachment(first.id);
                }
                setShowBroadcastModal(true);
              }}
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

            <button onClick={fetchAllData} title="Refresh data" style={{ ...buttonActionStyle, padding: '9px' }}>
              <RefreshCw style={{ width: '16px', height: '16px', color: '#a1a1aa' }} />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TOP STATS CARDS */}
        {/* ------------------------------------------------------------- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          {/* Card 1: Total Customers */}
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

          {/* Card 2: Customer Groups */}
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

          {/* Card 3: Direct WhatsApp Reach */}
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

          {/* Card 4: Sourcing List Sync */}
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
          {/* Search Box */}
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

          {/* Category Filter */}
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

          {/* City Filter */}
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
                    {/* Customer Identity & Contact */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px', flex: 1 }}>
                      {/* Initials Avatar */}
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

                      {/* Info Details */}
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

                        {/* Phone with WhatsApp Link */}
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

                    {/* Group & Category Badges */}
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

                    {/* Action Buttons: Message, Edit, Delete */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => {
                          setTargetCustomerForMsg(cust);
                          if (productListItems.length > 0 && !msgProductTitle) {
                            const first = productListItems[0];
                            setMsgProductTitle(first.title);
                            setMsgProductPriceBdt(String(first.price_bdt));
                            setMsgProductUrl(first.product_url || '');
                            setSelectedProductAttachment(first.id);
                          }
                          setShowPersonalMsgModal(true);
                        }}
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
                        style={{ padding: '8px', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}
                      >
                        <Edit3 style={{ width: '14px', height: '14px' }} />
                      </button>

                      <button
                        onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                        title="Delete Customer"
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD / EDIT CUSTOMER */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #27272a', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus style={{ width: '20px', height: '20px', color: '#dc2626' }} />
                {editingCustomer ? 'Edit Customer Details' : 'Register New Retail Customer'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>
                  Customer / Shop Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rafiqul Islam (Dhaka Gadget Hub)"
                  style={inputStyle}
                />
              </div>

              {/* Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>
                    Phone / WhatsApp <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +8801711223344"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Email (Optional)</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. rafiq@gadgethub.bd"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Group & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>
                    Customer Group <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value)}
                    style={{ ...inputStyle, backgroundColor: '#09090b', fontWeight: 700 }}
                  >
                    {groups.map((grp) => (
                      <option key={grp.id} value={grp.name}>{grp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Product Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ ...inputStyle, backgroundColor: '#09090b' }}
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Smart Watches">Smart Watches</option>
                    <option value="Audio & Earbuds">Audio & Earbuds</option>
                    <option value="Fashion & Apparel">Fashion & Apparel</option>
                    <option value="Home Goods">Home Goods</option>
                    <option value="General Retail">General Retail</option>
                  </select>
                </div>
              </div>

              {/* City & Address */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>City / Region</label>
                  <select
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    style={{ ...inputStyle, backgroundColor: '#09090b' }}
                  >
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chittagong">Chittagong</option>
                    <option value="Sylhet">Sylhet</option>
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Khulna">Khulna</option>
                    <option value="Barisal">Barisal</option>
                    <option value="Rangpur">Rangpur</option>
                    <option value="Mymensingh">Mymensingh</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Shop Address / Location</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="e.g. Shop 42, Multiplan Center, Dhaka"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Sourcing Notes & Preferences */}
              <div>
                <label style={labelStyle}>Sourcing Preferences & Notes</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Prefers Ultra 8/9 AMOLED watches. Buys 30-50 units per order. Prefers Air freight shipping."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #27272a' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ ...buttonActionStyle, backgroundColor: '#27272a' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  style={{
                    ...buttonActionStyle,
                    backgroundColor: '#dc2626',
                    borderColor: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 700
                  }}
                >
                  {savingCustomer ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: MANAGE & CREATE GROUPS */}
      {/* ------------------------------------------------------------- */}
      {showGroupModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #27272a', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus style={{ width: '20px', height: '20px', color: '#38bdf8' }} />
                Manage Customer Segments & Groups
              </h3>
              <button onClick={() => setShowGroupModal(false)} style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Existing Groups List */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                Existing Groups ({groups.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {groups.map((g) => {
                  const count = customers.filter((c) => c.group.toLowerCase() === g.name.toLowerCase()).length;
                  return (
                    <div
                      key={g.id}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#09090b',
                        border: '1px solid #27272a',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: g.color }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>{g.name}</div>
                          {g.description && <div style={{ fontSize: '0.75rem', color: '#71717a' }}>{g.description}</div>}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.1)' }}>
                        {count} customers
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create New Group Sub-form */}
            <form onSubmit={handleCreateGroup} style={{ borderTop: '1px solid #27272a', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus style={{ width: '14px', height: '14px' }} />
                Create New Customer Group
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Group Name *</label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Chittagong Tech Resellers"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Badge Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="color"
                      value={newGroupColor}
                      onChange={(e) => setNewGroupColor(e.target.value)}
                      style={{ width: '42px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 600 }}>{newGroupColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Category Focus</label>
                <input
                  type="text"
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  placeholder="e.g. Smart Watches, Audio"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Description (Optional)</label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="e.g. Retail store owners purchasing weekly batches"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={savingGroup}
                  style={{ ...buttonActionStyle, backgroundColor: '#38bdf8', borderColor: '#38bdf8', color: '#09090b', fontWeight: 800 }}
                >
                  {savingGroup ? 'Creating...' : '+ Add Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: PERSONAL 1-ON-1 DIRECT MESSAGE MODAL */}
      {/* ------------------------------------------------------------- */}
      {showPersonalMsgModal && targetCustomerForMsg && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #27272a', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>
                  Direct 1-on-1 Personal Message
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare style={{ width: '20px', height: '20px', color: '#10b981' }} />
                  Message to {targetCustomerForMsg.name}
                </h3>
              </div>
              <button onClick={() => setShowPersonalMsgModal(false)} style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Recipient Meta Bar */}
            <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#09090b', border: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700 }}>
                  📱 {targetCustomerForMsg.phone}
                </span>
                <span style={{ color: '#52525b' }}>|</span>
                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Group: <strong style={{ color: '#f8fafc' }}>{targetCustomerForMsg.group}</strong>
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                📍 {targetCustomerForMsg.city || 'Dhaka'}
              </span>
            </div>

            {/* Product Attachment Picker */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>
                <ShoppingBag style={{ width: '14px', height: '14px', color: '#f87171' }} />
                Attach Product From Sourcing List
              </label>
              <select
                value={selectedProductAttachment}
                onChange={(e) => handleSelectProductAttachment(e.target.value)}
                style={{ ...inputStyle, backgroundColor: '#09090b', fontWeight: 600 }}
              >
                <option value="custom">✏️ Enter Product Manually Below</option>
                {productListItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    📦 {item.title} (৳{item.price_bdt.toLocaleString()} BDT)
                  </option>
                ))}
              </select>
            </div>

            {/* Manual Product Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Product Title</label>
                <input
                  type="text"
                  value={msgProductTitle}
                  onChange={(e) => setMsgProductTitle(e.target.value)}
                  placeholder="e.g. Smart Watch Ultra 9 AMOLED"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Price in BDT (৳)</label>
                <input
                  type="number"
                  value={msgProductPriceBdt}
                  onChange={(e) => setMsgProductPriceBdt(e.target.value)}
                  placeholder="e.g. 2450"
                  style={{ ...inputStyle, fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Template Selector */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>
                <Sparkles style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
                Message Template Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMsgTemplateType('new_arrival')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: msgTemplateType === 'new_arrival' ? '#dc2626' : '#09090b',
                    color: '#ffffff',
                    border: '1px solid',
                    borderColor: msgTemplateType === 'new_arrival' ? '#dc2626' : '#27272a',
                    cursor: 'pointer'
                  }}
                >
                  🚀 New Arrival Alert
                </button>

                <button
                  type="button"
                  onClick={() => setMsgTemplateType('discount_offer')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: msgTemplateType === 'discount_offer' ? '#dc2626' : '#09090b',
                    color: '#ffffff',
                    border: '1px solid',
                    borderColor: msgTemplateType === 'discount_offer' ? '#dc2626' : '#27272a',
                    cursor: 'pointer'
                  }}
                >
                  🔥 VIP Discount Offer
                </button>

                <button
                  type="button"
                  onClick={() => setMsgTemplateType('restock_preorder')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: msgTemplateType === 'restock_preorder' ? '#dc2626' : '#09090b',
                    color: '#ffffff',
                    border: '1px solid',
                    borderColor: msgTemplateType === 'restock_preorder' ? '#dc2626' : '#27272a',
                    cursor: 'pointer'
                  }}
                >
                  📦 Cargo Pre-Order
                </button>

                <button
                  type="button"
                  onClick={() => setMsgTemplateType('custom')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: msgTemplateType === 'custom' ? '#dc2626' : '#09090b',
                    color: '#ffffff',
                    border: '1px solid',
                    borderColor: msgTemplateType === 'custom' ? '#dc2626' : '#27272a',
                    cursor: 'pointer'
                  }}
                >
                  ✍️ Custom Message
                </button>
              </div>
            </div>

            {/* Custom Message Body (if custom selected) */}
            {msgTemplateType === 'custom' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Custom Message Text</label>
                <textarea
                  rows={4}
                  value={customMsgBody}
                  onChange={(e) => setCustomMsgBody(e.target.value)}
                  placeholder="Type message with tokens: {name}, {group}, {product}, {price}, {city}, {url}"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            )}

            {/* Live WhatsApp Speech Bubble Preview */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>
                <Smartphone style={{ width: '14px', height: '14px', color: '#10b981' }} />
                Live WhatsApp Message Preview
              </label>
              <div
                style={{
                  backgroundColor: '#0c1f17',
                  border: '1px solid #054c33',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#e5e7eb',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  position: 'relative',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)'
                }}
              >
                {generateMessageText(targetCustomerForMsg)}
                <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#6ee7b7', marginTop: '6px' }}>
                  Formatted for WhatsApp Web & Mobile ✓✓
                </div>
              </div>
            </div>

            {/* Action Buttons: WhatsApp Direct, SMS, Copy */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '1rem', borderTop: '1px solid #27272a' }}>
              <button
                type="button"
                onClick={() => handleCopyMessage(targetCustomerForMsg)}
                style={buttonActionStyle}
              >
                <Copy style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
                <span>Copy Text</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSendSms(targetCustomerForMsg)}
                  style={{ ...buttonActionStyle, backgroundColor: '#27272a' }}
                >
                  <MessageSquare style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
                  <span>Send SMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWhatsapp(targetCustomerForMsg)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  <Send style={{ width: '16px', height: '16px' }} />
                  <span>Open in WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: GROUP BROADCAST MESSAGE MODAL */}
      {/* ------------------------------------------------------------- */}
      {showBroadcastModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', maxWidth: '720px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #27272a', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                  Mass Customer Outreach
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send style={{ width: '20px', height: '20px', color: '#38bdf8' }} />
                  Broadcast New Product to Group
                </h3>
              </div>
              <button onClick={() => setShowBroadcastModal(false)} style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Target Group Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>
                  Select Target Group <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={broadcastTargetGroup}
                  onChange={(e) => setBroadcastTargetGroup(e.target.value)}
                  style={{ ...inputStyle, backgroundColor: '#09090b', fontWeight: 800, color: '#38bdf8' }}
                >
                  <option value="All">All Groups ({customers.length} total customers)</option>
                  {groups.map((grp) => {
                    const count = customers.filter((c) => c.group.toLowerCase() === grp.name.toLowerCase()).length;
                    return (
                      <option key={grp.id} value={grp.name}>
                        {grp.name} ({count} customers)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Attach Product */}
              <div>
                <label style={labelStyle}>Attach Sourced Product</label>
                <select
                  value={selectedProductAttachment}
                  onChange={(e) => handleSelectProductAttachment(e.target.value)}
                  style={{ ...inputStyle, backgroundColor: '#09090b', fontWeight: 600 }}
                >
                  <option value="custom">✏️ Enter Product Manually Below</option>
                  {productListItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      📦 {item.title} (৳{item.price_bdt.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Specifications */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Product Title / Announcement</label>
                <input
                  type="text"
                  value={msgProductTitle}
                  onChange={(e) => setMsgProductTitle(e.target.value)}
                  placeholder="e.g. Smart Watch Ultra 8 Series with AMOLED"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Target Price (BDT ৳)</label>
                <input
                  type="number"
                  value={msgProductPriceBdt}
                  onChange={(e) => setMsgProductPriceBdt(e.target.value)}
                  placeholder="e.g. 2450"
                  style={{ ...inputStyle, fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Template Selector */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Message Template</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMsgTemplateType('new_arrival')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: msgTemplateType === 'new_arrival' ? '#38bdf8' : '#09090b',
                    color: msgTemplateType === 'new_arrival' ? '#09090b' : '#ffffff',
                    border: '1px solid #27272a',
                    cursor: 'pointer'
                  }}
                >
                  🚀 New Arrival Alert
                </button>
                <button
                  type="button"
                  onClick={() => setMsgTemplateType('discount_offer')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: msgTemplateType === 'discount_offer' ? '#38bdf8' : '#09090b',
                    color: msgTemplateType === 'discount_offer' ? '#09090b' : '#ffffff',
                    border: '1px solid #27272a',
                    cursor: 'pointer'
                  }}
                >
                  🔥 VIP Discount Offer
                </button>
                <button
                  type="button"
                  onClick={() => setMsgTemplateType('restock_preorder')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: msgTemplateType === 'restock_preorder' ? '#38bdf8' : '#09090b',
                    color: msgTemplateType === 'restock_preorder' ? '#09090b' : '#ffffff',
                    border: '1px solid #27272a',
                    cursor: 'pointer'
                  }}
                >
                  📦 Cargo Pre-Order
                </button>
              </div>
            </div>

            {/* Interactive Recipient Queue */}
            {(() => {
              const targetList = customers.filter(
                (c) => broadcastTargetGroup === 'All' || c.group.toLowerCase() === broadcastTargetGroup.toLowerCase()
              );

              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>
                      Recipients Queue ({targetList.length} Retailers)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyGroupPhones(broadcastTargetGroup)}
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Copy style={{ width: '12px', height: '12px' }} />
                      <span>Copy All Phone Numbers</span>
                    </button>
                  </div>

                  <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #27272a', borderRadius: '10px', padding: '8px', backgroundColor: '#09090b' }}>
                    {targetList.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>
                        No members in this group yet. Add customers to &ldquo;{broadcastTargetGroup}&rdquo; first.
                      </div>
                    ) : (
                      targetList.map((member, idx) => {
                        const isSent = sentCustomerIds[member.id];
                        return (
                          <div
                            key={member.id}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              backgroundColor: '#18181b',
                              border: '1px solid #27272a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a1a1aa', width: '20px' }}>
                                #{idx + 1}
                              </span>
                              <div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                                  {member.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#34d399' }}>
                                  {member.phone} • {member.city || 'Dhaka'}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(member)}
                                title="Copy personalized message for this customer"
                                style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '6px', color: '#a1a1aa', cursor: 'pointer' }}
                              >
                                <Copy style={{ width: '12px', height: '12px' }} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSendWhatsapp(member)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  backgroundColor: isSent ? '#047857' : '#10b981',
                                  color: '#ffffff',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                {isSent ? <CheckCircle2 style={{ width: '12px', height: '12px' }} /> : <Send style={{ width: '12px', height: '12px' }} />}
                                <span>{isSent ? 'Sent' : 'Send WhatsApp'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #27272a' }}>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                style={{ ...buttonActionStyle, backgroundColor: '#27272a' }}
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
