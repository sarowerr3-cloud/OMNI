'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package,
  Layers, 
  Calculator, 
  ListOrdered, 
  Search, 
  Sun, 
  Moon, 
  MessageCircle, 
  Coins, 
  Scale, 
  ExternalLink,
  Sparkles,
  Settings,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import CategoryProductManager from '@/components/CategoryProductManager';
import ProductPriceCalculator from '@/components/ProductPriceCalculator';
import ProductListBuilder, { ProductItem } from '@/components/ProductListBuilder';
import AiSourcingHub from '@/components/AiSourcingHub';
import { CategorizedProduct } from '@/types/catalog';
import { WHATSAPP_GROUP_URL, openWhatsAppGroup } from '@/config/whatsapp';

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'categories' | 'calculator' | 'list' | 'search'>('categories');
  
  // Shared List Builder Items
  const [listItems, setListItems] = useState<ProductItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Product passed to Calculator
  const [selectedForCalculator, setSelectedForCalculator] = useState<CategorizedProduct | null>(null);

  // Global Sourcing Rates (saved in localStorage)
  const [rmbRate, setRmbRate] = useState<number>(20.0);
  const [freightRate, setFreightRate] = useState<number>(1.2);
  const [freightUnit, setFreightUnit] = useState<'per_gm' | 'per_kg'>('per_gm');
  const [showRateSettings, setShowRateSettings] = useState<boolean>(false);
  const [backendHealth, setBackendHealth] = useState<'online' | 'offline' | 'checking'>('checking');
  const [aiSearchQuery, setAiSearchQuery] = useState<string>('');

  const handleSearchInAiHub = (query: string) => {
    setAiSearchQuery(query);
    setActiveTab('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load stored list items & rates on mount
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem('omni_builder_items');
      if (storedItems) setListItems(JSON.parse(storedItems));

      const storedRmb = localStorage.getItem('omni_user_rmb_rate');
      if (storedRmb && Number(storedRmb) > 0) setRmbRate(Number(storedRmb));

      const storedFreight = localStorage.getItem('omni_user_freight_rate');
      if (storedFreight && Number(storedFreight) > 0) setFreightRate(Number(storedFreight));

      const storedUnit = localStorage.getItem('omni_user_freight_unit');
      if (storedUnit === 'per_gm' || storedUnit === 'per_kg') setFreightUnit(storedUnit);
    } catch {
      // ignore
    }

    // Check backend health
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) })
      .then((res) => {
        if (res.ok) setBackendHealth('online');
        else setBackendHealth('offline');
      })
      .catch(() => setBackendHealth('offline'));
  }, []);

  // Save list items to localStorage
  const handleUpdateListItems = (updated: ProductItem[]) => {
    setListItems(updated);
    try {
      localStorage.setItem('omni_builder_items', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save list items:', e);
    }
  };

  // Add a product to list
  const handleAddToList = (product: any) => {
    const priceBdt = product.price_bdt || Math.round((product.source_price || product.price || 0) * rmbRate);
    const weightKg = product.weight_kg || (product.weight_val ? (product.weight_unit === 'gm' ? product.weight_val / 1000 : product.weight_val) : 0.3);
    const qty = product.quantity || product.moq || 1;
    const unitFreightBdt = Math.round(freightUnit === 'per_gm' ? weightKg * 1000 * freightRate : weightKg * freightRate);
    const combinedUnitBdt = product.combined_unit_price_bdt || product.computed_landed_cost || (priceBdt + unitFreightBdt);
    const combinedLineBdt = product.combined_line_total_bdt || (combinedUnitBdt * qty);

    const newItem: ProductItem = {
      id: product.id || 'item-' + Date.now(),
      title: product.title || 'Untitled Product',
      details: product.details || product.category || '',
      price: product.source_price || product.price || 0,
      currency: product.currency || 'RMB',
      price_bdt: priceBdt,
      weight_kg: weightKg,
      quantity: qty,
      image_url: product.image_url || '',
      images: product.images || (product.image_url ? [product.image_url] : []),
      product_url: product.product_url || '',
      platform: product.platform || '1688',
      notes: product.notes || '',
      paid_amount: product.paid_amount || 0,
      due_amount: product.due_amount || combinedLineBdt,
      payment_status: product.payment_status || 'unpaid',
      weight_price_bdt: unitFreightBdt,
      line_weight_price_bdt: unitFreightBdt * qty,
      combined_unit_price_bdt: combinedUnitBdt,
      combined_line_total_bdt: combinedLineBdt,
    };
    handleUpdateListItems([newItem, ...listItems]);
    showToast(`➕ Added "${newItem.title.slice(0, 24)}..." to Product List Builder!`);
  };

  // Send to Calculator and switch tab
  const handleSendToCalculator = (product: CategorizedProduct) => {
    setSelectedForCalculator(product);
    setActiveTab('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save updated rate
  const handleSaveRates = (newRmb: number, newFreight: number, newUnit: 'per_gm' | 'per_kg') => {
    setRmbRate(newRmb);
    setFreightRate(newFreight);
    setFreightUnit(newUnit);
    try {
      localStorage.setItem('omni_user_rmb_rate', String(newRmb));
      localStorage.setItem('omni_user_freight_rate', String(newFreight));
      localStorage.setItem('omni_user_freight_unit', newUnit);
    } catch {}
    setShowRateSettings(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-family)',
      position: 'relative',
    }}>
      {/* Ambient Floating Watermark Background */}
      <div className="omni-watermark-layer" aria-hidden="true">
        <div className="omni-watermark-radial-glow" />
        <div className="omni-watermark-float">
          <img
            src="/logo.png"
            alt=""
            className="omni-watermark-img"
          />
        </div>
        <div className="omni-watermark-float-secondary">
          <img
            src="/logo.png"
            alt=""
            className="omni-watermark-img-secondary"
          />
        </div>
      </div>

      {/* MINIMALIST TOP APP HEADER */}
      <header style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Brand Logo & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: '#ffffff',
                padding: '4px 10px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.22)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: '42px',
                flexShrink: 0,
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('categories')}
              title="OMNI Sourcing Pro - Home"
            >
              <img
                src="/logo.png"
                alt="OMNI Logo"
                style={{
                  height: '32px',
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  OMNI <span style={{ color: 'var(--omni-red)' }}>SOURCING</span>
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(220, 38, 38, 0.15)',
                  color: 'var(--omni-red)',
                  border: '1px solid rgba(220, 38, 38, 0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  PRO
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                China Sourcing & Bangladesh Landed Cost Intelligence
              </div>
            </div>
          </div>

          {/* Centered Segmented Navigation Tab Bar */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-surface)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            gap: '2px',
          }}>
            <button
              onClick={() => setActiveTab('categories')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'categories' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'categories' ? 'var(--omni-red)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'categories' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Package size={15} />
              <span>Products</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'calculator' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'calculator' ? 'var(--omni-red)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'calculator' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Calculator size={15} />
              <span>Price Calculator</span>
            </button>

            <button
              onClick={() => setActiveTab('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'list' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'list' ? 'var(--omni-red)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'list' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <ListOrdered size={15} />
              <span>List Builder</span>
              {listItems.length > 0 && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'var(--omni-red)',
                  color: '#ffffff',
                  fontWeight: 700,
                  marginLeft: '2px',
                }}>
                  {listItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('search')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'search' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'search' ? 'var(--omni-red)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'search' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Search size={15} />
              <span>Live AI Search</span>
            </button>
          </nav>

          {/* Right Tools: Rate Badge, Theme Switcher, Community */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Rates Badge & Quick Edit Modal */}
            <button
              onClick={() => setShowRateSettings(!showRateSettings)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Click to adjust benchmark exchange & cargo rates"
            >
              <span>¥ ৳{rmbRate.toFixed(2)}</span>
              <span>•</span>
              <span>⚖️ ৳{freightRate}{freightUnit === 'per_gm' ? '/gm' : '/kg'}</span>
              <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
            </button>

            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? <Sun size={17} style={{ color: '#fbbf24' }} /> : <Moon size={17} style={{ color: '#6366f1' }} />}
            </button>

            {/* WhatsApp VIP Community Button */}
            <button
              onClick={openWhatsAppGroup}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Join VIP Sourcing WhatsApp Community"
            >
              <MessageCircle size={15} />
              <span>VIP Group</span>
            </button>
          </div>
        </div>

        {/* Quick Rate Settings Drawer Modal */}
        {showRateSettings && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '24px',
            marginTop: '8px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-highlight)',
            borderRadius: '12px',
            padding: '14px',
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
            width: '280px',
          }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>
              Benchmark Rates Configuration
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>RMB to BDT Rate (৳):</label>
                <input
                  type="number"
                  step="0.05"
                  value={rmbRate}
                  onChange={(e) => setRmbRate(parseFloat(e.target.value) || 20.0)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>Cargo Freight Rate:</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.1"
                    value={freightRate}
                    onChange={(e) => setFreightRate(parseFloat(e.target.value) || 1.2)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <select
                    value={freightUnit}
                    onChange={(e) => setFreightUnit(e.target.value as any)}
                    style={{ padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="per_gm">৳/gm</option>
                    <option value="per_kg">৳/kg</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => handleSaveRates(rmbRate, freightRate, freightUnit)}
                style={{
                  padding: '7px',
                  borderRadius: '6px',
                  background: 'var(--omni-red)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  border: 'none',
                  marginTop: '4px',
                }}
              >
                Apply Rates
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN VIEW CONTENT AREA (Totally separate, individual parts) */}
      <main style={{ flex: 1, padding: '2rem 0' }}>
        {activeTab === 'categories' && (
          <CategoryProductManager
            onSelectForCalculator={handleSendToCalculator}
            onAddToList={handleAddToList}
            onSearchInAiHub={handleSearchInAiHub}
            rmbRate={rmbRate}
            freightRate={freightRate}
            freightUnit={freightUnit}
          />
        )}

        {activeTab === 'calculator' && (
          <ProductPriceCalculator
            initialProduct={selectedForCalculator}
            onAddToList={handleAddToList}
            globalRmbRate={rmbRate}
            globalFreightRate={freightRate}
            globalFreightUnit={freightUnit}
          />
        )}

        {activeTab === 'list' && (
          <ProductListBuilder
            items={listItems}
            onUpdateItems={handleUpdateListItems}
            apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
            showToast={showToast}
            defaultRmbRate={String(rmbRate)}
            defaultFreightRate={String(freightRate)}
            defaultFreightUnit={freightUnit}
            onPitchToCustomers={(item) => {
              const platform: '1688' | 'Taobao' | 'Pinduoduo' | 'AliExpress' | 'Factory Direct' | 'Other' = 
                item.platform === 'Taobao' || item.platform === 'Pinduoduo' || item.platform === 'AliExpress' || item.platform === 'Factory Direct' || item.platform === 'Other' 
                  ? item.platform 
                  : '1688';
              const currency: 'RMB' | 'USD' = item.currency === 'USD' ? 'USD' : 'RMB';

              setSelectedForCalculator({
                id: item.id,
                title: item.title,
                category: item.details || 'general',
                platform,
                source_price: item.price || 0,
                currency,
                weight_val: (item.weight_kg || 0.3) * 1000,
                weight_unit: 'gm',
                weight_kg: item.weight_kg || 0.3,
                moq: item.quantity || 1,
                target_selling_price: item.combined_unit_price_bdt || 0,
                created_at: new Date().toISOString(),
              });
              setActiveTab('calculator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'search' && (
          <AiSourcingHub
            onAddToList={handleAddToList}
            onSelectForCalculator={handleSendToCalculator}
            rmbRate={rmbRate}
            freightRate={freightRate}
            freightUnit={freightUnit}
            initialQuery={aiSearchQuery}
            onResetInitialQuery={() => setAiSearchQuery('')}
          />
        )}
      </main>

      {/* MINIMALIST COMPACT FOOTER */}
      <footer style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-color)',
        padding: '1.25rem 1.5rem',
        marginTop: 'auto',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: '#ffffff',
              padding: '2px 8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}>
              <img src="/logo.png" alt="OMNI" style={{ height: '18px', width: 'auto' }} />
            </div>
            <span>© {new Date().getFullYear()} OMNI Sourcing Pro</span>
            <span>•</span>
            <span>China Sourcing & Landed Cost Intelligence</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: backendHealth === 'online' ? '#10b981' : (backendHealth === 'checking' ? '#f59e0b' : '#ef4444'),
              }} />
              <span>Backend API: {backendHealth === 'online' ? 'Connected (Port 8000)' : (backendHealth === 'checking' ? 'Connecting...' : 'Offline (Mock Mode Active)')}</span>
            </div>

            <button
              onClick={openWhatsAppGroup}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#10b981',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              Join WhatsApp Community ↗
            </button>
          </div>
        </div>
      </footer>

      {/* Global Floating Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
