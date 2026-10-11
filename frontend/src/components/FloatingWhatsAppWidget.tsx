'use client';

import React, { useState } from 'react';
import { WHATSAPP_GROUP_URL, openWhatsAppGroup } from '@/config/whatsapp';

interface FloatingWhatsAppWidgetProps {
  onShareActiveList?: () => void;
  hasActiveItems?: boolean;
}

export default function FloatingWhatsAppWidget({
  onShareActiveList,
  hasActiveItems = false,
}: FloatingWhatsAppWidgetProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  if (dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 900,
        fontFamily: 'inherit',
      }}
    >
      {/* Expanded Popover Card */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '0',
            width: '320px',
            background: 'rgba(24, 24, 27, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(34, 197, 94, 0.2)',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.35)',
                }}
              >
                💬
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    OMNI VIP Group
                  </span>
                  <span
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#4ade80',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '4px',
                    }}
                  >
                    OFFICIAL
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#a1a1aa', marginTop: '1px' }}>
                  China Sourcing Community
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close WhatsApp popover"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#a1a1aa',
                borderRadius: '6px',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: '0.8rem',
              color: '#d4d4d8',
              lineHeight: 1.45,
              margin: '0 0 1rem 0',
            }}
          >
            Connect directly with our sourcing team! Get real-time China factory drops, bulk container slots, and instant wholesale quotes in our VIP group.
          </p>

          {/* Primary Action Button: Join Group */}
          <button
            type="button"
            onClick={openWhatsAppGroup}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(34, 197, 94, 0.35)',
              marginBottom: hasActiveItems && onShareActiveList ? '8px' : '0',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            <span>💬</span>
            <span>Join WhatsApp VIP Group</span>
            <span style={{ fontSize: '0.75rem' }}>↗</span>
          </button>

          {/* Secondary Action: Share active list if available */}
          {hasActiveItems && onShareActiveList && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onShareActiveList();
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#e4e4e7',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>📋</span>
              <span>Share Active List to Group</span>
            </button>
          )}

          {/* Direct link footer */}
          <div
            style={{
              fontSize: '0.68rem',
              color: '#71717a',
              textAlign: 'center',
              marginTop: '0.75rem',
              wordBreak: 'break-all',
            }}
          >
            chat.whatsapp.com/HDcEWiYHabm4oZKlhJbY4r
          </div>
        </div>
      )}

      {/* Floating Pill Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Open OMNI WhatsApp VIP Group"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4), 0 2px 6px rgba(0, 0, 0, 0.4)',
          fontWeight: 700,
          fontSize: '0.85rem',
          letterSpacing: '0.2px',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s',
        }}
      >
        <span
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
          }}
        >
          💬
          {/* Pulsing online indicator */}
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-3px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 0 6px #ffffff',
            }}
          />
        </span>
        <span>WhatsApp VIP Group</span>
        <span
          style={{
            fontSize: '0.7rem',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '2px 6px',
            borderRadius: '9999px',
            fontWeight: 800,
          }}
        >
          {isOpen ? '✕' : 'JOIN'}
        </span>
      </button>
    </div>
  );
}
