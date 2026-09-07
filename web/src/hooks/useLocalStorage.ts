import { useState, useEffect, useCallback } from 'react';

/**
 * useLocalStorage — typed localStorage hook with JSON serialization.
 * Handles SSR/test environments gracefully and syncs across tabs via storage events.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Quota exceeded or private browsing — degrade gracefully
        }
        return next;
      });
    },
    [key]
  );

  // Sync across tabs when another tab updates the same key
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        const next = e.newValue !== null ? (JSON.parse(e.newValue) as T) : initialValue;
        setStoredValue(next);
      } catch {
        // ignore malformed cross-tab data
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, initialValue]);

  return [storedValue, setValue];
}
