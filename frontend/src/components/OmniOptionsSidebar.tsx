'use client';

import React from 'react';

export interface OmniOptionsSidebarProps {
  rmbRate: string;
  onUpdateRmbRate: (val: string) => void;
  freightRate: string;
  onUpdateFreightRate: (val: string) => void;
  freightUnit: 'per_gm' | 'per_kg';
  onUpdateFreightUnit: (unit: 'per_gm' | 'per_kg') => void;
  quantity: string;
  onUpdateQuantity: (val: string) => void;
  weightKg: string;
  onUpdateWeightKg: (val: string) => void;
  shippingMethod: 'air' | 'sea';
  onUpdateShippingMethod: (method: 'air' | 'sea') => void;
  cinematicLoading: boolean;
  onToggleCinematicLoading: () => void;
  onOpenIntroVideo: () => void;
  onCopyQuotation: () => void;
  onShareToWhatsApp: () => void;
  onDownloadPdf: () => void;
  productListCount: number;
  onOpenProductList: () => void;
  formatMoney: (val: number) => string;
}

export const OmniOptionsSidebar: React.FC<OmniOptionsSidebarProps> = ({
  rmbRate,
  onUpdateRmbRate,
  freightRate,
  onUpdateFreightRate,
  freightUnit,
  onUpdateFreightUnit,
  quantity,
  onUpdateQuantity,
  weightKg,
  onUpdateWeightKg,
  shippingMethod,
  onUpdateShippingMethod,
  cinematicLoading,
  onToggleCinematicLoading,
  onOpenIntroVideo,
  onCopyQuotation,
  onShareToWhatsApp,
  onDownloadPdf,
  productListCount,
  onOpenProductList,
  formatMoney,
}) => {
  // Quick Live Calculations based on active parameters
  const qty = Number(quantity) > 0 ? Number(quantity) : 10;
  const weight = Number(weightKg) > 0 ? Number(weightKg) : 0.35;
  const totalWeight = qty * weight;
  const numFreightRate = Number(freightRate) || (freightUnit === 'per_gm' ? 1.2 : 1200);
  const ratePerKg = freightUnit === 'per_gm' ? numFreightRate * 1000 : numFreightRate;
  const unitFreightBdt = weight * ratePerKg;
  const totalFreightBdt = unitFreightBdt * qty;

  // Benchmark estimated landed cost for sample wholesale item (e.g. ¥25 RMB)
  const numRmbRate = Number(rmbRate) || 20.0;
  const sampleItemBdt = 25 * numRmbRate;
  const sampleLandedPerUnit = sampleItemBdt + unitFreightBdt + 20 + (sampleItemBdt * 0.05) + (sampleItemBdt * 0.15);

  const incrementQty = (amt: number) => {
    const cur = Number(quantity) || 0;
    onUpdateQuantity(String(Math.max(1, cur + amt)));
  };

  return (
    <aside className="omni-sidebar-sticky" aria-label="Sourcing Options and Rate Controls">
      {/* 1. Header & User Set Banner */}
      <div className="omni-sidebar-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.95rem' }}>⚙️</span>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px', margin: 0 }}>
              OPTIONS & RATES
            </h3>
          </div>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              padding: '1px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
            }}
          >
            User Set
          </span>
        </div>

        {/* Currency RMB Rate Input */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.76rem', color: '#a1a1aa', fontWeight: 600 }}>
              💱 1 RMB = (Tk / BDT)
            </label>
            <span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 700 }}>
              ৳{numRmbRate.toFixed(2)}
            </span>
          </div>
          <input
            type="number"
            step="0.05"
            value={rmbRate}
            onChange={(e) => onUpdateRmbRate(e.target.value)}
            placeholder="20.00"
            style={{
              width: '100%',
              background: 'rgba(9, 9, 11, 0.85)',
              border: '1px solid rgba(220, 38, 38, 0.45)',
              borderRadius: '8px',
              padding: '7px 10px',
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '0.88rem',
            }}
          />
        </div>

        {/* Cargo Weight Rate Input */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.76rem', color: '#a1a1aa', fontWeight: 600 }}>
              ⚖️ Cargo Weight Rate
            </label>
            <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 700 }}>
              {freightUnit === 'per_gm'
                ? `≈ ৳${((Number(freightRate) || 0) * 1000).toLocaleString()}/kg`
                : `≈ ৳${((Number(freightRate) || 0) / 1000).toFixed(2)}/gm`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="number"
              step="0.05"
              value={freightRate}
              onChange={(e) => onUpdateFreightRate(e.target.value)}
              placeholder="1.2"
              style={{
                flex: 1,
                background: 'rgba(9, 9, 11, 0.85)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '8px',
                padding: '7px 8px',
                fontWeight: 700,
                color: '#ffffff',
                fontSize: '0.88rem',
              }}
            />
            <select
              value={freightUnit}
              onChange={(e: any) => onUpdateFreightUnit(e.target.value)}
              style={{
                background: '#18181b',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '8px',
                padding: '7px 8px',
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
              }}
            >
              <option value="per_gm">Tk/gm</option>
              <option value="per_kg">Tk/kg</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Active Order Parameters */}
      <div className="omni-sidebar-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.65rem' }}>
          <span style={{ fontSize: '0.9rem' }}>🎯</span>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f4f4f5', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Order Parameters
          </h4>
        </div>

        {/* Quantity */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.76rem', color: '#a1a1aa', fontWeight: 600 }}>
              Quantity (Units)
            </label>
            <div style={{ display: 'flex', gap: '3px' }}>
              <button
                type="button"
                onClick={() => incrementQty(10)}
                style={{ padding: '1px 5px', fontSize: '0.62rem', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', color: '#e4e4e7', cursor: 'pointer' }}
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => incrementQty(50)}
                style={{ padding: '1px 5px', fontSize: '0.62rem', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', color: '#e4e4e7', cursor: 'pointer' }}
              >
                +50
              </button>
            </div>
          </div>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => onUpdateQuantity(e.target.value)}
            placeholder="10"
            style={{
              width: '100%',
              background: 'rgba(9, 9, 11, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#ffffff',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Weight per Unit */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.76rem', color: '#a1a1aa', marginBottom: '4px', fontWeight: 600 }}>
            Weight per Unit (kg)
          </label>
          <input
            type="number"
            step="0.05"
            value={weightKg}
            onChange={(e) => onUpdateWeightKg(e.target.value)}
            placeholder="0.35"
            style={{
              width: '100%',
              background: 'rgba(9, 9, 11, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#ffffff',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Cargo Shipping Toggle */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', color: '#a1a1aa', marginBottom: '4px', fontWeight: 600 }}>
            Shipping Cargo Mode
          </label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => onUpdateShippingMethod('air')}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '8px',
                background: shippingMethod === 'air' ? '#dc2626' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.78rem',
                border: shippingMethod === 'air' ? '1px solid #dc2626' : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
              }}
            >
              ✈️ Air Cargo
            </button>
            <button
              type="button"
              onClick={() => onUpdateShippingMethod('sea')}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '8px',
                background: shippingMethod === 'sea' ? '#dc2626' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.78rem',
                border: shippingMethod === 'sea' ? '1px solid #dc2626' : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
              }}
            >
              🚢 Sea Cargo
            </button>
          </div>
        </div>
      </div>

      {/* 3. Real-Time Live Landed Cost Summary Widget */}
      <div
        className="omni-sidebar-card"
        style={{
          border: '1px solid rgba(220, 38, 38, 0.35)',
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(9, 9, 11, 0.85) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.9rem' }}>📊</span>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f87171', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live Cost Breakdown
            </h4>
          </div>
          <span style={{ fontSize: '0.62rem', color: '#a1a1aa' }}>
            {qty} Units · {shippingMethod.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.76rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#a1a1aa' }}>Total Weight:</span>
            <span style={{ fontWeight: 600, color: '#f4f4f5' }}>{totalWeight.toFixed(2)} kg</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#a1a1aa' }}>Freight / Unit:</span>
            <span style={{ fontWeight: 600, color: '#fbbf24' }}>৳{formatMoney(unitFreightBdt)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#a1a1aa' }}>Total Batch Freight:</span>
            <span style={{ fontWeight: 700, color: '#fbbf24' }}>৳{formatMoney(totalFreightBdt)}</span>
          </div>
          <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#fca5a5', fontWeight: 600 }}>Est. Unit Landed (sample):</span>
            <span style={{ fontWeight: 800, color: '#4ade80' }}>৳{formatMoney(sampleLandedPerUnit)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={onCopyQuotation}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              background: '#27272a',
              border: '1px solid #3f3f46',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📋</span>
            <span>Copy Formal Quotation</span>
          </button>

          <button
            type="button"
            onClick={onShareToWhatsApp}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
            }}
          >
            <span>💬</span>
            <span>Share to VIP Group</span>
          </button>

          <button
            type="button"
            onClick={onDownloadPdf}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.4)',
              color: '#fca5a5',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📄</span>
            <span>Download PDF Quotation</span>
          </button>
        </div>
      </div>

      {/* 4. Active Sourcing List Peek */}
      {productListCount > 0 && (
        <div className="omni-sidebar-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 600 }}>Active Sourcing List:</span>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#dc2626', background: 'rgba(220, 38, 38, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
              {productListCount} Products
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenProductList}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: '8px',
              background: '#dc2626',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>View & Export Full List →</span>
          </button>
        </div>
      )}

      {/* 5. Interface Preferences */}
      <div className="omni-sidebar-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.74rem', color: '#a1a1aa' }}>Cinematic Video Loading</span>
          <button
            type="button"
            onClick={onToggleCinematicLoading}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
              background: cinematicLoading ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: cinematicLoading ? '1px solid #22c55e' : '1px solid #3f3f46',
              color: cinematicLoading ? '#86efac' : '#a1a1aa',
              cursor: 'pointer',
            }}
          >
            {cinematicLoading ? 'ON' : 'OFF'}
          </button>
        </div>
        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button
            type="button"
            onClick={onOpenIntroVideo}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#71717a',
              fontSize: '0.72rem',
              cursor: 'pointer',
              textAlign: 'center',
              padding: 0,
            }}
          >
            🎬 Replay Opening Video
          </button>
        </div>
      </div>
    </aside>
  );
};
