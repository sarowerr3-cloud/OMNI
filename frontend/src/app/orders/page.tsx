'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  Sun, 
  Moon, 
  Package
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import OrdersManager from '@/components/OrdersManager';
import { SavedProductList } from '@/components/ProductListBuilder';

export default function OrdersRecordPage() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleOpenOrderInBuilder = (order: SavedProductList) => {
    try {
      localStorage.setItem('omni_builder_items', JSON.stringify(order.items || []));
      router.push('/?tab=list');
    } catch (e) {
      console.warn('Failed to save order to localStorage:', e);
      router.push('/?tab=list');
    }
  };

  const handleCreateNewOrder = () => {
    router.push('/?tab=list');
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-family)',
      position: 'relative',
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Standalone Header for Excel Record System */}
      <header className="app-header">
        <div className="app-header-inner" style={{ flexWrap: 'wrap' }}>
          {/* Left: Branding & Page Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link 
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--neu-rim)',
                boxShadow: 'var(--neu-flat-sm)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.18s ease',
              }}
              title="Return to Product Sourcing Workspace"
            >
              <ArrowLeft size={14} />
              <span>Back to Sourcing Tools</span>
            </Link>

            <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: '#107c41',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: 'var(--neu-flat-sm)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}>
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h1 style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  Excel Orders Record System
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(16, 124, 65, 0.15)',
                    boxShadow: 'var(--neu-flat-sm)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 124, 65, 0.3)',
                    fontWeight: 700,
                  }}>
                    Standalone Ledger
                  </span>
                </h1>
                <p style={{
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  margin: '1px 0 0 0',
                }}>
                  Separate Excel (.xlsx) Ledger & Master Records
                </p>
              </div>
            </div>
          </div>

          {/* Right: Quick actions & Theme Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--neu-rim)',
                boxShadow: 'var(--neu-flat-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Package size={14} style={{ color: 'var(--omni-red)' }} />
              <span>Product List Builder</span>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--neu-rim)',
                boxShadow: 'var(--neu-flat-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              title="Toggle Light / Dark theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Standalone Content */}
      <main style={{
        flex: 1,
        padding: '1.5rem 0',
      }}>
        <OrdersManager
          apiUrl={apiUrl}
          showToast={showToast}
          onOpenOrderInBuilder={handleOpenOrderInBuilder}
          onCreateNewOrder={handleCreateNewOrder}
        />
      </main>
    </div>
  );
}
