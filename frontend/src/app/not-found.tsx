import Link from 'next/link';
import { Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#09090b',
        color: '#f8fafc',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
          backgroundColor: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(220, 38, 38, 0.15)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
          }}
        >
          <Compass style={{ width: '36px', height: '36px' }} />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.75rem 0' }}>
          Page Not Found
        </h2>
        <p style={{ color: '#a1a1aa', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
          The requested page or resource could not be found. Head back to the OMNI Sourcing & Intelligence Engine.
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '10px',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            fontSize: '0.9rem',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)',
          }}
        >
          <Home style={{ width: '16px', height: '16px' }} />
          <span>Back to Sourcing Engine</span>
        </Link>
      </div>
    </div>
  );
}
