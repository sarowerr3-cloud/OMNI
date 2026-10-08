'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI exception in component tree:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '2.5rem 1.5rem',
            margin: '1.5rem 0',
            backgroundColor: '#18181b',
            border: '1px solid #7f1d1d',
            borderRadius: '16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)'
          }}
        >
          <div
            style={{
              padding: '12px',
              borderRadius: '50%',
              backgroundColor: 'rgba(220, 38, 38, 0.15)',
              color: '#ef4444'
            }}
          >
            <AlertTriangle style={{ width: '32px', height: '32px' }} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              {this.props.fallbackTitle || 'Something went wrong while rendering this section'}
            </h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '6px', maxWidth: '500px' }}>
              {this.state.error?.message || 'An unexpected error occurred. You can reload the page or try again.'}
            </p>
          </div>

          <button
            onClick={this.handleReload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
            <span>Reload Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
