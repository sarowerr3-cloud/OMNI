'use client';

import React from 'react';
import { Wallet, CreditCard, CheckCheck, RotateCcw } from 'lucide-react';

interface PaymentActionBarProps {
  itemsCount: number;
  effectiveTotalOrderBdt: number;
  totalPaidBdt: number;
  totalDueBdt: number;
  onOpenDepositModal: () => void;
  onMarkAllPaid: () => void;
  onResetAllPayments: () => void;
}

export default function PaymentActionBar({
  itemsCount,
  effectiveTotalOrderBdt,
  totalPaidBdt,
  totalDueBdt,
  onOpenDepositModal,
  onMarkAllPaid,
  onResetAllPayments,
}: PaymentActionBarProps) {
  if (itemsCount === 0) return null;

  return (
    <div
      style={{
        marginTop: '1rem',
        padding: '10px 14px',
        backgroundColor: 'var(--bg-surface, #09090b)',
        border: '1px solid var(--border-color, #27272a)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <Wallet style={{ width: '18px', height: '18px', color: '#10b981' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
          Customer Payment Status:
        </span>
        <span
          style={{
            fontSize: '0.8rem',
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            fontWeight: 800,
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          ৳{totalPaidBdt.toLocaleString()} Paid (
          {effectiveTotalOrderBdt > 0 ? Math.round((totalPaidBdt / effectiveTotalOrderBdt) * 100) : 0}%)
        </span>
        <span
          style={{
            fontSize: '0.8rem',
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: totalDueBdt > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: totalDueBdt > 0 ? '#f87171' : '#34d399',
            fontWeight: 800,
            border:
              totalDueBdt > 0
                ? '1px solid rgba(239, 68, 68, 0.3)'
                : '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          {totalDueBdt > 0 ? `৳${totalDueBdt.toLocaleString()} Due` : 'All Paid ✓'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onOpenDepositModal}
          title="Record customer advance payment and distribute across items"
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CreditCard style={{ width: '14px', height: '14px' }} />
          <span>Record Customer Deposit</span>
        </button>

        <button
          type="button"
          onClick={onMarkAllPaid}
          title="Mark 100% of all items as paid"
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CheckCheck style={{ width: '14px', height: '14px' }} />
          <span>Mark All Paid</span>
        </button>

        <button
          type="button"
          onClick={onResetAllPayments}
          title="Reset all payments to 0 (all due)"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <RotateCcw style={{ width: '13px', height: '13px' }} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
