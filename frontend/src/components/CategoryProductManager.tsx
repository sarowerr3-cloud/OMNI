'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  X
} from 'lucide-react';
import { 
  PRODUCT_CATEGORIES, 
  CategorizedProduct, 
  INITIAL_SAMPLE_PRODUCTS, 
  getCategoryDefinition,
  CATEGORY_ALIASES
} from '@/types/catalog';
import { LightboxState } from '@/types/listBuilder';
import { useToast } from '@/context/ToastContext';
import LightboxModal from '@/components/list-builder/LightboxModal';
import EmptyState from '@/components/shared/EmptyState';
import {
  CatalogProductCard,
  CatalogProductRow,
  ProductModalForm,
  CategoryGridModal,
  CategoryNavPills,
} from '@/components/catalog';
import ViewModeToggle, { ViewMode } from '@/components/shared/ViewModeToggle';

interface CategoryProductManagerProps {
  onSelectForCalculator: (product: CategorizedProduct) => void;
  onAddToList: (product: CategorizedProduct) => void;
  rmbRate?: number;
  freightRate?: number;
  freightUnit?: 'per_gm' | 'per_kg';
}

export default function CategoryProductManager({
  onSelectForCalculator,
  onAddToList,
  rmbRate = 20.0,
  freightRate = 1.2,
  freightUnit = 'per_gm',
}: CategoryProductManagerProps) {
  const toast = useToast();
  const [products, setProducts] = useState<CategorizedProduct[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCategoryGrid, setShowCategoryGrid] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<CategorizedProduct | null>(null);

  // Lightbox Photo Viewer state
  const [previewModal, setPreviewModal] = useState<LightboxState | null>(null);

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

  const saveProductsToStorage = (updated: CategorizedProduct[]) => {
    setProducts(updated);
    try {
      localStorage.setItem('omni_category_products', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
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
    return Math.round(itemPriceBdt + domesticBdt + agentFeeBdt + freightBdt + dutyBdt);
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

  // Start Edit Product
  const startEdit = (p: CategorizedProduct) => {
    setEditingProduct(p);
    setShowAddForm(true);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Save or Update Product
  const handleSaveProduct = (formData: any) => {
    if (formData.id) {
      // Update existing
      const updated = products.map((p) => {
        if (p.id === formData.id) {
          return {
            ...p,
            ...formData,
          };
        }
        return p;
      });
      saveProductsToStorage(updated);
      toast.success('Product updated successfully');
    } else {
      // Add new
      const newProduct: CategorizedProduct = {
        ...formData,
        id: 'prod-' + Date.now(),
        sku: formData.sku || `SKU-${Date.now().toString().slice(-4)}`,
        created_at: new Date().toISOString(),
      };
      saveProductsToStorage([newProduct, ...products]);
      toast.success(`Added "${newProduct.title.slice(0, 20)}..."`);
    }

    setEditingProduct(null);
    setShowAddForm(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove "${name}" from your stored products?`)) {
      const filtered = products.filter((p) => p.id !== id);
      saveProductsToStorage(filtered);
      toast.info('Product removed from storage');
    }
  };

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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
  }, [products, activeCategory, searchQuery]);

  // Dynamic Matching Categories for search query
  const matchingCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return PRODUCT_CATEGORIES.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.name_bn && c.name_bn.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="content-container">
      {/* Lightbox Modal */}
      <LightboxModal
        previewModal={previewModal}
        onClose={() => setPreviewModal(null)}
        onIndexChange={(idx) => {
          setPreviewModal((prev) => (prev ? { ...prev, currentIndex: idx } : null));
        }}
      />

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
                setEditingProduct(null);
                setShowAddForm(false);
              } else {
                setEditingProduct(null);
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
      <ProductModalForm
        isOpen={showAddForm}
        initialProduct={editingProduct}
        onClose={() => {
          setEditingProduct(null);
          setShowAddForm(false);
        }}
        onSave={handleSaveProduct}
        computeProductCost={computeProductCost}
      />

      {/* Category Filter Pills & Search */}
      <CategoryNavPills
        activeCategory={activeCategory}
        onSelectCategory={(catId) => setActiveCategory(catId)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        products={products}
        filteredCount={filteredProducts.length}
        isGridOpen={showCategoryGrid}
        onToggleGrid={() => setShowCategoryGrid(!showCategoryGrid)}
        onResetAll={() => {
          setActiveCategory('all');
          setSearchQuery('');
        }}
      />

      {/* Expandable 25 Category Visual Grid Drawer & Suggestions */}
      <CategoryGridModal
        isOpen={showCategoryGrid}
        onClose={() => setShowCategoryGrid(false)}
        activeCategory={activeCategory}
        onSelectCategory={(catId) => setActiveCategory(catId)}
        products={products}
        searchQuery={searchQuery}
        onClearSearch={() => setSearchQuery('')}
        matchingCategories={matchingCategories}
      />

      {/* Products Grid / List */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={activeCategory !== 'all' ? getCategoryDefinition(activeCategory).icon : '📦'}
          title={
            activeCategory !== 'all'
              ? `No stored products in "${getCategoryDefinition(activeCategory).name}"`
              : searchQuery
              ? `No products matching "${searchQuery}"`
              : 'No products in store'
          }
          description={
            activeCategory !== 'all'
              ? `You don't have any items stored under ${getCategoryDefinition(activeCategory).name} yet. Catalog your first imported item with multiple photos and landed pricing.`
              : searchQuery
              ? `Try searching by category name, SKU, or clear the search query to see all stored items.`
              : 'Catalog your first imported item with multiple photos, supplier links, and landed pricing.'
          }
          actionLabel={activeCategory !== 'all' ? `Add Product to ${getCategoryDefinition(activeCategory).name}` : 'Add Product Now'}
          onAction={() => {
            setEditingProduct(null);
            setShowAddForm(true);
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* View Mode Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Showing <strong>{filteredProducts.length}</strong> products
            </div>
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === 'grid' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {filteredProducts.map((p) => {
                const landedCost = computeProductCost(p.source_price, p.currency, p.weight_kg);
                return (
                  <CatalogProductCard
                    key={p.id}
                    product={p}
                    landedCost={landedCost}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    onSelectForCalculator={onSelectForCalculator}
                    onAddToList={(prod) => {
                      onAddToList(prod);
                      toast.success(`➕ Added "${prod.title.slice(0, 18)}..." to List Builder`);
                    }}
                    onOpenPhotoViewer={openPhotoViewer}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredProducts.map((p) => {
                const landedCost = computeProductCost(p.source_price, p.currency, p.weight_kg);
                return (
                  <CatalogProductRow
                    key={p.id}
                    product={p}
                    landedCost={landedCost}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    onSelectForCalculator={onSelectForCalculator}
                    onAddToList={(prod) => {
                      onAddToList(prod);
                      toast.success(`➕ Added "${prod.title.slice(0, 18)}..." to List Builder`);
                    }}
                    onOpenPhotoViewer={openPhotoViewer}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
