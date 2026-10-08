'use client';

import { useState, useEffect, useRef } from 'react';
import ProductListBuilder, { ProductItem } from '@/components/ProductListBuilder';
import CustomerManager from '@/components/CustomerManager';
import { SourcedProductResult, LocalMarketBenchmark, SearchResults } from '@/lib/types';
import { formatMoney } from '@/lib/formatters';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import SearchHistory from '@/components/SearchHistory';
import SkeletonCard, { SearchLoadingOverlay } from '@/components/SkeletonCard';
import ComparisonTable from '@/components/ComparisonTable';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { exportQuotationPdf } from '@/lib/pdfExport';
import NegotiationModal from '@/components/NegotiationModal';

export default function Home() {
  const [health, setHealth] = useState<any>(null);
  const [searchMode, setSearchMode] = useState<'text' | 'image' | 'manual' | 'list' | 'crm'>('text');
  const [productListItems, setProductListItems] = useState<ProductItem[]>([]);
  const [customerManagerProduct, setCustomerManagerProduct] = useState<ProductItem | null>(null);
  
  // Search history state management
  const { history: searchHistory, addSearch, removeSearch, clearHistory } = useSearchHistory();

  // Live Exchange Rates Hook
  const { rates: liveRates, loading: ratesLoading, refreshRates } = useExchangeRate();

  // Active negotiation modal state
  const [activeNegotiationProduct, setActiveNegotiationProduct] = useState<{
    product: SourcedProductResult['product'];
    rmbPrice: number;
    qty: number;
  } | null>(null);

  // PDF Export loading state
  const [exportingPdf, setExportingPdf] = useState(false);
  
  // Search Parameters
  const [query, setQuery] = useState('Smart Watch Ultra');
  const [globalQuantity, setGlobalQuantity] = useState<number>(10);
  const [globalShippingMethod, setGlobalShippingMethod] = useState<'air' | 'sea'>('air');
  const [globalWeightKg, setGlobalWeightKg] = useState<string>('0.35');
  const [globalRateRmbBdt, setGlobalRateRmbBdt] = useState<string>('20.00');
  
  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Calculator State (Defaults: 20.00 RMB/BDT rate, 1.2 Tk/gm freight rate)
  const [manualRmbPrice, setManualRmbPrice] = useState<string>('28.00');
  const [manualRateRmb, setManualRateRmb] = useState<string>('20.00');
  const [manualQty, setManualQty] = useState<number>(10);
  const [manualWeightVal, setManualWeightVal] = useState<string>('350');
  const [manualWeightUnit, setManualWeightUnit] = useState<'kg' | 'gm'>('gm');
  const [manualFreightRate, setManualFreightRate] = useState<string>('1.2');
  const [manualFreightUnit, setManualFreightUnit] = useState<'per_kg' | 'per_gm'>('per_gm');
  const [manualDomesticShipping, setManualDomesticShipping] = useState<string>('20.00');
  const [manualAgentFeePct, setManualAgentFeePct] = useState<string>('5.00');
  const [manualDutyPct, setManualDutyPct] = useState<string>('15.00');
  const [manualOtherCosts, setManualOtherCosts] = useState<string>('50.00');
  const [manualTargetPrice, setManualTargetPrice] = useState<string>('1500.00');

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

  const [aiStatus, setAiStatus] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const applyPreset = (type: 'sample' | 'medium' | 'bulk_sea') => {
    if (type === 'sample') {
      setGlobalQuantity(5);
      setGlobalShippingMethod('air');
      setGlobalWeightKg('0.35');
      setGlobalRateRmbBdt('20.00');
      showToast('⚡ Applied Sample Preset: 5 Pcs | Air Shipping');
    } else if (type === 'medium') {
      setGlobalQuantity(50);
      setGlobalShippingMethod('air');
      setGlobalWeightKg('0.35');
      setGlobalRateRmbBdt('20.00');
      showToast('📦 Applied Medium Wholesale Preset: 50 Pcs | Air Shipping');
    } else if (type === 'bulk_sea') {
      setGlobalQuantity(500);
      setGlobalShippingMethod('sea');
      setGlobalWeightKg('0.35');
      setGlobalRateRmbBdt('20.00');
      showToast('🚢 Applied Bulk Container Preset: 500 Pcs | Sea Cargo');
    }
  };

  useEffect(() => {
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => {
        console.error('API health fetch failed:', err);
        setHealth({ status: 'offline' });
      });

    fetch(`${apiUrl}/ai/status`)
      .then((res) => res.json())
      .then((data) => setAiStatus(data))
      .catch((err) => {
        console.error('AI status fetch failed:', err);
      });
  }, [apiUrl]);

  // Synchronize live exchange rates when available
  useEffect(() => {
    if (liveRates?.cny_to_bdt && liveRates.cny_to_bdt > 0) {
      setGlobalRateRmbBdt(liveRates.cny_to_bdt.toFixed(2));
      setManualRateRmb(liveRates.cny_to_bdt.toFixed(2));
    }
  }, [liveRates?.cny_to_bdt]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Compute live manual calculator breakdown
  const computeManualMath = () => {
    const rmbPrice = Number(manualRmbPrice) || 0;
    const rate = Number(manualRateRmb) || 20.00;
    const qty = Math.max(1, Number(manualQty) || 1);
    const weightVal = Number(manualWeightVal) || 0;
    const weightKg = manualWeightUnit === 'gm' ? weightVal / 1000.0 : weightVal;
    const totalWeightKg = weightKg * qty;

    const freightRate = Number(manualFreightRate) || 0;
    let freightBdt = 0;
    if (manualFreightUnit === 'per_gm') {
      const totalWeightGm = manualWeightUnit === 'gm' ? weightVal * qty : weightVal * 1000.0 * qty;
      freightBdt = totalWeightGm * freightRate;
    } else {
      freightBdt = totalWeightKg * freightRate;
    }

    const itemPriceBdt = rmbPrice * rate * qty;
    const domesticShippingBdt = (Number(manualDomesticShipping) || 0) * qty;
    const agentFeeBdt = itemPriceBdt * ((Number(manualAgentFeePct) || 0) / 100.0);
    const dutyVatBdt = itemPriceBdt * ((Number(manualDutyPct) || 0) / 100.0);
    const otherCostsBdt = Number(manualOtherCosts) || 0;

    const totalLandedCost = itemPriceBdt + domesticShippingBdt + agentFeeBdt + freightBdt + dutyVatBdt + otherCostsBdt;
    const perUnitLandedCost = totalLandedCost / qty;

    const targetPrice = Number(manualTargetPrice) || perUnitLandedCost * 1.4;
    const netProfit = targetPrice - perUnitLandedCost;
    const batchTotalProfit = netProfit * qty;
    const grossMargin = targetPrice > 0 ? (netProfit / targetPrice) * 100 : 0;
    const roi = perUnitLandedCost > 0 ? (netProfit / perUnitLandedCost) * 100 : 0;
    const breakEvenUnits = targetPrice > 0 ? Math.ceil(totalLandedCost / targetPrice) : qty;

    // Cost distribution percentages for visual bar
    const itemPct = totalLandedCost > 0 ? (itemPriceBdt / totalLandedCost) * 100 : 0;
    const freightPct = totalLandedCost > 0 ? ((freightBdt + domesticShippingBdt) / totalLandedCost) * 100 : 0;
    const dutyAgentPct = totalLandedCost > 0 ? ((dutyVatBdt + agentFeeBdt) / totalLandedCost) * 100 : 0;
    const overheadPct = totalLandedCost > 0 ? (otherCostsBdt / totalLandedCost) * 100 : 0;

    return {
      itemPriceBdt,
      domesticShippingBdt,
      agentFeeBdt,
      freightBdt,
      dutyVatBdt,
      otherCostsBdt,
      totalLandedCost,
      perUnitLandedCost,
      targetPrice,
      netProfit,
      batchTotalProfit,
      breakEvenUnits,
      grossMargin: Number(grossMargin.toFixed(2)),
      roi: Number(roi.toFixed(2)),
      totalWeightKg: Number(totalWeightKg.toFixed(3)),
      itemPct: Number(itemPct.toFixed(1)),
      freightPct: Number(freightPct.toFixed(1)),
      dutyAgentPct: Number(dutyAgentPct.toFixed(1)),
      overheadPct: Number(overheadPct.toFixed(1)),
    };
  };

  const copyManualQuotation = () => {
    const math = computeManualMath();
    const text = [
      '========================================',
      '📦 OMNI SOURCING & LANDED COST QUOTATION',
      '========================================',
      '• RMB Unit Price: ¥' + manualRmbPrice + ' (Rate: ৳' + manualRateRmb + '/RMB)',
      '• Order Quantity: ' + manualQty + ' pcs',
      '• Weight per unit: ' + manualWeightVal + ' ' + manualWeightUnit + ' (Total: ' + math.totalWeightKg + ' kg)',
      '• Freight Rate: ৳' + manualFreightRate + ' ' + (manualFreightUnit === 'per_gm' ? '/ gram' : '/ kg'),
      '----------------------------------------',
      '💰 ITEMIZED COST BREAKDOWN (BDT ৳):',
      '• Total Product Cost: ৳' + formatMoney(math.itemPriceBdt),
      '• Domestic Freight (China): ৳' + formatMoney(math.domesticShippingBdt),
      '• Agent Sourcing Fee (' + manualAgentFeePct + '%): ৳' + formatMoney(Math.round(math.agentFeeBdt)),
      '• International Freight: ৳' + formatMoney(math.freightBdt),
      '• Customs Duty & Tax (' + manualDutyPct + '%): ৳' + formatMoney(Math.round(math.dutyVatBdt)),
      '• Other Overhead: ৳' + formatMoney(math.otherCostsBdt),
      '----------------------------------------',
      '💵 TOTAL LANDED COST: ৳' + formatMoney(math.totalLandedCost) + ' BDT',
      '🎯 LANDED COST PER UNIT: ৳' + formatMoney(math.perUnitLandedCost) + ' BDT',
      '🏷️ TARGET SELLING PRICE: ৳' + formatMoney(math.targetPrice) + ' BDT',
      '🟢 ESTIMATED NET PROFIT / UNIT: ৳' + formatMoney(math.netProfit) + ' BDT',
      '📈 GROSS MARGIN: ' + math.grossMargin + '% | ROI: ' + math.roi + '%',
      '💰 TOTAL BATCH NET PROFIT: ৳' + formatMoney(math.batchTotalProfit) + ' BDT',
      '========================================',
      'Generated by OMNI Sourcing & Intelligence System',
    ].join('\n');

    navigator.clipboard.writeText(text);
    showToast('📋 Formal Client Quotation copied to clipboard!');
  };

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      const math = computeManualMath();
      await exportQuotationPdf(
        {
          productTitle: query.trim() || 'Custom China Sourced Item',
          rmbPrice: manualRmbPrice,
          rmbRate: manualRateRmb,
          quantity: manualQty,
          weightVal: manualWeightVal,
          weightUnit: manualWeightUnit,
          totalWeightKg: math.totalWeightKg,
          freightRate: manualFreightRate,
          freightUnit: manualFreightUnit,
          domesticShipping: manualDomesticShipping,
          agentFeePct: manualAgentFeePct,
          dutyPct: manualDutyPct,
          otherCosts: manualOtherCosts,
          itemPriceBdt: math.itemPriceBdt,
          domesticShippingBdt: math.domesticShippingBdt,
          agentFeeBdt: math.agentFeeBdt,
          freightBdt: math.freightBdt,
          dutyVatBdt: math.dutyVatBdt,
          otherCostsBdt: math.otherCostsBdt,
          totalLandedCost: math.totalLandedCost,
          perUnitLandedCost: math.perUnitLandedCost,
          targetPrice: math.targetPrice,
          netProfit: math.netProfit,
          batchTotalProfit: math.batchTotalProfit,
          grossMargin: math.grossMargin,
          roi: math.roi,
          breakEvenUnits: math.breakEvenUnits,
        },
        formatMoney
      );
      showToast('📄 Formal PDF Quotation generated and downloaded!');
    } catch (err: any) {
      console.error('PDF export error:', err);
      showToast('❌ Failed to export PDF: ' + (err.message || 'Error'));
    } finally {
      setExportingPdf(false);
    }
  };

  const resetManualDefaults = () => {
    setManualRmbPrice('28.00');
    setManualRateRmb('20.00');
    setManualQty(10);
    setManualWeightVal('350');
    setManualWeightUnit('gm');
    setManualFreightRate('1.2');
    setManualFreightUnit('per_gm');
    setManualDomesticShipping('20.00');
    setManualAgentFeePct('5.00');
    setManualDutyPct('15.00');
    setManualOtherCosts('50.00');
    setManualTargetPrice('1500.00');
    showToast('🔄 Reset Manual Calculator to Default Values (20 RMB | 1.2 Tk/gm)');
  };

  const applyTargetMarginPreset = (marginPct: number) => {
    const math = computeManualMath();
    if (math.perUnitLandedCost > 0) {
      const target = math.perUnitLandedCost / (1 - marginPct / 100.0);
      setManualTargetPrice(target.toFixed(2));
      showToast('🎯 Applied ' + marginPct + '% Target Profit Margin Preset');
    }
  };

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const searchQuery = customQuery !== undefined ? customQuery : query;

    if (searchMode === 'text' && !searchQuery.trim()) return;
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
            query: searchQuery,
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
        addSearch(searchQuery, 'text', data.sourcing_results?.length || 0);
      } else if (searchMode === 'image') {
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
        const searchLabel = data.image_analysis?.description_en || selectedFile?.name || 'Image Search';
        addSearch(searchLabel, 'image', data.sourcing_results?.length || 0);
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

    const rmbRate = Number(override.rmbRate) || 20.00;
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

  const addSourcedProductToList = (res: SourcedProductResult, idx: number) => {
    const math = computeCardMath(res, idx);
    const title = res.product.title_en || res.product.title_original || 'Sourced Product';
    const imgUrl = res.product.images && res.product.images.length > 0 ? res.product.images[0] : '';
    const weightKg = Number(math.override.weight) || 0.35;
    const qty = Number(math.override.qty) || 1;
    const priceBdt = math.unitPriceBdt;

    const newItem: ProductItem = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      details: `${res.product.platform} Supplier (${res.product.seller_rating || 4.8}★)`,
      price: res.product.price,
      currency: res.product.currency || 'RMB',
      price_bdt: priceBdt,
      weight_kg: weightKg,
      quantity: qty,
      image_url: imgUrl,
      product_url: res.product.url,
      platform: res.product.platform
    };

    setProductListItems((prev) => [...prev, newItem]);
    showToast(`✅ Added "${title.substring(0, 25)}..." to Product List!`);
  };

  const addManualProductToList = () => {
    const rmbPrice = Number(manualRmbPrice) || 28;
    const rate = Number(manualRateRmb) || 20;
    const priceBdt = rmbPrice * rate;
    const qty = Math.max(1, Number(manualQty) || 1);
    const weightVal = Number(manualWeightVal) || 350;
    const weightKg = manualWeightUnit === 'gm' ? weightVal / 1000.0 : weightVal;

    const newItem: ProductItem = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: query.trim() || 'Manual Sourced Item',
      details: `Manual Sourced (Rate: ৳${rate}/RMB)`,
      price: rmbPrice,
      currency: 'RMB',
      price_bdt: priceBdt,
      weight_kg: Number(weightKg.toFixed(3)),
      quantity: qty,
      platform: '1688'
    };

    setProductListItems((prev) => [...prev, newItem]);
    showToast(`✅ Added "${newItem.title}" to Product List!`);
  };

  const handlePitchToCustomers = (item: ProductItem) => {
    setCustomerManagerProduct(item);
    setSearchMode('crm');
    showToast(`💬 Switched to Customers & Messaging for "${item.title.substring(0, 22)}..."`);
  };

  const sourcingResults = searchResults?.sourcing_results || [];
  const bdBenchmarks = searchResults?.bd_market_benchmarks || [];
  const manualMath = computeManualMath();

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
          <span style={{ color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🤖</span> Dual AI Co-Pilot (Gemini + Claude)
          </span>
          <span style={{ color: '#52525b' }}>|</span>
          <span
            style={{ color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            onClick={() => {
              if (liveRates?.cny_to_bdt) {
                setGlobalRateRmbBdt(liveRates.cny_to_bdt.toFixed(2));
                setManualRateRmb(liveRates.cny_to_bdt.toFixed(2));
                showToast(`Applied Live Rate: 1 RMB = ৳${liveRates.cny_to_bdt} BDT`);
              }
            }}
            title="Click to apply live rate"
          >
            <span>💱</span> 1 RMB = ৳{liveRates?.cny_to_bdt ? liveRates.cny_to_bdt.toFixed(2) : '20.00'}
          </span>
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

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSearchMode('text')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: searchMode === 'text' ? '#dc2626' : '#18181b',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: '1px solid #27272a',
            }}
          >
            🔍 Text Search
          </button>

          <button
            type="button"
            onClick={() => setSearchMode('image')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: searchMode === 'image' ? '#dc2626' : '#18181b',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: '1px solid #27272a',
            }}
          >
            📷 Image Search (Gemini Vision)
          </button>

          <button
            type="button"
            onClick={() => setSearchMode('manual')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: searchMode === 'manual' ? '#dc2626' : '#18181b',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: '1px solid #27272a',
            }}
          >
            🧮 Manual Landed Cost Calculator
          </button>

          <button
            type="button"
            onClick={() => setSearchMode('list')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: searchMode === 'list' ? '#dc2626' : '#18181b',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: '1px solid #27272a',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📋 Product List Builder</span>
            {productListItems.length > 0 && (
              <span
                style={{
                  background: searchMode === 'list' ? '#ffffff' : '#dc2626',
                  color: searchMode === 'list' ? '#dc2626' : '#ffffff',
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}
              >
                {productListItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSearchMode('crm')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: searchMode === 'crm' ? '#dc2626' : '#18181b',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: '1px solid #27272a',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>👥 Customers & Messaging</span>
          </button>
        </div>

        {/* Section A: Text & Image Search Panel */}
        {(searchMode === 'text' || searchMode === 'image') && (
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
            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {searchMode === 'text' ? (
                <>
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

                  {/* Recent Search History */}
                  <SearchHistory
                    history={searchHistory}
                    onSelect={(histQ) => {
                      setQuery(histQ);
                      showToast(`Searching "${histQ}" from history...`);
                      handleSearch(undefined, histQ);
                    }}
                    onRemove={removeSearch}
                    onClear={clearHistory}
                  />

                  {/* Quick Trending Product Chips */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, marginRight: '4px' }}>🔥 Trending Searches:</span>
                    {[
                      { label: '⌚ Smart Watch', val: 'Smart Watch Ultra' },
                      { label: '🎧 TWS Earbuds', val: 'Wireless Earbuds TWS' },
                      { label: '👗 Ladies Bag', val: 'Ladies Leather Handbag' },
                      { label: '⚡ Fast Charger', val: 'GaN Fast Charger 65W' },
                      { label: '👟 Sports Shoes', val: 'Men Sports Running Shoes' },
                      { label: '💄 Makeup Kit', val: 'Cosmetics Makeup Set' },
                    ].map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => {
                          setQuery(chip.val);
                          showToast("Searching for " + chip.val + "...");
                        }}
                        style={{
                          background: '#09090b',
                          border: '1px solid #3f3f46',
                          borderRadius: '9999px',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          color: '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </>
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

              {/* Smart Importer Quick Presets Bar */}
              <div style={{ background: '#09090b', padding: '0.75rem', borderRadius: '10px', border: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 800 }}>⚡ Smart Importer Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('sample')}
                  style={{ background: '#27272a', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  🧪 Sample Order (5 pcs | Air)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('medium')}
                  style={{ background: '#27272a', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  📦 Medium Batch (50 pcs | Air)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('bulk_sea')}
                  style={{ background: '#27272a', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  🚢 Sea Container (500 pcs | Sea)
                </button>
              </div>

              {/* Global Config Controls Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', paddingTop: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>
                      💱 1 RMB = (Tk / BDT)
                    </label>
                    {liveRates?.cny_to_bdt && (
                      <button
                        type="button"
                        onClick={() => {
                          setGlobalRateRmbBdt(liveRates.cny_to_bdt.toFixed(2));
                          showToast(`⚡ Applied Live FX Rate: ৳${liveRates.cny_to_bdt}`);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: 0,
                        }}
                      >
                        ⚡ Live: ৳{liveRates.cny_to_bdt.toFixed(2)}
                      </button>
                    )}
                  </div>
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
                    Quantity (Units)
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
                    Shipping Method
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
                    Weight per unit (kg)
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
        )}

        {/* Section B: Standalone Manual Landed Cost Calculator */}
        {searchMode === 'manual' && (
          <section
            style={{
              background: '#18181b',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid #dc2626',
              marginBottom: '2rem',
              boxShadow: '0 0 25px rgba(220, 38, 38, 0.2)',
            }}
          >
            {/* Header & Quick Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #27272a', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', color: '#ffffff', fontWeight: 800, margin: 0 }}>
                  🧮 Standalone Landed Cost & Profit Calculator
                </h2>
                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '2px', margin: 0 }}>
                  Smart BDT (৳) Landed Cost Breakdown | Default Rate: <strong>1 RMB = ৳20.00 BDT</strong> & Freight Rate: <strong>৳1.2 / gram (৳1,200/kg)</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={addManualProductToList}
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 10px rgba(22, 163, 74, 0.3)',
                  }}
                >
                  ➕ Add to Product List
                </button>
                <button
                  type="button"
                  onClick={copyManualQuotation}
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #990000 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 10px rgba(220, 38, 38, 0.3)',
                  }}
                >
                  📋 Copy Quotation
                </button>
                <button
                  type="button"
                  disabled={exportingPdf}
                  onClick={handleDownloadPdf}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: exportingPdf ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 10px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  {exportingPdf ? '⏳ Generating PDF...' : '📄 Download PDF'}
                </button>
                <button
                  type="button"
                  onClick={resetManualDefaults}
                  style={{
                    background: '#27272a',
                    color: '#f8fafc',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🔄 Reset Defaults
                </button>
              </div>
            </div>

            {/* Quick Speed Presets Bar for Freight & Exchange Rate */}
            <div style={{ background: '#09090b', padding: '0.85rem', borderRadius: '12px', border: '1px solid #27272a', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* RMB Quick Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 800 }}>💱 RMB Exchange Rate:</span>
                {liveRates?.cny_to_bdt && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualRateRmb(liveRates.cny_to_bdt.toFixed(2));
                      showToast(`⚡ Set to Live RMB Rate: ৳${liveRates.cny_to_bdt}`);
                    }}
                    style={{
                      background: manualRateRmb === liveRates.cny_to_bdt.toFixed(2) ? '#2563eb' : '#18181b',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Live (৳{liveRates.cny_to_bdt.toFixed(2)})
                  </button>
                )}
                {[
                  { label: 'RMB @ ৳19.50', rate: '19.50' },
                  { label: 'RMB @ ৳20.00 (Default)', rate: '20.00' },
                  { label: 'RMB @ ৳20.50', rate: '20.50' },
                  { label: 'RMB @ ৳21.00', rate: '21.00' },
                ].map((rItem, rIdx) => (
                  <button
                    key={rIdx}
                    type="button"
                    onClick={() => {
                      setManualRateRmb(rItem.rate);
                      showToast("Set RMB Rate to ৳" + rItem.rate + " BDT");
                    }}
                    style={{
                      background: manualRateRmb === rItem.rate ? '#dc2626' : '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      color: '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {rItem.label}
                  </button>
                ))}
              </div>

              {/* Cargo & Freight Rate Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 800 }}>✈️ Cargo Freight Presets:</span>
                {[
                  { label: '⚡ Express Air (1.2 Tk/gm)', rate: '1.2', unit: 'per_gm' },
                  { label: '✈️ Standard Air (1.0 Tk/gm)', rate: '1.0', unit: 'per_gm' },
                  { label: '🚢 Sea Cargo (0.3 Tk/gm = 300 Tk/kg)', rate: '0.3', unit: 'per_gm' },
                  { label: '📦 Bulk Container (650 Tk/kg)', rate: '650', unit: 'per_kg' },
                ].map((fItem, fIdx) => (
                  <button
                    key={fIdx}
                    type="button"
                    onClick={() => {
                      setManualFreightRate(fItem.rate);
                      setManualFreightUnit(fItem.unit as any);
                      showToast("Set Freight Rate to ৳" + fItem.rate + " " + (fItem.unit === 'per_gm' ? '/ gram' : '/ kg'));
                    }}
                    style={{
                      background: manualFreightRate === fItem.rate && manualFreightUnit === fItem.unit ? '#dc2626' : '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      color: '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {fItem.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  1. Product Price in RMB (¥)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={manualRmbPrice}
                  onChange={(e) => setManualRmbPrice(e.target.value)}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #dc2626', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  2. Exchange Rate (1 RMB = Tk/BDT)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={manualRateRmb}
                  onChange={(e) => setManualRateRmb(e.target.value)}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #dc2626', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                  3. Product Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  value={manualQty}
                  onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                  4. Weight per Unit
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.05"
                    value={manualWeightVal}
                    onChange={(e) => setManualWeightVal(e.target.value)}
                    style={{ flex: 1, background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}
                  />
                  <select
                    value={manualWeightUnit}
                    onChange={(e: any) => setManualWeightUnit(e.target.value)}
                    style={{ background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', color: '#fff' }}
                  >
                    <option value="gm">gm</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  5. Freight Charge Rate (Tk/BDT)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.1"
                    value={manualFreightRate}
                    onChange={(e) => setManualFreightRate(e.target.value)}
                    style={{ flex: 1, background: '#09090b', border: '1px solid #dc2626', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontWeight: 700 }}
                  />
                  <select
                    value={manualFreightUnit}
                    onChange={(e: any) => setManualFreightUnit(e.target.value)}
                    style={{ background: '#09090b', border: '1px solid #dc2626', borderRadius: '8px', padding: '8px', color: '#fff', fontWeight: 700 }}
                  >
                    <option value="per_gm">/ gram</option>
                    <option value="per_kg">/ kg</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                  6. Domestic China Freight / Unit (Tk)
                </label>
                <input
                  type="number"
                  value={manualDomesticShipping}
                  onChange={(e) => setManualDomesticShipping(e.target.value)}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                  7. Sourcing Agent Fee %
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={manualAgentFeePct}
                  onChange={(e) => setManualAgentFeePct(e.target.value)}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                  8. Customs Duty & Tax %
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={manualDutyPct}
                  onChange={(e) => setManualDutyPct(e.target.value)}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                  9. Other Overhead Costs Total (Tk)
                </label>
                <input
                  type="number"
                  value={manualOtherCosts}
                  onChange={(e) => setManualOtherCosts(e.target.value)}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 700 }}>
                    10. Target Selling Price / Unit (Tk)
                  </label>
                </div>
                <input
                  type="number"
                  value={manualTargetPrice}
                  onChange={(e) => setManualTargetPrice(e.target.value)}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #22c55e', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontWeight: 700 }}
                />
                {/* Target Price Margin Presets */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => applyTargetMarginPreset(30)}
                    style={{ flex: 1, background: '#18181b', border: '1px solid #22c55e', borderRadius: '4px', padding: '2px 4px', fontSize: '0.7rem', color: '#22c55e', cursor: 'pointer', fontWeight: 600 }}
                  >
                    +30% Margin
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTargetMarginPreset(50)}
                    style={{ flex: 1, background: '#18181b', border: '1px solid #22c55e', borderRadius: '4px', padding: '2px 4px', fontSize: '0.7rem', color: '#22c55e', cursor: 'pointer', fontWeight: 600 }}
                  >
                    +50% Margin
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTargetMarginPreset(100)}
                    style={{ flex: 1, background: '#18181b', border: '1px solid #22c55e', borderRadius: '4px', padding: '2px 4px', fontSize: '0.7rem', color: '#22c55e', cursor: 'pointer', fontWeight: 600 }}
                  >
                    2x Price
                  </button>
                </div>
              </div>
            </div>

            {/* Instant Calculated Output Breakdown Box */}
            <div style={{ background: '#09090b', padding: '1.25rem', borderRadius: '12px', border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff', fontWeight: 800, margin: 0 }}>
                  📊 Itemized Landed Cost & Profit Breakdown (Tk / BDT)
                </h3>

                {/* Profitability Health Pill */}
                {(() => {
                  const math = computeManualMath();
                  let isHigh = math.grossMargin >= 30;
                  let isModerate = math.grossMargin >= 15 && math.grossMargin < 30;
                  return (
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: isHigh ? 'rgba(34, 197, 94, 0.15)' : isModerate ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isHigh ? '#22c55e' : isModerate ? '#f59e0b' : '#ef4444',
                        border: '1px solid ' + (isHigh ? '#22c55e' : isModerate ? '#f59e0b' : '#ef4444'),
                      }}
                    >
                      {isHigh ? '🟢 HIGH PROFITABILITY' : isModerate ? '🟡 MODERATE MARGIN' : '🔴 THIN MARGIN / RISK'}
                    </span>
                  );
                })()}
              </div>

              {/* Visual Cost Structure Distribution Bar */}
              {(() => {
                const math = computeManualMath();
                return (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px' }}>
                      <span>Visual Cost Structure Distribution (% of Landed Cost):</span>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>Total: ৳{formatMoney(math.totalLandedCost)} BDT</span>
                    </div>
                    <div style={{ display: 'flex', height: '10px', borderRadius: '9999px', overflow: 'hidden', background: '#27272a' }}>
                      <div style={{ width: math.itemPct + '%', background: '#dc2626' }} title={"Product Cost: " + math.itemPct + "%"} />
                      <div style={{ width: math.freightPct + '%', background: '#38bdf8' }} title={"Freight: " + math.freightPct + "%"} />
                      <div style={{ width: math.dutyAgentPct + '%', background: '#f59e0b' }} title={"Duties & Agent: " + math.dutyAgentPct + "%"} />
                      <div style={{ width: math.overheadPct + '%', background: '#a855f7' }} title={"Overhead: " + math.overheadPct + "%"} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: '#a1a1aa', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626' }} /> Product ({math.itemPct}%)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} /> Freight ({math.freightPct}%)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> Duties & Agent ({math.dutyAgentPct}%)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} /> Overhead ({math.overheadPct}%)
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                {/* Cost Table */}
                {(() => {
                  const math = computeManualMath();
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#a1a1aa' }}>Total Product Cost (¥{manualRmbPrice} × ৳{manualRateRmb}):</span>
                        <span style={{ fontWeight: 600 }}>৳{formatMoney(math.itemPriceBdt)} Tk / BDT</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#a1a1aa' }}>Domestic China Freight:</span>
                        <span>৳{formatMoney(math.domesticShippingBdt)} Tk / BDT</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#a1a1aa' }}>Agent Sourcing Fee ({manualAgentFeePct}%):</span>
                        <span>৳{formatMoney(Math.round(math.agentFeeBdt))} Tk / BDT</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#a1a1aa' }}>International Freight ({math.totalWeightKg} kg @ ৳{manualFreightRate} {manualFreightUnit === 'per_gm' ? '/gm' : '/kg'}):</span>
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>৳{formatMoney(math.freightBdt)} Tk / BDT</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#a1a1aa' }}>Customs Duty & Tax ({manualDutyPct}%):</span>
                        <span>৳{formatMoney(Math.round(math.dutyVatBdt))} Tk / BDT</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#a1a1aa' }}>Other Overhead Costs:</span>
                        <span>৳{formatMoney(math.otherCostsBdt)} Tk / BDT</span>
                      </div>

                      <hr style={{ borderColor: '#27272a', margin: '8px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                        <span style={{ color: '#ffffff' }}>Total Landed Cost ({manualQty} pcs):</span>
                        <span style={{ color: '#38bdf8' }}>৳{formatMoney(math.totalLandedCost)} Tk / BDT</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: '#dc2626' }}>
                        <span>Landed Cost / Unit:</span>
                        <span>৳{formatMoney(math.perUnitLandedCost)} Tk / BDT</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Profit Metrics */}
                {(() => {
                  const math = computeManualMath();
                  return (
                    <div style={{ background: '#18181b', padding: '1.1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center', border: '1px solid #27272a' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Target Selling Price / Unit:</span>
                        <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.1rem' }}>
                          ৳{formatMoney(math.targetPrice)} Tk / BDT
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Est. Net Profit / Unit:</span>
                        <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.25rem' }}>
                          ৳{formatMoney(math.netProfit)} Tk / BDT
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Batch Net Profit ({manualQty} pcs):</span>
                        <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.1rem' }}>
                          ৳{formatMoney(math.batchTotalProfit)} BDT
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Gross Margin:</span>
                        <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '1.1rem' }}>
                          {math.grossMargin}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>ROI %:</span>
                        <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '1.1rem' }}>
                          {math.roi}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed #27272a' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Break-Even Quantity:</span>
                        <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '0.9rem' }}>
                          {math.breakEvenUnits} pcs to break even
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {/* Loading Skeleton & Progress Overlay */}
        {searchMode !== 'manual' && loading && (
          <SearchLoadingOverlay mode={searchMode === 'image' ? 'image' : 'text'} />
        )}

        {/* Results Section for Text/Image Search */}
        {searchMode !== 'manual' && !loading && searchResults && (
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

            {/* Side-by-Side Supplier Comparison Table */}
            <ComparisonTable results={sourcingResults} rmbRate={Number(globalRateRmbBdt) || 20} />

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

                        {/* Dual AI Co-Pilot Strategic Commercial Insight Box (Gemini + Claude) */}
                        {res.claude_insight && (
                          <div style={{ background: '#09090b', padding: '0.85rem', borderRadius: '10px', border: '1px solid #990000', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 800 }}>
                                🤖 Dual AI Co-Pilot (Gemini + Claude) Strategy
                              </span>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  background: res.claude_insight.commercial_viability === 'HIGH' ? '#14532d' : '#713f12',
                                  color: res.claude_insight.commercial_viability === 'HIGH' ? '#4ade80' : '#fde047',
                                  fontWeight: 700,
                                }}
                              >
                                Viability: {res.claude_insight.commercial_viability || 'HIGH'}
                              </span>
                            </div>

                            {res.claude_insight.recommended_pricing_strategy && (
                              <p style={{ fontSize: '0.8rem', color: '#f8fafc', marginBottom: '6px' }}>
                                💡 <strong>Pricing Strategy:</strong> {res.claude_insight.recommended_pricing_strategy}
                              </p>
                            )}

                            {res.claude_insight.risk_factors && res.claude_insight.risk_factors.length > 0 && (
                              <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginBottom: '6px' }}>
                                <strong>⚠️ Key Risk Factors:</strong>
                                <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>
                                  {res.claude_insight.risk_factors.map((risk, rIdx) => (
                                    <li key={rIdx}>{risk}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {res.claude_insight.sourcing_tip && (
                              <p style={{ fontSize: '0.75rem', color: '#38bdf8', margin: 0 }}>
                                🎯 <strong>Supplier Negotiation Tip:</strong> {res.claude_insight.sourcing_tip}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => addSourcedProductToList(res, idx)}
                          style={{
                            flex: 1,
                            minWidth: '140px',
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          ➕ Add to Product List
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveNegotiationProduct({
                              product: res.product,
                              rmbPrice: res.product.price,
                              qty: math.override.qty,
                            })
                          }
                          style={{
                            flex: 1,
                            minWidth: '140px',
                            background: '#15803d',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 0 10px rgba(21, 128, 61, 0.3)',
                          }}
                        >
                          💬 Chinese Script
                        </button>

                        {res.product?.url && (
                          <a
                            href={res.product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1,
                              minWidth: '140px',
                              textAlign: 'center',
                              background: '#27272a',
                              color: '#ffffff',
                              padding: '10px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              textDecoration: 'none',
                            }}
                          >
                            🔗 Buy on {res.product.platform}
                          </a>
                        )}
                      </div>
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

        {/* Section C: Product List Builder */}
        {searchMode === 'list' && (
          <section style={{ marginBottom: '2rem' }}>
            <ProductListBuilder
              items={productListItems}
              onUpdateItems={setProductListItems}
              apiUrl={apiUrl}
              showToast={showToast}
              defaultRmbRate={liveRates?.cny_to_bdt ? String(liveRates.cny_to_bdt) : globalRateRmbBdt}
              defaultUsdRate={liveRates?.usd_to_bdt ? String(liveRates.usd_to_bdt) : '121.50'}
              onPitchToCustomers={handlePitchToCustomers}
            />
          </section>
        )}

        {/* Section D: Retail Customers & Direct Messaging */}
        {searchMode === 'crm' && (
          <section style={{ marginBottom: '2rem' }}>
            <CustomerManager
              apiUrl={apiUrl}
              productListItems={productListItems}
              showToast={showToast}
              initialSelectedProduct={customerManagerProduct}
            />
          </section>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#18181b',
            border: '1px solid #dc2626',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(220, 38, 38, 0.4)',
            zIndex: 9999,
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1688 / WeChat Price Negotiation Modal */}
      {activeNegotiationProduct && (
        <NegotiationModal
          product={activeNegotiationProduct.product}
          currentRmbPrice={activeNegotiationProduct.rmbPrice}
          quantity={activeNegotiationProduct.qty}
          onClose={() => setActiveNegotiationProduct(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function mathRound(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
