'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Image as ImageIcon, 
  ExternalLink, 
  Calculator, 
  ListPlus, 
  X, 
  AlertCircle,
  TrendingUp,
  Scale,
  Coins,
  Filter,
  Layers,
  ChevronDown
} from 'lucide-react';
import { SourcedProductResult, LocalMarketBenchmark } from '@/lib/types';
import { formatMoney } from '@/lib/formatters';
import { PRODUCT_CATEGORIES, getCategoryDefinition } from '@/types/catalog';

interface AiSourcingHubProps {
  onAddToList: (item: any) => void;
  onSelectForCalculator: (item: any) => void;
  rmbRate?: number;
  freightRate?: number;
  freightUnit?: 'per_gm' | 'per_kg';
  initialQuery?: string;
  onResetInitialQuery?: () => void;
}

export default function AiSourcingHub({
  onAddToList,
  onSelectForCalculator,
  rmbRate = 20.0,
  freightRate = 1.2,
  freightUnit = 'per_gm',
  initialQuery = '',
  onResetInitialQuery,
}: AiSourcingHubProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<{
    query: string;
    rate_rmb_bdt: number;
    sourcing_results: SourcedProductResult[];
    bd_market_benchmarks: LocalMarketBenchmark[];
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      handleSearch(undefined, initialQuery);
      if (onResetInitialQuery) onResetInitialQuery();
    }
  }, [initialQuery]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = customQuery !== undefined ? customQuery : query;
    if (!q.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${apiUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q.trim(),
          quantity: 10,
          shipping_method: 'air',
          rate_rmb_bdt: rmbRate,
          freight_rate_per_kg: freightUnit === 'per_gm' ? freightRate * 1000 : freightRate,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setSearchResults(data);
      showToast(`🎯 Found ${data.sourcing_results?.length || 0} sourcing options for "${q}"`);
    } catch (err: any) {
      setErrorMsg('Unable to connect to live search backend. Please ensure the backend is running at http://localhost:8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-container">
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--text-primary)',
          color: 'var(--bg-primary)',
          padding: '10px 18px',
          borderRadius: '10px',
          fontWeight: 600,
          fontSize: '0.9rem',
          boxShadow: 'var(--shadow-md)',
          zIndex: 1000,
        }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span> AI Multi-Platform Sourcing Search
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Live factory search across 1688, Pinduoduo & AliExpress with Bangladesh market price benchmarking.
          </p>
        </div>
      </div>

      {/* Search Input Box with Category Selector */}
      <form onSubmit={(e) => handleSearch(e)} style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-card)',
          padding: '6px 8px',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
        }}>
          {/* Sourcing Category Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px 4px 6px',
            borderRight: '1px solid var(--border-color)',
            flexShrink: 0,
          }}>
            <Filter size={16} style={{ color: 'var(--omni-red)' }} />
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val);
                if (val !== 'all') {
                  const def = getCategoryDefinition(val);
                  setQuery(def.name);
                  handleSearch(undefined, def.name);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '190px',
              }}
              title="Search by Category"
            >
              <option value="all">All Categories</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '8px', color: 'var(--text-muted)' }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search any product or category (e.g. Smart Watch, Shoes, Toys, Automotive, Bags)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              padding: '8px 4px',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 22px',
              borderRadius: '10px',
              background: 'var(--omni-red)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              border: 'none',
              opacity: loading || !query.trim() ? 0.6 : 1,
            }}
          >
            <Sparkles size={16} />
            {loading ? 'Searching...' : 'AI Search'}
          </button>
        </div>

        {/* Quick Sourcing Category Chips (All 25 Categories from photos) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>Categories:</span>
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setQuery(cat.name);
                handleSearch(undefined, cat.name);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '14px',
                background: selectedCategory === cat.id ? 'var(--omni-red)' : 'var(--bg-card)',
                border: selectedCategory === cat.id ? '1px solid var(--omni-red)' : '1px solid var(--border-color)',
                color: selectedCategory === cat.id ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              title={cat.description}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Popular Trending Keywords */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Popular:</span>
          {['Smart Watch Ultra', 'TWS Earbuds ANC', 'Vintage Leather Backpack', 'Mini Projector 4K', 'Silicone Kitchen Utensils'].map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQuery(term);
                handleSearch(undefined, term);
              }}
              style={{
                padding: '3px 9px',
                borderRadius: '10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {term}
            </button>
          ))}
        </div>
      </form>

      {/* Error Banner */}
      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          color: '#f87171',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results */}
      {searchResults && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Sourcing Results for "{searchResults.query}"
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {searchResults.sourcing_results?.length || 0} suppliers found
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}>
            {searchResults.sourcing_results?.map((res, idx) => {
              const p = res.product;
              const cost = res.cost_breakdown;
              const market = res.market_analysis;
              const title = p.title_en || p.title_original;

              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        color: 'var(--omni-red)',
                        border: '1px solid rgba(220, 38, 38, 0.2)',
                      }}>
                        {p.platform}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        MOQ: {p.moq} pcs
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      {p.images && p.images[0] && (
                        <img
                          src={p.images[0]}
                          alt={title}
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                          }}
                        />
                      )}
                      <div>
                        <h4 style={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {title}
                        </h4>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Price: {p.currency === 'RMB' ? '¥' : '$'}{p.price} • {p.weight_kg ? `${(p.weight_kg * 1000).toFixed(0)} gm` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Cost & Market */}
                    <div style={{
                      background: 'var(--bg-surface)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      marginBottom: '10px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Landed Cost:</span>
                        <strong style={{ color: 'var(--omni-red)' }}>৳{formatMoney(Math.round(cost.per_unit_landed_cost))} BDT</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>BD Market Avg:</span>
                        <strong>৳{formatMoney(Math.round(market.local_bd_market_avg_price))} BDT</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Est. Margin:</span>
                        <strong style={{ color: '#10b981' }}>+{market.gross_margin_percent}%</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => onSelectForCalculator({
                        title,
                        category: 'electronics',
                        currency: p.currency,
                        source_price: p.price,
                        weight_val: (p.weight_kg || 0.3) * 1000,
                        weight_unit: 'gm',
                        target_selling_price: market.local_bd_market_avg_price,
                        moq: p.moq,
                      })}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '7px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Calculator size={13} />
                      Calculate
                    </button>

                    <button
                      onClick={() => {
                        onAddToList({
                          id: 'ai-' + Date.now() + '-' + idx,
                          title,
                          category: 'electronics',
                          price: p.price,
                          currency: p.currency,
                          price_bdt: cost.item_price_bdt,
                          combined_unit_price_bdt: Math.round(cost.per_unit_landed_cost),
                          combined_line_total_bdt: Math.round(cost.per_unit_landed_cost * (p.moq || 10)),
                          quantity: p.moq || 10,
                          weight_kg: p.weight_kg || 0.3,
                          platform: p.platform,
                          target_selling_price: market.local_bd_market_avg_price,
                        });
                        showToast(`➕ Added "${title.slice(0, 18)}..." to List Builder`);
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '7px',
                        borderRadius: '6px',
                        background: 'var(--omni-red)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <ListPlus size={13} />
                      Add to List
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
