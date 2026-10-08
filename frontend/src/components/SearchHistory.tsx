'use client';

import { SearchHistoryItem } from '@/lib/types';

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}

/**
 * Displays recent search history with clickable items and clear functionality.
 */
export default function SearchHistory({ history, onSelect, onRemove, onClear }: SearchHistoryProps) {
  if (history.length === 0) return null;

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div
      style={{
        background: '#09090b',
        borderRadius: '10px',
        border: '1px solid #27272a',
        padding: '0.75rem',
        marginBottom: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600 }}>
          🕐 Recent Searches
        </span>
        <button
          type="button"
          onClick={onClear}
          style={{
            background: 'none',
            border: 'none',
            color: '#52525b',
            fontSize: '0.7rem',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#52525b')}
        >
          Clear All
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {history.slice(0, 8).map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '9999px',
              padding: '3px 4px 3px 10px',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(item.query)}
              style={{
                background: 'none',
                border: 'none',
                color: '#e2e8f0',
                fontSize: '0.75rem',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{item.mode === 'image' ? '📷' : '🔍'}</span>
              <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.query}
              </span>
              <span style={{ color: '#52525b', fontSize: '0.65rem' }}>
                {formatTimeAgo(item.timestamp)}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.query);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#3f3f46',
                fontSize: '0.7rem',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '50%',
                lineHeight: 1,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#3f3f46')}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
