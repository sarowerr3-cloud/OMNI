'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  Layers, 
  TrendingUp, 
  CheckCircle2, 
  X,
  Volume2,
  VolumeX,
  Anchor,
  Compass
} from 'lucide-react';

interface VideoLoadingOverlayProps {
  mode: 'text' | 'image' | 'manual';
  query?: string;
  onCancel?: () => void;
  videoSrc?: string;
}

export default function VideoLoadingOverlay({
  mode,
  query,
  onCancel,
  videoSrc = '/intro.mp4'
}: VideoLoadingOverlayProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [elapsedSecs, setElapsedSecs] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>(videoSrc);

  const steps = mode === 'image'
    ? [
        { title: 'Gemini Vision AI Analysis', desc: 'Decoding product image pixels, materials & factory tags' },
        { title: '1688 & Taobao Direct Search', desc: 'Querying Guangzhou & Yiwu manufacturing databases' },
        { title: 'Currency & Duty Math', desc: 'Converting RMB to BDT with customs & air freight rates' },
        { title: 'Daraz BD Benchmarking', desc: 'Scraping live Bangladesh marketplace retail benchmarks' },
        { title: 'Commercial Strategy Synthesis', desc: 'Claude 3.5 Sonnet computing margins and landed ROI' }
      ]
    : [
        { title: 'China Factory Catalog Scan', desc: 'Querying 1688.com, AliExpress & Pinduoduo for lowest prices' },
        { title: 'Exchange Rate & FX Sync', desc: 'Calculating RMB to BDT landed costs with weight metrics' },
        { title: 'Bangladesh Market Intelligence', desc: 'Fetching Dhaka & Chittagong local competitor prices' },
        { title: 'Dual AI Co-Pilot Processing', desc: 'Synthesizing pricing recommendations & target wholesale margins' }
      ];

  // Increment elapsed seconds and steps
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSecs((prev) => prev + 1);
    }, 1000);

    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2400);

    return () => {
      clearInterval(timer);
      clearInterval(stepInterval);
    };
  }, [steps.length]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        backgroundColor: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted={isMuted}
        playsInline
        src={currentVideoSrc}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.35) contrast(1.2)',
          transform: 'scale(1.02)'
        }}
        onError={() => {
          const fallback = 'https://vjs.zencdn.net/v/oceans.mp4';
          if (currentVideoSrc !== fallback) {
            setCurrentVideoSrc(fallback);
          }
        }}
      />

      {/* Dark Frosted Blur Vignette Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(9, 9, 11, 0.75)',
          backdropFilter: 'blur(8px)',
          background: 'radial-gradient(circle at center, rgba(9, 9, 11, 0.5) 0%, rgba(9, 9, 11, 0.9) 70%, #09090b 100%)'
        }}
      />

      {/* Atmospheric Radar Rings */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          border: '1px solid rgba(220, 38, 38, 0.15)',
          boxShadow: '0 0 60px rgba(220, 38, 38, 0.08)',
          animation: 'spinRadar 12s linear infinite',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          border: '1px dashed rgba(220, 38, 38, 0.25)',
          animation: 'spinRadarRev 8s linear infinite',
          pointerEvents: 'none'
        }}
      />

      {/* Main Center Content Box */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '560px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        {/* Brand Logo Presentation with Pulse */}
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <div
            style={{
              position: 'absolute',
              inset: '-10px',
              background: 'radial-gradient(circle, rgba(220, 38, 38, 0.4) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(15px)',
              animation: 'pulseGlow 2s ease-in-out infinite'
            }}
          />
          <div
            style={{
              position: 'relative',
              backgroundColor: '#ffffff',
              padding: '12px 28px',
              borderRadius: '18px',
              border: '2px solid rgba(220, 38, 38, 0.6)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 25px rgba(220, 38, 38, 0.35)'
            }}
          >
            <img
              src="/logo.png"
              alt="OMNI Logo"
              style={{ height: '52px', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>

        {/* Live Title & Query */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
          <Sparkles style={{ width: '16px', height: '16px' }} />
          <span>Dual AI Sourcing Engine Running</span>
          <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(220, 38, 38, 0.2)', border: '1px solid rgba(220, 38, 38, 0.4)', fontSize: '0.72rem', color: '#ffffff' }}>
            {elapsedSecs}s
          </span>
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '0 0 1.25rem 0', letterSpacing: '-0.3px' }}>
          {query ? (
            <span>
              Searching China & BD Markets for: <span style={{ color: '#f87171' }}>&ldquo;{query}&rdquo;</span>
            </span>
          ) : (
            'Analyzing Product Sourcing Data...'
          )}
        </h2>

        {/* Dynamic Progress Steps Box */}
        <div
          style={{
            width: '100%',
            backgroundColor: 'rgba(24, 24, 27, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.25rem',
            backdropFilter: 'blur(16px)',
            marginBottom: '1.5rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {steps.map((st, idx) => {
              const isDone = idx < activeStep;
              const isCurrent = idx === activeStep;

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    opacity: isDone || isCurrent ? 1 : 0.35,
                    transition: 'opacity 0.3s ease'
                  }}
                >
                  <div style={{ marginTop: '2px' }}>
                    {isDone ? (
                      <CheckCircle2 style={{ width: '18px', height: '18px', color: '#10b981' }} />
                    ) : isCurrent ? (
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: '2px solid #dc2626',
                          borderTop: '2px solid transparent',
                          animation: 'spin 0.8s linear infinite'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: '2px solid #3f3f46'
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isCurrent ? '#f87171' : isDone ? '#e2e8f0' : '#71717a' }}>
                      {st.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isCurrent ? '#cbd5e1' : '#71717a', marginTop: '2px' }}>
                      {st.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Cancel Action */}
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '8px 20px',
              borderRadius: '9999px',
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              color: '#a1a1aa',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <X style={{ width: '14px', height: '14px' }} />
            <span>Cancel Search</span>
          </button>
        )}
      </div>

      <style>{`
        @keyframes spinRadar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinRadarRev {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
