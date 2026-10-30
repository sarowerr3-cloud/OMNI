'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Plus, Scale, Link as LinkIcon, Image as ImageIcon, Wallet, Tag, AlertCircle } from 'lucide-react';
import { ProductItem } from '@/types/listBuilder';
import { compressImageFile, formatExternalUrl } from '@/lib/imageUtils';
import SmartScreenshotExtractor from '@/components/SmartScreenshotExtractor';
import { ExtractedProductData } from '@/types/screenshotExtractor';

interface ProductItemFormProps {
  apiUrl: string;
  rmbRate: string;
  usdRate: string;
  freightRate: string;
  freightUnit: 'per_gm' | 'per_kg';
  includeWeightInTotal: boolean;
  onAddProduct: (item: ProductItem) => void;
  showToast: (msg: string) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: 'var(--text-secondary, #e2e8f0)',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  backgroundColor: 'var(--bg-card, #18181b)',
  border: '1px solid var(--border-color, #27272a)',
  color: 'var(--text-primary, #ffffff)',
  fontSize: '0.85rem',
  boxSizing: 'border-box',
};

const buttonActionStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '8px',
  backgroundColor: 'var(--bg-surface, #27272a)',
  border: '1px solid var(--border-color, #3f3f46)',
  color: 'var(--text-primary, #ffffff)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

export default function ProductItemForm({
  apiUrl,
  rmbRate,
  usdRate,
  freightRate,
  freightUnit,
  includeWeightInTotal,
  onAddProduct,
  showToast,
}: ProductItemFormProps) {
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDetails, setNewDetails] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newCurrency, setNewCurrency] = useState<'BDT' | 'RMB' | 'USD'>('RMB');
  const [newWeightVal, setNewWeightVal] = useState<string>('');
  const [newWeightUnit, setNewWeightUnit] = useState<'kg' | 'gm'>('gm');
  const [newQuantity, setNewQuantity] = useState<number | string>('');
  const [newProductUrl, setNewProductUrl] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newPlatform, setNewPlatform] = useState<string>('Pinduoduo');
  const [newPaidAmount, setNewPaidAmount] = useState<string>('');

  // Structured Manual Features (Color, Size, Model, Style, Shape, Combination)
  const [manualColor, setManualColor] = useState<string>('');
  const [manualSize, setManualSize] = useState<string>('');
  const [manualModel, setManualModel] = useState<string>('');
  const [manualStyle, setManualStyle] = useState<string>('');
  const [manualShape, setManualShape] = useState<string>('');
  const [manualCombination, setManualCombination] = useState<string>('');
  const [manualCustomNote, setManualCustomNote] = useState<string>('');

  const activeManualFeatures = useMemo(() => {
    const list: Array<{ label: string; value: string; icon: string }> = [];
    if (manualColor.trim()) list.push({ label: 'Color', value: manualColor.trim(), icon: '🎨' });
    if (manualSize.trim()) list.push({ label: 'Size', value: manualSize.trim(), icon: '📏' });
    if (manualModel.trim()) list.push({ label: 'Model', value: manualModel.trim(), icon: '⚙️' });
    if (manualStyle.trim()) list.push({ label: 'Style', value: manualStyle.trim(), icon: '✨' });
    if (manualShape.trim()) list.push({ label: 'Shape', value: manualShape.trim(), icon: '🔷' });
    if (manualCombination.trim()) list.push({ label: 'Combo', value: manualCombination.trim(), icon: '📦' });
    return list;
  }, [manualColor, manualSize, manualModel, manualStyle, manualShape, manualCombination]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculatePriceBdt = (priceVal: number, curr: string): number => {
    if (curr === 'RMB') {
      return priceVal * (Number(rmbRate) || 20.0);
    } else if (curr === 'USD') {
      return priceVal * (Number(usdRate) || 120.0);
    }
    return priceVal;
  };

  const calculateWeightKg = (val: number, unit: 'kg' | 'gm'): number => {
    return unit === 'gm' ? val / 1000.0 : val;
  };

  const calculateUnitWeightPriceBdt = (weightKg: number, rateStr: string, unit: 'per_gm' | 'per_kg'): number => {
    const rate = Number(rateStr) || 0;
    if (rate <= 0 || weightKg <= 0) return 0;
    return unit === 'per_gm' ? weightKg * 1000.0 * rate : weightKg * rate;
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    if (!newImages.includes(url)) {
      setNewImages([...newImages, url]);
      showToast('🖼️ Photo URL attached!');
    }
    setNewImageUrl('');
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    showToast(`⏳ Optimizing ${files.length} image${files.length > 1 ? 's' : ''}...`);
    const newCompressed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const compressed = await compressImageFile(file, 900, 0.82);
        if (compressed) newCompressed.push(compressed);
      }
    }

    if (newCompressed.length > 0) {
      setNewImages((prev) => [...prev, ...newCompressed]);
      showToast(`✅ ${newCompressed.length} photo${newCompressed.length > 1 ? 's' : ''} added!`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveNewImage = (idx: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAutoFillFromScreenshot = (data: ExtractedProductData) => {
    if (!data.isProductScreenshot || data.productName === 'No data found') {
      showToast('⚠️ No product details detected in this screenshot to auto-fill.');
      return;
    }
    if (data.productName && data.productName !== 'No data found') {
      setNewTitle(data.productName);
    }
    if (typeof data.priceCNY === 'number' && data.priceCNY > 0) {
      setNewPrice(String(data.priceCNY));
      setNewCurrency('RMB');
    } else {
      setNewPrice('');
    }
    const hasWeight = typeof data.finalWeightKg === 'number' && data.finalWeightKg > 0;
    if (hasWeight && data.finalWeightKg) {
      if (newWeightUnit === 'gm') {
        setNewWeightVal(String(Math.round(data.finalWeightKg * 1000)));
      } else {
        setNewWeightVal(String(data.finalWeightKg));
      }
    } else {
      setNewWeightVal('');
    }

    if (data.hasSelectedFeatures && data.selectedFeatures?.summaryList && data.selectedFeatures.summaryList.length > 0) {
      const specText = data.selectedFeatures.summaryList.join(' | ');
      setNewDetails(specText);
    } else if (data.colors && data.colors.length > 0) {
      const specText = data.colors.join(' | ');
      setNewDetails(specText);
    } else {
      setNewDetails('');
    }

    // Populate structured manual feature fields directly
    if (data.selectedFeatures) {
      setManualColor(data.selectedFeatures.color || '');
      setManualSize(data.selectedFeatures.size || '');
      setManualModel(data.selectedFeatures.model || '');
      setManualStyle(data.selectedFeatures.style || '');
      setManualShape(data.selectedFeatures.shape || '');
      setManualCombination(data.selectedFeatures.combination || '');
      setManualCustomNote('');
    } else {
      setManualColor('');
      setManualSize('');
      setManualModel('');
      setManualStyle('');
      setManualShape('');
      setManualCombination('');
      setManualCustomNote('');
    }

    const primaryImg = data.croppedImageDataUrl || data.originalImageDataUrl;
    if (primaryImg) {
      setNewImages((prev) => [primaryImg, ...prev.filter((img) => img !== primaryImg)]);
    }
    if (data.platformDetected) {
      setNewPlatform(data.platformDetected);
    }
  };

  const handleAddDirectlyToListFromScreenshot = (data: ExtractedProductData) => {
    if (!data.isProductScreenshot || data.productName === 'No data found') {
      showToast('⚠️ Cannot add product: No product or pricing data found in screenshot. Please enter details manually.');
      return;
    }

    const priceNum = typeof data.priceCNY === 'number' && data.priceCNY > 0 ? data.priceCNY : 0;
    const rateNum = Number(data.exchangeRate || rmbRate || 20.0);
    const priceBdt = Math.round(priceNum * rateNum * 100) / 100;
    const hasWeight = typeof data.finalWeightKg === 'number' && data.finalWeightKg > 0;
    const finalWeightKg = hasWeight && data.finalWeightKg ? data.finalWeightKg : 0;
    const unitWeightPrice = finalWeightKg > 0 ? calculateUnitWeightPriceBdt(finalWeightKg, freightRate, freightUnit) : 0;
    const primaryImg =
      data.croppedImageDataUrl ||
      data.originalImageDataUrl ||
      'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=400&q=80';

    const selectedDetails = data.hasSelectedFeatures && data.selectedFeatures?.summaryList && data.selectedFeatures.summaryList.length > 0
      ? data.selectedFeatures.summaryList.join(' | ')
      : (data.colors && data.colors.length > 0 ? data.colors.join(' | ') : '');

    const newItem: ProductItem = {
      id: `prod_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: data.productName || 'Imported Sourced Product',
      details: selectedDetails,
      price: priceNum,
      currency: 'RMB',
      price_bdt: priceBdt,
      weight_kg: Number(finalWeightKg.toFixed(3)),
      quantity: 1,
      weight_price_bdt: Number(unitWeightPrice.toFixed(2)),
      line_weight_price_bdt: Number(unitWeightPrice.toFixed(2)),
      combined_unit_price_bdt: Number((priceBdt + unitWeightPrice).toFixed(2)),
      combined_line_total_bdt: Number((priceBdt + unitWeightPrice).toFixed(2)),
      product_url: undefined,
      image_url: primaryImg,
      images: [primaryImg],
      platform: data.platformDetected || '1688',
      paid_amount: 0,
      due_amount: priceBdt + unitWeightPrice,
      payment_status: 'unpaid',
    };

    onAddProduct(newItem);
    showToast(`⚡ AI Extracted & Added "${newItem.title}" to list!`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('⚠️ Please enter a product title!');
      return;
    }

    const priceNum = Math.max(0, Number(newPrice) || 0);
    const priceBdt = calculatePriceBdt(priceNum, newCurrency);
    const weightNum = Math.max(0, Number(newWeightVal) || 0);
    const weightKg = calculateWeightKg(weightNum, newWeightUnit);
    const qty = Math.max(1, Number(newQuantity) || 1);

    const unitWeightPrice = calculateUnitWeightPriceBdt(weightKg, freightRate, freightUnit);
    const lineWeightPrice = unitWeightPrice * qty;
    const lineProductTotal = priceBdt * qty;
    const combinedLineTotal = lineProductTotal + lineWeightPrice;

    const lineTotalBdt = includeWeightInTotal ? combinedLineTotal : lineProductTotal;
    const paidNum = Math.max(0, Number(newPaidAmount) || 0);
    const dueNum = Math.max(0, lineTotalBdt - paidNum);
    const itemStatus: 'paid' | 'partial' | 'unpaid' =
      dueNum === 0 && paidNum > 0 ? 'paid' : paidNum > 0 ? 'partial' : 'unpaid';

    const imagesList = [...newImages];
    if (newImageUrl.trim() && !imagesList.includes(newImageUrl.trim())) {
      imagesList.push(newImageUrl.trim());
    }
    const defaultPlaceholder =
      'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=400&q=80';
    const primaryImg = imagesList[0] || defaultPlaceholder;
    const finalImages = imagesList.length > 0 ? imagesList : [primaryImg];

    // Combine structured manual features (Color, Size, Model, Style, Shape, Combination)
    const featureStrings = activeManualFeatures.map((f) => `${f.label}: ${f.value}`);
    if (manualCustomNote.trim()) featureStrings.push(manualCustomNote.trim());
    const finalDetails = featureStrings.length > 0 ? featureStrings.join(' | ') : newDetails.trim();

    const newItem: ProductItem = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: newTitle.trim(),
      details: finalDetails,
      price: priceNum,
      currency: newCurrency,
      price_bdt: priceBdt,
      weight_kg: Number(weightKg.toFixed(3)),
      quantity: qty,
      weight_price_bdt: Number(unitWeightPrice.toFixed(2)),
      line_weight_price_bdt: Number(lineWeightPrice.toFixed(2)),
      combined_unit_price_bdt: Number((priceBdt + unitWeightPrice).toFixed(2)),
      combined_line_total_bdt: Number(combinedLineTotal.toFixed(2)),
      product_url: newProductUrl.trim() ? formatExternalUrl(newProductUrl) : undefined,
      image_url: primaryImg,
      images: finalImages,
      platform: newPlatform,
      paid_amount: paidNum,
      due_amount: dueNum,
      payment_status: itemStatus,
    };

    onAddProduct(newItem);
    showToast(`✅ Added "${newItem.title}" (${finalImages.length} photo${finalImages.length > 1 ? 's' : ''}) to product list!`);

    setNewTitle('');
    setNewDetails('');
    setNewPrice('');
    setNewCurrency('RMB');
    setNewWeightVal('');
    setNewWeightUnit('gm');
    setNewPaidAmount('');
    setNewProductUrl('');
    setNewImageUrl('');
    setNewImages([]);
    setNewQuantity('');
    setNewPlatform('Pinduoduo');
  };

  return (
    <div style={{ marginTop: '1.5rem', backgroundColor: 'var(--bg-surface, #09090b)', border: '1px solid rgba(220, 38, 38, 0.4)', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color, #27272a)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus style={{ width: '20px', height: '20px', color: '#dc2626' }} />
          Add Product Sequentially
        </h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)' }}>Products are added step-by-step to the list below</span>
      </div>

      <SmartScreenshotExtractor
        apiUrl={apiUrl}
        defaultExchangeRate={rmbRate || '20.0'}
        onAutoFill={handleAutoFillFromScreenshot}
        onAddDirectlyToList={handleAddDirectlyToListFromScreenshot}
        showToast={showToast}
        isOpenByDefault={true}
      />

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {/* Title */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>
            Product Title / Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Smart Watch Ultra 8 Series"
            style={inputStyle}
          />
        </div>

        {/* Price & Currency */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Unit Price & Currency <span style={{ color: '#dc2626' }}>*</span>
            </label>
            {newCurrency === 'RMB' && Number(newPrice) > 0 && (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8' }}>
                ≈ ৳{((Number(newPrice) || 0) * (Number(rmbRate) || 20.0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
              </span>
            )}
            {newCurrency === 'USD' && Number(newPrice) > 0 && (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399' }}>
                ≈ ৳{((Number(newPrice) || 0) * (Number(usdRate) || 120.0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Enter price"
                style={{ ...inputStyle, paddingRight: '28px' }}
              />
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8', pointerEvents: 'none', fontWeight: 700 }}>
                {newCurrency === 'RMB' ? '¥' : newCurrency === 'USD' ? '$' : '৳'}
              </span>
            </div>
            <select
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value as any)}
              style={{ ...inputStyle, width: '95px', backgroundColor: 'var(--bg-card, #18181b)', fontWeight: 700 }}
            >
              <option value="RMB">RMB (¥)</option>
              <option value="BDT">BDT (৳)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>

        {/* Weight */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <Scale style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
              Unit Weight <span style={{ color: '#dc2626' }}>*</span>
            </label>
            {Number(newWeightVal) > 0 && (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24' }}>
                ≈ ৳{(calculateUnitWeightPriceBdt(calculateWeightKg(Number(newWeightVal) || 0, newWeightUnit), freightRate, freightUnit)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / unit
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="number"
              step="0.001"
              required
              min="0"
              value={newWeightVal}
              onChange={(e) => setNewWeightVal(e.target.value)}
              placeholder="Weight (gm)"
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={newWeightUnit}
              onChange={(e) => setNewWeightUnit(e.target.value as any)}
              style={{ ...inputStyle, width: '70px', backgroundColor: 'var(--bg-card, #18181b)', fontWeight: 700 }}
            >
              <option value="gm">gm</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label style={labelStyle}>Quantity (Units)</label>
          <input
            type="number"
            min="1"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder="1"
            style={inputStyle}
          />
        </div>

        {/* Direct Link URL */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>
            <LinkIcon style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
            Direct Product Link (URL)
          </label>
          <input
            type="url"
            value={newProductUrl}
            onChange={(e) => setNewProductUrl(e.target.value)}
            placeholder="https://detail.1688.com/offer/..."
            style={inputStyle}
          />
        </div>

        {/* Images */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <ImageIcon style={{ width: '14px', height: '14px', color: '#34d399' }} />
              Product Images {newImages.length > 0 && `(${newImages.length} added)`}
            </label>
            {newImages.length > 0 && (
              <button
                type="button"
                onClick={() => setNewImages([])}
                style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Clear all images
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddImageUrl();
                }
              }}
              placeholder="Paste image URL & click + Add, or upload files..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleAddImageUrl}
              disabled={!newImageUrl.trim()}
              style={{
                ...buttonActionStyle,
                padding: '8px 12px',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                opacity: newImageUrl.trim() ? 1 : 0.5,
              }}
            >
              + Add URL
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ ...buttonActionStyle, padding: '8px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap', backgroundColor: 'var(--bg-card, #27272a)' }}
            >
              Upload Photos
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageFileUpload}
              multiple
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          {newImages.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', padding: '8px', backgroundColor: 'var(--bg-card, #18181b)', borderRadius: '8px', border: '1px solid var(--border-color, #27272a)' }}>
              {newImages.map((img, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    width: '52px',
                    height: '52px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color, #3f3f46)',
                    backgroundColor: 'var(--bg-surface, #09090b)',
                    flexShrink: 0,
                  }}
                >
                  <img src={img} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveNewImage(idx)}
                    title="Remove this photo"
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '10px',
                      lineHeight: '1',
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '1px',
                      left: '2px',
                      fontSize: '8px',
                      color: '#ffffff',
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      padding: '0 3px',
                      borderRadius: '2px',
                    }}
                  >
                    #{idx + 1}
                  </span>
                </div>
              ))}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '6px',
                  border: '1px dashed #52525b',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#a1a1aa',
                  fontSize: '9px',
                  gap: '2px',
                }}
              >
                <Plus style={{ width: '14px', height: '14px' }} />
                <span>More</span>
              </div>
            </div>
          )}
        </div>

        {/* STRUCTURED PRODUCT FEATURES (Color, Size, Model, Style, Shape, Combination) */}
        <div
          style={{
            gridColumn: 'span 2',
            backgroundColor: 'var(--bg-surface, #09090b)',
            borderRadius: '10px',
            border: '1px solid var(--border-color, #27272a)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag style={{ width: '14px', height: '14px', color: '#dc2626' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
                Product Features & Selected Options
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #a1a1aa)' }}>
              Only filled features will be saved; empty options are ignored.
            </span>
          </div>

          {/* Live Preview Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '24px', alignItems: 'center' }}>
            {activeManualFeatures.length > 0 ? (
              activeManualFeatures.map((f, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}: {f.value}</span>
                </span>
              ))
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(148, 163, 184, 0.08)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#94a3b8',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={11} style={{ color: '#fbbf24' }} />
                <span>No features present (fill any option below to set features)</span>
              </div>
            )}
          </div>

          {/* 6 Feature Inputs in Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '3px' }}>
                🎨 Color
              </label>
              <input
                type="text"
                placeholder="e.g. Matte Black"
                value={manualColor}
                onChange={(e) => setManualColor(e.target.value)}
                style={{ ...inputStyle, padding: '6px 8px', fontSize: '0.8rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '3px' }}>
                📏 Size
              </label>
              <input
                type="text"
                placeholder="e.g. XL, 42 EU"
                value={manualSize}
                onChange={(e) => setManualSize(e.target.value)}
                style={{ ...inputStyle, padding: '6px 8px', fontSize: '0.8rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '3px' }}>
                ⚙️ Model / Specs
              </label>
              <input
                type="text"
                placeholder="e.g. Pro Edition"
                value={manualModel}
                onChange={(e) => setManualModel(e.target.value)}
                style={{ ...inputStyle, padding: '6px 8px', fontSize: '0.8rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '3px' }}>
                ✨ Style
              </label>
              <input
                type="text"
                placeholder="e.g. Hooded, Thin"
                value={manualStyle}
                onChange={(e) => setManualStyle(e.target.value)}
                style={{ ...inputStyle, padding: '6px 8px', fontSize: '0.8rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '3px' }}>
                🔷 Shape
              </label>
              <input
                type="text"
                placeholder="e.g. Round, Square"
                value={manualShape}
                onChange={(e) => setManualShape(e.target.value)}
                style={{ ...inputStyle, padding: '6px 8px', fontSize: '0.8rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '3px' }}>
                📦 Combo / Bundle
              </label>
              <input
                type="text"
                placeholder="e.g. 1 Device + 2 Batteries"
                value={manualCombination}
                onChange={(e) => setManualCombination(e.target.value)}
                style={{ ...inputStyle, padding: '6px 8px', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '3px' }}>
              Extra Remarks / Details (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Titanium Casing, OLED screen"
              value={manualCustomNote}
              onChange={(e) => setManualCustomNote(e.target.value)}
              style={{ ...inputStyle, padding: '6px 8px', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        {/* Initial Customer Paid Amount */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <Wallet style={{ width: '14px', height: '14px', color: '#34d399' }} />
              Customer Paid (BDT)
            </label>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
              Due: <strong style={{ color: Number(newPaidAmount) >= (calculatePriceBdt(Number(newPrice) || 0, newCurrency) * (Number(newQuantity) || 1)) ? '#34d399' : '#f87171' }}>
                ৳{Math.max(0, (calculatePriceBdt(Number(newPrice) || 0, newCurrency) * (Number(newQuantity) || 1)) - (Number(newPaidAmount) || 0)).toLocaleString()}
              </strong>
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              min="0"
              step="1"
              value={newPaidAmount}
              onChange={(e) => setNewPaidAmount(e.target.value)}
              placeholder="0"
              style={{ ...inputStyle, paddingRight: '60px' }}
            />
            <button
              type="button"
              onClick={() => {
                const priceBdt = calculatePriceBdt(Number(newPrice) || 0, newCurrency);
                const weightKg = calculateWeightKg(Number(newWeightVal) || 0, newWeightUnit);
                const unitWeightPrice = calculateUnitWeightPriceBdt(weightKg, freightRate, freightUnit);
                const combinedLineTotal = (priceBdt + unitWeightPrice) * (Number(newQuantity) || 1);
                const fullAmount = includeWeightInTotal ? combinedLineTotal : priceBdt * (Number(newQuantity) || 1);
                setNewPaidAmount(String(Math.round(fullAmount)));
              }}
              title="Set 100% paid (including weight price)"
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '3px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: 'var(--bg-card, #27272a)',
                color: '#34d399',
                border: '1px solid var(--border-color, #3f3f46)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Full
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            type="submit"
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #dc2626 0%, #990000 100%)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 800,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)',
            }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            Add Product to List
          </button>
        </div>
      </form>
    </div>
  );
}
