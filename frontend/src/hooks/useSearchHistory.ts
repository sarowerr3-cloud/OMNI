'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchHistoryItem } from '@/lib/types';

const STORAGE_KEY = 'omni_search_history';
const MAX_HISTORY_ITEMS = 15;

/**
 * Hook to manage search history in localStorage.
 * Persists the last 15 searches with timestamps.
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SearchHistoryItem[];
        setHistory(parsed);
      }
    } catch (e) {
      console.warn('Failed to load search history:', e);
    }
  }, []);

  // Save a new search to history
  const addToHistory = useCallback((query: string, mode: 'text' | 'image', resultCount: number) => {
    setHistory((prev) => {
      // Remove duplicate of the same query
      const filtered = prev.filter(
        (item) => item.query.toLowerCase() !== query.toLowerCase()
      );

      const newItem: SearchHistoryItem = {
        query,
        mode,
        timestamp: Date.now(),
        resultCount,
      };

      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save search history:', e);
      }

      return updated;
    });
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear search history:', e);
    }
  }, []);

  // Remove a single item from history
  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const updated = prev.filter(
        (item) => item.query.toLowerCase() !== query.toLowerCase()
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to update search history:', e);
      }
      return updated;
    });
  }, []);

  return {
    history,
    addToHistory,
    addSearch: addToHistory,
    clearHistory,
    removeFromHistory,
    removeSearch: removeFromHistory,
  };
}
