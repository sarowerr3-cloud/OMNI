'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  Package, 
  Calculator, 
  ListOrdered, 
  Users, 
  ListChecks, 
  FileSpreadsheet, 
  ArrowRight,
  ExternalLink,
  Tag,
  Phone,
  FileText
} from 'lucide-react';
import { MainTab } from '@/components/layout/AppHeader';
import { CategorizedProduct } from '@/types/catalog';
import { Customer } from '@/types/customer';
import { formatMoney } from '@/lib/formatters';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: MainTab) => void;
  onSelectProduct?: (product: CategorizedProduct) => void;
  onSelectCustomer?: (customer: Customer) => void;
}

interface PaletteItem {
  id: string;
  category: 'Navigation' | 'Products' | 'Customers' | 'Saved Lists';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectProduct,
  onSelectCustomer,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener handled by parent or hook, but Esc handled here
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Read dynamic items from localStorage
  const { storedProducts, storedCustomers, storedLists } = useMemo(() => {
    if (typeof window === 'undefined' || !isOpen) {
      return { storedProducts: [], storedCustomers: [], storedLists: [] };
    }

    let prods: CategorizedProduct[] = [];
    let custs: Customer[] = [];
    let lists: any[] = [];

    try {
      const pStr = localStorage.getItem('omni_category_products');
      if (pStr) prods = JSON.parse(pStr);
    } catch {}

    try {
      const cStr = localStorage.getItem('omni_customers_cache_v2');
      if (cStr) custs = JSON.parse(cStr);
    } catch {}

    try {
      const lStr = localStorage.getItem('omni_product_lists');
      if (lStr) lists = JSON.parse(lStr);
    } catch {}

    return { storedProducts: prods, storedCustomers: custs, storedLists: lists };
  }, [isOpen]);

  // Filter items based on query
  const filteredItems = useMemo<PaletteItem[]>(() => {
    const q = query.toLowerCase().trim();
    const items: PaletteItem[] = [];

    // 1. Navigation items
    const navItems: PaletteItem[] = [
      {
        id: 'nav-products',
        category: 'Navigation',
        title: 'Products Catalog',
        subtitle: 'Browse 25 import categories & stored items (Ctrl+1)',
        badge: 'Tab',
        icon: <Package size={16} style={{ color: 'var(--omni-red)' }} />,
        action: () => {
          onNavigateTab('categories');
          onClose();
        },
      },
      {
        id: 'nav-calc',
        category: 'Navigation',
        title: 'Price & Margin Calculator',
        subtitle: 'Compute RMB to BDT landed costs, agent fees, and duties (Ctrl+2)',
        badge: 'Tab',
        icon: <Calculator size={16} style={{ color: '#06b6d4' }} />,
        action: () => {
          onNavigateTab('calculator');
          onClose();
        },
      },
      {
        id: 'nav-list',
        category: 'Navigation',
        title: 'List Builder & Quotations',
        subtitle: 'Build client proposals, A4 PDF exports, and WhatsApp quotes (Ctrl+3)',
        badge: 'Tab',
        icon: <ListOrdered size={16} style={{ color: '#10b981' }} />,
        action: () => {
          onNavigateTab('list');
          onClose();
        },
      },
      {
        id: 'nav-customers',
        category: 'Navigation',
        title: 'Customer Directory & CRM',
        subtitle: 'Manage client accounts, groups, delivery addresses, and balances (Ctrl+4)',
        badge: 'Tab',
        icon: <Users size={16} style={{ color: '#8b5cf6' }} />,
        action: () => {
          onNavigateTab('customers');
          onClose();
        },
      },
      {
        id: 'nav-checklist',
        category: 'Navigation',
        title: 'Sourcing Checklist',
        subtitle: 'Track order milestones, supplier QC, customs, and dispatch (Ctrl+5)',
        badge: 'Tab',
        icon: <ListChecks size={16} style={{ color: '#f59e0b' }} />,
        action: () => {
          onNavigateTab('checklist');
          onClose();
        },
      },
      {
        id: 'nav-orders',
        category: 'Navigation',
        title: 'Order Spreadsheet System',
        subtitle: 'Client order tracking and bulk status manager (Ctrl+6)',
        badge: 'Tab',
        icon: <FileSpreadsheet size={16} style={{ color: '#ec4899' }} />,
        action: () => {
          onNavigateTab('orders');
          onClose();
        },
      },
    ];

    if (!q) {
      return navItems;
    }

    // Filter nav
    navItems.forEach((n) => {
      if (n.title.toLowerCase().includes(q) || (n.subtitle && n.subtitle.toLowerCase().includes(q))) {
        items.push(n);
      }
    });

    // 2. Products
    storedProducts.forEach((p) => {
      if (
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      ) {
        items.push({
          id: `prod-${p.id}`,
          category: 'Products',
          title: p.title,
          subtitle: `${p.category} • ${p.currency === 'RMB' ? '¥' : '$'}${p.source_price.toFixed(2)} (${p.weight_val} ${p.weight_unit})`,
          badge: p.platform,
          icon: <Tag size={16} style={{ color: 'var(--omni-red)' }} />,
          action: () => {
            onNavigateTab('categories');
            if (onSelectProduct) onSelectProduct(p);
            onClose();
          },
        });
      }
    });

    // 3. Customers
    storedCustomers.forEach((c) => {
      if (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.group && c.group.toLowerCase().includes(q))
      ) {
        items.push({
          id: `cust-${c.id}`,
          category: 'Customers',
          title: c.name,
          subtitle: `${c.phone} • ${c.city || 'Dhaka'} • ${c.orders?.length || 0} orders`,
          badge: c.group || 'Customer',
          icon: <Phone size={16} style={{ color: '#10b981' }} />,
          action: () => {
            onNavigateTab('customers');
            if (onSelectCustomer) onSelectCustomer(c);
            onClose();
          },
        });
      }
    });

    // 4. Saved Lists
    storedLists.forEach((l) => {
      const listName = l.list_name || l.name || 'Untitled List';
      if (listName.toLowerCase().includes(q) || (l.client_name && l.client_name.toLowerCase().includes(q))) {
        items.push({
          id: `list-${l.id || Math.random()}`,
          category: 'Saved Lists',
          title: listName,
          subtitle: `${l.client_name ? `Client: ${l.client_name} • ` : ''}${l.items?.length || 0} items`,
          badge: 'List',
          icon: <FileText size={16} style={{ color: '#3b82f6' }} />,
          action: () => {
            onNavigateTab('list');
            onClose();
          },
        });
      }
    });

    return items.slice(0, 20);
  }, [query, storedProducts, storedCustomers, storedLists, onNavigateTab, onSelectProduct, onSelectCustomer, onClose]);

  // Keep selected index in bound
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '12vh 1rem 2rem 1rem',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-highlight)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
        }}>
          <Search size={18} style={{ color: 'var(--omni-red)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products, customers, lists, or switch tabs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.96rem',
              color: 'var(--text-primary)',
            }}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={16} />
            </button>
          ) : (
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
            }}>
              ESC
            </span>
          )}
        </div>

        {/* Results List */}
        <div style={{
          maxHeight: '380px',
          overflowY: 'auto',
          padding: '8px',
        }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No matches found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
                    border: isSelected ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                    {item.badge && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                      }}>
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <ArrowRight size={14} style={{ color: 'var(--omni-red)' }} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div style={{
          padding: '8px 16px',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--omni-red)' }}>
            OMNI Universal Search
          </span>
        </div>
      </div>
    </div>
  );
}
