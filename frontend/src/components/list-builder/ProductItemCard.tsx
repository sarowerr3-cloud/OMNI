'use client';

import React from 'react';
import { 
  Package, 
  ExternalLink, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Check, 
  Plus, 
  X, 
  MessageSquare 
} from 'lucide-react';
import { ProductItem } from '@/types/listBuilder';
import { formatExternalUrl } from '@/lib/imageUtils';

interface ProductItemCardProps {
  item: ProductItem;
  index: number;
  totalItems: number;
  includeWeightInTotal: boolean;
  onToggleChecked: (id: string) => void;
  onOpenLightbox: (item: ProductItem, imgIdx: number) => void;
  onAddImages: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuantityChange: (id: string, newQty: number) => void;
  onPaidChange: (id: string, paid: number) => void;
  onMarkPaid: (id: string) => void;
  onResetPayment: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
  onPitchToCustomers?: (item: ProductItem) => void;
}

export default function ProductItemCard({
  item,
  index,
  totalItems,
  includeWeightInTotal,
  onToggleChecked,
  onOpenLightbox,
  onAddImages,
  onQuantityChange,
  onPaidChange,
  onMarkPaid,
  onResetPayment,
  onMove,
  onDelete,
  onPitchToCustomers,
}: ProductItemCardProps) {
  const lineProductPrice = (item.price_bdt || 0) * (item.quantity || 1);
  const unitWeightPrice = item.weight_price_bdt || 0;
  const lineWeightPrice = item.line_weight_price_bdt ?? (unitWeightPrice * (item.quantity || 1));
  const combinedLineTotal = item.combined_line_total_bdt ?? (lineProductPrice + lineWeightPrice);
  const lineTotalBdt = includeWeightInTotal ? combinedLineTotal : lineProductPrice;
  const lineTotalWeightKg = (item.weight_kg || 0) * (item.quantity || 1);
  const itemPaid = item.paid_amount || 0;
  const itemDue = item.due_amount !== undefined ? item.due_amount : Math.max(0, lineTotalBdt - itemPaid);
  const itemStatus: 'paid' | 'partial' | 'unpaid' =
    itemDue === 0 && itemPaid > 0 ? 'paid' : itemPaid > 0 ? 'partial' : 'unpaid';

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface, #09090b)',
        border: '1px solid var(--border-color, #27272a)',
        borderRadius: '12px',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      {/* Item Serial, Checklist Box, Image & Details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px', flex: 1 }}>
        {/* Checkbox button */}
        <button
          type="button"
          onClick={() => onToggleChecked(item.id)}
          title={item.is_checked ? 'Mark as pending' : 'Mark as sourced / verified'}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: item.is_checked ? '2px solid #22c55e' : '2px solid #52525b',
            backgroundColor: item.is_checked ? '#16a34a' : 'transparent',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          {item.is_checked ? <Check style={{ width: '14px', height: '14px' }} strokeWidth={3} /> : null}
        </button>

        <span
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card, #18181b)',
            border: '1px solid var(--border-color, #3f3f46)',
            color: 'var(--text-primary, #f8fafc)',
            fontWeight: 800,
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>

        {/* Image container & Multiple Images */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div
            onClick={() => onOpenLightbox(item, 0)}
            title={item.image_url || (item.images && item.images.length > 0) ? 'Click to view photo in lightbox' : undefined}
            style={{
              position: 'relative',
              width: '56px',
              height: '56px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card, #18181b)',
              border: '1px solid var(--border-color, #27272a)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: item.image_url || (item.images && item.images.length > 0) ? 'pointer' : 'default',
            }}
          >
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Package style={{ width: '24px', height: '24px', color: '#71717a' }} />
            )}
            {item.images && item.images.length > 1 && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '1px 4px',
                  borderRadius: '4px',
                }}
              >
                +{item.images.length - 1}
              </span>
            )}
          </div>

          {/* Add extra photos button */}
          <div>
            <input
              type="file"
              id={`add-photo-${item.id}`}
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => onAddImages(item.id, e)}
            />
            <button
              type="button"
              onClick={() => document.getElementById(`add-photo-${item.id}`)?.click()}
              title="Add more photos to this product"
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                color: '#a1a1aa',
                fontSize: '0.65rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <Plus style={{ width: '10px', height: '10px', color: '#34d399' }} />
              <span>Photo</span>
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h4
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: item.is_checked ? '#86efac' : 'var(--text-primary, #ffffff)',
                textDecoration: item.is_checked ? 'line-through' : 'none',
                margin: 0,
              }}
            >
              {item.title}
            </h4>
            {item.is_checked && (
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(34, 197, 94, 0.18)',
                  color: '#4ade80',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                }}
              >
                ✓ Sourced
              </span>
            )}
            {item.platform && (
              <span
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(220, 38, 38, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  textTransform: 'uppercase',
                }}
              >
                {item.platform}
              </span>
            )}
          </div>

          {item.details && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)', margin: 0 }}>{item.details}</p>
          )}

          {/* Extra image thumbnails */}
          {item.images && item.images.length > 1 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#71717a' }}>Photos ({item.images.length}):</span>
              {item.images.map((img, imgIdx) => (
                <div
                  key={imgIdx}
                  onClick={() => onOpenLightbox(item, imgIdx)}
                  title="Click to view photo in lightbox"
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: item.image_url === img ? '2px solid #dc2626' : '1px solid #3f3f46',
                    cursor: 'pointer',
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}

          {item.product_url ? (
            <a
              href={formatExternalUrl(item.product_url)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.75rem',
                color: '#60a5fa',
                textDecoration: 'underline',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '2px',
              }}
            >
              <ExternalLink style={{ width: '12px', height: '12px' }} />
              <span>Direct Product Link</span>
            </a>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#52525b' }}>No URL link</span>
          )}
        </div>
      </div>

      {/* Quantity Stepper & Calculation Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        {/* Stepper */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-card, #18181b)',
            border: '1px solid var(--border-color, #3f3f46)',
            borderRadius: '8px',
            padding: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => onQuantityChange(item.id, item.quantity - 1)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-surface, #27272a)',
              color: 'var(--text-primary, #ffffff)',
              fontWeight: 800,
              fontSize: '0.8rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            -
          </button>
          <span style={{ width: '32px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-surface, #27272a)',
              color: 'var(--text-primary, #ffffff)',
              fontWeight: 800,
              fontSize: '0.8rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            +
          </button>
        </div>

        {/* Pricing Badges */}
        <div style={{ textAlign: 'right', minWidth: '90px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #a1a1aa)' }}>
            {item.currency} {item.price.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
            ৳{item.price_bdt.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#60a5fa' }}>
            {item.quantity} × ৳{item.price_bdt.toLocaleString()} = ৳{lineProductPrice.toLocaleString()}
          </div>
        </div>

        {/* Weight & Freight Badges */}
        <div style={{ textAlign: 'right', minWidth: '85px' }}>
          <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700 }}>
            {lineTotalWeightKg.toFixed(3)} kg
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted, #a1a1aa)' }}>
            ({(item.weight_kg * 1000).toFixed(0)} gm/unit)
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
            +৳{lineWeightPrice.toFixed(0)}
          </div>
        </div>

        {/* Combined Line Total */}
        <div style={{ textAlign: 'right', minWidth: '100px' }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: '#f87171' }}>
            {includeWeightInTotal ? 'Line Total (Inc. Wt)' : 'Product Total'}
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
            ৳{lineTotalBdt.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
            ৳{lineProductPrice.toLocaleString()} + ৳{lineWeightPrice.toLocaleString()} wt
          </div>
        </div>

        {/* Customer Payment & Due Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'var(--bg-card, #18181b)',
            border: `1px solid ${
              itemStatus === 'paid'
                ? 'rgba(16, 185, 129, 0.4)'
                : itemStatus === 'partial'
                ? 'rgba(245, 158, 11, 0.4)'
                : 'var(--border-color, #27272a)'
            }`,
            borderRadius: '10px',
            padding: '6px 10px',
          }}
        >
          {/* Status Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textAlign: 'center',
                backgroundColor:
                  itemStatus === 'paid'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : itemStatus === 'partial'
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(239, 68, 68, 0.12)',
                color:
                  itemStatus === 'paid'
                    ? '#34d399'
                    : itemStatus === 'partial'
                    ? '#fbbf24'
                    : '#f87171',
                border:
                  itemStatus === 'paid'
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : itemStatus === 'partial'
                    ? '1px solid rgba(245, 158, 11, 0.3)'
                    : '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              {itemStatus === 'paid' ? 'PAID ✓' : itemStatus === 'partial' ? 'PARTIAL' : 'UNPAID'}
            </span>
          </div>

          {/* Paid Input */}
          <div>
            <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted, #a1a1aa)' }}>
              Customer Paid
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  max={lineTotalBdt}
                  step="1"
                  value={itemPaid}
                  onChange={(e) => onPaidChange(item.id, Number(e.target.value) || 0)}
                  style={{
                    width: '90px',
                    backgroundColor: 'var(--bg-surface, #09090b)',
                    border: '1px solid var(--border-color, #3f3f46)',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#34d399',
                    outline: 'none',
                  }}
                />
                <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: '#71717a', pointerEvents: 'none' }}>
                  ৳
                </span>
              </div>
              <button
                type="button"
                onClick={() => onMarkPaid(item.id)}
                title="Mark this item fully paid"
                style={{
                  padding: '4px 6px',
                  borderRadius: '5px',
                  backgroundColor: 'var(--bg-surface, #27272a)',
                  color: '#34d399',
                  border: '1px solid var(--border-color, #3f3f46)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Full
              </button>
              {itemPaid > 0 && (
                <button
                  type="button"
                  onClick={() => onResetPayment(item.id)}
                  title="Reset payment"
                  style={{
                    padding: '4px',
                    borderRadius: '5px',
                    backgroundColor: 'transparent',
                    color: '#f87171',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X style={{ width: '12px', height: '12px' }} />
                </button>
              )}
            </div>
          </div>

          {/* Due Display */}
          <div style={{ textAlign: 'right', minWidth: '75px' }}>
            <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, color: '#a1a1aa' }}>
              Customer Due
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: itemDue > 0 ? '#f87171' : '#34d399', marginTop: '2px' }}>
              ৳{itemDue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Reorder & Remove Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            style={{ padding: '4px', backgroundColor: 'transparent', color: index === 0 ? '#3f3f46' : '#a1a1aa', border: 'none', cursor: 'pointer' }}
          >
            <MoveUp style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 'down')}
            disabled={index === totalItems - 1}
            style={{ padding: '4px', backgroundColor: 'transparent', color: index === totalItems - 1 ? '#3f3f46' : '#a1a1aa', border: 'none', cursor: 'pointer' }}
          >
            <MoveDown style={{ width: '16px', height: '16px' }} />
          </button>
          {onPitchToCustomers && (
            <button
              type="button"
              onClick={() => onPitchToCustomers(item)}
              title="Message customers about this product"
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '4px',
              }}
            >
              <MessageSquare style={{ width: '12px', height: '12px' }} />
              <span>Pitch</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            style={{ padding: '4px', backgroundColor: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', marginLeft: '4px' }}
          >
            <Trash2 style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
