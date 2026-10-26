'use client';

import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Download, 
  ListPlus, 
  RotateCcw, 
  Scale, 
  Layers,
  Coins,
  Receipt
} from 'lucide-react';
import { CategorizedProduct } from '@/types/catalog';
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
  // Sourcing Price Inputs
  const [currency, setCurrency] = useState<'RMB' | 'USD'>('RMB');
  const [sourcePrice, setSourcePrice] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>(globalRmbRate ? String(globalRmbRate) : '20');
  const [quantity, setQuantity] = useState<string>('');
  
  // Weight & Freight Inputs
  const [weightVal, setWeightVal] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'gm' | 'kg'>('gm');
  const [freightRate, setFreightRate] = useState<string>(globalFreightRate ? String(globalFreightRate) : '1.2');
  const [freightUnit, setFreightUnit] = useState<'per_gm' | 'per_kg'>('per_gm');

  // Other Costing Input
  const [otherCost, setOtherCost] = useState<string>('');
  const [otherCostType, setOtherCostType] = useState<'per_unit' | 'total'>('per_unit');
  
  // Product context preservation (if sent from catalog)
  const [productTitle, setProductTitle] = useState<string>('');
  const [productCategory, setProductCategory] = useState<string>('');

  // UI states
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  // Sync initial product if passed from Category catalog
  useEffect(() => {
    if (initialProduct) {
      setProductTitle(initialProduct.title || '');
      setProductCategory(initialProduct.category || '');
      setCurrency(initialProduct.currency || 'RMB');
      setSourcePrice(String(initialProduct.source_price));
      setWeightVal(String(initialProduct.weight_val));
      setWeightUnit(initialProduct.weight_unit);
      setQuantity(String(initialProduct.moq || 10));
      showToast(`⚡ Loaded product price (${initialProduct.source_price} ${initialProduct.currency || 'RMB'}) into calculator`);
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

  // 3. Other Costing in BDT (packaging, duty, local delivery, etc.)
  const otherCostNum = parseFloat(otherCost) || 0;
  const unitOtherCostBdt = otherCostType === 'total' && qtyNum > 0
    ? otherCostNum / qtyNum
    : otherCostNum;
  const totalOtherCostBdt = otherCostType === 'total'
    ? otherCostNum
    : otherCostNum * (qtyNum > 0 ? qtyNum : (otherCostNum > 0 ? 1 : 0));

  // 4. Product Price Without Weight in BDT (Product Base + other non-weight costs)
  const unitProductWithoutWeightBdt = unitItemPriceBdt + unitOtherCostBdt;
  const totalProductWithoutWeightBdt = totalItemPriceBdt + totalOtherCostBdt;

  // 5. Combined Total Price in BDT
  const unitTotalPriceBdt = unitProductWithoutWeightBdt + unitFreightBdt;
  const totalBatchPriceBdt = (qtyNum > 0 ? qtyNum : (priceNum > 0 || rawWeight > 0 || otherCostNum > 0 ? 1 : 0)) * unitTotalPriceBdt;

  // Copy Quotation to Clipboard
  const handleCopyQuotation = () => {
    if (unitTotalPriceBdt <= 0) {
      showToast('⚠️ Please enter purchase price, weight, or other costing first');
      return;
    }

    const text = [
      '========================================',
      `📦 ${productTitle.toUpperCase() || 'PRICE CALCULATION'}`,
      '========================================',
      `• Purchase Price: ${currency === 'RMB' ? '¥' : '$'}${priceNum.toFixed(2)} (Exchange Rate: ৳${rateNum.toFixed(2)}/${currency})`,
      `• Product Price (Without Weight): ৳${formatMoney(Math.round(unitProductWithoutWeightBdt))} BDT / unit`,
      `• Weight Price: ৳${formatMoney(Math.round(unitFreightBdt))} BDT / unit`,
      '----------------------------------------',
      `🎯 TOTAL PRICE: ৳${formatMoney(Math.round(unitTotalPriceBdt))} BDT / unit`,
      ...(qtyNum > 0 ? [
        `• Order Quantity: ${qtyNum} pcs`,
        `💰 Total Product (Without Weight): ৳${formatMoney(Math.round(totalProductWithoutWeightBdt))} BDT`,
        `💰 Total Weight Price: ৳${formatMoney(Math.round(totalFreightBdt))} BDT`,
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
      showToast('⚠️ Please enter purchase price, weight, or other costing first');
      return;
    }

    setExportingPdf(true);
    try {
      await exportQuotationPdf(
        {
          productTitle: productTitle || 'Custom Calculated Product',
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
          otherCosts: String(otherCostNum),
          itemPriceBdt: totalItemPriceBdt,
          domesticShippingBdt: 0,
          agentFeeBdt: 0,
          freightBdt: totalFreightBdt,
          dutyVatBdt: 0,
          otherCostsBdt: totalOtherCostBdt,
          totalLandedCost: totalBatchPriceBdt,
          perUnitLandedCost: Math.round(unitTotalPriceBdt),
          targetPrice: 0,
          netProfit: 0,
          batchTotalProfit: 0,
          grossMargin: 0,
          roi: 0,
          breakEvenUnits: qtyNum || 1,
          shippingMethod: 'air',
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
      showToast('⚠️ Please enter purchase price, weight, or other costing first');
      return;
    }

    const otherNote = otherCostNum > 0 ? ` + ৳${Math.round(unitOtherCostBdt)} other` : '';
    const calculatedItem = {
      id: 'item-' + Date.now(),
      title: productTitle.trim() || 'Calculated Sourced Item',
      details: productCategory || `${rawWeight}${weightUnit} @ ৳${freightRate}/${freightUnit === 'per_gm' ? 'gm' : 'kg'}${otherNote}`,
      price: priceNum,
      currency,
      price_bdt: Math.round(unitItemPriceBdt),
      weight_kg: unitWeightKg,
      quantity: qtyNum > 0 ? qtyNum : 1,
      platform: 'Custom Calculation',
      notes: `${priceNum} ${currency} @ rate ৳${rateNum}${otherCostNum > 0 ? ` | Other: ৳${Math.round(unitOtherCostBdt)}` : ''}`,
      weight_price_bdt: Math.round(unitFreightBdt),
      line_weight_price_bdt: Math.round(totalFreightBdt),
      combined_unit_price_bdt: Math.round(unitTotalPriceBdt),
      combined_line_total_bdt: Math.round(unitTotalPriceBdt * (qtyNum > 0 ? qtyNum : 1)),
    };

    if (onAddToList) {
      onAddToList(calculatedItem);
      showToast('➕ Added calculated item to Product List Builder!');
    }
  };

  // Reset to clean defaults
  const handleReset = () => {
    setProductTitle('');
    setProductCategory('');
    setCurrency('RMB');
    setSourcePrice('');
    setExchangeRate(globalRmbRate ? String(globalRmbRate) : '20');
    setQuantity('');
    setWeightVal('');
    setWeightUnit('gm');
    setFreightRate(globalFreightRate ? String(globalFreightRate) : '1.2');
    setFreightUnit('per_gm');
    setOtherCost('');
    setOtherCostType('per_unit');
    showToast('🔄 Calculator reset');
  };

  return (
    <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto', padding: '0 1rem' }}>
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

      {/* Main Streamlined Calculator Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-md)',
      }}>
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
            <h2 style={{
              fontSize: '1.25rem',
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
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              margin: '3px 0 0 0',
            }}>
              Instant calculation of item price, cargo weight, and total landed BDT cost.
            </p>
          </div>

          <button
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Reset calculator inputs"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>

        {/* ================= INPUTS SECTION ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Section 1: Purchase Price & Exchange Rate */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
              <Coins size={15} style={{ color: 'var(--omni-red)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Purchase Price & Currency
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Purchase Price with Currency Switcher */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Purchase Price
                  </label>
                  {/* Currency Switcher */}
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

              {/* Exchange Rate */}
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
          </div>

          {/* Section 2: Order Quantity & Other Costing */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Order Quantity */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Order Quantity (Units)
                  </label>
                  {qtyNum > 0 && priceNum > 0 && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Base: <strong style={{ color: 'var(--text-primary)' }}>৳{formatMoney(Math.round(totalItemPriceBdt))}</strong>
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 10 (leave empty for single unit)"
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

              {/* Other Costing Box */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Other Costing (৳)
                  </label>
                  {/* Per Unit vs Total Switcher */}
                  <div style={{
                    display: 'flex',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '2px',
                  }}>
                    <button
                      type="button"
                      onClick={() => setOtherCostType('per_unit')}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: otherCostType === 'per_unit' ? 'var(--omni-red)' : 'transparent',
                        color: otherCostType === 'per_unit' ? '#ffffff' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      title="Other cost per unit"
                    >
                      / Unit
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtherCostType('total')}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: otherCostType === 'total' ? 'var(--omni-red)' : 'transparent',
                        color: otherCostType === 'total' ? '#ffffff' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      title="Total other cost for entire batch"
                    >
                      Total
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
                    ৳
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0.00 (packaging, duty, delivery)"
                    value={otherCost}
                    onChange={(e) => setOtherCost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 28px',
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
          </div>

          {/* Section 3: Weight & Freight */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
              <Scale size={15} style={{ color: 'var(--omni-red)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Weight & Cargo Freight
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Unit Weight with gm / kg Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Unit Weight
                  </label>
                  {qtyNum > 0 && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Total: <strong style={{ color: '#fbbf24' }}>{totalWeightKg.toFixed(2)} kg</strong>
                    </span>
                  )}
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
                        padding: '0 10px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
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
                        padding: '0 10px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
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

              {/* Freight Rate & Unit Base */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
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
                      padding: '9px 8px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="per_gm">/ gm</option>
                    <option value="per_kg">/ kg</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RESULT & ACTION FOOTER ================= */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.25rem',
            marginTop: '0.5rem',
          }}>
            {/* 3 Dedicated Price Displays: Product Price Without Weight, Weight Price, Total Price */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
              marginBottom: '1.25rem',
            }}>
              {/* 1. Product Price Without Weight */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginBottom: '4px',
                }}>
                  Product Price Without Weight
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ৳{formatMoney(Math.round(unitProductWithoutWeightBdt))}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/ unit</span>
                </div>
                {qtyNum > 1 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Total ({qtyNum} pcs): ৳{formatMoney(Math.round(totalProductWithoutWeightBdt))}
                  </span>
                )}
              </div>

              {/* 2. Weight Price */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginBottom: '4px',
                }}>
                  Weight Price
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>
                    ৳{formatMoney(Math.round(unitFreightBdt))}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/ unit</span>
                </div>
                {qtyNum > 1 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Total ({qtyNum} pcs): ৳{formatMoney(Math.round(totalFreightBdt))}
                  </span>
                )}
              </div>

              {/* 3. Total Price */}
              <div style={{
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--omni-red)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginBottom: '4px',
                }}>
                  Total Price
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--omni-red)' }}>
                    ৳{formatMoney(Math.round(unitTotalPriceBdt))}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/ unit</span>
                </div>
                {qtyNum > 1 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f87171', marginTop: '2px' }}>
                    Total ({qtyNum} pcs): ৳{formatMoney(Math.round(totalBatchPriceBdt))}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                onClick={handleAddToList}
                style={{
                  flex: '1 1 200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  background: 'var(--omni-red)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 2px 10px rgba(220, 38, 38, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <ListPlus size={16} />
                Add to Product List Builder
              </button>

              <button
                onClick={handleCopyQuotation}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Copy price quotation to clipboard"
              >
                <Copy size={14} />
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
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Export price quotation as PDF"
              >
                <Download size={14} />
                {exportingPdf ? 'Exporting...' : 'PDF'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
