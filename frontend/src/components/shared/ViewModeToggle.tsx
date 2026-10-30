'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'grid' | 'list';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  gridLabel?: string;
  listLabel?: string;
  size?: 'sm' | 'md';
}

export default function ViewModeToggle({
  viewMode,
  onChange,
  gridLabel = 'Grid',
  listLabel = 'List',
  size = 'sm',
}: ViewModeToggleProps) {
  const isSm = size === 'sm';

  return (
    <div
      role="group"
      aria-label="View layout switcher"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        borderRadius: '10px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        gap: '2px',
        userSelect: 'none',
      }}
    >
      <button
        type="button"
        role="button"
        aria-pressed={viewMode === 'grid'}
        onClick={() => onChange('grid')}
        title={`${gridLabel} View`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: isSm ? '4px 9px' : '6px 12px',
          borderRadius: '7px',
          border: 'none',
          fontSize: isSm ? '0.74rem' : '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.16s ease',
          background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent',
          color: viewMode === 'grid' ? 'var(--omni-red)' : 'var(--text-muted)',
          boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        <LayoutGrid size={isSm ? 13 : 15} />
        <span>{gridLabel}</span>
      </button>

      <button
        type="button"
        role="button"
        aria-pressed={viewMode === 'list'}
        onClick={() => onChange('list')}
        title={`${listLabel} View`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: isSm ? '4px 9px' : '6px 12px',
          borderRadius: '7px',
          border: 'none',
          fontSize: isSm ? '0.74rem' : '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.16s ease',
          background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent',
          color: viewMode === 'list' ? 'var(--omni-red)' : 'var(--text-muted)',
          boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        <List size={isSm ? 13 : 15} />
        <span>{listLabel}</span>
      </button>
    </div>
  );
}

