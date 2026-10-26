'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  Phone,
  MapPin,
  Package,
  Plus,
  ArrowRight,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Customer } from '@/types/customer';
import { customerApi, normalizePhoneNumber } from '@/services/customerApi';

interface UniversalCustomerSearchProps {
  apiUrl: string;
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewOrder: (customer: Customer) => void;
  onCreateNewCustomer: (prefilledQuery?: string) => void;
  showToast: (msg: string) => void;
}

export default function UniversalCustomerSearch({
  apiUrl,
  onSelectCustomer,
  onOpenNewOrder,
  onCreateNewCustomer,
  showToast
}: UniversalCustomerSearchProps) {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results as user types (debounced)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await customerApi.getCustomers(apiUrl, query.trim());
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Universal search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, apiUrl]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={searchContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
      }}
    >
      {/* SEARCH INPUT BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 12px 6px 18px',
          borderRadius: '18px',
          background: 'var(--bg-card)',
          border: isOpen ? '1.5px solid var(--omni-red)' : '1px solid var(--neu-rim)',
          boxShadow: isOpen ? '0 8px 30px rgba(220, 38, 38, 0.18)' : 'var(--neu-flat-sm)',
          transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--omni-red)', flexShrink: 0 }}>
          <Search size={20} />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Universal Search: Locate customer by Phone Number, Name, or Delivery Address..."
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '0.95rem',
            color: 'var(--text-primary)',
            padding: '8px 0',
            fontWeight: 500,
          }}
        />

        {loading && (
          <div
            style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              borderTopColor: 'var(--omni-red)',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
              flexShrink: 0,
            }}
          />
        )}

        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}

        {/* Quick Create Customer Button */}
        <button
          type="button"
          onClick={() => onCreateNewCustomer(query)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--neu-rim)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--neu-flat-sm)',
            whiteSpace: 'nowrap',
            transition: 'all 0.18s ease',
          }}
          title="Create a new customer profile"
        >
          <Plus size={14} style={{ color: 'var(--omni-red)' }} />
          <span>New Profile</span>
        </button>
      </div>

      {/* DROPDOWN RESULTS PANEL */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            borderRadius: '18px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--neu-rim)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
            maxHeight: '440px',
            overflowY: 'auto',
            zIndex: 900,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 0.18s ease',
          }}
        >
          {/* Header row in dropdown */}
          <div
            style={{
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <span>Matching Customer Profiles ({results.length})</span>
            <span>Search Key: "{query}"</span>
          </div>

          {results.length > 0 ? (
            results.map((cust) => {
              const activeCount = cust.orders?.filter((o) => !o.is_delivered && !o.is_cancelled).length || 0;
              const deliveredCount = cust.orders?.filter((o) => o.is_delivered).length || 0;

              return (
                <div
                  key={cust.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'all 0.18s ease',
                  }}
                  className="hover-neu-lift"
                >
                  {/* Left: Avatar & Customer Identifiers */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      flex: 1,
                      minWidth: 0,
                    }}
                    onClick={() => {
                      onSelectCustomer(cust);
                      setIsOpen(false);
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {cust.name.charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {cust.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--omni-red)',
                          }}
                        >
                          {cust.group}
                        </span>
                      </div>

                      {/* Phone & Address snippet */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <Phone size={12} style={{ color: 'var(--omni-red)' }} />
                          <span>{cust.phone}</span>
                        </span>
                        {cust.address && (
                          <>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                              <span>{cust.address}</span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Notes snippet (if any) */}
                      {cust.notes && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Note: {cust.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Order Stats */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.74rem',
                      background: 'var(--bg-surface)',
                      padding: '6px 10px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>Orders</div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{cust.orders?.length || 0}</div>
                    </div>
                    <div style={{ height: '20px', width: '1px', background: 'var(--border-color)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#10b981', fontSize: '0.66rem' }}>Delivered</div>
                      <div style={{ fontWeight: 800, color: '#10b981' }}>{deliveredCount}</div>
                    </div>
                    {cust.total_due > 0 && (
                      <>
                        <div style={{ height: '20px', width: '1px', background: 'var(--border-color)' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#ef4444', fontSize: '0.66rem' }}>Due</div>
                          <div style={{ fontWeight: 800, color: '#ef4444' }}>৳{cust.total_due.toLocaleString()}</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Actions: View Profile & Input Order */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCustomer(cust);
                        setIsOpen(false);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--neu-rim)',
                        boxShadow: 'var(--neu-flat-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="View Customer Profile & Orders"
                    >
                      <User size={13} />
                      <span>Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onOpenNewOrder(cust);
                        setIsOpen(false);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                      }}
                      title="Directly input order for this customer"
                    >
                      <Plus size={14} />
                      <span>Input Order</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            /* No Results Found State */
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertCircle size={28} style={{ color: 'var(--text-muted)', opacity: 0.7 }} />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  No customer profile matches "{query}"
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Locate by typing customer's full phone number (e.g. 0171...), name, or delivery address.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onCreateNewCustomer(query);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                  marginTop: '4px',
                }}
              >
                <Plus size={15} />
                <span>Create New Profile for "{query}"</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
