'use client';

import { useState } from 'react';
import { SourcedProductResult } from '@/lib/types';

interface NegotiationModalProps {
  product: SourcedProductResult['product'];
  currentRmbPrice: number;
  quantity: number;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export default function NegotiationModal({
  product,
  currentRmbPrice,
  quantity,
  onClose,
  showToast,
}: NegotiationModalProps) {
  // Suggested target counter-offers
  const discount5Pct = (currentRmbPrice * 0.95).toFixed(2);
  const discount10Pct = (currentRmbPrice * 0.90).toFixed(2);
  const discount15Pct = (currentRmbPrice * 0.85).toFixed(2);

  const [targetPrice, setTargetPrice] = useState<string>(discount10Pct);
  const [targetQty, setTargetQty] = useState<number>(quantity || 50);

  // Chinese negotiation message templates
  const chineseTemplate = `你好老板！我们是来自孟加拉国（Bangladesh）的专业进口贸易商。
我们对您店铺的这款【${product.title_original || product.title_en}】非常感兴趣。

我们计划首批采购 ${targetQty} 件作为试单。如果品质合格且交期稳定，我们每个月会有长期大批量的稳定返单。

请问：
1. 首批 ${targetQty} 件单价是否可以优惠到 ¥${targetPrice} /件？
2. 包装规格和现货库存是否充足？交货期大概几天？
3. 是否支持寄样检测？

期待与贵厂建立长期双赢合作，谢谢！`;

  const copyScript = () => {
    navigator.clipboard.writeText(chineseTemplate);
    showToast('📋 Chinese 1688/WeChat negotiation message copied!');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#18181b',
          border: '1px solid #dc2626',
          borderRadius: '16px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(220, 38, 38, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #27272a', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🇨🇳</span> 1688 / WeChat Price Negotiation Script Generator
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#a1a1aa' }}>
              AI-crafted supplier dialogue for cross-border Chinese factories & distributors
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#27272a',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Product summary */}
        <div style={{ background: '#09090b', padding: '0.85rem', borderRadius: '10px', border: '1px solid #27272a', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            {product.title_en || product.title_original}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
            <span>Platform: <strong style={{ color: '#dc2626' }}>{product.platform}</strong></span>
            <span>Current Listed Price: <strong style={{ color: '#fff' }}>¥{currentRmbPrice} RMB</strong></span>
            <span>MOQ: <strong style={{ color: '#fff' }}>{product.moq} pcs</strong></span>
          </div>
        </div>

        {/* Counter-offer selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, marginBottom: '6px' }}>
            🎯 Target Counter-Offer Price (RMB):
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '8px', flexWrap: 'wrap' }}>
            {[
              { label: `-5% (¥${discount5Pct})`, val: discount5Pct },
              { label: `-10% (¥${discount10Pct}) (Recommended)`, val: discount10Pct },
              { label: `-15% (¥${discount15Pct})`, val: discount15Pct },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTargetPrice(p.val)}
                style={{
                  background: targetPrice === p.val ? '#dc2626' : '#27272a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', marginBottom: '3px' }}>Custom Target Price (¥)</label>
              <input
                type="number"
                step="0.5"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', marginBottom: '3px' }}>Order Volume (Pcs)</label>
              <input
                type="number"
                min="1"
                value={targetQty}
                onChange={(e) => setTargetQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Ready to copy script */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 700 }}>
              ✉️ Chinese Ready-to-Send Negotiation Message:
            </span>
            <button
              type="button"
              onClick={copyScript}
              style={{
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              📋 Copy Chinese Text
            </button>
          </div>
          <textarea
            readOnly
            value={chineseTemplate}
            rows={8}
            style={{
              width: '100%',
              background: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '10px',
              color: '#e2e8f0',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              lineHeight: 1.5,
              resize: 'none',
            }}
          />
        </div>

        {/* English Translation Guide */}
        <div style={{ background: '#09090b', padding: '0.85rem', borderRadius: '8px', border: '1px solid #27272a', marginBottom: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '4px' }}>English Meaning:</strong>
          "Hello boss! We are a professional import trader from Bangladesh. We are interested in your product and want to place a trial order of ${targetQty} pcs. If quality is satisfactory, we will place regular bulk repeat orders monthly. Can you offer ¥${targetPrice} / pc? Are packing specs and ready inventory available? Can you provide a sample?"
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={copyScript}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #dc2626 0%, #990000 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)',
          }}
        >
          📋 Copy Full Negotiation Script to Clipboard
        </button>
      </div>
    </div>
  );
}
