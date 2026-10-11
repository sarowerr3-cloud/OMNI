'use client';

import React, { useEffect } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Page Error caught:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#09090b',
        color: '#f8fafc',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          backgroundColor: '#18181b',
          border: '1px solid #3f3f46',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(220, 38, 38, 0.15)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
          }}
        >
          <AlertOctagon style={{ width: '36px', height: '36px' }} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
          Application Encountered an Error
        </h1>
        <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
          {error?.message || 'An unexpected error occurred. The system is protected and you can recover easily.'}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)',
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
            <span>Try Again</span>
          </button>

          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              backgroundColor: '#27272a',
              color: '#f8fafc',
              fontSize: '0.9rem',
              fontWeight: 600,
              border: '1px solid #3f3f46',
              cursor: 'pointer',
            }}
          >
            <Home style={{ width: '16px', height: '16px' }} />
            <span>Go Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
