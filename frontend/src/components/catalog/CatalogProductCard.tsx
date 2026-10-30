'use client';

import React from 'react';
import { 
  Edit3, 
  Trash2, 
  Calculator, 
  ListPlus, 
  Link as LinkIcon, 
  ExternalLink, 
  ZoomIn 
} from 'lucide-react';
import { CategorizedProduct, getCategoryDefinition } from '@/types/catalog';
import { formatMoney } from '@/lib/formatters';
import { formatExternalUrl } from '@/lib/imageUtils';

interface CatalogProductCardProps {
  product: CategorizedProduct;
  landedCost: number;
  onEdit: (product: CategorizedProduct) => void;
  onDelete: (id: string, title: string) => void;
  onSelectForCalculator: (product: CategorizedProduct) => void;
  onAddToList: (product: CategorizedProduct) => void;
  onOpenPhotoViewer: (product: CategorizedProduct, startIndex: number) => void;
}

export default function CatalogProductCard({
  product: p,
  landedCost,
  onEdit,
  onDelete,
  onSelectForCalculator,
  onAddToList,
  onOpenPhotoViewer,
}: CatalogProductCardProps) {
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
            onClick={() => hasPhotos && onOpenPhotoViewer(p, 0)}
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

                {/* Hover Gradient Overlay */}
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
                  onClick={() => onOpenPhotoViewer(p, pIdx)}
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
            onClick={() => onEdit(p)}
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
            onClick={() => onDelete(p.id, p.title)}
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
            onClick={() => onAddToList({ ...p, images: allPhotos })}
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
}
