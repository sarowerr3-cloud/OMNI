import React, { useState, useEffect } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Customer, CustomerGroup } from '@/components/CustomerManager';
import { CustomerPayload } from '@/services/customerApi';
import { inputStyle, labelStyle, buttonActionStyle } from './customerStyles';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCustomer: Customer | null;
  groups: CustomerGroup[];
  onSave: (payload: CustomerPayload) => Promise<void>;
  isSaving: boolean;
}

export default function CustomerFormModal({
  isOpen,
  onClose,
  editingCustomer,
  groups,
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
      setName('');
      setPhone('');
      setEmail('');
      setGroup(groups.length > 0 ? groups[0].name : 'Wholesale Buyers');
      setCategory('Electronics');
      setCity('Dhaka');
      setAddress('');
      setNotes('');
    }
  }, [editingCustomer, groups, isOpen]);

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #27272a', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus style={{ width: '20px', height: '20px', color: '#dc2626' }} />
            {editingCustomer ? 'Edit Customer Details' : 'Register New Retail Customer'}
          </h3>
          <button onClick={onClose} style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}>
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>
              Customer / Shop Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rafiqul Islam (Dhaka Gadget Hub)"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>
                Phone / WhatsApp <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +8801711223344"
                style={inputStyle}
              />
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>
                Customer Group <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>City / Region</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
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
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Shop 42, Multiplan Center, Dhaka"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Sourcing Preferences & Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prefers Ultra 8/9 AMOLED watches. Buys 30-50 units per order. Prefers Air freight shipping."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #27272a' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...buttonActionStyle, backgroundColor: '#27272a' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                ...buttonActionStyle,
                backgroundColor: '#dc2626',
                borderColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 700
              }}
            >
              {isSaving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Register Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
