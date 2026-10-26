'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, X, Phone, MapPin, FileText, User } from 'lucide-react';
import { Customer, CustomerGroup, CustomerPayload } from '@/types/customer';
import { inputStyle, labelStyle, buttonActionStyle } from './customerStyles';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCustomer: Customer | null;
  groups: CustomerGroup[];
  prefilledQuery?: string;
  onSave: (payload: CustomerPayload) => Promise<void>;
  isSaving: boolean;
}

export default function CustomerFormModal({
  isOpen,
  onClose,
  editingCustomer,
  groups,
  prefilledQuery = '',
  onSave,
  isSaving
}: CustomerFormModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('Wholesale Buyers');
  const [category, setCategory] = useState('Electronics');
  const [city, setCity] = useState('Dhaka');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingCustomer) {
      setName(editingCustomer.name || '');
      setPhone(editingCustomer.phone || '');
      setEmail(editingCustomer.email || '');
      setGroup(editingCustomer.group || 'Wholesale Buyers');
      setCategory(editingCustomer.category || 'Electronics');
      setCity(editingCustomer.city || 'Dhaka');
      setAddress(editingCustomer.address || '');
      setNotes(editingCustomer.notes || '');
    } else {
      // Check if prefilledQuery is a phone number or name
      const isDigits = prefilledQuery && /^[\d\+\-\s]+$/.test(prefilledQuery.trim());
      setName(isDigits ? '' : prefilledQuery.trim());
      setPhone(isDigits ? prefilledQuery.trim() : '');
      setEmail('');
      setGroup(groups.length > 0 ? groups[0].name : 'Wholesale Buyers');
      setCategory('Electronics');
      setCity('Dhaka');
      setAddress('');
      setNotes('');
    }
  }, [editingCustomer, groups, prefilledQuery, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      group: group.trim(),
      category: category.trim(),
      city: city.trim() || 'Dhaka',
      address: address.trim() || null,
      notes: notes.trim() || null,
      preferred_contact: 'whatsapp'
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--neu-rim)',
          borderRadius: '20px',
          boxShadow: 'var(--neu-flat)',
          maxWidth: '600px',
          width: '100%',
          padding: '1.75rem',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--neu-rim)',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              }}
            >
              <UserPlus size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {editingCustomer ? 'Edit Customer Profile' : 'Create Customer Profile'}
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Profile containing Name, Phone Number, Address, and Special Notes
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Customer Name */}
          <div>
            <label style={labelStyle}>
              Customer Full Name / Shop Name <span style={{ color: 'var(--omni-red)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rafiqul Islam (Dhaka Gadget Hub)"
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>
                Phone Number <span style={{ color: 'var(--omni-red)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01711223344"
                  style={{ ...inputStyle, paddingLeft: '36px' }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rafiq@gadgethub.bd"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label style={labelStyle}>
              Delivery Address / Retail Location <span style={{ color: 'var(--omni-red)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Shop 42, Level 3, Multiplan Center, Elephant Road, Dhaka"
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Group and City */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Customer Group</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                style={{ ...inputStyle, fontWeight: 700 }}
              >
                {groups.map((grp) => (
                  <option key={grp.id} value={grp.name}>{grp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>City / Division</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={inputStyle}
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
          </div>

          {/* Brief Notes */}
          <div>
            <label style={labelStyle}>
              Brief Notes (Special Customer Requirements / Reminders)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prefers AMOLED smartwatches, requires delivery confirmation via WhatsApp, special credit terms or delivery reminders..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.4' }}
            />
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--neu-rim)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{ ...buttonActionStyle, background: 'transparent' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                ...buttonActionStyle,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                padding: '10px 24px',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
              }}
            >
              {isSaving ? 'Saving...' : editingCustomer ? 'Update Profile' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
