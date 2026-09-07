import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiFetch, authEventSourceUrl } from '../utils/api';
import { playTaskFinished } from '../utils/audio';

type LogLevel = 'ALL' | 'ERROR' | 'WARN' | 'INFO';

const MAX_LOG_BUFFER_CHARS = 500_000; // 500 KB rolling buffer guard

// Progress pattern: "42%" or "[42/100]" or "42/100"
const PROGRESS_PATTERN = /(?:^|[\s\[])(\d{1,3})(?:%|\s*\/\s*(\d+))/;

export interface UseTaskLogsReturn {
  logContent: string;
  loadingLogs: boolean;
  isStreaming: boolean;
  autoScroll: boolean;
  setAutoScroll: (v: boolean) => void;
  logFilterQuery: string;
  setLogFilterQuery: (v: string) => void;
  selectedLogLevel: LogLevel;
  setSelectedLogLevel: (v: LogLevel) => void;
  wrapLines: boolean;
  setWrapLines: (v: boolean) => void;
  displayedLogLines: string[];
  processedLogLines: string[];
  progressPct: number | null;
  logEndRef: React.RefObject<HTMLDivElement | null>;
  fetchLogs: () => Promise<void>;
}

export function useTaskLogs(
  taskId: string | null,
  onTaskComplete: () => void,
): UseTaskLogsReturn {
  const [logContent, setLogContent] = useState<string>('');
  const logContentRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [logFilterQuery, setLogFilterQuery] = useState<string>('');
  const [selectedLogLevel, setSelectedLogLevel] = useState<LogLevel>('ALL');
  const [wrapLines, setWrapLines] = useState<boolean>(true);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  // Single-EventSource-per-task invariant: track active source ref to prevent duplicates
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!taskId) return;
    setLoadingLogs(true);
    try {
      const res = await apiFetch(`/api/bg/${encodeURIComponent(taskId)}/logs`);
      const data = await res.json();
      if (isMountedRef.current) {
        const text = data.logs || 'No logs captured yet.';
        logContentRef.current = text;
        setLogContent(text);
      }
    } catch {
      if (isMountedRef.current) {
        setLogContent('Failed to fetch logs.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingLogs(false);
      }
    }
  }, [taskId]);

  // SSE streaming — single EventSource per taskId with full isMountedRef guarding
  useEffect(() => {
    if (!taskId) {
      logContentRef.current = '';
      setLogContent('');
      setIsStreaming(false);
      setProgressPct(null);
      return;
    }

    // WASABI-ASYNC-02: Close any existing EventSource before opening a new one
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    logContentRef.current = '';
    setLogContent('');
    setLoadingLogs(true);
    setIsStreaming(true);
    setProgressPct(null);

    const eventSource = new EventSource(
      authEventSourceUrl(`/api/bg/${encodeURIComponent(taskId)}/stream`)
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (e) => {
      // WASABI-ASYNC-07: Guard all state updates with isMountedRef
      if (!isMountedRef.current) {
        eventSource.close();
        return;
      }
      try {
        const data = JSON.parse(e.data);
        if (data.chunk) {
          setLogContent((prev) => {
            const next = prev + data.chunk;
            const bounded =
              next.length > MAX_LOG_BUFFER_CHARS
                ? next.slice(next.length - MAX_LOG_BUFFER_CHARS)
                : next;
            logContentRef.current = bounded;
            return bounded;
          });

          // TEL-02: Auto-parse progress % from SSE chunks
          const match = PROGRESS_PATTERN.exec(data.chunk);
          if (match) {
            const numerator = parseInt(match[1], 10);
            const denominator = match[2] ? parseInt(match[2], 10) : null;
            if (denominator && denominator > 0) {
              setProgressPct(Math.min(100, Math.round((numerator / denominator) * 100)));
            } else if (!denominator && numerator <= 100) {
              setProgressPct(numerator);
            }
          }
        }
        if (data.status === 'COMPLETED' || data.status === 'STOPPED') {
          if (isMountedRef.current) {
            setIsStreaming(false);
          }
          eventSource.close();
          eventSourceRef.current = null;
          playTaskFinished();
          onTaskComplete();
        }
      } catch {
        // ignore parse errors
      } finally {
        if (isMountedRef.current) {
          setLoadingLogs(false);
        }
      }
    };

    eventSource.addEventListener('close', () => {
      if (isMountedRef.current) {
        setIsStreaming(false);
      }
      eventSource.close();
      eventSourceRef.current = null;
      onTaskComplete();
    });

    eventSource.onerror = () => {
      if (isMountedRef.current) {
        setIsStreaming(false);
        setLoadingLogs(false);
      }
      eventSource.close();
      eventSourceRef.current = null;
      // WASABI-ASYNC-01: Only fetch fallback if buffer is empty
      if (!logContentRef.current && isMountedRef.current) {
        fetchLogs();
      }
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      if (isMountedRef.current) {
        setIsStreaming(false);
      }
    };
  }, [taskId, onTaskComplete, fetchLogs]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logContent, autoScroll]);

  // Pre-compiled query matcher with ReDoS protection (WASABI-DOS-01 / WASABI-UI-01)
  const queryMatcher = useMemo(() => {
    if (!logFilterQuery.trim()) return null;
    const trimmed = logFilterQuery.trim();
    if (trimmed.length > 100) {
      const lower = trimmed.toLowerCase();
      return (line: string) => line.toLowerCase().includes(lower);
    }
    try {
      const safePattern = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safePattern, 'i');
      return (line: string) => regex.test(line);
    } catch {
      const lower = trimmed.toLowerCase();
      return (line: string) => line.toLowerCase().includes(lower);
    }
  }, [logFilterQuery]);

  const processedLogLines = useMemo(() => {
    if (!logContent) return [];
    const lines = logContent.split('\n');
    return lines.filter((line) => {
      if (selectedLogLevel === 'ERROR') {
        if (!/error|fatal|fail|traceback|exception/i.test(line)) return false;
      } else if (selectedLogLevel === 'WARN') {
        if (!/warn|warning/i.test(line)) return false;
      } else if (selectedLogLevel === 'INFO') {
        if (!/info|serving|ready|passed|listening/i.test(line)) return false;
      }
      if (queryMatcher && !queryMatcher(line)) return false;
      return true;
    });
  }, [logContent, selectedLogLevel, queryMatcher]);

  // Cap displayed lines in DOM to last 300 to prevent DOM explosion (WASABI-UI-03)
  const displayedLogLines = useMemo(() => {
    if (processedLogLines.length <= 300) return processedLogLines;
    return processedLogLines.slice(-300);
  }, [processedLogLines]);

  return {
    logContent,
    loadingLogs,
    isStreaming,
    autoScroll,
    setAutoScroll,
    logFilterQuery,
    setLogFilterQuery,
    selectedLogLevel,
    setSelectedLogLevel,
    wrapLines,
    setWrapLines,
    displayedLogLines,
    processedLogLines,
    progressPct,
    logEndRef,
    fetchLogs,
  };
}
