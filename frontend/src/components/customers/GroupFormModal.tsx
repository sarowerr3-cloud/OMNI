import React, { useState } from 'react';
import { FolderPlus, Plus, X } from 'lucide-react';
import { Customer, CustomerGroup } from '@/components/CustomerManager';
import { GroupPayload } from '@/services/customerApi';
import { inputStyle, labelStyle, buttonActionStyle } from './customerStyles';

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: CustomerGroup[];
  customers: Customer[];
  onSaveGroup: (payload: GroupPayload) => Promise<void>;
  isSaving: boolean;
}

export default function GroupFormModal({
  isOpen,
  onClose,
  groups,
  customers,
  onSaveGroup,
  isSaving
}: GroupFormModalProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Electronics');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3b82f6');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await onSaveGroup({
      name: newGroupName.trim(),
      category: newGroupCategory.trim(),
      description: newGroupDesc.trim() || null,
      color: newGroupColor
    });
    setNewGroupName('');
    setNewGroupDesc('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #27272a', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus style={{ width: '20px', height: '20px', color: '#38bdf8' }} />
            Manage Customer Segments & Groups
          </h3>
          <button onClick={onClose} style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}>
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
        <form onSubmit={handleSubmit} style={{ borderTop: '1px solid #27272a', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              disabled={isSaving}
              style={{ ...buttonActionStyle, backgroundColor: '#38bdf8', borderColor: '#38bdf8', color: '#09090b', fontWeight: 800 }}
            >
              {isSaving ? 'Creating...' : '+ Add Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
