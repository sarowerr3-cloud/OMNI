'use client';

/**
 * Skeleton loading card that pulses during search.
 * Shows animated placeholder for sourcing result cards.
 */
export default function SkeletonCard() {
  return (
    <div
      style={{
        background: '#18181b',
        borderRadius: '16px',
        border: '1px solid #27272a',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        animation: 'pulse 1.8s ease-in-out infinite',
      }}
    >
      {/* Platform badge skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '80px', height: '20px', background: '#27272a', borderRadius: '6px' }} />
        <div style={{ width: '120px', height: '20px', background: '#27272a', borderRadius: '6px' }} />
      </div>

      {/* Title skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ width: '90%', height: '16px', background: '#27272a', borderRadius: '4px' }} />
        <div style={{ width: '60%', height: '16px', background: '#27272a', borderRadius: '4px' }} />
      </div>

      {/* Image skeleton */}
      <div style={{ width: '100%', height: '180px', background: '#27272a', borderRadius: '10px' }} />

      {/* Override controls skeleton */}
      <div
        style={{
          background: '#09090b',
          padding: '0.85rem',
          borderRadius: '10px',
          border: '1px solid #1c1c1e',
        }}
      >
        <div style={{ width: '200px', height: '14px', background: '#27272a', borderRadius: '4px', marginBottom: '0.75rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div style={{ height: '32px', background: '#27272a', borderRadius: '6px' }} />
          <div style={{ height: '32px', background: '#27272a', borderRadius: '6px' }} />
          <div style={{ height: '32px', background: '#27272a', borderRadius: '6px' }} />
          <div style={{ height: '32px', background: '#27272a', borderRadius: '6px' }} />
        </div>
      </div>

      {/* Cost breakdown skeleton */}
      <div
        style={{
          background: '#09090b',
          padding: '0.75rem',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '45%', height: '14px', background: '#27272a', borderRadius: '4px' }} />
            <div style={{ width: '25%', height: '14px', background: '#27272a', borderRadius: '4px' }} />
          </div>
        ))}
        <div style={{ borderTop: '1px solid #27272a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ width: '40%', height: '18px', background: '#27272a', borderRadius: '4px' }} />
          <div style={{ width: '30%', height: '18px', background: '#1e3a5f', borderRadius: '4px' }} />
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1, height: '40px', background: '#27272a', borderRadius: '8px' }} />
        <div style={{ flex: 1, height: '40px', background: '#27272a', borderRadius: '8px' }} />
      </div>

      {/* CSS animation keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/**
 * Loading overlay with animated search status messages.
 */
export function SearchLoadingOverlay({ mode }: { mode: 'text' | 'image' }) {
  const messages = mode === 'image'
    ? [
        '📷 Analyzing image with Gemini Vision AI...',
        '🔍 Identifying product features & keywords...',
        '🇨🇳 Searching suppliers on 1688, AliExpress, Pinduoduo...',
        '🇧🇩 Fetching Bangladesh local market prices...',
        '🤖 Generating Claude AI commercial strategy...',
        '📊 Calculating landed costs & profit margins...',
      ]
    : [
        '🔍 Searching global suppliers...',
        '🇨🇳 Querying 1688, AliExpress, Pinduoduo...',
        '🇧🇩 Benchmarking Bangladesh market prices...',
        '🤖 Running Dual AI Co-Pilot analysis...',
        '📊 Computing landed costs & margins...',
      ];

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Progress status messages */}
      <div
        style={{
          background: '#18181b',
          borderRadius: '12px',
          border: '1px solid #dc2626',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 0 20px rgba(220, 38, 38, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '3px solid #dc2626',
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem' }}>
            OMNI Intelligence Engine Working...
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '0.85rem',
                color: '#a1a1aa',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: `fadeInStep 0.3s ease-out ${idx * 0.4}s both`,
              }}
            >
              {msg}
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInStep {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
