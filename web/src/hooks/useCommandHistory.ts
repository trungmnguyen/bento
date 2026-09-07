import { useState, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

const HISTORY_KEY = 'bento_cmd_history';
const MAX_HISTORY = 50;

/**
 * useCommandHistory — shell-style command history for the task launch input.
 * Stores up to MAX_HISTORY commands in localStorage.
 * Navigate with navigateHistory(-1) for older (up arrow) and (+1) for newer (down arrow).
 */
export function useCommandHistory() {
  const [history, setHistory] = useLocalStorage<string[]>(HISTORY_KEY, []);
  // Cursor: -1 means "not navigating" (showing current input)
  const cursorRef = useRef<number>(-1);
  const [cursor, setCursor] = useState<number>(-1);

  /** Push a submitted command into history (deduplicated, newest first). */
  const pushCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;
      setHistory((prev) => {
        // Deduplicate: remove any identical previous entry
        const filtered = prev.filter((c) => c !== trimmed);
        return [trimmed, ...filtered].slice(0, MAX_HISTORY);
      });
      cursorRef.current = -1;
      setCursor(-1);
    },
    [setHistory]
  );

  /** Reset cursor (call when the user types anything manually). */
  const resetCursor = useCallback(() => {
    cursorRef.current = -1;
    setCursor(-1);
  }, []);

  /**
   * Navigate history. direction = -1 → older (up arrow), +1 → newer (down arrow).
   * Returns the command at the new cursor position, or null if back at current input.
   */
  const navigateHistory = useCallback(
    (direction: -1 | 1): string | null => {
      const newCursor = cursorRef.current + direction;
      if (newCursor < -1) return null;
      if (newCursor >= history.length) return null;
      cursorRef.current = newCursor;
      setCursor(newCursor);
      return newCursor === -1 ? null : history[newCursor];
    },
    [history]
  );

  return {
    history,
    cursor,
    pushCommand,
    resetCursor,
    navigateHistory,
    hasHistory: history.length > 0,
  };
}
