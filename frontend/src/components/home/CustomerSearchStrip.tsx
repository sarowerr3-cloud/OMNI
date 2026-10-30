'use client';

import React from 'react';
import { Sparkles, Users } from 'lucide-react';
import UniversalCustomerSearch from '@/components/customers/UniversalCustomerSearch';
import { Customer } from '@/types/customer';

interface CustomerSearchStripProps {
  apiUrl: string;
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewOrder: (customer: Customer) => void;
  onCreateNewCustomer: (prefill?: string) => void;
  onOpenCustomerManager: () => void;
  showToast: (msg: string) => void;
}

export default function CustomerSearchStrip({
  apiUrl,
  onSelectCustomer,
  onOpenNewOrder,
  onCreateNewCustomer,
  onOpenCustomerManager,
  showToast,
}: CustomerSearchStripProps) {
  return (
    <div className="content-container" style={{ marginTop: '1.25rem', position: 'relative', zIndex: 40 }}>
      <div className="search-strip">
        <div className="search-strip-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--omni-red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--neu-flat-sm)',
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Universal Customer Profile & Order Search</span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '6px',
                    background: 'var(--omni-red)',
                    color: '#ffffff',
                    letterSpacing: '0.5px',
                  }}
                >
                  UNIVERSAL
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Search by Phone Number, Name, or Address to quickly launch orders or open customer profiles.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCustomerManager}
            className="header-util-btn"
            style={{ color: 'var(--omni-red)' }}
          >
            <Users size={14} />
            <span>Open Customer Manager ➔</span>
          </button>
        </div>

        <UniversalCustomerSearch
          apiUrl={apiUrl}
          onSelectCustomer={onSelectCustomer}
          onOpenNewOrder={onOpenNewOrder}
          onCreateNewCustomer={onCreateNewCustomer}
          showToast={showToast}
        />
      </div>
    </div>
  );
}
