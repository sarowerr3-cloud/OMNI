'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('API health fetch failed:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#38bdf8', fontSize: '2rem', marginBottom: '0.5rem' }}>
          SourceIQ Engine
        </h1>
        <p style={{ color: '#94a3b8' }}>
          Multi-Platform Product Sourcing & Costing Engine powered by Google Gemini API
        </p>
      </header>

      <div
        style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #334155',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#f8fafc' }}>
          Backend Connection & AI Status
        </h2>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Checking backend health...</p>
        ) : health ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Status:</span>
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{health.status.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Service:</span>
              <span>{health.service}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>AI Provider:</span>
              <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{health.ai_provider}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Gemini Model:</span>
              <span>{health.gemini_model}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Gemini Key Configured:</span>
              <span style={{ color: health.gemini_configured ? '#4ade80' : '#fbbf24' }}>
                {health.gemini_configured ? 'Yes (Live)' : 'No (Mock Mode Active)'}
              </span>
            </div>
          </div>
        ) : (
          <p style={{ color: '#f87171' }}>
            Unable to connect to backend server at http://localhost:8000.
          </p>
        )}
      </div>

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
        Phase 1 Scaffold Complete — Gemini API Ready
      </footer>
    </div>
  );
}
