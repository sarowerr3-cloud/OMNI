'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Package,
  Image as ImageIcon,
  Link as LinkIcon,
  Scale,
  Coins,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  ExternalLink,
  Sparkles,
  User,
  Phone,
  MapPin,
  Check,
  UploadCloud,
  Camera,
  Trash2,
  Loader2,
  Truck,
  Box
} from 'lucide-react';
import { Customer, CustomerOrder, CustomerOrderPayload } from '@/types/customer';
import { inputStyle, labelStyle, buttonActionStyle } from './customerStyles';
import SmartScreenshotExtractor from '@/components/SmartScreenshotExtractor';
import { ExtractedProductData } from '@/types/screenshotExtractor';

interface CustomerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  orderToEdit?: CustomerOrder | null;
  onSaveOrder: (orderPayload: CustomerOrderPayload, orderId?: string) => Promise<void>;
  showToast: (msg: string) => void;
  apiUrl?: string;
  defaultExchangeRate?: string | number;
}

export default function CustomerOrderModal({
  isOpen,
  onClose,
  customer,
  orderToEdit,
  onSaveOrder,
  showToast,
  apiUrl,
  defaultExchangeRate = '20.0'
}: CustomerOrderModalProps) {
  // Form State
  const [productName, setProductName] = useState<string>('');
  const [productImage, setProductImage] = useState<string>('');
  const [productLink, setProductLink] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'gm'>('kg');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryCost, setDeliveryCost] = useState<string>('');
  const [packingCost, setPackingCost] = useState<string>('');
  const [advancePayment, setAdvancePayment] = useState<string>('');
  const [dateTime, setDateTime] = useState<string>('');
  const [isDelivered, setIsDelivered] = useState<boolean>(false);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Local Image Upload & Extractor State
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [isImageDragging, setIsImageDragging] = useState<boolean>(false);
  const [isExtractingDirectImage, setIsExtractingDirectImage] = useState<boolean>(false);

  // Initialize or reset form values
  useEffect(() => {
    if (orderToEdit) {
      setProductName(orderToEdit.product_name || '');
      setProductImage(orderToEdit.product_image || '');
      setProductLink(orderToEdit.product_link || '');
      setWeight(orderToEdit.weight !== undefined && orderToEdit.weight !== null ? String(orderToEdit.weight) : '');
      setWeightUnit(orderToEdit.weight_unit || 'kg');
      setPrice(String(orderToEdit.price ?? ''));
      setQuantity(orderToEdit.quantity || 1);
      setDeliveryCost(orderToEdit.delivery_cost !== undefined && orderToEdit.delivery_cost !== null ? String(orderToEdit.delivery_cost) : '');
      setPackingCost(orderToEdit.packing_cost !== undefined && orderToEdit.packing_cost !== null ? String(orderToEdit.packing_cost) : '');
      setAdvancePayment(orderToEdit.advance_payment !== undefined && orderToEdit.advance_payment !== null ? String(orderToEdit.advance_payment) : '');
      setDateTime(orderToEdit.date_time || getCurrentDateTime());
      setIsDelivered(!!orderToEdit.is_delivered);
      setIsCancelled(!!orderToEdit.is_cancelled);
      setNotes(orderToEdit.notes || '');
    } else {
      setProductName('');
      setProductImage('');
      setProductLink('');
      setWeight('');
      setWeightUnit('kg');
      setPrice('');
      setQuantity(1);
      setDeliveryCost(
        customer?.default_delivery_cost !== undefined && customer?.default_delivery_cost !== null && customer.default_delivery_cost > 0
          ? String(customer.default_delivery_cost)
          : ''
      );
      setPackingCost(
        customer?.default_packing_cost !== undefined && customer?.default_packing_cost !== null && customer.default_packing_cost > 0
          ? String(customer.default_packing_cost)
          : ''
      );
      setAdvancePayment('');
      setDateTime(getCurrentDateTime());
      setIsDelivered(false);
      setIsCancelled(false);
      setNotes('');
    }
  }, [orderToEdit, isOpen, customer]);

  // Current formatted date/time helper: YYYY-MM-DD HH:mm
  function getCurrentDateTime(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Handle auto-fill from AI Smart Screenshot Extractor
  const handleAutoFillFromScreenshot = useCallback((data: ExtractedProductData) => {
    if (!data.isProductScreenshot || data.productName === 'No data found') {
      showToast('⚠️ No product details detected in this screenshot to auto-fill.');
      return;
    }

    if (data.productName && data.productName !== 'No data found') {
      setProductName(data.productName);
    }

    // Set cropped thumbnail or original uploaded screenshot
    const primaryImg = data.croppedImageDataUrl || data.originalImageDataUrl;
    if (primaryImg) {
      setProductImage(primaryImg);
    }

    // Converted price in BDT (leave empty if not detected)
    if (typeof data.priceBDT === 'number' && data.priceBDT > 0) {
      setPrice(String(Math.round(data.priceBDT)));
    } else if (typeof data.priceCNY === 'number' && data.priceCNY > 0) {
      const activeRate = Number(data.exchangeRate || defaultExchangeRate || 20.0);
      setPrice(String(Math.round(data.priceCNY * activeRate)));
    } else {
      setPrice('');
    }

    // Weight Logic:
    // Only set weight if explicitly identified in screenshot (with 1.2x safety factor).
    // If not found in screenshot, leave it empty for manual entry!
    const hasWeight = typeof data.finalWeightKg === 'number' && data.finalWeightKg > 0;
    if (hasWeight && data.finalWeightKg) {
      if (weightUnit === 'gm') {
        setWeight(String(Math.round(data.finalWeightKg * 1000)));
      } else {
        setWeight(String(data.finalWeightKg));
      }
    } else {
      // User rule: No automatic base weight - leave empty for manual input!
      setWeight('');
    }

    // Notes / Specs (Colors)
    if (data.colors && data.colors.length > 0) {
      const colorSpec = `Colors: ${data.colors.join(', ')}`;
      setNotes((prev) => (prev ? `${prev} | ${colorSpec}` : colorSpec));
    }

    if (data.platformDetected && !productLink) {
      setNotes((prev) => (prev ? `${prev} | Sourced from ${data.platformDetected}` : `Sourced from ${data.platformDetected}`));
    }
  }, [defaultExchangeRate, productLink, weightUnit]);

  // Process a local File for product image
  const processLocalImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('⚠️ Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || '';
      setProductImage(dataUrl);
      showToast('📸 Product photo uploaded! Click "⚡ Extract with AI" to auto-fill details.');
    };
    reader.readAsDataURL(file);
  }, [showToast]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processLocalImageFile(e.target.files[0]);
    }
  };

  // Direct AI extraction for the currently loaded product image
  const handleDirectAiExtract = async () => {
    if (!productImage) {
      showToast('⚠️ Please upload or paste a product image/screenshot first.');
      return;
    }

    setIsExtractingDirectImage(true);
    showToast('🤖 Analyzing image with Google Gemini Vision...');

    try {
      const formData = new FormData();
      if (productImage.startsWith('data:')) {
        const res = await fetch(productImage);
        const blob = await res.blob();
        formData.append('file', blob, 'product_screenshot.png');
      } else {
        formData.append('imageUrl', productImage);
      }

      const activeRate = Number(defaultExchangeRate || 20.0);
      formData.append('cnyRate', String(activeRate));
      formData.append('exchangeRate', String(activeRate));

      let response: Response;
      try {
        response = await fetch('/api/products/analyze-screenshot', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok && apiUrl) {
          response = await fetch(`${apiUrl}/api/products/analyze-screenshot`, {
            method: 'POST',
            body: formData,
          });
        }
      } catch (err) {
        if (apiUrl) {
          response = await fetch(`${apiUrl}/api/products/analyze-screenshot`, {
            method: 'POST',
            body: formData,
          });
        } else {
          throw err;
        }
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.detail || 'Failed to extract screenshot data.');
      }

      const extracted: ExtractedProductData = await response.json();
      extracted.exchangeRate = activeRate;
      extracted.originalImageDataUrl = productImage;
      handleAutoFillFromScreenshot(extracted);

      const hasWeight = typeof extracted.finalWeightKg === 'number' && extracted.finalWeightKg > 0;
      showToast(
        hasWeight
          ? `✨ Extracted: "${extracted.productName.slice(0, 30)}..." | ৳${extracted.priceBDT} | 1.2× Weight: ${extracted.finalWeightKg}kg`
          : `✨ Extracted: "${extracted.productName.slice(0, 30)}..." | ৳${extracted.priceBDT} (Weight left empty as requested)`
      );
    } catch (err: any) {
      console.error('Direct extraction failed:', err);
      showToast(`❌ ${err.message || 'AI extraction failed. Please try again.'}`);
    } finally {
      setIsExtractingDirectImage(false);
    }
  };

  // Clipboard paste listener (Ctrl+V) when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processLocalImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, processLocalImageFile]);

  if (!isOpen) return null;

  // Real-time calculations
  const numPrice = parseFloat(price) || 0;
  const numQty = quantity > 0 ? quantity : 1;
  const productSubtotal = Math.round(numPrice * numQty);
  const numDelivery = parseFloat(deliveryCost) || 0;
  const numPacking = parseFloat(packingCost) || 0;
  const totalAmount = Math.round(productSubtotal + numDelivery + numPacking);
  const numAdvance = parseFloat(advancePayment) || 0;
  const remainingBalance = Math.max(0, totalAmount - numAdvance);

  // Live payment status badge
  let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
  if (numAdvance >= totalAmount && totalAmount > 0) {
    paymentStatus = 'paid';
  } else if (numAdvance > 0) {
    paymentStatus = 'partial';
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      showToast('⚠️ Please enter a product name');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CustomerOrderPayload = {
        product_name: productName.trim(),
        product_image: productImage.trim() || null,
        product_link: productLink.trim() || null,
        weight: parseFloat(weight) || 0,
        weight_unit: weightUnit,
        price: numPrice,
        quantity: numQty,
        delivery_cost: numDelivery,
        packing_cost: numPacking,
        total_amount: totalAmount,
        advance_payment: numAdvance,
        remaining_balance: remainingBalance,
        payment_status: paymentStatus,
        date_time: dateTime || getCurrentDateTime(),
        is_delivered: isDelivered,
        is_cancelled: isCancelled,
        status: isCancelled ? 'cancelled' : (isDelivered ? 'delivered' : 'active'),
        notes: notes.trim() || null,
      };

      await onSaveOrder(payload, orderToEdit?.id);
      showToast(orderToEdit ? '✅ Order updated successfully!' : '✅ New order saved to customer profile!');
      onClose();
    } catch (err) {
      console.error('Failed to save order:', err);
      showToast('❌ Error saving order. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '20px',
          boxShadow: 'var(--neu-flat)',
          border: '1px solid var(--neu-rim)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--neu-rim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {orderToEdit ? 'Edit Customer Order' : 'Input New Customer Order'}
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{customer.name}</span>
                <span>•</span>
                <span>{customer.phone}</span>
                {customer.address && (
                  <>
                    <span>•</span>
                    <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {customer.address}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE WITH INDEPENDENT SECTIONS) */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* AI-Powered Smart Screenshot Extractor (1688, AliExpress, Pinduoduo, Taobao) */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                padding: '0 4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <Sparkles size={14} color="#ffffff" />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
                  AI SMART SCREENSHOT EXTRACTOR
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  1688 • Taobao • AliExpress • PDD
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Press <kbd style={{ padding: '2px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--omni-red)', fontWeight: 700 }}>Ctrl + V</kbd> to paste
              </span>
            </div>

            <SmartScreenshotExtractor
              apiUrl={apiUrl}
              defaultExchangeRate={defaultExchangeRate || '20.0'}
              onAutoFill={handleAutoFillFromScreenshot}
              showToast={showToast}
              isOpenByDefault={true}
            />
          </div>


          {/* SECTION 1: PRODUCT DETAILS */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={16} style={{ color: 'var(--omni-red)' }} />
                <span>1. Product Information</span>
              </div>
              {productImage && (
                <button
                  type="button"
                  onClick={handleDirectAiExtract}
                  disabled={isExtractingDirectImage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    cursor: isExtractingDirectImage ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isExtractingDirectImage ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Extracting with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>⚡ Auto-Fill from Image</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Product Name */}
            <div>
              <label style={labelStyle}>Product Name *</label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. HK9 Ultra 2 AMOLED Smart Watch"
                style={inputStyle}
              />
            </div>

            {/* Product Image Upload & Preview */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, margin: 0 }}>Product Photo / Screenshot</label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Local File • Remote URL • Paste (Ctrl+V)
                </span>
              </div>

              {/* Hidden native file input */}
              <input
                type="file"
                ref={imageFileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageFileChange}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsImageDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsImageDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsImageDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processLocalImageFile(e.dataTransfer.files[0]);
                  }
                }}
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                  background: isImageDragging ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-surface)',
                  border: isImageDragging ? '2px dashed var(--omni-red)' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Clickable Thumbnail Preview */}
                <div
                  onClick={() => imageFileInputRef.current?.click()}
                  title="Click to browse image from your device"
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '12px',
                    border: '1px dashed var(--neu-rim)',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--neu-flat-sm)',
                  }}
                >
                  {productImage ? (
                    <>
                      <img
                        src={productImage}
                        alt="Product Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s ease',
                          color: '#ffffff',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          gap: '2px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                      >
                        <Camera size={16} />
                        <span>Change</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: 'var(--text-muted)' }}>
                      <UploadCloud size={22} style={{ color: 'var(--omni-red)' }} />
                      <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Upload</span>
                    </div>
                  )}
                </div>

                {/* URL Input & Direct Actions */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <ImageIcon size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={productImage}
                      onChange={(e) => setProductImage(e.target.value)}
                      placeholder="Paste image URL OR click 'Browse Image' below..."
                      style={{ ...inputStyle, paddingLeft: '32px', fontSize: '0.8rem', padding: '8px 12px 8px 32px' }}
                    />
                  </div>

                  {/* Button row */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => imageFileInputRef.current?.click()}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                      }}
                    >
                      <UploadCloud size={14} />
                      Browse Image
                    </button>

                    {productImage && (
                      <>
                        <button
                          type="button"
                          onClick={handleDirectAiExtract}
                          disabled={isExtractingDirectImage}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            cursor: isExtractingDirectImage ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {isExtractingDirectImage ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Analyzing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={13} />
                              <span>⚡ Extract with AI</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setProductImage('')}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            backgroundColor: 'transparent',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <X size={12} />
                          Clear Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Product Link */}
            <div>
              <label style={labelStyle}>Product Purchase / Source Link</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <LinkIcon size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="url"
                    value={productLink}
                    onChange={(e) => setProductLink(e.target.value)}
                    placeholder="e.g. 1688 / Taobao / Daraz / Website Link"
                    style={{ ...inputStyle, paddingLeft: '36px' }}
                  />
                </div>
                {productLink && (
                  <a
                    href={productLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      ...buttonActionStyle,
                      textDecoration: 'none',
                      padding: '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Open link in new tab"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>

            {/* Weight and Weight Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ ...labelStyle, margin: 0 }}>Weight</label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    (Auto-calculated only if in screenshot)
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Scale size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Leave empty if unknown"
                    style={{ ...inputStyle, paddingLeft: '36px' }}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  * No automatic base weight is added. Enter manually if weight is not in screenshot.
                </span>
              </div>

              <div>
                <label style={labelStyle}>Unit</label>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '4px', borderRadius: '12px', border: '1px solid var(--neu-inset-border)' }}>
                  <button
                    type="button"
                    onClick={() => setWeightUnit('kg')}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '8px',
                      border: 'none',
                      background: weightUnit === 'kg' ? 'var(--omni-red)' : 'transparent',
                      color: weightUnit === 'kg' ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    KG
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightUnit('gm')}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '8px',
                      border: 'none',
                      background: weightUnit === 'gm' ? 'var(--omni-red)' : 'transparent',
                      color: weightUnit === 'gm' ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    GM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRICING & PAYMENT STATUS */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={16} style={{ color: '#10b981' }} />
                <span>2. Pricing & Payment Breakdown</span>
              </div>

              {/* Live Payment Status Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background:
                    paymentStatus === 'paid'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : paymentStatus === 'partial'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  color:
                    paymentStatus === 'paid'
                      ? '#10b981'
                      : paymentStatus === 'partial'
                      ? '#f59e0b'
                      : '#ef4444',
                  border: `1px solid ${
                    paymentStatus === 'paid'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : paymentStatus === 'partial'
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(239, 68, 68, 0.3)'
                  }`,
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background:
                      paymentStatus === 'paid'
                        ? '#10b981'
                        : paymentStatus === 'partial'
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                />
                <span>Status: {paymentStatus}</span>
              </div>
            </div>

            {/* Price and Quantity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Unit Price (BDT) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>৳</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 1500"
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Local Delivery Cost & Packing Cost Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Local Delivery Cost Box */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ ...labelStyle, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={14} style={{ color: '#38bdf8' }} />
                    <span>Local Delivery Cost</span>
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Courier / Transport</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>৳</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={deliveryCost}
                    onChange={(e) => setDeliveryCost(e.target.value)}
                    placeholder="e.g. 120"
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                  />
                </div>
                {/* Delivery presets */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Inside Dhaka (৳70)', val: '70' },
                    { label: 'Outside Dhaka (৳130)', val: '130' },
                    { label: 'Free (৳0)', val: '0' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setDeliveryCost(p.val)}
                      style={{
                        padding: '2px 7px',
                        borderRadius: '6px',
                        border: deliveryCost === p.val ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                        background: deliveryCost === p.val ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-surface)',
                        color: deliveryCost === p.val ? '#38bdf8' : 'var(--text-muted)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Packing Cost Box */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ ...labelStyle, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Box size={14} style={{ color: '#fbbf24' }} />
                    <span>Packing Cost</span>
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Box / Bubble Wrap</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>৳</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={packingCost}
                    onChange={(e) => setPackingCost(e.target.value)}
                    placeholder="e.g. 50"
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                  />
                </div>
                {/* Packing presets */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Carton Box (৳50)', val: '50' },
                    { label: 'Bubble Wrap (৳30)', val: '30' },
                    { label: 'Free (৳0)', val: '0' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setPackingCost(p.val)}
                      style={{
                        padding: '2px 7px',
                        borderRadius: '6px',
                        border: packingCost === p.val ? '1px solid #fbbf24' : '1px solid var(--border-color)',
                        background: packingCost === p.val ? 'rgba(251, 191, 36, 0.15)' : 'var(--bg-surface)',
                        color: packingCost === p.val ? '#fbbf24' : 'var(--text-muted)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Real-time Cost Breakdown Pill */}
            {(numDelivery > 0 || numPacking > 0 || productSubtotal > 0) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Item Subtotal: <strong>৳{productSubtotal.toLocaleString()}</strong></span>
                  {numDelivery > 0 && <span style={{ color: '#38bdf8' }}>+ Delivery: <strong>৳{numDelivery}</strong></span>}
                  {numPacking > 0 && <span style={{ color: '#fbbf24' }}>+ Packing: <strong>৳{numPacking}</strong></span>}
                </div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  Total: ৳{totalAmount.toLocaleString()}
                </div>
              </div>
            )}

            {/* Advance Payment Made */}
            <div>
              <label style={labelStyle}>Advance Payment Made (BDT)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>৳</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(e.target.value)}
                  placeholder="e.g. 1000"
                  style={{ ...inputStyle, paddingLeft: '28px' }}
                />
              </div>
            </div>

            {/* Summary Cards Row (Total Amount, Advance, Remaining Balance) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                marginTop: '6px',
              }}
            >
              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Amount</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  ৳{totalAmount.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#10b981' }}>Advance Paid</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  ৳{numAdvance.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: remainingBalance > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                  border: remainingBalance > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: remainingBalance > 0 ? '#ef4444' : '#10b981' }}>
                  Remaining Balance
                </div>
                <div
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: remainingBalance > 0 ? '#ef4444' : '#10b981',
                    marginTop: '2px',
                  }}
                >
                  ৳{remainingBalance.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ORDER DATE, TIME & STATUS CHECKBOXES */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: '#3b82f6' }} />
              <span>3. Order Date & Delivery Status</span>
            </div>

            {/* Date and Time */}
            <div>
              <label style={labelStyle}>Order Date & Time</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  placeholder="YYYY-MM-DD HH:mm (e.g. 2026-10-25 15:30)"
                  style={{ ...inputStyle, paddingLeft: '36px' }}
                />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Default: current date & time. You may adjust if entering a past order.
              </div>
            </div>

            {/* Checkboxes: Delivered & Cancelled */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              {/* Delivered Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: isDelivered ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
                  border: isDelivered ? '1px solid #10b981' : '1px solid var(--neu-rim)',
                  boxShadow: isDelivered ? 'var(--neu-pressed)' : 'var(--neu-flat-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={isDelivered}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsDelivered(checked);
                    if (checked) setIsCancelled(false);
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDelivered ? '#10b981' : 'var(--text-primary)' }}>
                    Order Delivered
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Goods received by customer
                  </div>
                </div>
              </label>

              {/* Cancelled Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: isCancelled ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
                  border: isCancelled ? '1px solid #ef4444' : '1px solid var(--neu-rim)',
                  boxShadow: isCancelled ? 'var(--neu-pressed)' : 'var(--neu-flat-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={isCancelled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsCancelled(checked);
                    if (checked) setIsDelivered(false);
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#ef4444', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isCancelled ? '#ef4444' : 'var(--text-primary)' }}>
                    Order Cancelled
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Customer cancelled / refunded
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 4: BRIEF NOTES */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} style={{ color: '#8b5cf6' }} />
              <span>4. Brief Notes (Special Customer Requirements / Reminders)</span>
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Special customer requirements: black strap with orange accents, deliver via SA Paribahan courier, customer requested fragile sticker..."
              style={{
                ...inputStyle,
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: '1.4',
              }}
            />
          </div>

          {/* SUBMIT BUTTONS */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '8px',
              borderTop: '1px solid var(--neu-rim)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                ...buttonActionStyle,
                background: 'transparent',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...buttonActionStyle,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                padding: '10px 24px',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
              }}
            >
              {submitting ? (
                <span>Saving Order...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>{orderToEdit ? 'Save Changes' : 'Save Order to Customer Profile'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
