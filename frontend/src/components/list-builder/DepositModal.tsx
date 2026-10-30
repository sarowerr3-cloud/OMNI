'use client';

import React, { useState } from 'react';
import { CreditCard, X, Wallet, CheckCheck } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  effectiveTotalOrderBdt: number;
  totalPaidBdt: number;
  totalDueBdt: number;
  onApplyDeposit: (amount: number, strategy: 'sequential' | 'proportional') => void;
}

export default function DepositModal({
  isOpen,
  onClose,
  effectiveTotalOrderBdt,
  totalPaidBdt,
  totalDueBdt,
  onApplyDeposit,
}: DepositModalProps) {
  const [depositAmountInput, setDepositAmountInput] = useState<string>('');
  const [depositStrategy, setDepositStrategy] = useState<'sequential' | 'proportional'>('sequential');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depositAmountInput) || 0;
    if (amount <= 0) return;
    onApplyDeposit(amount, depositStrategy);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #18181b)',
          border: '1px solid var(--border-color, #27272a)',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '100%',
          padding: '1.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-color, #27272a)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
              }}
            >
              <CreditCard style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0 }}>
                Record Customer Advance / Deposit
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)', margin: '2px 0 0 0' }}>
                Allocate advance payment across product line items
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: 'var(--bg-surface, #27272a)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-muted, #a1a1aa)',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Quick Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1rem' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #09090b)',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #27272a)',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted, #a1a1aa)', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Order
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', marginTop: '2px' }}>
              ৳{effectiveTotalOrderBdt.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #09090b)',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>
              Current Paid
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
              ৳{totalPaidBdt.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #09090b)',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 700 }}>
              Current Due
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
              ৳{totalDueBdt.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Deposit Input */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary, #e2e8f0)',
                marginBottom: '6px',
              }}
            >
              <Wallet style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
              Customer Deposit Amount (BDT) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min="1"
                step="1"
                value={depositAmountInput}
                onChange={(e) => setDepositAmountInput(e.target.value)}
                placeholder="e.g. 5000"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface, #09090b)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  boxSizing: 'border-box',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1rem',
                  color: '#38bdf8',
                  pointerEvents: 'none',
                  fontWeight: 800,
                }}
              >
                ৳
              </span>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setDepositAmountInput(String(totalDueBdt))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface, #27272a)',
                  border: '1px solid var(--border-color, #3f3f46)',
                  color: '#34d399',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Pay Full Balance (৳{totalDueBdt.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => setDepositAmountInput(String(Math.round(effectiveTotalOrderBdt * 0.5)))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface, #27272a)',
                  border: '1px solid var(--border-color, #3f3f46)',
                  color: '#60a5fa',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                50% Advance (৳{Math.round(effectiveTotalOrderBdt * 0.5).toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => setDepositAmountInput(String(Math.round(effectiveTotalOrderBdt * 0.3)))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface, #27272a)',
                  border: '1px solid var(--border-color, #3f3f46)',
                  color: '#fbbf24',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                30% Advance (৳{Math.round(effectiveTotalOrderBdt * 0.3).toLocaleString()})
              </button>
            </div>
          </div>

          {/* Allocation Strategy */}
          <div
            style={{
              marginBottom: '1.25rem',
              backgroundColor: 'var(--bg-surface, #09090b)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #27272a)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #e2e8f0)', marginBottom: '8px' }}>
              Allocation Mode:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary, #f8fafc)' }}>
                <input
                  type="radio"
                  name="allocation_strategy"
                  checked={depositStrategy === 'sequential'}
                  onChange={() => setDepositStrategy('sequential')}
                />
                <span><strong>Sequential:</strong> Clear items top-to-bottom in order</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary, #f8fafc)' }}>
                <input
                  type="radio"
                  name="allocation_strategy"
                  checked={depositStrategy === 'proportional'}
                  onChange={() => setDepositStrategy('proportional')}
                />
                <span><strong>Proportional:</strong> Distribute evenly based on item price</span>
              </label>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color, #27272a)',
                color: 'var(--text-secondary, #a1a1aa)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
              }}
            >
              <CheckCheck style={{ width: '16px', height: '16px' }} />
              <span>Apply Customer Deposit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
