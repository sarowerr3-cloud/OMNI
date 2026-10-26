import React from 'react';

export const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--neu-inset-border)',
  borderRadius: '12px',
  boxShadow: 'var(--neu-sunken)',
  padding: '10px 14px',
  fontSize: '0.9rem',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box'
};

export const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '6px'
};

export const buttonActionStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--neu-rim)',
  borderRadius: '12px',
  boxShadow: 'var(--neu-flat-sm)',
  color: 'var(--text-primary)',
  fontSize: '0.84rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.18s ease'
};
