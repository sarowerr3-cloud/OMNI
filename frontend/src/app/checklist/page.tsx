'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  CheckSquare, 
  ArrowLeft, 
  Sun, 
  Moon, 
  Package
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import SourcingChecklistManager from '@/components/SourcingChecklistManager';
import { SavedProductList } from '@/components/ProductListBuilder';

export default function SourcingChecklistPage() {
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
      router.push('/?tab=list');
    }
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
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          padding: '12px 18px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideUp 0.2s ease',
        }}>
          {toastMessage}
        </div>
      )}

      {/* HEADER */}
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--neu-rim)',
        boxShadow: 'var(--neu-flat-sm)',
        padding: '0.85rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Left: Back Link & Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Workspace</span>
            </Link>

            <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                background: '#ffffff',
                padding: '4px 10px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: 'var(--neu-flat-sm)',
                border: '1px solid var(--neu-rim)',
              }}>
                <img src="/logo.png" alt="OMNI" style={{ height: '20px', width: 'auto' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  To-Do Checklist
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
                  Sourcing & Order Operations
                </div>
              </div>
            </div>
          </div>

          {/* Right Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              href="/orders"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '12px',
                background: 'rgba(16, 124, 65, 0.15)',
                border: '1px solid rgba(16, 124, 65, 0.4)',
                boxShadow: 'var(--neu-flat-sm)',
                color: '#34d399',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Excel Records ↗</span>
            </Link>

            <button
              onClick={toggleTheme}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                border: '1px solid var(--neu-rim)',
                boxShadow: 'var(--neu-flat-sm)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
        <SourcingChecklistManager
          apiUrl={apiUrl}
          showToast={showToast}
          onOpenOrderInBuilder={handleOpenOrderInBuilder}
        />
      </main>

      {/* FOOTER */}
      <footer style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-color)',
        padding: '1.25rem 1.5rem',
        marginTop: 'auto',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>© {new Date().getFullYear()} OMNI Sourcing Pro</span>
            <span>•</span>
            <span>Sourcing Pipeline Checklist Operations</span>
          </div>
          <div>
            <span>Official OMNI Operations Management</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
