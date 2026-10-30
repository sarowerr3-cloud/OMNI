'use client';

import React, { useRef } from 'react';
import { 
  Filter, 
  Search, 
  X, 
  LayoutGrid, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { 
  PRODUCT_CATEGORIES, 
  CategorizedProduct, 
  CATEGORY_ALIASES,
  getCategoryDefinition 
} from '@/types/catalog';

interface CategoryNavPillsProps {
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  products: CategorizedProduct[];
  filteredCount: number;
  isGridOpen: boolean;
  onToggleGrid: () => void;
  onResetAll: () => void;
}

export default function CategoryNavPills({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  products,
  filteredCount,
  isGridOpen,
  onToggleGrid,
  onResetAll,
}: CategoryNavPillsProps) {
  const pillsContainerRef = useRef<HTMLDivElement>(null);

  const scrollPills = (direction: 'left' | 'right') => {
    if (!pillsContainerRef.current) return;
    const distance = 280;
    pillsContainerRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  const activeDef = getCategoryDefinition(activeCategory);

  return (
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
            onChange={(e) => onSelectCategory(e.target.value)}
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
            placeholder="Search products by title, category, SKU, or details..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
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
              onClick={() => onSearchChange('')}
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
          onClick={onToggleGrid}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '8px',
            background: isGridOpen ? 'var(--omni-red)' : 'var(--bg-surface)',
            color: isGridOpen ? '#ffffff' : 'var(--text-secondary)',
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
                {activeDef.icon} {activeDef.name}
                <button
                  onClick={() => onSelectCategory('all')}
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
                  onClick={() => onSearchChange('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginLeft: '2px', fontSize: '0.74rem' }}
                  title="Clear search text"
                >
                  ✕
                </button>
              </span>
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
              ({filteredCount} product{filteredCount !== 1 ? 's' : ''} found)
            </span>
          </div>

          <button
            type="button"
            onClick={onResetAll}
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
            onClick={() => onSelectCategory('all')}
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
                onClick={() => onSelectCategory(cat.id)}
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
  );
}
