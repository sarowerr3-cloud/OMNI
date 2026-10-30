'use client';

import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { LightboxState } from '@/types/listBuilder';
import { formatExternalUrl } from '@/lib/imageUtils';

interface LightboxModalProps {
  previewModal: LightboxState | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export default function LightboxModal({
  previewModal,
  onClose,
  onIndexChange,
}: LightboxModalProps) {
  // Keyboard navigation (Esc, Left, Right)
  useEffect(() => {
    if (!previewModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (previewModal.images.length > 1) {
          const nextIdx =
            previewModal.currentIndex > 0
              ? previewModal.currentIndex - 1
              : previewModal.images.length - 1;
          onIndexChange(nextIdx);
        }
      } else if (e.key === 'ArrowRight') {
        if (previewModal.images.length > 1) {
          const nextIdx =
            previewModal.currentIndex < previewModal.images.length - 1
              ? previewModal.currentIndex + 1
              : 0;
          onIndexChange(nextIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModal, onClose, onIndexChange]);

  if (!previewModal) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem',
        animation: 'fadeIn 0.18s ease',
      }}
    >
      {/* Top Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: '#ffffff',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '650px',
            }}
          >
            {previewModal.title}
          </h3>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              whiteSpace: 'nowrap',
            }}
          >
            Photo {previewModal.currentIndex + 1} of {previewModal.images.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {previewModal.productUrl && (
            <a
              href={formatExternalUrl(previewModal.productUrl)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <ExternalLink size={13} />
              <span>Supplier Link</span>
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.18)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
            title="Close viewer (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Center Main Photo Stage */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 0',
        }}
      >
        {/* Previous Button */}
        {previewModal.images.length > 1 && (
          <button
            type="button"
            onClick={() => {
              const nextIdx =
                previewModal.currentIndex > 0
                  ? previewModal.currentIndex - 1
                  : previewModal.images.length - 1;
              onIndexChange(nextIdx);
            }}
            style={{
              position: 'absolute',
              left: '16px',
              zIndex: 2,
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
            title="Previous photo (Left arrow)"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* Displayed Large Image */}
        <img
          src={previewModal.images[previewModal.currentIndex]}
          alt={previewModal.title}
          style={{
            maxWidth: '88vw',
            maxHeight: '74vh',
            objectFit: 'contain',
            borderRadius: '12px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.75)',
            userSelect: 'none',
          }}
        />

        {/* Next Button */}
        {previewModal.images.length > 1 && (
          <button
            type="button"
            onClick={() => {
              const nextIdx =
                previewModal.currentIndex < previewModal.images.length - 1
                  ? previewModal.currentIndex + 1
                  : 0;
              onIndexChange(nextIdx);
            }}
            style={{
              position: 'absolute',
              right: '16px',
              zIndex: 2,
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
            title="Next photo (Right arrow)"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Strip (If Multiple Images) */}
      {previewModal.images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            gap: '8px',
            maxWidth: '90vw',
            overflowX: 'auto',
            padding: '6px',
            background: 'rgba(0, 0, 0, 0.45)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {previewModal.images.map((imgUrl, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => onIndexChange(idx)}
              style={{
                padding: 0,
                background: 'transparent',
                border:
                  idx === previewModal.currentIndex
                    ? '2.5px solid var(--omni-red, #dc2626)'
                    : '2px solid transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: idx === previewModal.currentIndex ? 1 : 0.6,
                transform: idx === previewModal.currentIndex ? 'scale(1.05)' : 'none',
                transition: 'all 0.15s ease',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <img
                src={imgUrl}
                alt={`Thumb ${idx + 1}`}
                style={{
                  width: '56px',
                  height: '56px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
