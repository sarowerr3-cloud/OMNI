'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Clock,
  Package,
  Scale,
  Coins,
  CheckCircle2,
  XCircle,
  Plus,
  ExternalLink,
  Edit3,
  Trash2,
  MessageCircle,
  Check,
  AlertCircle,
  Filter,
  Layers,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { Customer, CustomerOrder, CustomerOrderPayload, CustomerPayload } from '@/types/customer';
import { buttonActionStyle, inputStyle } from './customerStyles';
import { formatWhatsappPhone, getWhatsappShareUrl } from '@/utils/customerMessaging';
import { exportSingleCustomerOrdersToExcel } from '@/lib/excelExport';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onUpdateProfile: (customerId: string, payload: Partial<CustomerPayload>) => Promise<void>;
  onAddNewOrder: (customer: Customer) => void;
  onEditOrder: (order: CustomerOrder) => void;
  onToggleOrderStatus: (order: CustomerOrder, isDelivered: boolean, isCancelled: boolean) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onEditCustomerProfile: (customer: Customer) => void;
  showToast: (msg: string) => void;
}

export default function CustomerProfileModal({
  isOpen,
  onClose,
  customer,
  onUpdateProfile,
  onAddNewOrder,
  onEditOrder,
  onToggleOrderStatus,
  onDeleteOrder,
  onEditCustomerProfile,
  showToast
}: CustomerProfileModalProps) {
  const [activeOrderFilter, setActiveOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [editingProfileNotes, setEditingProfileNotes] = useState<boolean>(false);
  const [profileNotesText, setProfileNotesText] = useState<string>(customer.notes || '');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filtered orders list
  const orders = customer.orders || [];
  const filteredOrders = orders.filter((o) => {
    if (activeOrderFilter === 'active') return !o.is_delivered && !o.is_cancelled;
    if (activeOrderFilter === 'delivered') return o.is_delivered;
    if (activeOrderFilter === 'cancelled') return o.is_cancelled;
    return true;
  });

  // Save updated profile notes
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onUpdateProfile(customer.id, { notes: profileNotesText.trim() || null });
      setEditingProfileNotes(false);
      showToast('✅ Special requirements / profile notes updated');
    } catch {
      showToast('❌ Failed to update profile notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const whatsappUrl = getWhatsappShareUrl(
    formatWhatsappPhone(customer.phone),
    `Assalamu Alaikum ${customer.name}, regarding your order update from OMNI Sourcing:`
  );

  const handleExportCustomerExcel = () => {
    try {
      exportSingleCustomerOrdersToExcel(customer, {
        shipmentNo: '03'
      });
      showToast(`📗 Excel Sheet (.xlsx) for "${customer.name}" downloaded!`);
    } catch (err: any) {
      console.error(err);
      showToast('❌ Export failed');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
          maxWidth: '880px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* HEADER: CUSTOMER PROFILE OVERVIEW */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--neu-rim)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Customer Avatar & Info */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
                flexShrink: 0,
              }}
            >
              {customer.name.charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {customer.name}
                </h2>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: 'var(--omni-red)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}
                >
                  {customer.group}
                </span>
              </div>

              {/* Phone, WhatsApp, Address */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                  <a
                    href={`tel:${customer.phone}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <Phone size={14} style={{ color: 'var(--omni-red)' }} />
                    <span>{customer.phone}</span>
                  </a>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#10b981',
                      fontWeight: 700,
                      textDecoration: 'none',
                      fontSize: '0.8rem',
                      background: 'rgba(16, 185, 129, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </a>
                </div>

                {customer.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>{customer.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Right Profile Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleExportCustomerExcel}
              style={{
                ...buttonActionStyle,
                padding: '6px 12px',
                fontSize: '0.78rem',
                background: 'rgba(16, 124, 65, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 124, 65, 0.35)',
                fontWeight: 600,
              }}
              title="Export this customer's orders into an Excel sheet formatted in the OMNI template"
            >
              <FileSpreadsheet size={14} />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => onEditCustomerProfile(customer)}
              style={{
                ...buttonActionStyle,
                padding: '6px 12px',
                fontSize: '0.78rem',
              }}
              title="Edit Customer Profile"
            >
              <Edit3 size={14} />
              <span>Edit Profile</span>
            </button>

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
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 1. AGGREGATE STATS CARDS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--neu-flat-sm)',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Orders</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {orders.length}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#3b82f6' }}>Active In-Flight</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6', marginTop: '2px' }}>
                {orders.filter((o) => !o.is_delivered && !o.is_cancelled).length}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#10b981' }}>Delivered</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                {orders.filter((o) => o.is_delivered).length}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Spent</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                ৳{orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString()}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: customer.total_due > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: customer.total_due > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: customer.total_due > 0 ? '#ef4444' : '#10b981' }}>
                Balance Due
              </div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: customer.total_due > 0 ? '#ef4444' : '#10b981',
                  marginTop: '2px',
                }}
              >
                ৳{customer.total_due.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 2. CUSTOMER SPECIAL REQUIREMENTS & PROFILE NOTES */}
          <div
            style={{
              padding: '16px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <FileText size={15} style={{ color: '#8b5cf6' }} />
                <span>Special Customer Requirements & Profile Notes</span>
              </div>

              {!editingProfileNotes && (
                <button
                  onClick={() => {
                    setProfileNotesText(customer.notes || '');
                    setEditingProfileNotes(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--omni-red)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Edit3 size={12} />
                  <span>{customer.notes ? 'Edit Notes' : 'Add Note'}</span>
                </button>
              )}
            </div>

            {editingProfileNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  rows={2}
                  value={profileNotesText}
                  onChange={(e) => setProfileNotesText(e.target.value)}
                  placeholder="Enter special requirements, preferred shipping routes, or client reminders..."
                  style={{
                    ...inputStyle,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    fontSize: '0.85rem',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingProfileNotes(false)}
                    style={{ ...buttonActionStyle, padding: '5px 12px', fontSize: '0.75rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    style={{
                      ...buttonActionStyle,
                      background: 'var(--omni-red)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 14px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: '0.85rem',
                  color: customer.notes ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontStyle: customer.notes ? 'normal' : 'italic',
                  lineHeight: '1.45',
                  background: 'var(--bg-surface)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--neu-inset-border)',
                }}
              >
                {customer.notes || 'No special requirements or reminders recorded for this profile yet.'}
              </div>
            )}
          </div>

          {/* 3. STORED CUSTOMER ORDERS SECTION */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} style={{ color: 'var(--omni-red)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Customer Orders ({orders.length})
                </h3>
              </div>

              {/* Order Filter Tabs & Add Order Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'flex',
                    background: 'var(--bg-surface)',
                    padding: '3px',
                    borderRadius: '10px',
                    border: '1px solid var(--neu-inset-border)',
                    gap: '2px',
                  }}
                >
                  {(['all', 'active', 'delivered', 'cancelled'] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setActiveOrderFilter(filterKey)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '7px',
                        border: 'none',
                        background: activeOrderFilter === filterKey ? 'var(--bg-card)' : 'transparent',
                        color: activeOrderFilter === filterKey ? 'var(--omni-red)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.74rem',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        boxShadow: activeOrderFilter === filterKey ? 'var(--neu-flat-sm)' : 'none',
                      }}
                    >
                      {filterKey}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleExportCustomerExcel}
                  style={{
                    ...buttonActionStyle,
                    background: '#107c41',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    padding: '8px 14px',
                    boxShadow: '0 4px 12px rgba(16, 124, 65, 0.35)',
                  }}
                  title="Download Customer Excel Sheet (.xlsx) in OMNI Template"
                >
                  <FileSpreadsheet size={15} />
                  <span>Export Customer Sheet (.xlsx)</span>
                </button>

                <button
                  onClick={() => onAddNewOrder(customer)}
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
                  <Plus size={15} />
                  <span>Add New Order</span>
                </button>
              </div>
            </div>

            {/* ORDER LIST CARDS */}
            {filteredOrders.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  borderRadius: '16px',
                  background: 'var(--bg-card)',
                  border: '1px dashed var(--border-color)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Package size={36} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {orders.length === 0
                    ? 'No orders placed by this customer yet.'
                    : `No orders match the "${activeOrderFilter}" filter.`}
                </div>
                <button
                  onClick={() => onAddNewOrder(customer)}
                  style={{
                    ...buttonActionStyle,
                    background: 'var(--omni-red)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                  }}
                >
                  <Plus size={15} />
                  <span>Input First Order for {customer.name}</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredOrders.map((order) => {
                  const isDelivered = !!order.is_delivered;
                  const isCancelled = !!order.is_cancelled;

                  return (
                    <div
                      key={order.id}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        background: 'var(--bg-card)',
                        border: isCancelled
                          ? '1px solid rgba(239, 68, 68, 0.3)'
                          : isDelivered
                          ? '1px solid rgba(16, 185, 129, 0.3)'
                          : '1px solid var(--border-color)',
                        boxShadow: 'var(--neu-flat-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      {/* Top Row: Thumbnail, Product Title, Link, Date/Time & Actions */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        {/* Thumbnail */}
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '12px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          {order.product_image ? (
                            <img
                              src={order.product_image}
                              alt={order.product_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package size={22} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                          )}
                        </div>

                        {/* Title and metadata */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                            <div>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                {order.product_name}
                              </h4>
                              {order.product_link && (
                                <a
                                  href={order.product_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.74rem',
                                    color: '#3b82f6',
                                    textDecoration: 'none',
                                    marginTop: '2px',
                                    fontWeight: 600,
                                  }}
                                >
                                  <span>View Sourced Product Link</span>
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>

                            {/* Date & Time Badge */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)',
                                background: 'var(--bg-surface)',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Calendar size={12} />
                              <span>{order.date_time}</span>
                            </div>
                          </div>

                          {/* Weight & Price Details */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Scale size={13} style={{ color: 'var(--text-muted)' }} />
                              <span>{order.weight} {order.weight_unit}</span>
                            </span>
                            <span>•</span>
                            <span>Qty: <strong>{order.quantity || 1}</strong></span>
                            <span>•</span>
                            <span>Unit: ৳{order.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Row: Payment Status & Amounts Breakdown */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                          gap: '8px',
                          background: 'var(--bg-surface)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Amount</div>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                            ৳{order.total_amount.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#10b981' }}>Advance Paid</div>
                          <div style={{ fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                            ৳{order.advance_payment.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.68rem', color: order.remaining_balance > 0 ? '#ef4444' : '#10b981' }}>
                            Remaining Balance
                          </div>
                          <div style={{ fontWeight: 800, color: order.remaining_balance > 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                            ৳{order.remaining_balance.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Payment Status</div>
                          <div
                            style={{
                              display: 'inline-block',
                              marginTop: '2px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              background:
                                order.payment_status === 'paid'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : order.payment_status === 'partial'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                              color:
                                order.payment_status === 'paid'
                                  ? '#10b981'
                                  : order.payment_status === 'partial'
                                  ? '#f59e0b'
                                  : '#ef4444',
                            }}
                          >
                            {order.payment_status}
                          </div>
                        </div>
                      </div>

                      {/* Brief Notes Box (if any) */}
                      {order.notes && (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            background: 'rgba(139, 92, 246, 0.08)',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '6px',
                          }}
                        >
                          <FileText size={14} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: '1px' }} />
                          <span><strong>Note:</strong> {order.notes}</span>
                        </div>
                      )}

                      {/* Bottom Row: Checkboxes (Delivered / Cancelled) & Order Edit/Delete Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--border-color)',
                        }}
                      >
                        {/* Status Checkboxes */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: isDelivered ? '#10b981' : 'var(--text-secondary)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isDelivered}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                onToggleOrderStatus(order, checked, false);
                              }}
                              style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <span>Order Delivered</span>
                          </label>

                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: isCancelled ? '#ef4444' : 'var(--text-secondary)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isCancelled}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                onToggleOrderStatus(order, false, checked);
                              }}
                              style={{ width: '16px', height: '16px', accentColor: '#ef4444', cursor: 'pointer' }}
                            />
                            <span>Order Cancelled</span>
                          </label>
                        </div>

                        {/* Order Actions: Edit & Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => onEditOrder(order)}
                            style={{
                              ...buttonActionStyle,
                              padding: '5px 10px',
                              fontSize: '0.75rem',
                            }}
                            title="Edit order details"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete order "${order.product_name}"?`)) {
                                onDeleteOrder(order.id);
                              }
                            }}
                            style={{
                              ...buttonActionStyle,
                              padding: '5px 8px',
                              color: '#ef4444',
                            }}
                            title="Delete order"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--neu-rim)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Customer Profile ID: <code>{customer.id}</code>
          </div>

          <button
            onClick={onClose}
            style={{
              ...buttonActionStyle,
              padding: '8px 20px',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
