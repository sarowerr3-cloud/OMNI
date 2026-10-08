import React from 'react';

export const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#09090b',
  border: '1px solid #3f3f46',
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '0.9rem',
  color: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box'
};

export const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#e2e8f0',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '6px'
};

export const buttonActionStyle: React.CSSProperties = {
  padding: '8px 14px',
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '8px',
  color: '#f4f4f5',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.15s ease'
};
