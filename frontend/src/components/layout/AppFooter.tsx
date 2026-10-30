'use client';

import React from 'react';
import { openWhatsAppGroup } from '@/config/whatsapp';

interface AppFooterProps {
  backendHealth: 'online' | 'offline' | 'checking';
}

export default function AppFooter({ backendHealth }: AppFooterProps) {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div>
          <span>© {new Date().getFullYear()} OMNI Sourcing Pro. Built for Bangladesh Cross-Border Importers & Sourcing Agents.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`status-dot ${backendHealth}`} />
            <span>
              Backend API:{' '}
              {backendHealth === 'online'
                ? 'Connected (Port 8000)'
                : backendHealth === 'checking'
                ? 'Connecting...'
                : 'Offline (Local Cache Active)'}
            </span>
          </div>

          <button
            type="button"
            onClick={openWhatsAppGroup}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#10b981',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              padding: 0,
            }}
          >
            Join WhatsApp Community ↗
          </button>
        </div>
      </div>
    </footer>
  );
}
