'use client';

import React from 'react';
import { Tag, Calendar, Coins, Scale, Info } from 'lucide-react';

interface ListMetadataFormProps {
  listName: string;
  setListName: (val: string) => void;
  listDate: string;
  setListDate: (val: string) => void;
  rmbRate: string;
  setRmbRate: (val: string) => void;
  freightRate: string;
  setFreightRate: (val: string) => void;
  freightUnit: 'per_gm' | 'per_kg';
  setFreightUnit: (unit: 'per_gm' | 'per_kg') => void;
  includeWeightInTotal: boolean;
  setIncludeWeightInTotal: (val: boolean) => void;
  listNotes: string;
  setListNotes: (notes: string) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: 'var(--text-secondary, #e2e8f0)',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  backgroundColor: 'var(--bg-card, #18181b)',
  border: '1px solid var(--border-color, #27272a)',
  color: 'var(--text-primary, #ffffff)',
  fontSize: '0.85rem',
  boxSizing: 'border-box',
};

export default function ListMetadataForm({
  listName,
  setListName,
  listDate,
  setListDate,
  rmbRate,
  setRmbRate,
  freightRate,
  setFreightRate,
  freightUnit,
  setFreightUnit,
  includeWeightInTotal,
  setIncludeWeightInTotal,
  listNotes,
  setListNotes,
}: ListMetadataFormProps) {
  return (
    <div
      style={{
        marginTop: '1.25rem',
        backgroundColor: 'var(--bg-surface, #09090b)',
        border: '1px solid var(--border-color, #27272a)',
        borderRadius: '12px',
        padding: '1.25rem',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* List Name */}
        <div>
          <label style={labelStyle}>
            <Tag style={{ width: '14px', height: '14px', color: '#f87171' }} />
            Product List Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="e.g. Smart Watch & Accessories Sourcing List Q4"
            style={{ ...inputStyle, border: '1px solid #dc2626', fontWeight: 600 }}
          />
        </div>

        {/* List Date */}
        <div>
          <label style={labelStyle}>
            <Calendar style={{ width: '14px', height: '14px', color: '#f87171' }} />
            List Date <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="date"
            value={listDate}
            onChange={(e) => setListDate(e.target.value)}
            style={{ ...inputStyle, fontWeight: 600 }}
          />
        </div>

        {/* Currency Exchange Rate */}
        <div>
          <label style={labelStyle}>
            <Coins style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
            RMB / BDT Rate (৳)
          </label>
          <input
            type="number"
            step="0.1"
            value={rmbRate}
            onChange={(e) => setRmbRate(e.target.value)}
            style={{ ...inputStyle, fontWeight: 700 }}
          />
        </div>

        {/* Cargo Freight Rate (Weight Price) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <Scale style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
              Cargo Freight Rate <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700 }}>
              {freightUnit === 'per_gm'
                ? `≈ ৳${((Number(freightRate) || 0) * 1000).toLocaleString()}/kg`
                : `≈ ৳${((Number(freightRate) || 0) / 1000).toFixed(2)}/gm`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={freightRate}
              onChange={(e) => setFreightRate(e.target.value)}
              style={{ ...inputStyle, flex: 1, fontWeight: 700, color: '#fbbf24' }}
            />
            <select
              value={freightUnit}
              onChange={(e) => setFreightUnit(e.target.value as 'per_gm' | 'per_kg')}
              style={{ ...inputStyle, width: '105px', backgroundColor: 'var(--bg-card, #18181b)', fontWeight: 700 }}
            >
              <option value="per_gm">Tk / gm</option>
              <option value="per_kg">Tk / kg</option>
            </select>
          </div>
        </div>

        {/* Toggle: Include Weight in Total & Due */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary, #e2e8f0)' }}>
            <input
              type="checkbox"
              checked={includeWeightInTotal}
              onChange={(e) => setIncludeWeightInTotal(e.target.checked)}
              style={{ accentColor: '#dc2626', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 600 }}>Include Weight Price in Customer Total & Due</span>
          </label>
        </div>

        {/* List Notes */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ ...labelStyle, color: 'var(--text-muted, #a1a1aa)' }}>
            <Info style={{ width: '14px', height: '14px', color: '#a1a1aa' }} />
            List Notes / Sourcing Context (Optional)
          </label>
          <input
            type="text"
            value={listNotes}
            onChange={(e) => setListNotes(e.target.value)}
            placeholder="e.g. Urgent sourcing order for Dhaka warehouse distribution. Air freight method required."
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}
