'use client';

import React from 'react';
import { SearchHistoryItem } from '@/lib/types';

export interface OmniFeaturesSidebarProps {
  searchMode: 'text' | 'image' | 'manual' | 'list' | 'crm';
  setSearchMode: (mode: 'text' | 'image' | 'manual' | 'list' | 'crm') => void;
  productListCount: number;
  applyPreset: (type: 'sample' | 'medium' | 'bulk_sea') => void;
  applyTargetMarginPreset: (margin: number) => void;
  searchHistory: SearchHistoryItem[];
  onSelectHistory: (query: string, mode: 'text' | 'image') => void;
  onRemoveHistory: (query: string) => void;
  onClearHistory: () => void;
  onSelectTrending: (term: string) => void;
  health: any;
  aiStatus: any;
  whatsappGroupUrl: string;
}

const TRENDING_RADAR = [
  { label: 'Winter Puffer Jacket', icon: '🧥' },
  { label: 'Oversized Heavyweight Hoodie', icon: '👕' },
  { label: 'RGB Mechanical Keyboard', icon: '⌨️' },
  { label: 'ANC Wireless Earbuds', icon: '🎧' },
  { label: 'Smart Watch Ultra', icon: '⌚' },
];

export const OmniFeaturesSidebar: React.FC<OmniFeaturesSidebarProps> = ({
  searchMode,
  setSearchMode,
  productListCount,
  applyPreset,
  applyTargetMarginPreset,
  searchHistory,
  onSelectHistory,
  onRemoveHistory,
  onClearHistory,
  onSelectTrending,
  health,
  aiStatus,
  whatsappGroupUrl,
}) => {
  return (
    <aside className="omni-sidebar-sticky" aria-label="System Features Navigation">
      {/* 1. Core System Features Navigation */}
      <div className="omni-sidebar-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.95rem' }}>⚡</span>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px', margin: 0 }}>
              FEATURES & TOOLS
            </h3>
          </div>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              background: 'rgba(220, 38, 38, 0.15)',
              color: '#f87171',
              padding: '1px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
            }}
          >
            Studio
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {/* Feature: Product Search */}
          <button
            type="button"
            onClick={() => setSearchMode('text')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '10px',
              background: (searchMode === 'text' || searchMode === 'image') ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'rgba(255, 255, 255, 0.03)',
              color: (searchMode === 'text' || searchMode === 'image') ? '#ffffff' : '#e4e4e7',
              fontWeight: (searchMode === 'text' || searchMode === 'image') ? 700 : 500,
              fontSize: '0.85rem',
              border: (searchMode === 'text' || searchMode === 'image') ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: (searchMode === 'text' || searchMode === 'image') ? '0 4px 14px rgba(220, 38, 38, 0.35)' : 'none',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔍</span>
              <span>AI Product Search</span>
            </div>
            <span
              style={{
                fontSize: '0.65rem',
                background: (searchMode === 'text' || searchMode === 'image') ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)',
                padding: '2px 6px',
                borderRadius: '6px',
              }}
            >
              1688 · Taobao
            </span>
          </button>

          {/* Feature: Standalone Calculator */}
          <button
            type="button"
            onClick={() => setSearchMode('manual')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '10px',
              background: searchMode === 'manual' ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'rgba(255, 255, 255, 0.03)',
              color: searchMode === 'manual' ? '#ffffff' : '#e4e4e7',
              fontWeight: searchMode === 'manual' ? 700 : 500,
              fontSize: '0.85rem',
              border: searchMode === 'manual' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: searchMode === 'manual' ? '0 4px 14px rgba(220, 38, 38, 0.35)' : 'none',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧮</span>
              <span>Price Calculator</span>
            </div>
            <span
              style={{
                fontSize: '0.65rem',
                background: searchMode === 'manual' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)',
                padding: '2px 6px',
                borderRadius: '6px',
              }}
            >
              BDT Math
            </span>
          </button>

          {/* Feature: Product List Builder */}
          <button
            type="button"
            onClick={() => setSearchMode('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '10px',
              background: searchMode === 'list' ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'rgba(255, 255, 255, 0.03)',
              color: searchMode === 'list' ? '#ffffff' : '#e4e4e7',
              fontWeight: searchMode === 'list' ? 700 : 500,
              fontSize: '0.85rem',
              border: searchMode === 'list' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: searchMode === 'list' ? '0 4px 14px rgba(220, 38, 38, 0.35)' : 'none',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span>
              <span>Sourcing List Builder</span>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                background: searchMode === 'list' ? '#ffffff' : '#dc2626',
                color: searchMode === 'list' ? '#dc2626' : '#ffffff',
                padding: '1px 7px',
                borderRadius: '9999px',
              }}
            >
              {productListCount}
            </span>
          </button>

          {/* Feature: Retail CRM & Pitch */}
          <button
            type="button"
            onClick={() => setSearchMode('crm')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '10px',
              background: searchMode === 'crm' ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'rgba(255, 255, 255, 0.03)',
              color: searchMode === 'crm' ? '#ffffff' : '#e4e4e7',
              fontWeight: searchMode === 'crm' ? 700 : 500,
              fontSize: '0.85rem',
              border: searchMode === 'crm' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: searchMode === 'crm' ? '0 4px 14px rgba(220, 38, 38, 0.35)' : 'none',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👥</span>
              <span>Retail CRM & Pitch</span>
            </div>
            <span
              style={{
                fontSize: '0.65rem',
                background: searchMode === 'crm' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)',
                padding: '2px 6px',
                borderRadius: '6px',
              }}
            >
              Clients
            </span>
          </button>
        </nav>
      </div>

      {/* 2. Sourcing Batch Presets (Quick One-Click Setup) */}
      <div className="omni-sidebar-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.65rem' }}>
          <span style={{ fontSize: '0.9rem' }}>📦</span>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fca5a5', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Batch Presets
          </h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => applyPreset('sample')}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#f4f4f5',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span>🧪 Sample Test</span>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>5 Pcs · Air</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('medium')}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#f4f4f5',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span>📦 Wholesale Pack</span>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>50 Pcs · Air</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('bulk_sea')}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#f4f4f5',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span>🚢 Sea Container</span>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>500 Pcs · Sea</span>
          </button>
        </div>

        {/* Target Profit Margins */}
        <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600 }}>Target Margin Presets:</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {[30, 40, 50, 100].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => applyTargetMarginPreset(m)}
                style={{
                  padding: '4px 2px',
                  borderRadius: '6px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#86efac',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                title={`Set target selling price for ${m}% profit margin`}
              >
                {m === 100 ? '2x' : `${m}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Trending Sourcing Radar (Hot China Imports for BD) */}
      <div className="omni-sidebar-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.65rem' }}>
          <span style={{ fontSize: '0.9rem' }}>🔥</span>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Trending Radar (BD)
          </h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {TRENDING_RADAR.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectTrending(item.label)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 9px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: '#d4d4d8',
                fontSize: '0.76rem',
                fontWeight: 500,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span>{item.icon}</span>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#71717a' }}>→</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Search History (Recents) */}
      {searchHistory.length > 0 && (
        <div className="omni-sidebar-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem' }}>🕒</span>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a1a1aa', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Recent Searches
              </h4>
            </div>
            <button
              type="button"
              onClick={onClearHistory}
              style={{
                background: 'none',
                border: 'none',
                color: '#71717a',
                fontSize: '0.65rem',
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '180px', overflowY: 'auto' }}>
            {searchHistory.slice(0, 6).map((item) => (
              <div
                key={item.query}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  fontSize: '0.74rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectHistory(item.query, item.mode)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e4e4e7',
                    textAlign: 'left',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {item.mode === 'image' ? '📷 ' : '🔍 '}
                  {item.query}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveHistory(item.query)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    padding: '0 4px',
                  }}
                  title="Remove from history"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. WhatsApp VIP Sourcing Group Card */}
      <div
        className="omni-sidebar-card"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 83, 45, 0.3) 0%, rgba(9, 9, 11, 0.8) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '1.1rem' }}>💬</span>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4ade80', margin: 0 }}>
            WhatsApp VIP Group
          </h4>
        </div>
        <p style={{ color: '#86efac', fontSize: '0.72rem', margin: '0 0 0.65rem 0', lineHeight: 1.4 }}>
          Connect with Bangladesh wholesale importers, freight updates & live deal sharing.
        </p>
        <a
          href={whatsappGroupUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: '#ffffff',
            padding: '7px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 2px 10px rgba(22, 163, 74, 0.35)',
          }}
        >
          Join VIP Community →
        </a>
      </div>

      {/* 6. System Health & AI Co-Pilot */}
      <div style={{ padding: '0 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: '#71717a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: health?.status === 'ok' ? '#22c55e' : '#ef4444',
            }}
          />
          <span>{health?.status === 'ok' ? 'FastAPI Online' : 'API Offline'}</span>
        </div>
        <span>Gemini + Claude AI</span>
      </div>
    </aside>
  );
};
