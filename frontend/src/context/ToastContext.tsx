'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const defaultDuration = type === 'error' ? 6000 : type === 'warning' ? 5000 : 3500;
      const finalDuration = duration ?? defaultDuration;

      setToasts((prev) => [...prev.slice(-4), { id, message, type, duration: finalDuration }]);

      if (finalDuration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, finalDuration);
      }
    },
    [dismissToast]
  );

  const toastMethods = useMemo(
    () => ({
      success: (msg: string, dur?: number) => showToast(msg, 'success', dur),
      error: (msg: string, dur?: number) => showToast(msg, 'error', dur),
      warning: (msg: string, dur?: number) => showToast(msg, 'warning', dur),
      info: (msg: string, dur?: number) => showToast(msg, 'info', dur),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        toast: toastMethods,
        success: toastMethods.success,
        error: toastMethods.error,
        warning: toastMethods.warning,
        info: toastMethods.info,
      }}
    >
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => {
          const Icon =
            t.type === 'success'
              ? CheckCircle2
              : t.type === 'error'
              ? AlertCircle
              : t.type === 'warning'
              ? AlertTriangle
              : Info;

          return (
            <div key={t.id} className={`toast toast-${t.type}`} role="alert">
              <Icon size={18} className="toast-icon" />
              <span className="toast-text">{t.message}</span>
              <button
                type="button"
                className="toast-dismiss"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss toast"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
