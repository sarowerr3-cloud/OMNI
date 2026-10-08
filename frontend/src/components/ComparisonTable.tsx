'use client';

import { useState } from 'react';
import { SourcedProductResult } from '@/lib/types';
import { formatMoney } from '@/lib/formatters';

interface ComparisonTableProps {
  results: SourcedProductResult[];
  rmbRate: number;
}

/**
 * Side-by-side comparison table for sourcing results.
 * Highlights the best value in each metric row.
 */
export default function ComparisonTable({ results, rmbRate }: ComparisonTableProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (results.length < 2) return null;

  const metrics = [
    {
      label: 'Platform',
      getValue: (r: SourcedProductResult) => r.product.platform,
      format: (v: any) => v,
      best: 'none' as const,
    },
    {
      label: 'Supplier Price',
      getValue: (r: SourcedProductResult) => r.product.price,
      format: (v: number) => `${v}`,
      best: 'lowest' as const,
    },
    {
      label: 'Landed Cost / Unit',
      getValue: (r: SourcedProductResult) => r.cost_breakdown.per_unit_landed_cost,
      format: (v: number) => `৳${formatMoney(v)}`,
      best: 'lowest' as const,
    },
    {
      label: 'Est. Net Profit / Unit',
      getValue: (r: SourcedProductResult) => r.market_analysis.estimated_net_profit,
      format: (v: number) => `৳${formatMoney(v)}`,
      best: 'highest' as const,
    },
    {
      label: 'Gross Margin',
      getValue: (r: SourcedProductResult) => r.market_analysis.gross_margin_percent,
      format: (v: number) => `${v}%`,
      best: 'highest' as const,
    },
    {
      label: 'ROI',
      getValue: (r: SourcedProductResult) => r.market_analysis.roi_percent,
      format: (v: number) => `${v}%`,
      best: 'highest' as const,
    },
    {
      label: 'MOQ',
      getValue: (r: SourcedProductResult) => r.product.moq,
      format: (v: number) => `${v} pcs`,
      best: 'lowest' as const,
    },
    {
      label: 'Seller Rating',
      getValue: (r: SourcedProductResult) => r.product.seller_rating || 0,
      format: (v: number) => `⭐ ${v}`,
      best: 'highest' as const,
    },
    {
      label: 'AI Viability',
      getValue: (r: SourcedProductResult) => r.claude_insight?.commercial_viability || 'N/A',
      format: (v: string) => v,
      best: 'none' as const,
    },
  ];

  // Bind `r` into the format function for the Supplier Price row
  const formatWithContext = (metric: typeof metrics[0], r: SourcedProductResult, value: any) => {
    if (metric.label === 'Supplier Price') {
      return `${r.product.currency === 'RMB' ? '¥' : '$'}${value}`;
    }
    return (metric.format as any)(value);
  };

  const findBestIdx = (metric: typeof metrics[0]): number => {
    if (metric.best === 'none') return -1;
    const values = results.map((r) => Number(metric.getValue(r)) || 0);
    if (metric.best === 'lowest') return values.indexOf(Math.min(...values));
    return values.indexOf(Math.max(...values));
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 20px',
          borderRadius: '10px',
          background: isOpen ? 'linear-gradient(135deg, #dc2626 0%, #990000 100%)' : '#18181b',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.95rem',
          border: isOpen ? 'none' : '1px solid #27272a',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.3s',
          boxShadow: isOpen ? '0 0 15px rgba(220, 38, 38, 0.3)' : 'none',
        }}
      >
        <span>📊 Compare All {results.length} Suppliers Side-by-Side</span>
        <span style={{ fontSize: '1.2rem' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: '0.75rem',
            background: '#18181b',
            borderRadius: '12px',
            border: '1px solid #27272a',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              minWidth: `${results.length * 180 + 160}px`,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    color: '#a1a1aa',
                    fontWeight: 600,
                    borderBottom: '1px solid #27272a',
                    position: 'sticky',
                    left: 0,
                    background: '#18181b',
                    zIndex: 1,
                    minWidth: '140px',
                  }}
                >
                  Metric
                </th>
                {results.map((r, idx) => (
                  <th
                    key={idx}
                    style={{
                      textAlign: 'center',
                      padding: '12px 16px',
                      color: '#ffffff',
                      fontWeight: 800,
                      borderBottom: '1px solid #27272a',
                      borderLeft: '1px solid #27272a',
                      background: idx === 0 ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
                      minWidth: '160px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#dc2626' }}>
                        {r.product.platform === 'Pinduoduo' ? '拼多多 Pinduoduo' : r.product.platform}
                      </span>
                      {idx === 0 && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            background: '#dc2626',
                            color: '#fff',
                            padding: '1px 6px',
                            borderRadius: '9999px',
                          }}
                        >
                          BEST VALUE
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, mIdx) => {
                const bestIdx = findBestIdx(metric);
                return (
                  <tr key={mIdx} style={{ borderBottom: '1px solid #1c1c1e' }}>
                    <td
                      style={{
                        padding: '10px 16px',
                        color: '#a1a1aa',
                        fontWeight: 600,
                        position: 'sticky',
                        left: 0,
                        background: '#18181b',
                        zIndex: 1,
                      }}
                    >
                      {metric.label}
                    </td>
                    {results.map((r, rIdx) => {
                      const value = metric.getValue(r);
                      const isBest = rIdx === bestIdx;
                      const viabilityColor =
                        metric.label === 'AI Viability'
                          ? value === 'HIGH'
                            ? '#22c55e'
                            : value === 'MODERATE'
                              ? '#f59e0b'
                              : '#ef4444'
                          : undefined;

                      return (
                        <td
                          key={rIdx}
                          style={{
                            padding: '10px 16px',
                            textAlign: 'center',
                            fontWeight: isBest ? 800 : 600,
                            color: viabilityColor || (isBest ? '#22c55e' : '#f8fafc'),
                            borderLeft: '1px solid #27272a',
                            background: isBest ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                          }}
                        >
                          {formatWithContext(metric, r, value)}
                          {isBest && <span style={{ marginLeft: '4px', fontSize: '0.7rem' }}>✓</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
