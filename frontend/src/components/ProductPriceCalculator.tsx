'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Download, 
  ListPlus, 
  RotateCcw, 
  Scale, 
  Plane, 
  Ship, 
  Layers
} from 'lucide-react';
import { CategorizedProduct, PRODUCT_CATEGORIES } from '@/types/catalog';
import { formatMoney } from '@/lib/formatters';
import { exportQuotationPdf } from '@/lib/pdfExport';

interface ProductPriceCalculatorProps {
  initialProduct?: CategorizedProduct | null;
  onAddToList?: (calculatedProduct: any) => void;
  globalRmbRate?: number;
  globalFreightRate?: number;
  globalFreightUnit?: 'per_gm' | 'per_kg';
}

export default function ProductPriceCalculator({
  initialProduct,
  onAddToList,
  globalRmbRate = 20.0,
  globalFreightRate = 1.2,
  globalFreightUnit = 'per_gm',
}: ProductPriceCalculatorProps) {
  // Core Sourcing Inputs (Default: empty except RMB rate 20 and weight rate 1.2/gm)
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [currency, setCurrency] = useState<'RMB' | 'USD'>('RMB');
  const [sourcePrice, setSourcePrice] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>(globalRmbRate ? String(globalRmbRate) : '20');
  const [quantity, setQuantity] = useState<string>('');
  
  // Weight & Shipping
  const [weightVal, setWeightVal] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'gm' | 'kg'>('gm');
  const [freightRate, setFreightRate] = useState<string>(globalFreightRate ? String(globalFreightRate) : '1.2');
  const [freightUnit, setFreightUnit] = useState<'per_gm' | 'per_kg'>('per_gm');
  const [shippingMethod, setShippingMethod] = useState<'air' | 'sea' | 'custom'>('air');
  
  // UI states
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  // Sync initial product if passed from Category catalog
  useEffect(() => {
    if (initialProduct) {
      setTitle(initialProduct.title);
      setCategory(initialProduct.category || 'electronics');
      setCurrency(initialProduct.currency || 'RMB');
      setSourcePrice(String(initialProduct.source_price));
      setWeightVal(String(initialProduct.weight_val));
      setWeightUnit(initialProduct.weight_unit);
      setQuantity(String(initialProduct.moq || 10));
      showToast(`⚡ Loaded "${initialProduct.title.slice(0, 22)}..." into calculator`);
    }
  }, [initialProduct]);

  // Adjust default rate when currency changes
  const handleCurrencyChange = (curr: 'RMB' | 'USD') => {
    setCurrency(curr);
    if (curr === 'USD') {
      setExchangeRate('121.50');
    } else {
      setExchangeRate(String(globalRmbRate || '20.00'));
    }
  };

  // Preset shipping switch
  const handleShippingPreset = (method: 'air' | 'sea' | 'custom') => {
    setShippingMethod(method);
    if (method === 'air') {
      setFreightRate('1.2');
      setFreightUnit('per_gm');
    } else if (method === 'sea') {
      setFreightRate('250');
      setFreightUnit('per_kg');
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Perform Calculations
  const priceNum = parseFloat(sourcePrice) || 0;
  const rateNum = parseFloat(exchangeRate) || (currency === 'RMB' ? 20.0 : 121.5);
  const parsedQty = parseInt(quantity, 10);
  const qtyNum = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 0;
  const rawWeight = parseFloat(weightVal) || 0;
  const unitWeightKg = weightUnit === 'gm' ? rawWeight / 1000 : rawWeight;
  const totalWeightKg = unitWeightKg * (qtyNum > 0 ? qtyNum : (rawWeight > 0 ? 1 : 0));

  // 1. Base Product Item Price in BDT
  const unitItemPriceBdt = priceNum * rateNum;
  const totalItemPriceBdt = unitItemPriceBdt * (qtyNum > 0 ? qtyNum : (priceNum > 0 ? 1 : 0));

  // 2. Weight / Cargo Charge in BDT
  const fRateNum = parseFloat(freightRate) || 0;
  const fRatePerKg = freightUnit === 'per_gm' ? fRateNum * 1000 : fRateNum;
  const unitFreightBdt = unitWeightKg * fRatePerKg;
  const totalFreightBdt = (qtyNum > 0 ? qtyNum : (rawWeight > 0 ? 1 : 0)) * unitFreightBdt;

  // 3. Combined Total Price in BDT
  const unitTotalPriceBdt = unitItemPriceBdt + unitFreightBdt;
  const totalBatchPriceBdt = (qtyNum > 0 ? qtyNum : (priceNum > 0 || rawWeight > 0 ? 1 : 0)) * unitTotalPriceBdt;

  // Copy Quotation to Clipboard
  const handleCopyQuotation = () => {
    if (unitTotalPriceBdt <= 0) {
      showToast('⚠️ Please enter purchase price or weight first');
      return;
    }

    const text = [
      '========================================',
      `📦 ${title.toUpperCase() || 'PRODUCT PRICE CALCULATION'}`,
      '========================================',
      `• Purchase Price: ${currency === 'RMB' ? '¥' : '$'}${priceNum.toFixed(2)} (Exchange Rate: ৳${rateNum.toFixed(2)}/${currency})`,
      `• Base Product Cost: ৳${formatMoney(Math.round(unitItemPriceBdt))} BDT`,
      `• Unit Weight: ${rawWeight} ${weightUnit} (Freight Rate: ৳${fRateNum} ${freightUnit === 'per_gm' ? '/ gm' : '/ kg'})`,
      `• Weight Cargo Charge: ৳${formatMoney(Math.round(unitFreightBdt))} BDT`,
      '----------------------------------------',
      `🎯 TOTAL CALCULATED UNIT PRICE: ৳${formatMoney(Math.round(unitTotalPriceBdt))} BDT / unit`,
      ...(qtyNum > 0 ? [
        `• Order Quantity: ${qtyNum} pcs`,
        `💰 TOTAL BATCH PRICE: ৳${formatMoney(Math.round(totalBatchPriceBdt))} BDT`,
      ] : []),
      '========================================',
      'Generated by OMNI Sourcing Pro',
    ].join('\n');

    navigator.clipboard.writeText(text);
    showToast('📋 Price quote copied to clipboard!');
  };

  // Export PDF Quotation
  const handleExportPdf = async () => {
    if (unitTotalPriceBdt <= 0) {
      showToast('⚠️ Please enter purchase price or weight first');
      return;
    }

    setExportingPdf(true);
    try {
      await exportQuotationPdf(
        {
          productTitle: title || 'Custom Sourced Product',
          rmbPrice: String(priceNum),
          rmbRate: String(rateNum),
          quantity: qtyNum || 1,
          weightVal: String(rawWeight),
          weightUnit,
          totalWeightKg,
          freightRate: String(fRateNum),
          freightUnit,
          domesticShipping: '0',
          agentFeePct: '0',
          dutyPct: '0',
          otherCosts: '0',
          itemPriceBdt: totalItemPriceBdt,
          domesticShippingBdt: 0,
          agentFeeBdt: 0,
          freightBdt: totalFreightBdt,
          dutyVatBdt: 0,
          otherCostsBdt: 0,
          totalLandedCost: totalBatchPriceBdt,
          perUnitLandedCost: Math.round(unitTotalPriceBdt),
          targetPrice: 0,
          netProfit: 0,
          batchTotalProfit: 0,
          grossMargin: 0,
          roi: 0,
          breakEvenUnits: qtyNum || 1,
          shippingMethod: shippingMethod === 'sea' ? 'sea' : 'air',
          platform: 'Custom Calculation',
        },
        formatMoney
      );
      showToast('📄 PDF Quotation downloaded!');
    } catch (err: any) {
      console.error('PDF export failed:', err);
      showToast('❌ PDF export error: ' + (err.message || 'Error'));
    } finally {
      setExportingPdf(false);
    }
  };

  // Add to Product List Builder
  const handleAddToList = () => {
    if (unitTotalPriceBdt <= 0) {
      showToast('⚠️ Please enter purchase price or weight first');
      return;
    }

    const calculatedItem = {
      id: 'item-' + Date.now(),
      title: title.trim() || 'Calculated Sourced Item',
      details: category,
      price: priceNum,
      currency,
      price_bdt: Math.round(unitItemPriceBdt),
      weight_kg: unitWeightKg,
      quantity: qtyNum > 0 ? qtyNum : 1,
      platform: 'Custom Calculation',
      notes: title ? `Calculated item (${priceNum} ${currency})` : '',
      weight_price_bdt: Math.round(unitFreightBdt),
      line_weight_price_bdt: Math.round(totalFreightBdt),
      combined_unit_price_bdt: Math.round(unitTotalPriceBdt),
      combined_line_total_bdt: Math.round(unitTotalPriceBdt * (qtyNum > 0 ? qtyNum : 1)),
    };

    if (onAddToList) {
      onAddToList(calculatedItem);
      showToast(`➕ Added "${title.slice(0, 20) || 'Item'}..." to Product List Builder!`);
    }
  };

  // Reset to clean defaults
  const handleReset = () => {
    setTitle('');
    setCategory('');
    setCurrency('RMB');
    setSourcePrice('');
    setExchangeRate(globalRmbRate ? String(globalRmbRate) : '20');
    setQuantity('');
    setWeightVal('');
    setWeightUnit('gm');
    setFreightRate(globalFreightRate ? String(globalFreightRate) : '1.2');
    setFreightUnit('per_gm');
    setShippingMethod('air');
    showToast('🔄 Calculator reset');
  };

  return (
    <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
      {/* Toast Notification */}
      {toastMsg && (
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
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Minimalist Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.75rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div>
          <h2 style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0,
          }}>
            <span style={{ color: 'var(--omni-red)' }}>🧮</span> Product Price Calculator
          </h2>
          <p style={{
            fontSize: '0.84rem',
            color: 'var(--text-muted)',
            margin: '4px 0 0 0',
          }}>
            Simple, instant calculation of item price, cargo weight, and total BDT cost.
          </p>
        </div>

        <button
          onClick={handleReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--border-highlight)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      {/* 2-Column Minimalist Layout: Left Inputs | Right Price Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.75rem',
        alignItems: 'start',
      }}>
        {/* ================= LEFT COLUMN: ESSENTIALS ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card 1: Core Product & Sourcing */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <Layers size={16} style={{ color: 'var(--omni-red)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Product & Purchase Cost
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Product Title & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Product Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Wireless Smart Watch"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: category ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="" disabled>Select one</option>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id} style={{ color: 'var(--text-primary)' }}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purchase Price with Currency Segmented Switch */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Purchase Price
                    </label>
                    {/* Segmented Pill Currency Switcher */}
                    <div style={{
                      display: 'flex',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '2px',
                    }}>
                      <button
                        type="button"
                        onClick={() => handleCurrencyChange('RMB')}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: currency === 'RMB' ? 'var(--omni-red)' : 'transparent',
                          color: currency === 'RMB' ? '#ffffff' : 'var(--text-muted)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        ¥ RMB
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCurrencyChange('USD')}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: currency === 'USD' ? 'var(--omni-red)' : 'transparent',
                          color: currency === 'USD' ? '#ffffff' : 'var(--text-muted)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        $ USD
                      </button>
                    </div>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                    }}>
                      {currency === 'RMB' ? '¥' : '$'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={sourcePrice}
                      onChange={(e) => setSourcePrice(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 28px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Exchange Rate (৳/{currency})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Order Quantity */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Order Quantity (Units)
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Total Base Cost: <strong style={{ color: 'var(--text-primary)' }}>৳{formatMoney(Math.round(totalItemPriceBdt))}</strong>
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Weight & International Cargo */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <Scale size={16} style={{ color: 'var(--omni-red)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Weight & International Cargo
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Weight with inline Unit Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Unit Weight
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Batch Total: <strong style={{ color: 'var(--text-primary)' }}>{totalWeightKg.toFixed(2)} kg</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 250"
                    value={weightVal}
                    onChange={(e) => setWeightVal(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '2px',
                  }}>
                    <button
                      type="button"
                      onClick={() => setWeightUnit('gm')}
                      style={{
                        padding: '0 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: weightUnit === 'gm' ? 'var(--omni-red)' : 'transparent',
                        color: weightUnit === 'gm' ? '#ffffff' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      gm
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightUnit('kg')}
                      style={{
                        padding: '0 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: weightUnit === 'kg' ? 'var(--omni-red)' : 'transparent',
                        color: weightUnit === 'kg' ? '#ffffff' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      kg
                    </button>
                  </div>
                </div>
              </div>

              {/* Shipping Method Pills */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Shipping Mode Preset
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                }}>
                  <button
                    type="button"
                    onClick={() => handleShippingPreset('air')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      background: shippingMethod === 'air' ? 'rgba(220, 38, 38, 0.12)' : 'var(--bg-surface)',
                      border: shippingMethod === 'air' ? '1.5px solid var(--omni-red)' : '1px solid var(--border-color)',
                      color: shippingMethod === 'air' ? 'var(--omni-red)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Plane size={15} />
                    <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>Air Cargo</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>৳1.2 / gm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShippingPreset('sea')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      background: shippingMethod === 'sea' ? 'rgba(220, 38, 38, 0.12)' : 'var(--bg-surface)',
                      border: shippingMethod === 'sea' ? '1.5px solid var(--omni-red)' : '1px solid var(--border-color)',
                      color: shippingMethod === 'sea' ? 'var(--omni-red)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Ship size={15} />
                    <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>Sea Cargo</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>৳250 / kg</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShippingMethod('custom')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      background: shippingMethod === 'custom' ? 'rgba(220, 38, 38, 0.12)' : 'var(--bg-surface)',
                      border: shippingMethod === 'custom' ? '1.5px solid var(--omni-red)' : '1px solid var(--border-color)',
                      color: shippingMethod === 'custom' ? 'var(--omni-red)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Scale size={15} />
                    <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>Custom</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Manual Rate</span>
                  </button>
                </div>
              </div>

              {/* Freight Charge Rate with unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Freight Rate (৳)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    placeholder="1.2"
                    value={freightRate}
                    onChange={(e) => setFreightRate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Unit Base
                  </label>
                  <select
                    value={freightUnit}
                    onChange={(e) => setFreightUnit(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="per_gm">per gram (gm)</option>
                    <option value="per_kg">per kilogram (kg)</option>
                  </select>
                </div>
              </div>

              {/* Line Freight total preview */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                padding: '8px 12px',
                background: 'var(--bg-surface)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}>
                <span>Unit Weight Charge:</span>
                <strong style={{ color: 'var(--omni-red)' }}>৳{formatMoney(Math.round(unitFreightBdt))} BDT</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: CLEAN PRICE SUMMARY ================= */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-md)',
          position: 'sticky',
          top: '24px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={17} style={{ color: 'var(--omni-red)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                Price Summary
              </h3>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(220, 38, 38, 0.1)',
              color: 'var(--omni-red)',
            }}>
              {qtyNum > 0 ? `${qtyNum} PCS` : 'SINGLE UNIT'}
            </span>
          </div>

          {/* Primary Calculated Price Card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.25rem',
            marginBottom: '1.25rem',
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
              Total Calculated Price Per Unit
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--omni-red)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                ৳{formatMoney(Math.round(unitTotalPriceBdt))}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                BDT / unit
              </span>
            </div>

            {qtyNum > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}>
                <span>Total for {qtyNum} pcs:</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
                  ৳{formatMoney(Math.round(totalBatchPriceBdt))} BDT
                </strong>
              </div>
            )}
          </div>

          {/* Itemized Price Details */}
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            fontSize: '0.82rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <span>Base Product Price ({currency === 'RMB' ? '¥' : '$'}{priceNum || 0} × {rateNum})</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>৳{formatMoney(Math.round(unitItemPriceBdt))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <span>Weight Cargo Price ({rawWeight || 0} {weightUnit} × ৳{fRateNum})</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>৳{formatMoney(Math.round(unitFreightBdt))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', color: 'var(--text-secondary)', background: 'rgba(220, 38, 38, 0.04)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Combined Unit Price</span>
              <span style={{ fontWeight: 800, color: 'var(--omni-red)' }}>৳{formatMoney(Math.round(unitTotalPriceBdt))}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={handleAddToList}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'var(--omni-red)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 2px 10px rgba(220, 38, 38, 0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--omni-red-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--omni-red)';
              }}
            >
              <ListPlus size={16} />
              Add to Product List Builder
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={handleCopyQuotation}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-highlight)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <Copy size={13} />
                Copy Quote
              </button>

              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-highlight)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <Download size={13} />
                {exportingPdf ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
