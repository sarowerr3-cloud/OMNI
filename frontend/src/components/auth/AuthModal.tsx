'use client';

import React, { useState, useEffect } from 'react';
import { User, LogIn, LogOut, Key, Mail, Shield, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { getAuthToken, setAuthToken, clearAuthToken, getAuthHeaders } from '@/services/customerApi';

interface AuthModalProps {
  apiUrl: string;
  showToast?: (msg: string) => void;
}

interface UserProfile {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
}

export default function AuthModal({ apiUrl, showToast }: AuthModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Fetch current user on mount if token exists
  const fetchCurrentUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUser(null);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      } else {
        clearAuthToken();
        setCurrentUser(null);
      }
    } catch {
      // offline or unreachable
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [apiUrl]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Invalid email or password');
      }

      const data = await res.json();
      setAuthToken(data.access_token);
      await fetchCurrentUser();
      setIsOpen(false);
      showToast?.('👋 Logged in successfully!');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Registration failed');
      }

      showToast?.('🎉 Account created! Logging you in...');
      await handleLogin();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setIsOpen(false);
    showToast?.('🔒 Signed out successfully');
  };

  const fillDemoAdmin = () => {
    setEmail('admin@sourceiq.com');
    setPassword('admin123');
    setError(null);
  };

  return (
    <>
      {/* Trigger Button in Header */}
      {currentUser ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--neu-rim)',
            boxShadow: 'var(--neu-flat-sm)',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            transition: 'all 0.18s ease',
          }}
          title="Account Profile & Security"
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'A'}
          </div>
          <span>{currentUser.full_name || currentUser.email.split('@')[0]}</span>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '8px',
              background: currentUser.role === 'admin' ? 'rgba(220, 38, 38, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: currentUser.role === 'admin' ? 'var(--omni-red)' : '#3b82f6',
              textTransform: 'uppercase',
            }}
          >
            {currentUser.role}
          </span>
        </button>
      ) : (
        <button
          onClick={() => {
            setError(null);
            setIsOpen(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: 'var(--neu-flat-sm)',
            cursor: 'pointer',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 700,
            transition: 'all 0.18s ease',
          }}
          title="Sign in to OMNI System"
        >
          <LogIn size={15} />
          <span>Sign In</span>
        </button>
      )}

      {/* Modal Dialog */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'var(--bg-card)',
              borderRadius: '20px',
              border: '1px solid var(--neu-rim)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              padding: '1.75rem',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="var(--omni-red)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  {currentUser ? 'User Account' : mode === 'login' ? 'Trader Login' : 'Create Account'}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {currentUser ? (
              /* Authenticated User Profile View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '14px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--neu-rim)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Signed in as:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{currentUser.full_name || 'Trader'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{currentUser.email}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(220, 38, 38, 0.15)',
                        color: 'var(--omni-red)',
                      }}
                    >
                      Role: {currentUser.role}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                      }}
                    >
                      Status: Active
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px',
                    borderRadius: '12px',
                    background: 'rgba(220, 38, 38, 0.1)',
                    border: '1px solid var(--omni-red)',
                    color: 'var(--omni-red)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              /* Login / Register Form */
              <form onSubmit={mode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {error && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: 'rgba(220, 38, 38, 0.1)',
                      border: '1px solid var(--omni-red)',
                      color: 'var(--omni-red)',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                {mode === 'register' && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Tanvir Ahmed"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--neu-rim)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        marginTop: '4px',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--neu-rim)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      marginTop: '4px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Password {mode === 'register' && <span style={{ opacity: 0.7 }}>(min 8 characters)</span>}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--neu-rim)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      marginTop: '4px',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '11px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '6px',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  <Key size={16} />
                  <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                </button>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={fillDemoAdmin}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'transparent',
                      border: '1px dashed var(--neu-rim)',
                      padding: '7px',
                      borderRadius: '10px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Sparkles size={13} color="var(--omni-red)" />
                    <span>Quick-fill Default Admin credentials</span>
                  </button>
                )}

                <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('register');
                          setError(null);
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--omni-red)', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Register
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError(null);
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--omni-red)', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Sign In
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
