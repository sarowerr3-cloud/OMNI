'use client';

import React from 'react';
import { LayoutGrid, X } from 'lucide-react';
import { 
  PRODUCT_CATEGORIES, 
  CategorizedProduct, 
  CATEGORY_ALIASES,
  CategoryDefinition 
} from '@/types/catalog';

interface CategoryGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
  products: CategorizedProduct[];
  searchQuery: string;
  onClearSearch: () => void;
  matchingCategories: CategoryDefinition[];
}

export default function CategoryGridModal({
  isOpen,
  onClose,
  activeCategory,
  onSelectCategory,
  products,
  searchQuery,
  onClearSearch,
  matchingCategories,
}: CategoryGridModalProps) {
  return (
    <>
      {/* Dynamic Category Suggestions when typing in search */}
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
                onSelectCategory(c.id);
                onClearSearch();
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
      {isOpen && (
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
                  onSelectCategory('all');
                  onClose();
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
                onClick={onClose}
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
              const count = products.filter(
                (p) => p.category === cat.id || CATEGORY_ALIASES[p.category] === cat.id
              ).length;
              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onClose();
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
    </>
  );
}
