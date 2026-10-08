'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Volume2, 
  VolumeX, 
  X, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  Film,
  Upload,
  Settings
} from 'lucide-react';

interface IntroVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc?: string;
  autoPlay?: boolean;
}

export default function IntroVideoModal({
  isOpen,
  onClose,
  videoSrc = '/intro.mp4',
  autoPlay = true
}: IntroVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);
  const [currentStepText, setCurrentStepText] = useState<string>('Initializing OMNI Sourcing Engine...');
  const [activeVideoSrc, setActiveVideoSrc] = useState<string>(videoSrc);
  const [customVideoUploaded, setCustomVideoUploaded] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check saved preference
    const savedNoShow = localStorage.getItem('omni_disable_intro_video');
    if (savedNoShow === 'true') {
      setDontShowAgain(true);
    }
    const savedCustomVid = localStorage.getItem('omni_custom_intro_video');
    if (savedCustomVid) {
      setActiveVideoSrc(savedCustomVid);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      setIsPlaying(true);
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          const next = prev + 1.25;
          if (next > 20 && next < 50) {
            setCurrentStepText('Connecting China 1688 & Taobao Direct Hub...');
          } else if (next >= 50 && next < 80) {
            setCurrentStepText('Syncing Dual AI Co-Pilot (Gemini + Claude)...');
          } else if (next >= 80) {
            setCurrentStepText('Ready for Global Sourcing & Landed Costing');
          }
          return next;
        });
      }, 50);

      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('omni_disable_intro_video', 'true');
    } else {
      localStorage.removeItem('omni_disable_intro_video');
    }
    onClose();
  };

  const handleToggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
      setProgress(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setActiveVideoSrc(url);
      setCustomVideoUploaded(file.name);
      localStorage.setItem('omni_custom_intro_video', url);
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.play();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Background Video Layer */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={isMuted}
        playsInline
        src={activeVideoSrc}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.55) contrast(1.15)',
          transform: 'scale(1.02)'
        }}
        onError={() => {
          const fallback = 'https://vjs.zencdn.net/v/oceans.mp4';
          if (activeVideoSrc !== fallback) {
            setActiveVideoSrc(fallback);
          }
        }}
      />

      {/* Cinematic Vignette & Radial Gradients */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(9, 9, 11, 0.4) 0%, rgba(9, 9, 11, 0.85) 75%, #09090b 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* Subtle Glowing Red Border / Atmospheric Effect */}
      <div
        style={{
          position: 'absolute',
          inset: '20px',
          border: '1px solid rgba(220, 38, 38, 0.25)',
          borderRadius: '24px',
          boxShadow: 'inset 0 0 50px rgba(220, 38, 38, 0.1)',
          pointerEvents: 'none'
        }}
      />

      {/* Top Controls Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: '32px',
          left: '32px',
          right: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(24, 24, 27, 0.75)',
              border: '1px solid rgba(220, 38, 38, 0.4)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: '#f87171',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            <Sparkles style={{ width: '14px', height: '14px' }} />
            <span>OMNI Cinematic Intro</span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload custom MP4 video"
            style={{
              padding: '6px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(24, 24, 27, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: '#e2e8f0',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Upload style={{ width: '12px', height: '12px' }} />
            <span>{customVideoUploaded ? 'Custom Video Set' : 'Custom MP4'}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/mp4,video/webm"
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleToggleSound}
            style={{
              padding: '10px',
              borderRadius: '50%',
              backgroundColor: 'rgba(24, 24, 27, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX style={{ width: '18px', height: '18px' }} /> : <Volume2 style={{ width: '18px', height: '18px', color: '#10b981' }} />}
          </button>

          <button
            onClick={handleReplay}
            style={{
              padding: '10px',
              borderRadius: '50%',
              backgroundColor: 'rgba(24, 24, 27, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Replay Video"
          >
            <RotateCcw style={{ width: '18px', height: '18px' }} />
          </button>

          <button
            onClick={handleClose}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(220, 38, 38, 0.9)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)'
            }}
          >
            <span>Skip Intro</span>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      {/* Center Cinematic Hero Presentation */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '750px'
        }}
      >
        {/* Glowing OMNI Brand Logo Presentation */}
        <div
          style={{
            position: 'relative',
            marginBottom: '1.5rem',
            animation: 'floatLogo 4s ease-in-out infinite'
          }}
        >
          {/* Logo glow pulse backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: '-15px',
              background: 'radial-gradient(circle, rgba(220, 38, 38, 0.45) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(20px)',
              zIndex: 0
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              backgroundColor: '#ffffff',
              padding: '16px 36px',
              borderRadius: '24px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(220, 38, 38, 0.4)',
              border: '2px solid rgba(220, 38, 38, 0.6)'
            }}
          >
            <img
              src="/logo.png"
              alt="OMNI Sourcing Logo"
              style={{
                height: '75px',
                maxWidth: '380px',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
        </div>

        {/* Cinematic Title & Tagline */}
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '1px',
            margin: '0 0 8px 0',
            textShadow: '0 4px 20px rgba(0,0,0,0.8)'
          }}
        >
          OMNI <span style={{ color: '#dc2626' }}>SOURCING</span>
        </h1>

        <p
          style={{
            fontSize: '1.1rem',
            color: '#cbd5e1',
            fontWeight: 600,
            letterSpacing: '0.5px',
            margin: '0 0 2rem 0',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
          }}
        >
          Global Factory Sourcing & Bangladesh Landed Cost Engine
        </p>

        {/* Dynamic Startup Progress Bar */}
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'rgba(24, 24, 27, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '14px 18px',
            backdropFilter: 'blur(12px)',
            marginBottom: '1.75rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.78rem' }}>
            <span style={{ color: '#fca5a5', fontWeight: 700 }}>
              {currentStepText}
            </span>
            <span style={{ color: '#ffffff', fontWeight: 900 }}>
              {Math.min(100, Math.round(progress))}%
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#27272a',
              borderRadius: '9999px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #dc2626 0%, #f87171 100%)',
                borderRadius: '9999px',
                transition: 'width 0.1s linear',
                boxShadow: '0 0 10px rgba(220, 38, 38, 0.8)'
              }}
            />
          </div>
        </div>

        {/* Enter App Action Button */}
        <button
          onClick={handleClose}
          style={{
            padding: '14px 38px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #dc2626 0%, #990000 100%)',
            color: '#ffffff',
            fontSize: '1.05rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 0 30px rgba(220, 38, 38, 0.6)',
            transition: 'transform 0.2s ease',
            letterSpacing: '0.5px'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span>Enter Sourcing Hub</span>
          <ArrowRight style={{ width: '20px', height: '20px' }} />
        </button>

        {/* Preference Checkbox */}
        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.78rem', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{ accentColor: '#dc2626', cursor: 'pointer' }}
            />
            Don&apos;t show intro video automatically on next visit
          </label>
        </div>
      </div>

      <style>{`
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
