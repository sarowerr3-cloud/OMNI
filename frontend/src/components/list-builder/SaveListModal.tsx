'use client';

import React from 'react';
import { Save, X, Plus } from 'lucide-react';

interface SaveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  listName: string;
  setListName: (name: string) => void;
  brandName: string;
  setBrandName: (brand: string) => void;
  listDate: string;
  setListDate: (date: string) => void;
  listNotes: string;
  setListNotes: (notes: string) => void;
  savingToServer: boolean;
  onSave: (startNew: boolean) => void;
}

export default function SaveListModal({
  isOpen,
  onClose,
  listName,
  setListName,
  brandName,
  setBrandName,
  listDate,
  setListDate,
  listNotes,
  setListNotes,
  savingToServer,
  onSave,
}: SaveListModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #18181b)',
          border: '1px solid var(--border-color, #27272a)',
          borderRadius: '16px',
          maxWidth: '560px',
          width: '100%',
          padding: '1.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-color, #27272a)',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <Save style={{ width: '22px', height: '22px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0 }}>
                Save Sourcing List & Order
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)', margin: '2px 0 0 0' }}>
                Choose whether to keep working on this list or start a fresh new order
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: 'var(--bg-surface, #27272a)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-muted, #a1a1aa)',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary, #e2e8f0)',
                marginBottom: '6px',
              }}
            >
              List / Order Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g. Guangzhou Autumn Apparel Order #042"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface, #09090b)',
                border: '1px solid var(--border-color, #27272a)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary, #e2e8f0)',
                  marginBottom: '6px',
                }}
              >
                Brand / Client Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. OMNI SOURCING"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface, #09090b)',
                  border: '1px solid var(--border-color, #27272a)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary, #e2e8f0)',
                  marginBottom: '6px',
                }}
              >
                Order Date
              </label>
              <input
                type="date"
                value={listDate}
                onChange={(e) => setListDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface, #09090b)',
                  border: '1px solid var(--border-color, #27272a)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary, #e2e8f0)',
                marginBottom: '6px',
              }}
            >
              Notes / Special Instructions (Optional)
            </label>
            <input
              type="text"
              value={listNotes}
              onChange={(e) => setListNotes(e.target.value)}
              placeholder="e.g. Sea cargo, urgent shipment, check battery certifications..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface, #09090b)',
                border: '1px solid var(--border-color, #27272a)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Dual Save Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Save & Keep Working */}
            <button
              type="button"
              disabled={savingToServer}
              onClick={() => onSave(false)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#107c41',
                color: '#ffffff',
                border: '1px solid #16a34a',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: savingToServer ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                boxShadow: '0 4px 12px rgba(16, 124, 65, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save style={{ width: '16px', height: '16px' }} />
                <span>{savingToServer ? 'Saving...' : 'Save & Keep Working'}</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#bbf7d0', fontWeight: 500 }}>
                Does NOT clear items from screen
              </span>
            </button>

            {/* Save & Start New List */}
            <button
              type="button"
              disabled={savingToServer}
              onClick={() => onSave(true)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: '1px solid #3b82f6',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: savingToServer ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus style={{ width: '16px', height: '16px' }} />
                <span>{savingToServer ? 'Saving...' : 'Save & Start New List'}</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#bfdbfe', fontWeight: 500 }}>
                Saves & refreshes to blank builder
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              color: 'var(--text-muted, #a1a1aa)',
              border: 'none',
              fontSize: '0.8rem',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
