'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Tag, 
  X, 
  Upload, 
  Camera, 
  Link as LinkIcon, 
  Sparkles, 
  Check 
} from 'lucide-react';
import { 
  PRODUCT_CATEGORIES, 
  CategorizedProduct 
} from '@/types/catalog';
import { formatMoney } from '@/lib/formatters';
import { compressImageFile } from '@/lib/imageUtils';
import { useToast } from '@/context/ToastContext';

interface ProductModalFormProps {
  isOpen: boolean;
  initialProduct: CategorizedProduct | null;
  onClose: () => void;
  onSave: (productData: {
    id?: string;
    title: string;
    category: string;
    platform: CategorizedProduct['platform'];
    source_price: number;
    currency: 'RMB' | 'USD';
    weight_val: number;
    weight_unit: 'gm' | 'kg';
    weight_kg: number;
    moq: number;
    target_selling_price: number;
    image_url?: string;
    images?: string[];
    product_url?: string;
    notes?: string;
    sku?: string;
    computed_landed_cost: number;
    computed_profit: number;
    computed_margin: number;
  }) => void;
  computeProductCost: (price: number, curr: 'RMB' | 'USD', weightKg: number) => number;
}

export default function ProductModalForm({
  isOpen,
  initialProduct,
  onClose,
  onSave,
  computeProductCost,
}: ProductModalFormProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formCategory, setFormCategory] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formPlatform, setFormPlatform] = useState<CategorizedProduct['platform']>('Pinduoduo');
  const [formSourcePrice, setFormSourcePrice] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<'RMB' | 'USD'>('RMB');
  const [formWeightVal, setFormWeightVal] = useState<string>('');
  const [formWeightUnit, setFormWeightUnit] = useState<'gm' | 'kg'>('gm');
  const [formMoq, setFormMoq] = useState<string>('0');
  const [formTargetPrice, setFormTargetPrice] = useState<string>('');
  const [formProductUrl, setFormProductUrl] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formSku, setFormSku] = useState<string>('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  useEffect(() => {
    if (initialProduct) {
      setFormCategory(initialProduct.category || '');
      setFormTitle(initialProduct.title || '');
      setFormPlatform(initialProduct.platform || 'Pinduoduo');
      setFormSourcePrice(String(initialProduct.source_price ?? ''));
      setFormCurrency(initialProduct.currency || 'RMB');
      setFormWeightVal(String(initialProduct.weight_val ?? ''));
      setFormWeightUnit(initialProduct.weight_unit || 'gm');
      setFormMoq(String(initialProduct.moq ?? '0'));
      setFormTargetPrice(String(initialProduct.target_selling_price ?? ''));
      setFormProductUrl(initialProduct.product_url || '');
      setFormNotes(initialProduct.notes || '');
      setFormSku(initialProduct.sku || '');

      const existingImgs = (initialProduct.images && initialProduct.images.length > 0)
        ? initialProduct.images
        : (initialProduct.image_url ? [initialProduct.image_url] : []);
      setFormImages(existingImgs);
      setUrlInput('');
    } else {
      setFormCategory('');
      setFormTitle('');
      setFormPlatform('Pinduoduo');
      setFormSourcePrice('');
      setFormCurrency('RMB');
      setFormWeightVal('');
      setFormWeightUnit('gm');
      setFormMoq('0');
      setFormTargetPrice('');
      setFormProductUrl('');
      setFormNotes('');
      setFormSku('');
      setFormImages([]);
      setUrlInput('');
    }
  }, [initialProduct, isOpen]);

  if (!isOpen) return null;

  // Handle Multi-Photo File Upload with Canvas Compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const compressedList = await Promise.all(
        files.map((file) => compressImageFile(file, 800, 0.82))
      );
      const validImages = compressedList.filter(Boolean);
      if (validImages.length > 0) {
        setFormImages((prev) => [...prev, ...validImages]);
        toast.success(`📸 ${validImages.length} photo${validImages.length > 1 ? 's' : ''} added & compressed!`);
      }
    } catch {
      toast.error('Image upload failed');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add Photo from URL
  const handleAddImageUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('data:')) {
      toast.warning('Please enter a valid URL (starting with http:// or https://)');
      return;
    }
    setFormImages((prev) => [...prev, trimmed]);
    setUrlInput('');
    toast.success('Photo link added to gallery!');
  };

  const handleRemovePhoto = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverPhoto = (index: number) => {
    if (index === 0) return;
    setFormImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      return [item, ...copy];
    });
    toast.info('Set as primary cover photo');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.warning('Please enter a product title');
      return;
    }

    if (!formCategory) {
      toast.warning('Please select a product category');
      return;
    }

    const priceNum = parseFloat(formSourcePrice) || 0;
    const weightValNum = parseFloat(formWeightVal) || 0;
    const weightKg = formWeightUnit === 'gm' ? weightValNum / 1000 : weightValNum;
    const targetPriceNum = parseFloat(formTargetPrice) || 0;
    const parsedMoq = parseInt(formMoq, 10);
    const moqNum = isNaN(parsedMoq) ? 0 : Math.max(0, parsedMoq);

    const landedCost = computeProductCost(priceNum, formCurrency, weightKg);
    const profit = targetPriceNum > 0 ? targetPriceNum - landedCost : 0;
    const margin = targetPriceNum > 0 ? Math.round((profit / targetPriceNum) * 100) : 0;

    const primaryImg = formImages[0] || undefined;
    const allImgs = formImages.length > 0 ? formImages : undefined;

    onSave({
      id: initialProduct?.id,
      title: formTitle.trim(),
      category: formCategory,
      platform: formPlatform,
      source_price: priceNum,
      currency: formCurrency,
      weight_val: weightValNum,
      weight_unit: formWeightUnit,
      weight_kg: weightKg,
      moq: moqNum,
      target_selling_price: targetPriceNum,
      image_url: primaryImg,
      images: allImgs,
      product_url: formProductUrl.trim() || undefined,
      notes: formNotes.trim() || undefined,
      sku: formSku.trim() || undefined,
      computed_landed_cost: landedCost,
      computed_profit: profit,
      computed_margin: margin,
    });
  };

  // Live preview metrics
  const formPriceNum = parseFloat(formSourcePrice) || 0;
  const formWeightNum = parseFloat(formWeightVal) || 0;
  const formWeightKg = formWeightUnit === 'gm' ? formWeightNum / 1000 : formWeightNum;
  const formEstimatedCost = computeProductCost(formPriceNum, formCurrency, formWeightKg);
  const formTargetNum = parseFloat(formTargetPrice) || 0;
  const formEstimatedProfit = formTargetNum > 0 ? formTargetNum - formEstimatedCost : 0;
  const formEstimatedMargin = formTargetNum > 0 ? Math.round((formEstimatedProfit / formTargetNum) * 100) : 0;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-highlight)',
      borderRadius: '18px',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Tag size={17} style={{ color: 'var(--omni-red)' }} />
          {initialProduct ? 'Edit Product Details' : 'Add New Product to Store'}
        </h3>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="image/*" 
          multiple 
          style={{ display: 'none' }} 
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Product Title */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Product Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wireless Smart Watch Pro AMOLED"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Category *
            </label>
            <select
              required
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: formCategory ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '0.88rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="" disabled>Select one</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} style={{ color: 'var(--text-primary)' }}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sourcing Platform */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Platform
            </label>
            <select
              value={formPlatform}
              onChange={(e) => setFormPlatform(e.target.value as any)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="Pinduoduo">Pinduoduo</option>
              <option value="1688">1688 Wholesale</option>
              <option value="Taobao">Taobao</option>
              <option value="AliExpress">AliExpress</option>
              <option value="Factory Direct">Factory Direct</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Product Supplier Link */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Product / Supplier Link (URL)
            </label>
            <div style={{ position: 'relative' }}>
              <LinkIcon size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="url"
                placeholder="https://detail.1688.com/offer/... or product page link"
                value={formProductUrl}
                onChange={(e) => setFormProductUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Purchase Price & Currency */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Purchase Price
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value as any)}
                style={{
                  width: '80px',
                  padding: '9px 8px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="RMB">¥ RMB</option>
                <option value="USD">$ USD</option>
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formSourcePrice}
                onChange={(e) => setFormSourcePrice(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Weight & Unit */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Unit Weight
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 250"
                value={formWeightVal}
                onChange={(e) => setFormWeightVal(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              <select
                value={formWeightUnit}
                onChange={(e) => setFormWeightUnit(e.target.value as any)}
                style={{
                  width: '75px',
                  padding: '9px 8px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="gm">gm</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          {/* MULTI-PHOTO UPLOAD & URL GALLERY SECTION */}
          <div style={{
            gridColumn: 'span 2',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={15} style={{ color: 'var(--omni-red)' }} />
                <span>Product Photos Gallery (Add as many as you want)</span>
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {formImages.length} photo{formImages.length !== 1 ? 's' : ''} attached
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Upload size={14} style={{ color: 'var(--omni-red)' }} />
                {isUploadingImage ? 'Optimizing...' : 'Upload Photos (Select Multiple)'}
              </button>

              <div style={{ display: 'flex', flex: 1, minWidth: '240px', gap: '4px' }}>
                <input
                  type="url"
                  placeholder="Or paste photo URL..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Add URL
                </button>
              </div>
            </div>

            {formImages.length > 0 ? (
              <div style={{
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                padding: '8px 4px',
                scrollbarWidth: 'thin',
              }}>
                {formImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '78px',
                      height: '78px',
                      borderRadius: '10px',
                      border: idx === 0 ? '2px solid var(--omni-red)' : '1px solid var(--border-color)',
                      overflow: 'hidden',
                      background: 'var(--bg-card)',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Upload ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />

                    {idx === 0 && (
                      <span style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'var(--omni-red)',
                        color: '#ffffff',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        padding: '1px 0',
                      }}>
                        Cover
                      </span>
                    )}

                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetCoverPhoto(idx)}
                        title="Set as main cover photo"
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          left: '2px',
                          background: 'rgba(0,0,0,0.65)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          fontSize: '0.6rem',
                          cursor: 'pointer',
                        }}
                      >
                        Set Cover
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      title="Remove photo"
                      style={{
                        position: 'absolute',
                        top: '3px',
                        right: '3px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: 800,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                No photos added yet. Upload files or paste image links above.
              </p>
            )}
          </div>

          {/* Product Details / Specifications */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Details & Specifications
            </label>
            <textarea
              rows={2}
              placeholder="Specifications, available colors, packaging, supplier notes..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Minimum Order (MOQ) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              MOQ (Units)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={formMoq}
              onChange={(e) => setFormMoq(e.target.value)}
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

          {/* Target Selling Price in BDT */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Target Retail Price (BDT ৳)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              placeholder="e.g. 1500"
              value={formTargetPrice}
              onChange={(e) => setFormTargetPrice(e.target.value)}
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
        </div>

        {/* Live Calculation Preview Banner */}
        {formPriceNum > 0 && (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-highlight)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '1.25rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: 'var(--omni-red)' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Est. Landed Cost:
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--omni-red)' }}>
                ৳{formatMoney(formEstimatedCost)} BDT / unit
              </span>
            </div>

            {formTargetNum > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem' }}>
                <span style={{ color: formEstimatedProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                  {formEstimatedProfit >= 0 ? '🟢 Net Profit: +৳' : '🔴 Loss: ৳'}{formatMoney(Math.abs(formEstimatedProfit))}
                </span>
                <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  Margin: {formEstimatedMargin}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 24px',
              borderRadius: '8px',
              background: 'var(--omni-red)',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 2px 10px rgba(220, 38, 38, 0.3)',
            }}
          >
            <Check size={16} />
            {initialProduct ? 'Save Changes' : 'Store Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
