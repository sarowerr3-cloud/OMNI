'use client';

import React, { useState } from 'react';
import { 
  Package, 
  Calculator, 
  ListOrdered, 
  Users, 
  ListChecks, 
  FileSpreadsheet, 
  Coins, 
  Scale, 
  ChevronDown, 
  Sun, 
  Moon, 
  MessageCircle,
  Search,
  FolderOpen
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { openWhatsAppGroup } from '@/config/whatsapp';
import AuthModal from '@/components/auth/AuthModal';

export type MainTab = 'categories' | 'calculator' | 'list' | 'folders' | 'customers' | 'checklist' | 'orders';

interface AppHeaderProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  listCount: number;
  rmbRate: number;
  setRmbRate: (rate: number) => void;
  freightRate: number;
  setFreightRate: (rate: number) => void;
  freightUnit: 'per_gm' | 'per_kg';
  setFreightUnit: (unit: 'per_gm' | 'per_kg') => void;
  onSaveRates: (rmb: number, freight: number, unit: 'per_gm' | 'per_kg') => void;
  apiUrl: string;
  showToast: (msg: string) => void;
  onOpenSearch?: () => void;
}

export default function AppHeader({
  activeTab,
  setActiveTab,
  listCount,
  rmbRate,
  setRmbRate,
  freightRate,
  setFreightRate,
  freightUnit,
  setFreightUnit,
  onSaveRates,
  apiUrl,
  showToast,
  onOpenSearch,
}: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [showRateSettings, setShowRateSettings] = useState(false);

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* Row 1: Brand Logo & Name (Left) + Right Utility Tools (Right) */}
        <div className="header-top-row">
          {/* Brand Logo & Name */}
          <div className="header-brand" onClick={() => setActiveTab('categories')} title="OMNI Sourcing Pro">
            <div className="brand-logo-container" style={{ height: '42px', flexShrink: 0 }}>
              <img
                src="/logo.png"
                alt="OMNI"
                className="brand-logo"
                style={{ height: '32px', width: 'auto', maxHeight: '32px', objectFit: 'contain', display: 'block' }}
              />
            </div>
            <div className="brand-text">
              <div className="brand-title">
                <span>OMNI</span>
                <span className="brand-accent">SOURCING</span>
                <span className="pro-badge">PRO</span>
              </div>
              <div className="brand-subtitle">
                China Sourcing & Landed Cost Intelligence
              </div>
            </div>
          </div>

          {/* Right Tools: Search, Rates, Theme, Auth, VIP */}
          <div className="header-tools">
            {/* Universal Search (Ctrl+K) */}
            {onOpenSearch && (
              <button
                type="button"
                className="header-util-btn"
                onClick={onOpenSearch}
                title="Universal Search (Ctrl+K)"
              >
                <Search size={14} style={{ color: 'var(--omni-red)' }} />
                <span>Search</span>
                <kbd style={{
                  fontSize: '0.62rem',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontFamily: 'monospace',
                }}>
                  Ctrl K
                </kbd>
              </button>
            )}

            {/* Rates Toggle Button */}
            <button
              type="button"
              className={`header-util-btn ${showRateSettings ? 'pressed' : ''}`}
              onClick={() => setShowRateSettings(!showRateSettings)}
              title="Configure Benchmark Conversion and Freight Rates"
              aria-expanded={showRateSettings}
            >
              <Coins size={14} style={{ color: '#eab308' }} />
              <span>¥ ৳{rmbRate.toFixed(2)}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <Scale size={14} style={{ color: '#06b6d4' }} />
              <span>৳{freightRate}/{freightUnit === 'per_gm' ? 'g' : 'kg'}</span>
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>

            {/* Theme Switcher */}
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? (
                <Sun size={16} style={{ color: '#fbbf24' }} />
              ) : (
                <Moon size={16} style={{ color: '#6366f1' }} />
              )}
            </button>

            {/* User Sign In Modal */}
            <AuthModal apiUrl={apiUrl} showToast={showToast} />

            {/* WhatsApp VIP Community */}
            <button
              type="button"
              className="header-util-btn"
              onClick={openWhatsAppGroup}
              style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
              title="Join VIP Sourcing WhatsApp Group"
            >
              <MessageCircle size={15} />
              <span>VIP Group</span>
            </button>
          </div>
        </div>

        {/* Row 2: Features Navigation Tabs */}
        <div className="header-nav-row">
          <nav className="tab-nav" role="tablist" aria-label="Main Navigation">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'categories'}
              className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
              title="Browse categorized China products (Ctrl+1)"
            >
              <Package size={15} />
              <span>Products</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'calculator'}
              className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
              onClick={() => setActiveTab('calculator')}
              title="Landed Cost & Profit Margin Calculator (Ctrl+2)"
            >
              <Calculator size={15} />
              <span>Calculator</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'list'}
              className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
              title="Product List & Quotation Builder (Ctrl+3)"
            >
              <ListOrdered size={15} />
              <span>List Builder</span>
              {listCount > 0 && <span className="tab-badge">{listCount}</span>}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'folders'}
              className={`tab-btn ${activeTab === 'folders' ? 'active' : ''}`}
              onClick={() => setActiveTab('folders')}
              title="Profile Folders & Product Tracking (Ctrl+4)"
            >
              <FolderOpen size={15} />
              <span>Folders</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'customers'}
              className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveTab('customers')}
              title="Customer Profiles & CRM (Ctrl+5)"
            >
              <Users size={15} />
              <span>Customers</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'checklist'}
              className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
              onClick={() => setActiveTab('checklist')}
              title="Sourcing & Order To-Do Checklist (Ctrl+5)"
            >
              <ListChecks size={15} />
              <span>Checklist</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'orders'}
              className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
              title="Order Records & Excel System (Ctrl+6)"
            >
              <FileSpreadsheet size={15} />
              <span>Orders</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Rate Settings Dropdown */}
      {showRateSettings && (
        <div className="rate-dropdown" role="dialog" aria-label="Rate Configuration">
          <h4>Benchmark Rates Configuration</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label htmlFor="rate-rmb">RMB to BDT Rate (৳):</label>
              <input
                id="rate-rmb"
                type="number"
                step="0.05"
                value={rmbRate}
                onChange={(e) => setRmbRate(parseFloat(e.target.value) || 20.0)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label htmlFor="rate-freight">Cargo Freight Rate:</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  id="rate-freight"
                  type="number"
                  step="0.1"
                  value={freightRate}
                  onChange={(e) => setFreightRate(parseFloat(e.target.value) || 1.2)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
                <select
                  value={freightUnit}
                  onChange={(e) => setFreightUnit(e.target.value as 'per_gm' | 'per_kg')}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="per_gm">৳/gm</option>
                  <option value="per_kg">৳/kg</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              className="apply-btn"
              onClick={() => {
                onSaveRates(rmbRate, freightRate, freightUnit);
                setShowRateSettings(false);
              }}
            >
              Apply Rates
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
