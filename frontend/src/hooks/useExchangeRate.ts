'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ExchangeRates {
  cny_to_bdt: number;
  cny_to_bdt_interbank?: number;
  usd_to_bdt: number;
  rmb_import_premium_pct?: number;
  currency_pairs?: Record<string, number>;
  source?: string;
  updated_at?: number;
  cached?: boolean;
}

const DEFAULT_RATES: ExchangeRates = {
  cny_to_bdt: 20.0,
  cny_to_bdt_interbank: 17.15,
  usd_to_bdt: 121.5,
  source: 'default_fallback',
};

/**
 * Hook to fetch and cache live exchange rates from the backend.
 */
export function useExchangeRate() {
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/rates/live`);
      if (res.ok) {
        const data = await res.json();
        setRates(data);
      } else {
        throw new Error(`Failed to fetch rates: ${res.status}`);
      }
    } catch (err: any) {
      console.warn('Using fallback exchange rates:', err);
      setError(err.message || 'Offline exchange rates');
      setRates(DEFAULT_RATES);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return { rates, loading, error, refreshRates: fetchRates };
}
