'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Calculator, 
  ListPlus, 
  Check, 
  X, 
  Tag, 
  ExternalLink, 
  Scale, 
  TrendingUp, 
  Coins, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  FileText, 
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  Eye,
  Camera,
  LayoutGrid
} from 'lucide-react';
import { 
  PRODUCT_CATEGORIES, 
  CategorizedProduct, 
  INITIAL_SAMPLE_PRODUCTS, 
  CategoryDefinition,
  getCategoryDefinition,
  CATEGORY_ALIASES
} from '@/types/catalog';
import { formatMoney } from '@/lib/formatters';
import { compressImageFile, formatExternalUrl } from '@/components/ProductListBuilder';

interface CategoryProductManagerProps {
  onSelectForCalculator: (product: CategorizedProduct) => void;
  onAddToList: (product: CategorizedProduct) => void;
  onSearchInAiHub?: (query: string) => void;
  rmbRate?: number;
  freightRate?: number;
  freightUnit?: 'per_gm' | 'per_kg';
}

export default function CategoryProductManager({
  onSelectForCalculator,
  onAddToList,
  onSearchInAiHub,
  rmbRate = 20.0,
  freightRate = 1.2,
  freightUnit = 'per_gm',
}: CategoryProductManagerProps) {
  const [products, setProducts] = useState<CategorizedProduct[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCategoryGrid, setShowCategoryGrid] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const pillsContainerRef = useRef<HTMLDivElement>(null);

  // Form states
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
  
  // Multiple Photos state
  const [formImages, setFormImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Lightbox Photo Viewer state
  const [previewModal, setPreviewModal] = useState<{
    title: string;
    images: string[];
    currentIndex: number;
    productUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage or initialize with sample products
  useEffect(() => {
    try {
      const stored = localStorage.getItem('omni_category_products');
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        setProducts(INITIAL_SAMPLE_PRODUCTS);
        localStorage.setItem('omni_category_products', JSON.stringify(INITIAL_SAMPLE_PRODUCTS));
      }
    } catch {
      setProducts(INITIAL_SAMPLE_PRODUCTS);
    }
  }, []);

  // Keyboard navigation for Lightbox Photo Viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewModal) return;
      if (e.key === 'Escape') {
        setPreviewModal(null);
      } else if (e.key === 'ArrowLeft') {
        setPreviewModal((prev) => {
          if (!prev || prev.images.length <= 1) return prev;
          const nextIdx = prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1;
          return { ...prev, currentIndex: nextIdx };
        });
      } else if (e.key === 'ArrowRight') {
        setPreviewModal((prev) => {
          if (!prev || prev.images.length <= 1) return prev;
          const nextIdx = prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0;
          return { ...prev, currentIndex: nextIdx };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModal]);

  const saveProductsToStorage = (updated: CategorizedProduct[]) => {
    setProducts(updated);
    try {
      localStorage.setItem('omni_category_products', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Compute live landed cost estimate for a product
  const computeProductCost = (price: number, curr: 'RMB' | 'USD', weightKg: number) => {
    const exchange = curr === 'RMB' ? rmbRate : 121.5;
    const itemPriceBdt = price * exchange;
    const domesticBdt = 20.0;
    const agentFeeBdt = itemPriceBdt * 0.05;
    const ratePerKg = freightUnit === 'per_gm' ? freightRate * 1000 : freightRate;
    const freightBdt = weightKg * ratePerKg;
    const dutyBdt = itemPriceBdt * 0.15;
    const totalLandedCost = Math.round(itemPriceBdt + domesticBdt + agentFeeBdt + freightBdt + dutyBdt);
    return totalLandedCost;
  };

  // Reset Form
  const resetForm = () => {
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
    setEditingId(null);
    setShowAddForm(false);
  };

  // Populate Form for Editing
  const startEdit = (p: CategorizedProduct) => {
    setEditingId(p.id);
    setFormCategory(p.category);
    setFormTitle(p.title);
    setFormPlatform(p.platform);
    setFormSourcePrice(String(p.source_price));
    setFormCurrency(p.currency);
    setFormWeightVal(String(p.weight_val));
    setFormWeightUnit(p.weight_unit);
    setFormMoq(String(p.moq));
    setFormTargetPrice(String(p.target_selling_price || ''));
    setFormProductUrl(p.product_url || '');
    setFormNotes(p.notes || '');
    setFormSku(p.sku || '');
    
    // Load existing photos
    const existingImgs = (p.images && p.images.length > 0)
      ? p.images
      : (p.image_url ? [p.image_url] : []);
    setFormImages(existingImgs);
    setUrlInput('');
    setShowAddForm(true);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

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
        showToast(`📸 ${validImages.length} photo${validImages.length > 1 ? 's' : ''} added & compressed!`);
      }
    } catch (err) {
      showToast('⚠️ Image upload failed');
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
      showToast('⚠️ Please enter a valid URL (starting with http:// or https://)');
      return;
    }
    setFormImages((prev) => [...prev, trimmed]);
    setUrlInput('');
    showToast('🖼️ Photo link added to gallery!');
  };

  // Remove Photo from Form Gallery
  const handleRemovePhoto = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Set as Cover Photo (Move to Index 0)
  const handleSetCoverPhoto = (index: number) => {
    if (index === 0) return;
    setFormImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      return [item, ...copy];
    });
    showToast('⭐ Set as primary cover photo');
  };

  // Open Lightbox Photo Viewer
  const openPhotoViewer = (p: CategorizedProduct, startIndex: number = 0) => {
    const productImages = (p.images && p.images.length > 0)
      ? p.images
      : (p.image_url ? [p.image_url] : []);
    
    if (productImages.length === 0) return;

    setPreviewModal({
      title: p.title,
      images: productImages,
      currentIndex: Math.max(0, Math.min(startIndex, productImages.length - 1)),
      productUrl: p.product_url,
    });
  };

  // Save or Update Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('⚠️ Please enter a product title');
      return;
    }

    if (!formCategory) {
      showToast('⚠️ Please select a product category');
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

    if (editingId) {
      // Update existing
      const updated = products.map((p) => {
        if (p.id === editingId) {
          return {
            ...p,
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
          };
        }
        return p;
      });
      saveProductsToStorage(updated);
      showToast('✅ Product updated successfully');
    } else {
      // Add new
      const newProduct: CategorizedProduct = {
        id: 'prod-' + Date.now(),
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
        sku: formSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        created_at: new Date().toISOString(),
        computed_landed_cost: landedCost,
        computed_profit: profit,
        computed_margin: margin,
      };
      saveProductsToStorage([newProduct, ...products]);
      showToast(`✅ Added "${newProduct.title.slice(0, 20)}..." with ${formImages.length} photo(s)`);
    }

    resetForm();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove "${name}" from your stored products?`)) {
      const filtered = products.filter((p) => p.id !== id);
      saveProductsToStorage(filtered);
      showToast('🗑️ Product removed from storage');
    }
  };

  // Filtered list
  const filteredProducts = products.filter((p) => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory || CATEGORY_ALIASES[p.category] === activeCategory;
    const catDef = getCategoryDefinition(p.category);
    const queryLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !queryLower || 
      p.title.toLowerCase().includes(queryLower) ||
      catDef.name.toLowerCase().includes(queryLower) ||
      (catDef.name_bn && catDef.name_bn.toLowerCase().includes(queryLower)) ||
      p.category.toLowerCase().includes(queryLower) ||
      (p.sku && p.sku.toLowerCase().includes(queryLower)) ||
      (p.notes && p.notes.toLowerCase().includes(queryLower)) ||
      (p.product_url && p.product_url.toLowerCase().includes(queryLower));
    return matchesCat && matchesSearch;
  });

  // Dynamic Matching Categories for search query
  const matchingCategories = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return PRODUCT_CATEGORIES.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.name_bn && c.name_bn.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Horizontal scroll helper for category pills
  const scrollPills = (direction: 'left' | 'right') => {
    if (!pillsContainerRef.current) return;
    const distance = 280;
    pillsContainerRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  // Calculate live preview landed cost for the add form
  const formPriceNum = parseFloat(formSourcePrice) || 0;
  const formWeightNum = parseFloat(formWeightVal) || 0;
  const formWeightKg = formWeightUnit === 'gm' ? formWeightNum / 1000 : formWeightNum;
  const formEstimatedCost = computeProductCost(formPriceNum, formCurrency, formWeightKg);
  const formTargetNum = parseFloat(formTargetPrice) || 0;
  const formEstimatedProfit = formTargetNum > 0 ? formTargetNum - formEstimatedCost : 0;
  const formEstimatedMargin = formTargetNum > 0 ? Math.round((formEstimatedProfit / formTargetNum) * 100) : 0;

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
          fontWeight: 600,
          fontSize: '0.88rem',
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

      {/* LIGHTBOX PHOTO VIEWER MODAL */}
      {previewModal && (
        <div 
          onClick={() => setPreviewModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem',
            animation: 'fadeIn 0.18s ease',
          }}
        >
          {/* Top Bar */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '1200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
              paddingBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#ffffff',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '650px',
              }}>
                {previewModal.title}
              </h3>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                whiteSpace: 'nowrap',
              }}>
                Photo {previewModal.currentIndex + 1} of {previewModal.images.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {previewModal.productUrl && (
                <a
                  href={formatExternalUrl(previewModal.productUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Supplier Link</span>
                </a>
              )}

              <button
                onClick={() => setPreviewModal(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.18)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                title="Close viewer (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Center Main Photo Stage */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 0',
            }}
          >
            {/* Previous Button */}
            {previewModal.images.length > 1 && (
              <button
                onClick={() => {
                  setPreviewModal((prev) => {
                    if (!prev) return null;
                    const nextIdx = prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1;
                    return { ...prev, currentIndex: nextIdx };
                  });
                }}
                style={{
                  position: 'absolute',
                  left: '16px',
                  zIndex: 2,
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                }}
                title="Previous photo (Left arrow)"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Displayed Large Image */}
            <img
              src={previewModal.images[previewModal.currentIndex]}
              alt={previewModal.title}
              style={{
                maxWidth: '88vw',
                maxHeight: '74vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 12px 48px rgba(0, 0, 0, 0.75)',
                userSelect: 'none',
              }}
            />

            {/* Next Button */}
            {previewModal.images.length > 1 && (
              <button
                onClick={() => {
                  setPreviewModal((prev) => {
                    if (!prev) return null;
                    const nextIdx = prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0;
                    return { ...prev, currentIndex: nextIdx };
                  });
                }}
                style={{
                  position: 'absolute',
                  right: '16px',
                  zIndex: 2,
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                }}
                title="Next photo (Right arrow)"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip (If Multiple Images) */}
          {previewModal.images.length > 1 && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                gap: '8px',
                maxWidth: '90vw',
                overflowX: 'auto',
                padding: '6px',
                background: 'rgba(0, 0, 0, 0.45)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {previewModal.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setPreviewModal((prev) => prev ? { ...prev, currentIndex: idx } : null)}
                  style={{
                    padding: 0,
                    background: 'transparent',
                    border: idx === previewModal.currentIndex ? '2.5px solid var(--omni-red)' : '2px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: idx === previewModal.currentIndex ? 1 : 0.6,
                    transform: idx === previewModal.currentIndex ? 'scale(1.05)' : 'none',
                    transition: 'all 0.15s ease',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={`Thumb ${idx + 1}`}
                    style={{
                      width: '56px',
                      height: '56px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top Header & Actions */}
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
            fontSize: '1.4rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            <Package size={22} style={{ color: 'var(--omni-red)' }} />
            <span>Products</span>
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Store, add, edit, and organize sourced merchandise with multiple photos, direct supplier links, pricing, and category filters.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.78rem',
            padding: '5px 12px',
            borderRadius: '20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontWeight: 600,
          }}>
            {products.length} Stored Products
          </span>

          <button
            onClick={() => {
              if (showAddForm) {
                resetForm();
              } else {
                setShowAddForm(true);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '10px',
              background: showAddForm ? 'var(--bg-card-hover)' : 'var(--omni-red)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: 'none',
              boxShadow: showAddForm ? 'none' : '0 2px 10px rgba(220, 38, 38, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {showAddForm ? <X size={15} /> : <Plus size={15} />}
            {showAddForm ? 'Close Form' : 'Add New Product to Store'}
          </button>
        </div>
      </div>

      {/* Add / Edit Product Collapsible Drawer */}
      {showAddForm && (
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
              {editingId ? 'Edit Product Details' : 'Add New Product to Store'}
            </h3>
            <button
              onClick={resetForm}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveProduct}>
            {/* Hidden file input for photo upload with multiple selection */}
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

                {/* Upload Buttons & Add URL Row */}
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

                {/* Thumbnail Preview Strip */}
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
                        className="group relative"
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

                        {/* Cover Badge on first image */}
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

                        {/* Set as Cover button if not first */}
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

                        {/* Delete photo button */}
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
                onClick={resetForm}
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
                {editingId ? 'Save Changes' : 'Store Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Filter Pills & Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Search Bar with Integrated Category Selector & Grid Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '4px 8px',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
        }}>
          {/* Category Dropdown Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px 4px 6px',
            borderRight: '1px solid var(--border-color)',
            flexShrink: 0,
          }}>
            <Filter size={15} style={{ color: 'var(--omni-red)' }} />
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '200px',
              }}
              title="Search / Filter by Category"
            >
              <option value="all">All Categories ({products.length})</option>
              {PRODUCT_CATEGORIES.map((cat) => {
                const count = products.filter((p) => p.category === cat.id || CATEGORY_ALIASES[p.category] === cat.id).length;
                return (
                  <option key={cat.id} value={cat.id} style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>
                    {cat.icon} {cat.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Query Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search products by title, category (e.g. Shoes, Baby, Toys, Automotive), SKU, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 30px 9px 32px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
                title="Clear search text"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Categories (25) Grid Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => setShowCategoryGrid(!showCategoryGrid)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: showCategoryGrid ? 'var(--omni-red)' : 'var(--bg-surface)',
              color: showCategoryGrid ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            title="Browse all 25 categories in interactive grid view"
          >
            <LayoutGrid size={15} />
            <span>Categories (25)</span>
          </button>
        </div>

        {/* Dynamic Category Suggestions when typing */}
        {matchingCategories.length > 0 && searchQuery.trim() && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            padding: '6px 12px',
            background: 'var(--bg-surface)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            fontSize: '0.78rem',
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600 }}>
              🏷️ Category match:
            </span>
            {matchingCategories.slice(0, 8).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCategory(c.id);
                  setSearchQuery('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'rgba(220, 38, 38, 0.12)',
                  color: 'var(--omni-red)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title={`Filter by ${c.name} (${c.name_bn || ''})`}
              >
                <span>{c.icon}</span>
                <span>{c.name}</span>
                {c.name_bn && <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>• {c.name_bn}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Expandable 25 Category Visual Grid Drawer */}
        {showCategoryGrid && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-highlight)',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutGrid size={18} style={{ color: 'var(--omni-red)' }} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Search & Filter by Category (25 Categories)
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('all');
                    setShowCategoryGrid(false);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: activeCategory === 'all' ? 'var(--omni-red)' : 'var(--bg-surface)',
                    color: activeCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  All Products ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryGrid(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Close category grid"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '8px',
              maxHeight: '340px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}>
              {PRODUCT_CATEGORIES.map((cat) => {
                const count = products.filter((p) => p.category === cat.id || CATEGORY_ALIASES[p.category] === cat.id).length;
                const isSelected = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setShowCategoryGrid(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(220, 38, 38, 0.12)' : 'var(--bg-surface)',
                      border: isSelected ? '1.5px solid var(--omni-red)' : '1px solid var(--border-color)',
                      color: isSelected ? 'var(--omni-red)' : 'var(--text-primary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    title={cat.description}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{cat.icon}</span>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cat.name}
                        </div>
                        {cat.name_bn && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cat.name_bn}
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      background: isSelected ? 'var(--omni-red)' : 'var(--bg-card)',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: 700,
                      marginLeft: '4px',
                      flexShrink: 0,
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Filter & Search Status Pill Row */}
        {(activeCategory !== 'all' || searchQuery.trim()) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '0.8rem',
            padding: '8px 12px',
            background: 'var(--bg-surface)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Filtering by:</span>
              {activeCategory !== 'all' && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: 'var(--omni-red)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.76rem',
                }}>
                  {getCategoryDefinition(activeCategory).icon} {getCategoryDefinition(activeCategory).name}
                  <button
                    onClick={() => setActiveCategory('all')}
                    style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0, marginLeft: '2px', fontSize: '0.74rem' }}
                    title="Remove category filter"
                  >
                    ✕
                  </button>
                </span>
              )}
              {searchQuery.trim() && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.76rem',
                  border: '1px solid var(--border-color)',
                }}>
                  "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginLeft: '2px', fontSize: '0.74rem' }}
                    title="Clear search text"
                  >
                    ✕
                  </button>
                </span>
              )}
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                ({filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {onSearchInAiHub && (
                <button
                  type="button"
                  onClick={() => {
                    const searchTarget = activeCategory !== 'all' ? getCategoryDefinition(activeCategory).name : searchQuery;
                    onSearchInAiHub(searchTarget);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-highlight)',
                    color: 'var(--text-primary)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Search real factory suppliers across 1688, Pinduoduo & AliExpress"
                >
                  <Sparkles size={12} style={{ color: 'var(--omni-red)' }} />
                  <span>Search China Suppliers ↗</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--omni-red)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* Categories Horizontal Pill Row with Scroll Navigation */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => scrollPills('left')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: 'var(--shadow-sm)',
            }}
            title="Scroll categories left"
          >
            <ChevronLeft size={16} />
          </button>

          <div 
            ref={pillsContainerRef}
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              padding: '2px 0',
              scrollbarWidth: 'none',
              flex: 1,
            }}
          >
            <button
              onClick={() => setActiveCategory('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: activeCategory === 'all' ? 'var(--omni-red)' : 'var(--bg-card)',
                color: activeCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
                border: activeCategory === 'all' ? '1px solid var(--omni-red)' : '1px solid var(--border-color)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <span>All Products</span>
              <span style={{
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: '10px',
                background: activeCategory === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)',
                color: activeCategory === 'all' ? '#ffffff' : 'var(--text-muted)',
              }}>
                {products.length}
              </span>
            </button>

            {PRODUCT_CATEGORIES.map((cat) => {
              const count = products.filter((p) => p.category === cat.id || CATEGORY_ALIASES[p.category] === cat.id).length;
              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: isSelected ? 'var(--omni-red)' : 'var(--bg-card)',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    border: isSelected ? '1px solid var(--omni-red)' : '1px solid var(--border-color)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  title={cat.name_bn ? `${cat.name} (${cat.name_bn})` : cat.name}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollPills('right')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: 'var(--shadow-sm)',
            }}
            title="Scroll categories right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px dashed var(--border-color)',
          padding: '3.5rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
            {activeCategory !== 'all' ? getCategoryDefinition(activeCategory).icon : '📦'}
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {activeCategory !== 'all'
              ? `No stored products in "${getCategoryDefinition(activeCategory).name}"`
              : searchQuery
              ? `No products matching "${searchQuery}"`
              : 'No products in store'}
          </h4>
          <p style={{ fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
            {activeCategory !== 'all'
              ? `You don't have any items stored under ${getCategoryDefinition(activeCategory).name} yet. You can add one manually or search live factory suppliers on 1688, Pinduoduo, and AliExpress.`
              : searchQuery
              ? `Try searching by category name, SKU, or clear the search query to see all stored items.`
              : 'Catalog your first imported item with multiple photos, supplier links, and landed pricing.'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (activeCategory !== 'all') {
                  setFormCategory(activeCategory);
                }
                setShowAddForm(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 20px',
                borderRadius: '8px',
                background: 'var(--omni-red)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <Plus size={15} />
              <span>{activeCategory !== 'all' ? `Add Product to ${getCategoryDefinition(activeCategory).name}` : 'Add Product Now'}</span>
            </button>

            {onSearchInAiHub && (
              <button
                onClick={() => {
                  const targetQuery = activeCategory !== 'all' ? getCategoryDefinition(activeCategory).name : searchQuery || 'Trending Products';
                  onSearchInAiHub(targetQuery);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-highlight)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={15} style={{ color: 'var(--omni-red)' }} />
                <span>Live Search China Factories (1688 / PDD)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}>
          {filteredProducts.map((p) => {
            const catDef = getCategoryDefinition(p.category);
            const landedCost = computeProductCost(p.source_price, p.currency, p.weight_kg);
            const targetPrice = p.target_selling_price || 0;
            const profit = targetPrice > 0 ? targetPrice - landedCost : 0;
            const margin = targetPrice > 0 ? Math.round((profit / targetPrice) * 100) : 0;

            const allPhotos = (p.images && p.images.length > 0)
              ? p.images
              : (p.image_url ? [p.image_url] : []);
            const hasPhotos = allPhotos.length > 0;
            const primaryPhoto = allPhotos[0];

            return (
              <div
                key={p.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.18s ease, border-color 0.18s ease',
                }}
              >
                <div>
                  {/* Category Pill & Platform */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        color: catDef.color,
                        border: `1px solid ${catDef.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        {catDef.icon} {catDef.name}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '3px 7px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-muted)',
                      }}>
                        {p.platform}
                      </span>
                    </div>

                    {p.sku && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {p.sku}
                      </span>
                    )}
                  </div>

                  {/* CLICKABLE PRODUCT IMAGE WITH VIEWER & GALLERY */}
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <div
                      onClick={() => hasPhotos && openPhotoViewer(p, 0)}
                      title={hasPhotos ? 'Click to view full photo gallery' : undefined}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '190px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: 'var(--bg-surface)',
                        cursor: hasPhotos ? 'pointer' : 'default',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {hasPhotos ? (
                        <>
                          <img
                            src={primaryPhoto}
                            alt={p.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.25s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.04)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          />

                          {/* Hover Zoom Overlay Banner */}
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 40%)',
                            pointerEvents: 'none',
                          }} />

                          {/* Floating Photos Count Badge */}
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(0, 0, 0, 0.72)',
                            color: '#ffffff',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            backdropFilter: 'blur(4px)',
                          }}>
                            <ZoomIn size={12} />
                            <span>{allPhotos.length} photo{allPhotos.length > 1 ? 's' : ''}</span>
                          </div>
                        </>
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          color: 'var(--text-muted)',
                        }}>
                          <span style={{ fontSize: '2.5rem' }}>{catDef.icon}</span>
                          <span style={{ fontSize: '0.75rem' }}>No photo added</span>
                        </div>
                      )}
                    </div>

                    {/* Mini Thumbnail Row if Multiple Photos */}
                    {allPhotos.length > 1 && (
                      <div style={{
                        display: 'flex',
                        gap: '6px',
                        marginTop: '6px',
                        overflowX: 'auto',
                        paddingBottom: '2px',
                        scrollbarWidth: 'none',
                      }}>
                        {allPhotos.map((photoUrl, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => openPhotoViewer(p, pIdx)}
                            title={`View photo ${pIdx + 1}`}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: pIdx === 0 ? '1.5px solid var(--omni-red)' : '1px solid var(--border-color)',
                              cursor: 'pointer',
                              flexShrink: 0,
                              background: 'var(--bg-surface)',
                            }}
                          >
                            <img
                              src={photoUrl}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Title & Specifications */}
                  <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.35,
                    margin: '0 0 6px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {p.title}
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span>⚖️ {p.weight_val} {p.weight_unit}</span>
                    <span>•</span>
                    <span>MOQ: {p.moq} pcs</span>
                  </div>

                  {/* Product Details / Notes Snippet */}
                  {p.notes && (
                    <p style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      margin: '0 0 10px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {p.notes}
                    </p>
                  )}

                  {/* Clickable Product Link */}
                  {p.product_url && (
                    <div style={{ marginBottom: '10px' }}>
                      <a
                        href={formatExternalUrl(p.product_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.76rem',
                          color: '#3b82f6',
                          fontWeight: 600,
                          textDecoration: 'none',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        <LinkIcon size={12} />
                        <span>Supplier Link</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}

                  {/* Price & Landed Cost Breakdown Card */}
                  <div style={{
                    background: 'var(--bg-surface)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Source Price:</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {p.currency === 'RMB' ? '¥' : '$'}{p.source_price.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Est. Landed Cost:</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--omni-red)' }}>
                        ৳{formatMoney(landedCost)} BDT
                      </span>
                    </div>

                    {targetPrice > 0 ? (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border-color)',
                      }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Retail Target:</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            ৳{formatMoney(targetPrice)}
                          </span>
                          <span style={{
                            display: 'block',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: profit >= 0 ? '#10b981' : '#ef4444',
                          }}>
                            {profit >= 0 ? '+৳' : '৳'}{formatMoney(profit)} ({margin}%)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border-color)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                      }}>
                        No retail target set
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => startEdit(p)}
                      title="Edit product"
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.title)}
                      title="Delete product"
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => onSelectForCalculator(p)}
                      title="Send to Price Calculator"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Calculator size={13} />
                      Calculate
                    </button>

                    <button
                      onClick={() => {
                        onAddToList({
                          ...p,
                          images: allPhotos,
                        });
                        showToast(`➕ Added "${p.title.slice(0, 18)}..." to List Builder`);
                      }}
                      title="Add to Product List Builder"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'var(--omni-red)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                      }}
                    >
                      <ListPlus size={13} />
                      Add to List
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
