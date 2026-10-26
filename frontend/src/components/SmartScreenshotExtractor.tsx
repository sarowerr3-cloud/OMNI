'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Coins,
  Scale,
  Palette,
  Eye,
  Crop,
  ArrowRight,
  Clipboard,
  AlertCircle,
  HelpCircle,
  Tag,
  Zap,
  Check
} from 'lucide-react';
import { ExtractedProductData, BoundingBox } from '@/types/screenshotExtractor';
import { exportExtractedProductToExcel } from '@/lib/excelExport';

interface SmartScreenshotExtractorProps {
  apiUrl?: string;
  onAutoFill: (data: ExtractedProductData) => void;
  onAddDirectlyToList?: (data: ExtractedProductData) => void;
  showToast?: (msg: string) => void;
  defaultExchangeRate?: string | number;
  isOpenByDefault?: boolean;
}

/**
 * Crops the product thumbnail using HTML5 canvas based on Gemini Vision's bounding box coordinates.
 */
async function cropImageFromBoundingBox(
  imageUrl: string,
  box?: BoundingBox
): Promise<string> {
  if (!box || typeof box.ymin !== 'number') return imageUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        // Convert percentage [0-100] coordinates to pixels
        const sx = Math.max(0, (box.xmin / 100) * width);
        const sy = Math.max(0, (box.ymin / 100) * height);
        const sw = Math.min(width - sx, ((box.xmax - box.xmin) / 100) * width);
        const sh = Math.min(height - sy, ((box.ymax - box.ymin) / 100) * height);

        if (sw <= 20 || sh <= 20) {
          resolve(imageUrl);
          return;
        }

        canvas.width = sw;
        canvas.height = sh;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        console.warn('Canvas cropping fallback:', err);
        resolve(imageUrl);
      }
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

export default function SmartScreenshotExtractor({
  apiUrl,
  onAutoFill,
  onAddDirectlyToList,
  showToast,
  defaultExchangeRate = '17.5',
  isOpenByDefault = true
}: SmartScreenshotExtractorProps) {
  // Configurable CNY to BDT exchange rate (default: 17.5 BDT / CNY)
  const [exchangeRate, setExchangeRate] = useState<string>(String(defaultExchangeRate || '17.5'));

  // Drag & drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');

  // Processing & Extracted Result State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedProductData | null>(null);
  const [croppedThumbnail, setCroppedThumbnail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasAutoFilled, setHasAutoFilled] = useState<boolean>(false);

  // Accordion toggle
  const [isExpanded, setIsExpanded] = useState<boolean>(isOpenByDefault);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Sync exchange rate if default changes
  useEffect(() => {
    if (defaultExchangeRate && Number(defaultExchangeRate) > 0) {
      setExchangeRate(String(defaultExchangeRate));
    }
  }, [defaultExchangeRate]);

  /**
   * Reads an image file into state and data URL preview
   */
  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      const err = 'Please upload a valid image file (PNG, JPG, WEBP).';
      setErrorMessage(err);
      if (showToast) showToast(`⚠️ ${err}`);
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
    setExtractedData(null);
    setCroppedThumbnail('');
    setHasAutoFilled(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || '';
      setImagePreviewUrl(dataUrl);
      if (showToast) showToast('📸 Screenshot loaded! Click "Analyze with Gemini" or wait.');
    };
    reader.readAsDataURL(file);
  }, [showToast]);

  /**
   * Listen for clipboard paste events (Ctrl+V) anywhere when the dropzone or window is focused
   */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            if (!isExpanded) setIsExpanded(true);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processImageFile, isExpanded]);

  /**
   * Drag & Drop event handlers
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  /**
   * Submit screenshot to backend AI Vision API
   */
  const handleAnalyzeScreenshot = async () => {
    if (!selectedFile && !imagePreviewUrl) {
      setErrorMessage('Please select, drop, or paste a screenshot first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage('');
    setAnalysisStep('Uploading screenshot to AI Vision Engine...');

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else if (imagePreviewUrl) {
        // Convert data URL to blob
        const res = await fetch(imagePreviewUrl);
        const blob = await res.blob();
        formData.append('file', blob, 'pasted_screenshot.png');
      }

      const activeRate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 17.5;
      formData.append('cnyRate', String(activeRate));
      formData.append('exchangeRate', String(activeRate));

      setAnalysisStep('Google Gemini 2.5 Flash Vision analyzing 1688 / AliExpress / PDD image...');

      // Priority 1: Next.js API route (`/api/products/analyze-screenshot`)
      // Priority 2: Backend server (`${apiUrl}/api/products/analyze-screenshot`)
      let response: Response;
      try {
        response = await fetch('/api/products/analyze-screenshot', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok && apiUrl) {
          // Fallback to FastAPI/Express backend
          response = await fetch(`${apiUrl}/api/products/analyze-screenshot`, {
            method: 'POST',
            body: formData,
          });
        }
      } catch (directErr) {
        if (apiUrl) {
          response = await fetch(`${apiUrl}/api/products/analyze-screenshot`, {
            method: 'POST',
            body: formData,
          });
        } else {
          throw directErr;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `Server returned error status ${response.status}`);
      }

      setAnalysisStep('Extracting specs, converting CNY to BDT, checking screenshot for weight...');
      const data: ExtractedProductData = await response.json();

      data.exchangeRate = activeRate;
      data.originalImageDataUrl = imagePreviewUrl;

      // Crop product photo using canvas if bounding box is provided
      let cropped = imagePreviewUrl;
      if (data.boundingBoxForProductImage && imagePreviewUrl) {
        try {
          cropped = await cropImageFromBoundingBox(imagePreviewUrl, data.boundingBoxForProductImage);
        } catch (cropErr) {
          console.warn('Could not crop product image:', cropErr);
        }
      }

      data.croppedImageDataUrl = cropped;
      setCroppedThumbnail(cropped);
      setExtractedData(data);

      if (showToast) {
        showToast(`✨ Extracted: "${data.productName.slice(0, 32)}..." (${data.priceCNY} CNY ≈ ৳${data.priceBDT} BDT)`);
      }
    } catch (err: any) {
      console.error('Failed to analyze screenshot:', err);
      const msg = err.message || 'Failed to analyze screenshot with AI Vision';
      setErrorMessage(msg);
      if (showToast) showToast(`❌ ${msg}`);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  /**
   * Auto-fill the extracted details into the "Add Product" form
   */
  const handleApplyToForm = () => {
    if (!extractedData) return;
    onAutoFill(extractedData);
    setHasAutoFilled(true);
    const hasWeight = typeof extractedData.finalWeightKg === 'number' && extractedData.finalWeightKg > 0;
    if (showToast) {
      showToast(
        hasWeight
          ? '✅ Product title, price, variants, 1.2× weight, and cropped photo populated into form!'
          : '✅ Product title, price, variants, and photo populated (Weight left empty for manual entry)!'
      );
    }
  };

  /**
   * Export the extracted product data directly to an Excel (.xlsx) file
   */
  const handleExportToExcel = () => {
    if (!extractedData) return;
    try {
      exportExtractedProductToExcel(extractedData);
      if (showToast) {
        showToast('📊 Exported extracted product data to Excel (.xlsx)!');
      }
    } catch (err: any) {
      console.error('Excel export error:', err);
      if (showToast) showToast(`❌ Export failed: ${err.message}`);
    }
  };

  /**
   * Reset the extractor to analyze a new screenshot
   */
  const handleReset = () => {
    setSelectedFile(null);
    setImagePreviewUrl('');
    setExtractedData(null);
    setCroppedThumbnail('');
    setErrorMessage('');
    setHasAutoFilled(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      style={{
        marginBottom: '1.25rem',
        borderRadius: '12px',
        border: '1px solid rgba(239, 68, 68, 0.45)',
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.95) 0%, rgba(9, 9, 11, 0.98) 100%)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
      }}
    >
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          cursor: 'pointer',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderBottom: isExpanded ? '1px solid rgba(239, 68, 68, 0.25)' : 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
            }}
          >
            <Sparkles style={{ width: '18px', height: '18px', color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc' }}>
                AI Smart Screenshot Extractor
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}
              >
                1688 • AliExpress • Pinduoduo
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>
              Upload or paste (Ctrl+V) screenshot ➔ Gemini Vision extracts Title, Colors, CNY Price, Photo & calculates 1.2× Weight (if specified)!
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 600 }}>
            {isExpanded ? 'Hide Extractor ▲' : 'Open Extractor ▼'}
          </span>
        </div>
      </div>

      {/* Accordion Body */}
      {isExpanded && (
        <div style={{ padding: '16px 18px' }}>
          {/* Top Controls: Rate configuration */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                CNY to BDT Exchange Rate:
              </label>
              <div style={{ position: 'relative', width: '130px' }}>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="17.50"
                  style={{
                    width: '100%',
                    backgroundColor: '#18181b',
                    color: '#38bdf8',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '6px',
                    padding: '4px 28px 4px 8px',
                    outline: 'none',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#94a3b8',
                    pointerEvents: 'none',
                  }}
                >
                  BDT
                </span>
              </div>
            </div>

            {/* Quick Rate Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Presets:</span>
              {['17.5', '18.0', '19.5', '20.0'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setExchangeRate(preset)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    borderRadius: '4px',
                    border: exchangeRate === preset ? '1px solid #38bdf8' : '1px solid #3f3f46',
                    backgroundColor: exchangeRate === preset ? 'rgba(56, 189, 248, 0.15)' : '#27272a',
                    color: exchangeRate === preset ? '#38bdf8' : '#cbd5e1',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Scale style={{ width: '13px', height: '13px' }} />
              <span>Weight Safety Factor: <strong>× 1.2 (+20%)</strong> applied automatically</span>
            </div>
          </div>

          {/* Main Grid: Upload Area & Results */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: imagePreviewUrl || extractedData ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
              gap: '16px',
            }}
          >
            {/* Upload & Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                position: 'relative',
                border: isDragging ? '2px dashed #ef4444' : '2px dashed rgba(161, 161, 170, 0.3)',
                borderRadius: '10px',
                padding: '20px 16px',
                textAlign: 'center',
                backgroundColor: isDragging ? 'rgba(239, 68, 68, 0.08)' : 'rgba(24, 24, 27, 0.6)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: imagePreviewUrl ? '220px' : '160px',
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processImageFile(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />

              {!imagePreviewUrl ? (
                <>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <UploadCloud style={{ width: '24px', height: '24px', color: '#f87171' }} />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
                    Drag & Drop Screenshot Here
                  </h4>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.76rem', color: '#a1a1aa', maxWidth: '380px' }}>
                    Or click below to browse, or simply press <kbd style={{ backgroundColor: '#27272a', padding: '2px 6px', borderRadius: '4px', border: '1px solid #3f3f46', color: '#38bdf8' }}>Ctrl + V</kbd> anywhere on this page to paste your clipboard screenshot.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      <UploadCloud style={{ width: '14px', height: '14px' }} />
                      Browse Screenshot
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const clipboardItems = await navigator.clipboard.read();
                          for (const item of clipboardItems) {
                            for (const type of item.types) {
                              if (type.startsWith('image/')) {
                                const blob = await item.getType(type);
                                const file = new File([blob], 'clipboard_screenshot.png', { type });
                                processImageFile(file);
                                return;
                              }
                            }
                          }
                          if (showToast) showToast('ℹ️ No image in clipboard. Press Win+Shift+S then Ctrl+V');
                        } catch (e) {
                          if (showToast) showToast('ℹ️ Clipboard access: Press Ctrl+V directly to paste');
                        }
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#27272a',
                        color: '#cbd5e1',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: '1px solid #3f3f46',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Clipboard style={{ width: '14px', height: '14px' }} />
                      Paste Clipboard
                    </button>
                  </div>
                </>
              ) : (
                /* Screenshot Preview & Action Controls */
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      position: 'relative',
                      maxWidth: '320px',
                      maxHeight: '220px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      backgroundColor: '#09090b',
                    }}
                  >
                    <img
                      src={imagePreviewUrl}
                      alt="Uploaded Screenshot"
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '220px',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />

                    {/* Scanning animation overlay while analyzing */}
                    {isAnalyzing && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.65)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px',
                        }}
                      >
                        <RefreshCw
                          style={{
                            width: '28px',
                            height: '28px',
                            color: '#ef4444',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '8px',
                          }}
                        />
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', textAlign: 'center' }}>
                          Analyzing with Gemini 2.5 Flash Vision...
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>
                          {analysisStep}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Button bar for preview */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={handleAnalyzeScreenshot}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        border: 'none',
                        cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)',
                        opacity: isAnalyzing ? 0.7 : 1,
                      }}
                    >
                      <Sparkles style={{ width: '15px', height: '15px' }} />
                      {isAnalyzing ? 'Extracting Details...' : 'Analyze with Gemini AI'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isAnalyzing}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#27272a',
                        color: '#a1a1aa',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        border: '1px solid #3f3f46',
                        cursor: 'pointer',
                      }}
                    >
                      Replace Screenshot
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Extracted Results Panel */}
            {extractedData && (
              <div
                style={{
                  borderRadius: '10px',
                  backgroundColor: 'rgba(24, 24, 27, 0.85)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Result Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #27272a', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 style={{ width: '18px', height: '18px', color: '#10b981' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                      AI Vision Extraction Complete
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    {extractedData.platformDetected || '1688'}
                  </span>
                </div>

                {/* Product Title (English) */}
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                    Translated English Title:
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px', lineHeight: '1.3' }}>
                    {extractedData.productName}
                  </div>
                </div>

                {/* Visual Thumbnail & Variants Row */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {/* Cropped Thumbnail */}
                  {croppedThumbnail && (
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '2px' }}>
                        Cropped Product Photo:
                      </div>
                      <div
                        style={{
                          width: '72px',
                          height: '72px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '2px solid #34d399',
                          backgroundColor: '#09090b',
                        }}
                      >
                        <img
                          src={croppedThumbnail}
                          alt="Cropped Product"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Colors & Variants List */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '4px' }}>
                      Available Colors / Variants:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {extractedData.colors && extractedData.colors.length > 0 ? (
                        extractedData.colors.map((c, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              color: '#7dd3fc',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              fontWeight: 600,
                            }}
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Standard Edition</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price & Converted BDT Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid #27272a',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Original Price (CNY):</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#f59e0b' }}>
                      ¥ {extractedData.priceCNY.toFixed(2)} RMB
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Converted Price (BDT):</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#38bdf8' }}>
                      ৳ {extractedData.priceBDT?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                    </div>
                    <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                      (@ ৳{exchangeRate}/RMB)
                    </span>
                  </div>
                </div>

                {/* Weight Breakdown: Base vs 1.2x Calculated Weight or Empty Manual Notice */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: extractedData.finalWeightKg ? 'rgba(245, 158, 11, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                    border: extractedData.finalWeightKg ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(148, 163, 184, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {extractedData.finalWeightKg ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.74rem', color: '#fbbf24', fontWeight: 700 }}>
                          ⚖️ Base Extracted Weight:
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fef08a' }}>
                          {extractedData.baseWeightKg} kg ({Math.round((extractedData.baseWeightKg || 0) * 1000)} gm)
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(245, 158, 11, 0.3)', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 800 }}>
                          📦 Final Calculated Weight (× 1.2):
                        </span>
                        <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#4ade80' }}>
                          {extractedData.finalWeightKg} kg ({extractedData.finalWeightGm} gm)
                        </span>
                      </div>
                      <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                        (+20% safety factor applied to prevent carton/shipping charge discrepancies)
                      </span>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Scale style={{ width: '16px', height: '16px', color: '#94a3b8', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#cbd5e1' }}>
                          ⚖️ Weight: Not specified on screenshot
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '1px' }}>
                          No base weight assumed. Weight input is left empty for manual entry.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Auto-Fill & Excel Export */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleApplyToForm}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: hasAutoFilled ? '#059669' : '#dc2626',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 0 12px rgba(220, 38, 38, 0.35)',
                    }}
                  >
                    {hasAutoFilled ? (
                      <>
                        <Check style={{ width: '16px', height: '16px' }} />
                        Form Fields Populated!
                      </>
                    ) : (
                      <>
                        <Zap style={{ width: '16px', height: '16px' }} />
                        Auto-Fill Form Fields
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportToExcel}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 0 10px rgba(21, 128, 61, 0.3)',
                    }}
                  >
                    <FileSpreadsheet style={{ width: '16px', height: '16px' }} />
                    Export to Excel (.xlsx)
                  </button>

                  {onAddDirectlyToList && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddDirectlyToList(extractedData);
                        if (showToast) showToast('➕ Product added directly to list!');
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#27272a',
                        color: '#38bdf8',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        border: '1px solid #38bdf8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      + Add to Table
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error notice if any */}
          {errorMessage && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
