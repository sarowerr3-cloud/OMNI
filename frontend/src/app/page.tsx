'use client';

import { useState, useEffect, useRef } from 'react';

interface SourcedProductResult {
  product: {
    platform: string;
    title_original: string;
    title_en?: string;
    price: number;
    currency: string;
    price_bdt?: number;
    moq: number;
    url?: string;
    seller_name?: string;
    seller_rating?: number;
    weight_kg?: number;
  };
  cost_breakdown: {
    item_price_bdt: number;
    domestic_china_shipping_bdt: number;
    agent_fee_bdt: number;
    international_freight_bdt: number;
    duty_vat_bdt: number;
    payment_fee_bdt: number;
    total_landed_cost: number;
    per_unit_landed_cost: number;
  };
  market_analysis: {
    per_unit_landed_cost: number;
    local_bd_market_avg_price: number;
    local_bd_market_min_price: number;
    local_bd_market_max_price: number;
    estimated_net_profit: number;
    gross_margin_percent: number;
    roi_percent: number;
    break_even_quantity: number;
  };
}

interface LocalMarketBenchmark {
  platform: string;
  seller_or_store: string;
  price_bdt: number;
  listing_url?: string;
  source_type: string;
  notes?: string;
}

export default function Home() {
  const [health, setHealth] = useState<any>(null);
  const [searchMode, setSearchMode] = useState<'text' | 'image'>('text');
  const [query, setQuery] = useState('Smart Watch Ultra');
  const [quantity, setQuantity] = useState(10);
  const [shippingMethod, setShippingMethod] = useState<'air' | 'sea'>('air');
  const [weightKg, setWeightKg] = useState<string>('0.35');
  const [rateRmbBdt, setRateRmbBdt] = useState<string>('16.50');
  
  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    query: string;
    rate_rmb_bdt: number;
    image_analysis?: any;
    sourcing_results: SourcedProductResult[];
    bd_market_benchmarks: LocalMarketBenchmark[];
  } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error('API health fetch failed:', err));
  }, [apiUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (searchMode === 'text' && !query.trim()) return;
    if (searchMode === 'image' && !selectedFile) {
      alert('Please select or capture a product image to search.');
      return;
    }

    setLoading(true);
    try {
      if (searchMode === 'text') {
        const res = await fetch(`${apiUrl}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            quantity: Number(quantity),
            shipping_method: shippingMethod,
            user_weight_kg: weightKg ? Number(weightKg) : null,
            rate_rmb_bdt: rateRmbBdt ? Number(rateRmbBdt) : 16.50,
          }),
        });
        const data = await res.json();
        setSearchResults(data);
      } else {
        const formData = new FormData();
        formData.append('file', selectedFile!);
        formData.append('quantity', String(quantity));
        formData.append('shipping_method', shippingMethod);
        if (weightKg) formData.append('user_weight_kg', weightKg);
        if (rateRmbBdt) formData.append('rate_rmb_bdt', rateRmbBdt);

        const res = await fetch(`${apiUrl}/search/image`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '1.5rem 1rem' }}>
      {/* Header with OMNI Logo */}
      <header
        style={{
          maxWidth: '1100px',
          margin: '0 auto 2rem auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #27272a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              background: '#ffffff',
              padding: '6px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.3)',
            }}
          >
            <img src="/logo.png" alt="OMNI Logo" style={{ height: '42px', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
              OMNI <span style={{ color: '#dc2626' }}>SOURCING</span>
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
              Global Sourcing & Bangladesh Market Intelligence
            </p>
          </div>
        </div>

        {/* Backend & AI Status Pill */}
        <div
          style={{
            background: '#18181b',
            border: '1px solid #27272a',
            padding: '8px 14px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: health?.status === 'ok' ? '#22c55e' : '#ef4444',
            }}
          />
          <span>API: {health?.status === 'ok' ? 'Connected' : 'Offline'}</span>
          <span style={{ color: '#52525b' }}>|</span>
          <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Gemini AI Vision</span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Search Mode Selector & Panel */}
        <section
          style={{
            background: '#18181b',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid #27272a',
            marginBottom: '2rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Mode Switch Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setSearchMode('text')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: searchMode === 'text' ? '#dc2626' : '#27272a',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              🔍 Text Search
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('image')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: searchMode === 'image' ? '#dc2626' : '#27272a',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              📷 Image Search (Gemini Vision)
            </button>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {searchMode === 'text' ? (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search product (e.g., Smart Watch, Wireless Earbuds, Bag)..."
                  style={{
                    flex: 1,
                    minWidth: '260px',
                    background: '#09090b',
                    border: '1px solid #3f3f46',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #990000 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '12px 28px',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    boxShadow: '0 0 12px rgba(220, 38, 38, 0.4)',
                  }}
                >
                  {loading ? 'Searching OMNI...' : '🔍 Search Product'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #dc2626',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: '#09090b',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  {previewUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <img
                        src={previewUrl}
                        alt="Product Upload Preview"
                        style={{ maxHeight: '140px', borderRadius: '8px', objectFit: 'contain' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 600 }}>
                        ✓ {selectedFile?.name} Selected
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                        📷 Click or Drag Product Photo Here
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                        Supports camera photos, JPG, PNG, WEBP, HEIC
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedFile}
                  style={{
                    background: selectedFile
                      ? 'linear-gradient(135deg, #dc2626 0%, #990000 100%)'
                      : '#3f3f46',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '12px 28px',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    boxShadow: selectedFile ? '0 0 12px rgba(220, 38, 38, 0.4)' : 'none',
                  }}
                >
                  {loading ? 'Analyzing with Gemini Vision...' : '📷 Search by Image'}
                </button>
              </div>
            )}

            {/* Config Controls Grid: RMB Exchange Rate, Quantity, Shipping, Weight */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', paddingTop: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, marginBottom: '4px' }}>
                  💱 Exchange Rate: 1 RMB = (Tk / BDT)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.05"
                    value={rateRmbBdt}
                    onChange={(e) => setRateRmbBdt(e.target.value)}
                    placeholder="16.50"
                    style={{
                      width: '100%',
                      background: '#09090b',
                      border: '1px solid #dc2626',
                      borderRadius: '8px',
                      padding: '8px 45px 8px 12px',
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  />
                  <span style={{ position: 'absolute', right: '12px', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>
                    Tk / BDT
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '4px' }}>
                  Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    background: '#09090b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '4px' }}>
                  Shipping Method
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShippingMethod('air')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      background: shippingMethod === 'air' ? '#dc2626' : '#27272a',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    ✈️ Air
                  </button>
                  <button
                    type="button"
                    onClick={() => setShippingMethod('sea')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      background: shippingMethod === 'sea' ? '#dc2626' : '#27272a',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    🚢 Sea
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '4px' }}>
                  Weight per unit (kg)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#09090b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                />
              </div>
            </div>
          </form>
        </section>

        {/* Results Section */}
        {searchResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Gemini Vision Analysis Banner (if image search) */}
            {searchResults.image_analysis && (
              <div
                style={{
                  background: '#18181b',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  border: '1px solid #dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <div>
                  <h4 style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.95rem' }}>
                    Gemini Vision AI Image Identification
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                    {searchResults.image_analysis.description_en}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                    Identified Keywords: {searchResults.image_analysis.keywords_en?.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* 1. Sourcing Listings & Landed Cost Breakdown */}
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#dc2626' }}>🇨🇳</span> Sourcing Suppliers & Landed Cost (Rate: 1 RMB = {searchResults.rate_rmb_bdt} Tk / BDT)
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {searchResults.sourcing_results.map((res, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#18181b',
                      borderRadius: '14px',
                      border: idx === 0 ? '2px solid #dc2626' : '1px solid #27272a',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    {idx === 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-12px',
                          right: '16px',
                          background: '#dc2626',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '2px 10px',
                          borderRadius: '9999px',
                        }}
                      >
                        LOWEST LANDED COST
                      </span>
                    )}

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.9rem' }}>
                          {res.product.platform}
                        </span>
                        <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>
                          MOQ: {res.product.moq} pcs
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                        {res.product.title_en || res.product.title_original}
                      </h3>

                      <div style={{ background: '#09090b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Supplier Price:</span>
                          <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                            {res.product.currency === 'RMB' ? `¥${res.product.price} RMB` : `$${res.product.price} USD`}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Total Item Price:</span>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                            ৳{res.cost_breakdown.item_price_bdt.toLocaleString()} Tk / BDT
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Freight ({shippingMethod.toUpperCase()}):</span>
                          <span>৳{res.cost_breakdown.international_freight_bdt.toLocaleString()} Tk / BDT</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Duty & Tax (15%):</span>
                          <span>৳{res.cost_breakdown.duty_vat_bdt.toLocaleString()} Tk / BDT</span>
                        </div>

                        <hr style={{ borderColor: '#27272a', margin: '6px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem' }}>
                          <span style={{ color: '#ffffff' }}>Landed Cost / Unit:</span>
                          <span style={{ color: '#38bdf8' }}>
                            ৳{res.cost_breakdown.per_unit_landed_cost.toLocaleString()} Tk / BDT
                          </span>
                        </div>
                      </div>
                    </div>

                    {res.product.url && (
                      <a
                        href={res.product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block',
                          textAlign: 'center',
                          background: '#27272a',
                          color: '#ffffff',
                          padding: '10px',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          textDecoration: 'none',
                        }}
                      >
                        🔗 Buy Manually on {res.product.platform}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Bangladesh Local Market Intelligence */}
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#dc2626' }}>🇧🇩</span> Bangladesh Local Market Benchmark & Profit Intelligence
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {searchResults.bd_market_benchmarks.map((bm, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#18181b',
                      borderRadius: '12px',
                      padding: '1rem',
                      border: '1px solid #27272a',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}>
                        {bm.platform}
                      </span>
                      <span style={{ fontSize: '0.75rem', background: '#27272a', padding: '2px 8px', borderRadius: '4px' }}>
                        {bm.source_type}
                      </span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '8px' }}>{bm.seller_or_store}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Local Selling Price:</span>
                      <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.1rem' }}>
                        ৳{bm.price_bdt.toLocaleString()} Tk / BDT
                      </span>
                    </div>
                    {bm.notes && <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '6px' }}>{bm.notes}</p>}
                  </div>
                ))}
              </div>

              {/* OMNI Profit & Margin Overview Card */}
              {searchResults.sourcing_results.length > 0 && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #18181b 0%, #271418 100%)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid #dc2626',
                    boxShadow: '0 0 25px rgba(220, 38, 38, 0.2)',
                  }}
                >
                  <h3 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '1rem', fontWeight: 800 }}>
                    📈 OMNI Estimated Return & Profit Overview (Per Unit)
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                    <div style={{ background: '#09090b', padding: '1rem', borderRadius: '10px' }}>
                      <p style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Average Local Retail Price</p>
                      <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                        ৳{searchResults.sourcing_results[0].market_analysis.local_bd_market_avg_price.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Tk / BDT</span>
                      </p>
                    </div>

                    <div style={{ background: '#09090b', padding: '1rem', borderRadius: '10px' }}>
                      <p style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Est. Net Profit / Unit</p>
                      <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>
                        ৳{searchResults.sourcing_results[0].market_analysis.estimated_net_profit.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Tk / BDT</span>
                      </p>
                    </div>

                    <div style={{ background: '#09090b', padding: '1rem', borderRadius: '10px' }}>
                      <p style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Gross Margin %</p>
                      <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                        {searchResults.sourcing_results[0].market_analysis.gross_margin_percent}%
                      </p>
                    </div>

                    <div style={{ background: '#09090b', padding: '1rem', borderRadius: '10px' }}>
                      <p style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>ROI %</p>
                      <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                        {searchResults.sourcing_results[0].market_analysis.roi_percent}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
