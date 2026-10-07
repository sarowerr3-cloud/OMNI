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
    images?: string[];
    videos?: string[];
    specs?: Record<string, string>;
    seller_name?: string;
    seller_rating?: number;
    weight_kg?: number;
    dimensions?: string;
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
  const [globalQuantity, setGlobalQuantity] = useState<number>(10);
  const [globalShippingMethod, setGlobalShippingMethod] = useState<'air' | 'sea'>('air');
  const [globalWeightKg, setGlobalWeightKg] = useState<string>('0.35');
  const [globalRateRmbBdt, setGlobalRateRmbBdt] = useState<string>('16.50');
  
  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<{
    query: string;
    rate_rmb_bdt: number;
    image_analysis?: any;
    sourcing_results: SourcedProductResult[];
    bd_market_benchmarks: LocalMarketBenchmark[];
  } | null>(null);

  // Per-card user overrides state map: idx -> { rmbRate, qty, weight, shipping }
  const [cardOverrides, setCardOverrides] = useState<Record<number, { rmbRate: string; qty: number; weight: string; shipping: 'air' | 'sea'; selectedImgIdx: number; showVideo: boolean; showSpecs: boolean }>>({});

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => {
        console.error('API health fetch failed:', err);
        setHealth({ status: 'offline' });
      });
  }, [apiUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const formatMoney = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return Number(val).toLocaleString();
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (searchMode === 'text' && !query.trim()) return;
    if (searchMode === 'image' && !selectedFile) {
      alert('Please select or capture a product image to search.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (searchMode === 'text') {
        const res = await fetch(`${apiUrl}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            quantity: Number(globalQuantity) || 10,
            shipping_method: globalShippingMethod,
            user_weight_kg: globalWeightKg ? Number(globalWeightKg) : null,
            rate_rmb_bdt: globalRateRmbBdt ? Number(globalRateRmbBdt) : 16.50,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `Server returned status ${res.status}`);
        }
        const data = await res.json();
        setSearchResults(data);
        initOverrides(data.sourcing_results);
      } else {
        const formData = new FormData();
        formData.append('file', selectedFile!);
        formData.append('quantity', String(globalQuantity || 10));
        formData.append('shipping_method', globalShippingMethod);
        if (globalWeightKg) formData.append('user_weight_kg', globalWeightKg);
        if (globalRateRmbBdt) formData.append('rate_rmb_bdt', globalRateRmbBdt);

        const res = await fetch(`${apiUrl}/search/image`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `Server returned status ${res.status}`);
        }
        const data = await res.json();
        setSearchResults(data);
        initOverrides(data.sourcing_results);
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      setErrorMessage(err.message || 'Failed to connect to backend search service.');
    } finally {
      setLoading(false);
    }
  };

  const initOverrides = (results: SourcedProductResult[]) => {
    const initial: Record<number, any> = {};
    results.forEach((_, idx) => {
      initial[idx] = {
        rmbRate: globalRateRmbBdt,
        qty: globalQuantity,
        weight: globalWeightKg,
        shipping: globalShippingMethod,
        selectedImgIdx: 0,
        showVideo: false,
        showSpecs: false,
      };
    });
    setCardOverrides(initial);
  };

  const updateOverride = (idx: number, field: string, value: any) => {
    setCardOverrides((prev) => ({
      ...prev,
      [idx]: {
        ...(prev[idx] || {
          rmbRate: globalRateRmbBdt,
          qty: globalQuantity,
          weight: globalWeightKg,
          shipping: globalShippingMethod,
          selectedImgIdx: 0,
          showVideo: false,
          showSpecs: false,
        }),
        [field]: value,
      },
    }));
  };

  // Compute live card landed cost & profit math for card index `idx`
  const computeCardMath = (res: SourcedProductResult, idx: number) => {
    const override = cardOverrides[idx] || {
      rmbRate: globalRateRmbBdt,
      qty: globalQuantity,
      weight: globalWeightKg,
      shipping: globalShippingMethod,
    };

    const rmbRate = Number(override.rmbRate) || 16.50;
    const usdRate = 120.0;
    const qty = Number(override.qty) || 1;
    const weight = Number(override.weight) || 0.30;
    const shipping = override.shipping || 'air';

    // Item price in BDT
    const unitPriceBdt = res.product.currency === 'RMB' ? res.product.price * rmbRate : res.product.price * usdRate;
    const totalItemPriceBdt = unitPriceBdt * qty;
    const domesticShippingBdt = 20.0 * qty;
    const agentFeeBdt = totalItemPriceBdt * 0.05;
    const ratePerKg = shipping === 'air' ? 1000.0 : 300.0;
    const internationalFreightBdt = weight * qty * ratePerKg;
    const dutyVatBdt = totalItemPriceBdt * 0.15;
    const paymentFeeBdt = totalItemPriceBdt * 0.015;

    const totalLandedCost = totalItemPriceBdt + domesticShippingBdt + agentFeeBdt + internationalFreightBdt + dutyVatBdt + paymentFeeBdt;
    const perUnitLandedCost = totalLandedCost / qty;

    const avgLocalBdPrice = res.market_analysis?.local_bd_market_avg_price || 1500;
    const netProfit = avgLocalBdPrice - perUnitLandedCost;
    const grossMargin = (netProfit / avgLocalBdPrice) * 100;
    const roi = (netProfit / perUnitLandedCost) * 100;

    return {
      unitPriceBdt,
      totalItemPriceBdt,
      domesticShippingBdt,
      agentFeeBdt,
      internationalFreightBdt,
      dutyVatBdt,
      totalLandedCost,
      perUnitLandedCost,
      netProfit,
      grossMargin: Number(grossMargin.toFixed(2)),
      roi: Number(roi.toFixed(2)),
      override,
    };
  };

  const sourcingResults = searchResults?.sourcing_results || [];
  const bdBenchmarks = searchResults?.bd_market_benchmarks || [];

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
        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            style={{
              background: '#450a0a',
              border: '1px solid #dc2626',
              color: '#fca5a5',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
            }}
          >
            ⚠️ <strong>Error:</strong> {errorMessage}
          </div>
        )}

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

            {/* Global Config Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', paddingTop: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, marginBottom: '4px' }}>
                  💱 Global RMB Rate (Tk / BDT)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={globalRateRmbBdt}
                  onChange={(e) => setGlobalRateRmbBdt(e.target.value)}
                  placeholder="16.50"
                  style={{
                    width: '100%',
                    background: '#09090b',
                    border: '1px solid #dc2626',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '4px' }}>
                  Global Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  value={globalQuantity}
                  onChange={(e) => setGlobalQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
                  Global Shipping Method
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setGlobalShippingMethod('air')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      background: globalShippingMethod === 'air' ? '#dc2626' : '#27272a',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    ✈️ Air
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlobalShippingMethod('sea')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      background: globalShippingMethod === 'sea' ? '#dc2626' : '#27272a',
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
                  Global Weight per unit (kg)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={globalWeightKg}
                  onChange={(e) => setGlobalWeightKg(e.target.value)}
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
            {searchResults?.image_analysis && (
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
                    {searchResults.image_analysis?.description_en}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                    Identified Keywords: {searchResults.image_analysis?.keywords_en?.join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* 1. Sourcing Suppliers with Photos, Video & Interactive Live Override Controls */}
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#dc2626' }}>🇨🇳</span> Sourcing Suppliers & Interactive Cost Calculator
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {sourcingResults.map((res, idx) => {
                  const math = computeCardMath(res, idx);
                  const images = res.product?.images || [];
                  const videos = res.product?.videos || [];
                  const specs = res.product?.specs || {};
                  const currentImgIdx = math.override.selectedImgIdx || 0;

                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#18181b',
                        borderRadius: '16px',
                        border: idx === 0 ? '2px solid #dc2626' : '1px solid #27272a',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
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
                            zIndex: 2,
                          }}
                        >
                          LOWEST LANDED COST
                        </span>
                      )}

                      <div>
                        {/* Header Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.1rem' }}>
                            {res.product?.platform}
                          </span>
                          <span style={{ color: '#a1a1aa', fontSize: '0.8rem', background: '#09090b', padding: '3px 8px', borderRadius: '6px' }}>
                            ⭐ {res.product?.seller_rating || 4.8} | MOQ: {res.product?.moq || 1} pcs
                          </span>
                        </div>

                        {/* Title */}
                        <h3 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '0.75rem', lineHeight: 1.4, fontWeight: 700 }}>
                          {res.product?.title_en || res.product?.title_original}
                        </h3>

                        {/* Photos Gallery & Video Section */}
                        <div style={{ marginBottom: '1rem' }}>
                          {images.length > 0 && (
                            <div style={{ borderRadius: '10px', overflow: 'hidden', background: '#09090b', border: '1px solid #27272a', marginBottom: '0.5rem' }}>
                              <img
                                src={images[currentImgIdx]}
                                alt="Product Photo"
                                style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                              />
                            </div>
                          )}

                          {/* Image Thumbnails */}
                          {images.length > 1 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', overflowX: 'auto' }}>
                              {images.map((img, iIdx) => (
                                <img
                                  key={iIdx}
                                  src={img}
                                  alt={`Thumb ${iIdx}`}
                                  onClick={() => updateOverride(idx, 'selectedImgIdx', iIdx)}
                                  style={{
                                    width: '45px',
                                    height: '45px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    border: currentImgIdx === iIdx ? '2px solid #dc2626' : '1px solid #27272a',
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Video Player Toggle Button */}
                          {videos.length > 0 && (
                            <div style={{ marginBottom: '0.75rem' }}>
                              <button
                                type="button"
                                onClick={() => updateOverride(idx, 'showVideo', !math.override.showVideo)}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '8px',
                                  background: '#27272a',
                                  color: '#dc2626',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                }}
                              >
                                🎬 {math.override.showVideo ? 'Hide Demo Video' : 'Play Product Demo Video'}
                              </button>

                              {math.override.showVideo && (
                                <div style={{ marginTop: '0.5rem', borderRadius: '10px', overflow: 'hidden', background: '#000' }}>
                                  <video controls autoPlay src={videos[0]} style={{ width: '100%', maxHeight: '200px' }} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Interactive User Parameter Override Controls Box */}
                        <div style={{ background: '#09090b', padding: '0.85rem', borderRadius: '10px', border: '1px solid #dc2626', marginBottom: '1rem' }}>
                          <p style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 800, marginBottom: '0.5rem' }}>
                            ⚡ User Live Parameter Overrides (Instant Recalculation)
                          </p>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block' }}>RMB Rate (Tk / BDT)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={math.override.rmbRate}
                                onChange={(e) => updateOverride(idx, 'rmbRate', e.target.value)}
                                style={{ width: '100%', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '4px 8px', fontSize: '0.85rem', color: '#fff' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block' }}>Quantity (Pcs)</label>
                              <input
                                type="number"
                                min="1"
                                value={math.override.qty}
                                onChange={(e) => updateOverride(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                                style={{ width: '100%', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '4px 8px', fontSize: '0.85rem', color: '#fff' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block' }}>Weight/Unit (kg)</label>
                              <input
                                type="number"
                                step="0.05"
                                value={math.override.weight}
                                onChange={(e) => updateOverride(idx, 'weight', e.target.value)}
                                style={{ width: '100%', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '4px 8px', fontSize: '0.85rem', color: '#fff' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block' }}>Shipping</label>
                              <select
                                value={math.override.shipping}
                                onChange={(e) => updateOverride(idx, 'shipping', e.target.value)}
                                style={{ width: '100%', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '4px 8px', fontSize: '0.85rem', color: '#fff' }}
                              >
                                <option value="air">✈️ Air</option>
                                <option value="sea">🚢 Sea</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Recalculated Line-by-Line Landed Cost Summary */}
                        <div style={{ background: '#09090b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #27272a' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Supplier Unit Price:</span>
                            <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                              {res.product?.currency === 'RMB' ? `¥${res.product?.price} RMB` : `$${res.product?.price} USD`}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Total Item Price:</span>
                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                              ৳{formatMoney(math.totalItemPriceBdt)} Tk / BDT
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Freight ({math.override.shipping.toUpperCase()}):</span>
                            <span>৳{formatMoney(math.internationalFreightBdt)} Tk / BDT</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Duty & Tax (15%):</span>
                            <span>৳{formatMoney(math.dutyVatBdt)} Tk / BDT</span>
                          </div>

                          <hr style={{ borderColor: '#27272a', margin: '6px 0' }} />

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', marginBottom: '6px' }}>
                            <span style={{ color: '#ffffff' }}>Landed Cost / Unit:</span>
                            <span style={{ color: '#38bdf8' }}>
                              ৳{formatMoney(math.perUnitLandedCost)} Tk / BDT
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#22c55e', fontWeight: 700 }}>
                            <span>Est. Net Profit / Unit:</span>
                            <span>৳{formatMoney(math.netProfit)} Tk / BDT</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700 }}>
                            <span>Gross Margin:</span>
                            <span>{math.grossMargin}%</span>
                          </div>
                        </div>

                        {/* Collapsible Product Details & Specs */}
                        {Object.keys(specs).length > 0 && (
                          <div style={{ marginBottom: '1rem' }}>
                            <button
                              type="button"
                              onClick={() => updateOverride(idx, 'showSpecs', !math.override.showSpecs)}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: '#27272a',
                                color: '#a1a1aa',
                                fontSize: '0.8rem',
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>📋 {math.override.showSpecs ? 'Hide Full Specifications' : 'View Full Specifications & Details'}</span>
                              <span>{math.override.showSpecs ? '▲' : '▼'}</span>
                            </button>

                            {math.override.showSpecs && (
                              <div style={{ background: '#09090b', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                {Object.entries(specs).map(([sKey, sVal], sIdx) => (
                                  <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: '#a1a1aa' }}>{sKey}:</span>
                                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>{sVal}</span>
                                  </div>
                                ))}
                                {res.product.dimensions && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: '#a1a1aa' }}>Dimensions:</span>
                                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>{res.product.dimensions}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {res.product?.url && (
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
                  );
                })}
              </div>
            </div>

            {/* 2. Bangladesh Local Market Intelligence */}
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#dc2626' }}>🇧🇩</span> Bangladesh Local Market Benchmark & Profit Intelligence
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {bdBenchmarks.map((bm, idx) => (
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
                        ৳{formatMoney(bm.price_bdt)} Tk / BDT
                      </span>
                    </div>
                    {bm.notes && <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '6px' }}>{bm.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
