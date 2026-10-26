'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Image as ImageIcon,
  Link as LinkIcon,
  Scale,
  Coins,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  ExternalLink,
  Sparkles,
  User,
  Phone,
  MapPin,
  Check
} from 'lucide-react';
import { Customer, CustomerOrder, CustomerOrderPayload } from '@/types/customer';
import { inputStyle, labelStyle, buttonActionStyle } from './customerStyles';

interface CustomerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  orderToEdit?: CustomerOrder | null;
  onSaveOrder: (orderPayload: CustomerOrderPayload, orderId?: string) => Promise<void>;
  showToast: (msg: string) => void;
}

const SAMPLE_PRESETS = [
  {
    name: 'HK9 Ultra 2 AMOLED Smart Watch',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&auto=format&fit=crop&q=80',
    link: 'https://detail.1688.com/offer/732948210344.html',
    weight: 0.35,
    unit: 'kg' as const,
    price: 2850
  },
  {
    name: 'ANC TWS Wireless Earbuds Pro 2',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
    link: 'https://detail.1688.com/offer/684920194821.html',
    weight: 0.18,
    unit: 'kg' as const,
    price: 1450
  },
  {
    name: '65W GaN Dual Type-C Fast Charger',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80',
    link: 'https://detail.1688.com/offer/718294104928.html',
    weight: 0.22,
    unit: 'kg' as const,
    price: 1150
  }
];

export default function CustomerOrderModal({
  isOpen,
  onClose,
  customer,
  orderToEdit,
  onSaveOrder,
  showToast
}: CustomerOrderModalProps) {
  // Form State
  const [productName, setProductName] = useState<string>('');
  const [productImage, setProductImage] = useState<string>('');
  const [productLink, setProductLink] = useState<string>('');
  const [weight, setWeight] = useState<string>('0.35');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'gm'>('kg');
  const [price, setPrice] = useState<string>('2500');
  const [quantity, setQuantity] = useState<number>(1);
  const [advancePayment, setAdvancePayment] = useState<string>('1000');
  const [dateTime, setDateTime] = useState<string>('');
  const [isDelivered, setIsDelivered] = useState<boolean>(false);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Initialize or reset form values
  useEffect(() => {
    if (orderToEdit) {
      setProductName(orderToEdit.product_name || '');
      setProductImage(orderToEdit.product_image || '');
      setProductLink(orderToEdit.product_link || '');
      setWeight(String(orderToEdit.weight ?? 0.35));
      setWeightUnit(orderToEdit.weight_unit || 'kg');
      setPrice(String(orderToEdit.price ?? 0));
      setQuantity(orderToEdit.quantity || 1);
      setAdvancePayment(String(orderToEdit.advance_payment ?? 0));
      setDateTime(orderToEdit.date_time || getCurrentDateTime());
      setIsDelivered(!!orderToEdit.is_delivered);
      setIsCancelled(!!orderToEdit.is_cancelled);
      setNotes(orderToEdit.notes || '');
    } else {
      setProductName('');
      setProductImage('');
      setProductLink('');
      setWeight('0.35');
      setWeightUnit('kg');
      setPrice('2500');
      setQuantity(1);
      setAdvancePayment('1000');
      setDateTime(getCurrentDateTime());
      setIsDelivered(false);
      setIsCancelled(false);
      setNotes('');
    }
  }, [orderToEdit, isOpen]);

  // Current formatted date/time helper: YYYY-MM-DD HH:mm
  function getCurrentDateTime(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  if (!isOpen) return null;

  // Real-time calculations
  const numPrice = parseFloat(price) || 0;
  const numQty = quantity > 0 ? quantity : 1;
  const totalAmount = Math.round(numPrice * numQty);
  const numAdvance = parseFloat(advancePayment) || 0;
  const remainingBalance = Math.max(0, totalAmount - numAdvance);

  // Live payment status badge
  let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
  if (numAdvance >= totalAmount && totalAmount > 0) {
    paymentStatus = 'paid';
  } else if (numAdvance > 0) {
    paymentStatus = 'partial';
  }

  // Handle preset quick selection
  const handleApplyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setProductName(preset.name);
    setProductImage(preset.image);
    setProductLink(preset.link);
    setWeight(String(preset.weight));
    setWeightUnit(preset.unit);
    setPrice(String(preset.price));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      showToast('⚠️ Please enter a product name');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CustomerOrderPayload = {
        product_name: productName.trim(),
        product_image: productImage.trim() || null,
        product_link: productLink.trim() || null,
        weight: parseFloat(weight) || 0,
        weight_unit: weightUnit,
        price: numPrice,
        quantity: numQty,
        total_amount: totalAmount,
        advance_payment: numAdvance,
        remaining_balance: remainingBalance,
        payment_status: paymentStatus,
        date_time: dateTime || getCurrentDateTime(),
        is_delivered: isDelivered,
        is_cancelled: isCancelled,
        status: isCancelled ? 'cancelled' : (isDelivered ? 'delivered' : 'active'),
        notes: notes.trim() || null,
      };

      await onSaveOrder(payload, orderToEdit?.id);
      showToast(orderToEdit ? '✅ Order updated successfully!' : '✅ New order saved to customer profile!');
      onClose();
    } catch (err) {
      console.error('Failed to save order:', err);
      showToast('❌ Error saving order. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '20px',
          boxShadow: 'var(--neu-flat)',
          border: '1px solid var(--neu-rim)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--neu-rim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {orderToEdit ? 'Edit Customer Order' : 'Input New Customer Order'}
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{customer.name}</span>
                <span>•</span>
                <span>{customer.phone}</span>
                {customer.address && (
                  <>
                    <span>•</span>
                    <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {customer.address}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE WITH INDEPENDENT SECTIONS) */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Quick Preset Selector */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⚡ Quick Auto-Fill Samples
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SAMPLE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--neu-rim)',
                    boxShadow: 'var(--neu-flat-sm)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={12} style={{ color: 'var(--omni-red)' }} />
                  <span>{p.name.slice(0, 22)}...</span>
                  <span style={{ color: 'var(--omni-red)', fontWeight: 700 }}>৳{p.price}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 1: PRODUCT DETAILS */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={16} style={{ color: 'var(--omni-red)' }} />
              <span>1. Product Information</span>
            </div>

            {/* Product Name */}
            <div>
              <label style={labelStyle}>Product Name *</label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. HK9 Ultra 2 AMOLED Smart Watch"
                style={inputStyle}
              />
            </div>

            {/* Product Image URL & Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'flex-start' }}>
              <div>
                <label style={labelStyle}>Product Image URL</label>
                <div style={{ position: 'relative' }}>
                  <ImageIcon size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="url"
                    value={productImage}
                    onChange={(e) => setProductImage(e.target.value)}
                    placeholder="https://... image link"
                    style={{ ...inputStyle, paddingLeft: '36px' }}
                  />
                </div>
              </div>

              {/* Thumbnail Preview */}
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  marginTop: '22px',
                  flexShrink: 0,
                }}
              >
                {productImage ? (
                  <img
                    src={productImage}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon size={22} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                )}
              </div>
            </div>

            {/* Product Link */}
            <div>
              <label style={labelStyle}>Product Purchase / Source Link</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <LinkIcon size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="url"
                    value={productLink}
                    onChange={(e) => setProductLink(e.target.value)}
                    placeholder="e.g. 1688 / Taobao / Daraz / Website Link"
                    style={{ ...inputStyle, paddingLeft: '36px' }}
                  />
                </div>
                {productLink && (
                  <a
                    href={productLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      ...buttonActionStyle,
                      textDecoration: 'none',
                      padding: '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Open link in new tab"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>

            {/* Weight and Weight Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Weight</label>
                <div style={{ position: 'relative' }}>
                  <Scale size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.35"
                    style={{ ...inputStyle, paddingLeft: '36px' }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Unit</label>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '4px', borderRadius: '12px', border: '1px solid var(--neu-inset-border)' }}>
                  <button
                    type="button"
                    onClick={() => setWeightUnit('kg')}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '8px',
                      border: 'none',
                      background: weightUnit === 'kg' ? 'var(--omni-red)' : 'transparent',
                      color: weightUnit === 'kg' ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    KG
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightUnit('gm')}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '8px',
                      border: 'none',
                      background: weightUnit === 'gm' ? 'var(--omni-red)' : 'transparent',
                      color: weightUnit === 'gm' ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    GM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRICING & PAYMENT STATUS */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={16} style={{ color: '#10b981' }} />
                <span>2. Pricing & Payment Breakdown</span>
              </div>

              {/* Live Payment Status Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background:
                    paymentStatus === 'paid'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : paymentStatus === 'partial'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  color:
                    paymentStatus === 'paid'
                      ? '#10b981'
                      : paymentStatus === 'partial'
                      ? '#f59e0b'
                      : '#ef4444',
                  border: `1px solid ${
                    paymentStatus === 'paid'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : paymentStatus === 'partial'
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(239, 68, 68, 0.3)'
                  }`,
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background:
                      paymentStatus === 'paid'
                        ? '#10b981'
                        : paymentStatus === 'partial'
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                />
                <span>Status: {paymentStatus}</span>
              </div>
            </div>

            {/* Price and Quantity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Unit Price (BDT) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>৳</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="2500"
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Advance Payment Made */}
            <div>
              <label style={labelStyle}>Advance Payment Made (BDT)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>৳</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(e.target.value)}
                  placeholder="e.g. 1000"
                  style={{ ...inputStyle, paddingLeft: '28px' }}
                />
              </div>
            </div>

            {/* Summary Cards Row (Total Amount, Advance, Remaining Balance) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                marginTop: '6px',
              }}
            >
              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Amount</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  ৳{totalAmount.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#10b981' }}>Advance Paid</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  ৳{numAdvance.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: remainingBalance > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                  border: remainingBalance > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: remainingBalance > 0 ? '#ef4444' : '#10b981' }}>
                  Remaining Balance
                </div>
                <div
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: remainingBalance > 0 ? '#ef4444' : '#10b981',
                    marginTop: '2px',
                  }}
                >
                  ৳{remainingBalance.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ORDER DATE, TIME & STATUS CHECKBOXES */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: '#3b82f6' }} />
              <span>3. Order Date & Delivery Status</span>
            </div>

            {/* Date and Time */}
            <div>
              <label style={labelStyle}>Order Date & Time</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  placeholder="YYYY-MM-DD HH:mm (e.g. 2026-10-25 15:30)"
                  style={{ ...inputStyle, paddingLeft: '36px' }}
                />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Default: current date & time. You may adjust if entering a past order.
              </div>
            </div>

            {/* Checkboxes: Delivered & Cancelled */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              {/* Delivered Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: isDelivered ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
                  border: isDelivered ? '1px solid #10b981' : '1px solid var(--neu-rim)',
                  boxShadow: isDelivered ? 'var(--neu-pressed)' : 'var(--neu-flat-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={isDelivered}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsDelivered(checked);
                    if (checked) setIsCancelled(false);
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDelivered ? '#10b981' : 'var(--text-primary)' }}>
                    Order Delivered
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Goods received by customer
                  </div>
                </div>
              </label>

              {/* Cancelled Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: isCancelled ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
                  border: isCancelled ? '1px solid #ef4444' : '1px solid var(--neu-rim)',
                  boxShadow: isCancelled ? 'var(--neu-pressed)' : 'var(--neu-flat-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={isCancelled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsCancelled(checked);
                    if (checked) setIsDelivered(false);
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#ef4444', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isCancelled ? '#ef4444' : 'var(--text-primary)' }}>
                    Order Cancelled
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Customer cancelled / refunded
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 4: BRIEF NOTES */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} style={{ color: '#8b5cf6' }} />
              <span>4. Brief Notes (Special Customer Requirements / Reminders)</span>
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Special customer requirements: black strap with orange accents, deliver via SA Paribahan courier, customer requested fragile sticker..."
              style={{
                ...inputStyle,
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: '1.4',
              }}
            />
          </div>

          {/* SUBMIT BUTTONS */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '8px',
              borderTop: '1px solid var(--neu-rim)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                ...buttonActionStyle,
                background: 'transparent',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...buttonActionStyle,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                padding: '10px 24px',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
              }}
            >
              {submitting ? (
                <span>Saving Order...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>{orderToEdit ? 'Save Changes' : 'Save Order to Customer Profile'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
