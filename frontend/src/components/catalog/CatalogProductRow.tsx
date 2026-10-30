'use client';

import React from 'react';
import { 
  Edit3, 
  Trash2, 
  Calculator, 
  ListPlus, 
  ExternalLink 
} from 'lucide-react';
import { CategorizedProduct, getCategoryDefinition } from '@/types/catalog';
import { formatMoney } from '@/lib/formatters';
import { formatExternalUrl } from '@/lib/imageUtils';

interface CatalogProductRowProps {
  product: CategorizedProduct;
  landedCost: number;
  onEdit: (product: CategorizedProduct) => void;
  onDelete: (id: string, title: string) => void;
  onSelectForCalculator: (product: CategorizedProduct) => void;
  onAddToList: (product: CategorizedProduct) => void;
  onOpenPhotoViewer: (product: CategorizedProduct, startIndex: number) => void;
}

export default function CatalogProductRow({
  product: p,
  landedCost,
  onEdit,
  onDelete,
  onSelectForCalculator,
  onAddToList,
  onOpenPhotoViewer,
}: CatalogProductRowProps) {
  const catDef = getCategoryDefinition(p.category);
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
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        flexWrap: 'wrap',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.18s ease',
      }}
    >
      {/* Left: Thumbnail & Details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 320px', minWidth: 0 }}>
        {/* Photo thumbnail */}
        <div
          onClick={() => hasPhotos && onOpenPhotoViewer(p, 0)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '10px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            flexShrink: 0,
            cursor: hasPhotos ? 'pointer' : 'default',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={hasPhotos ? 'Click to zoom photos' : undefined}
        >
          {hasPhotos ? (
            <img
              src={primaryPhoto}
              alt={p.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '1.4rem' }}>{catDef.icon}</span>
          )}
          {allPhotos.length > 1 && (
            <span
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                padding: '1px 4px',
                borderRadius: '4px',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 700,
              }}
            >
              +{allPhotos.length}
            </span>
          )}
        </div>

        {/* Text info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '5px',
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--omni-red)',
              }}
            >
              {catDef.icon} {catDef.name}
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: '5px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
              }}
            >
              {p.platform || '1688'}
            </span>
            {p.product_url && (
              <a
                href={formatExternalUrl(p.product_url)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.68rem',
                  color: '#3b82f6',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  textDecoration: 'none',
                }}
                title="Open Source Link"
              >
                <ExternalLink size={11} />
                <span>Source</span>
              </a>
            )}
          </div>

          <h4
            style={{
              margin: 0,
              fontSize: '0.88rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={p.title}
          >
            {p.title}
          </h4>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Weight: <strong>{p.weight_kg} kg</strong>
            {p.moq && p.moq > 1 ? ` • MOQ: ${p.moq}` : ''}
          </div>
        </div>
      </div>

      {/* Middle: Pricing Breakdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Source</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {p.currency === 'RMB' ? '¥' : '$'}{p.source_price.toFixed(2)}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Landed Cost</div>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--omni-red)' }}>
            ৳{formatMoney(landedCost)}
          </div>
        </div>

        {targetPrice > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Margin</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: profit >= 0 ? '#10b981' : '#ef4444' }}>
              {margin}% (৳{formatMoney(profit)})
            </div>
          </div>
        )}
      </div>

      {/* Right: Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onAddToList(p)}
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            background: 'var(--omni-red)',
            color: '#fff',
            border: 'none',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Add to List Builder"
        >
          <ListPlus size={13} />
          <span>+ List</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectForCalculator(p)}
          style={{
            padding: '6px 8px',
            borderRadius: '8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '0.74rem',
            cursor: 'pointer',
          }}
          title="Calculate Landed Cost"
        >
          <Calculator size={13} />
        </button>

        <button
          type="button"
          onClick={() => onEdit(p)}
          style={{
            padding: '6px 8px',
            borderRadius: '8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '0.74rem',
            cursor: 'pointer',
          }}
          title="Edit Product"
        >
          <Edit3 size={13} />
        </button>

        <button
          type="button"
          onClick={() => onDelete(p.id, p.title)}
          style={{
            padding: '6px 8px',
            borderRadius: '8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: '#ef4444',
            fontSize: '0.74rem',
            cursor: 'pointer',
          }}
          title="Delete Product"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

