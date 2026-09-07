import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Search, X, Download, RotateCcw, Square, ArrowDown,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { SoyFishIcon } from './icons/BentoIcons';
import { BackgroundTask } from '../types';
import { useTaskLogs } from '../hooks/useTaskLogs';
import { useA11yModal } from '../hooks/useA11yModal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { CopyButton } from './CopyButton';
import { playClack } from '../utils/audio';
import { parseAnsi, stripAnsi } from '../utils/ansi';

type LogLevel = 'ALL' | 'ERROR' | 'WARN' | 'INFO';

interface LogDrawerProps {
  task: BackgroundTask;
  onClose: () => void;
  onRefresh: () => void;
  onKill: (taskId: string) => void;
  onRecook: (cmd: string, tag: string) => void;
  onDownloadLog: (task: BackgroundTask, logContent: string) => void;
}

function highlightMatches(
  line: string,
  query: string,
  isActiveMatch: boolean
): React.ReactNode {
  if (!query) return parseAnsi(line);
  const cleanLine = stripAnsi(line);
  const lowerLine = cleanLine.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const firstIdx = lowerLine.indexOf(lowerQuery);
  if (firstIdx === -1) return parseAnsi(line);

  const parts: React.ReactNode[] = [];
  let remaining = cleanLine;
  let keyIdx = 0;

  while (remaining) {
    const idx = remaining.toLowerCase().indexOf(lowerQuery);
    if (idx === -1) {
      parts.push(remaining);
      break;
    }
    if (idx > 0) {
      parts.push(remaining.slice(0, idx));
    }
    const match = remaining.slice(idx, idx + lowerQuery.length);
    parts.push(
      <mark
        key={keyIdx++}
        className={`${
          isActiveMatch
            ? 'bg-amber-400 text-gray-950 font-extrabold ring-2 ring-amber-300 rounded px-1'
            : 'bg-amber-400/40 text-amber-200 rounded px-0.5 font-bold'
        }`}
      >
        {match}
      </mark>
    );
    remaining = remaining.slice(idx + lowerQuery.length);
  }

  return parts;
}

export const LogDrawer: React.FC<LogDrawerProps> = ({
  task, onClose, onRefresh, onKill, onRecook, onDownloadLog,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useLocalStorage<boolean>('bento_log_line_numbers', false);

  const {
    logContent, loadingLogs, isStreaming, autoScroll, setAutoScroll,
    logFilterQuery, setLogFilterQuery, selectedLogLevel, setSelectedLogLevel,
    wrapLines, setWrapLines, displayedLogLines, processedLogLines,
    progressPct, logEndRef, fetchLogs,
  } = useTaskLogs(task.task_id, onRefresh);

  const { modalProps } = useA11yModal({
    isOpen: true,
    onClose,
    containerRef: drawerRef,
  });

  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  // Compute all displayed line indices matching logFilterQuery
  const matchingLineIndices = useMemo(() => {
    const q = logFilterQuery.trim().toLowerCase();
    if (!q) return [];
    const indices: number[] = [];
    displayedLogLines.forEach((line, idx) => {
      if (stripAnsi(line).toLowerCase().includes(q)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [displayedLogLines, logFilterQuery]);

  // Keep activeMatchIdx within bounds when matchingLineIndices updates
  useEffect(() => {
    setActiveMatchIdx(0);
  }, [logFilterQuery]);

  const jumpToMatch = (newIdx: number) => {
    if (matchingLineIndices.length === 0) return;
    playClack();
    const total = matchingLineIndices.length;
    const nextIdx = (newIdx + total) % total;
    setActiveMatchIdx(nextIdx);
    const targetLine = matchingLineIndices[nextIdx];
    const el = lineRefs.current[targetLine];
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const handleNextMatch = () => jumpToMatch(activeMatchIdx + 1);
  const handlePrevMatch = () => jumpToMatch(activeMatchIdx - 1);

  // Hotkey: Cmd+F / Ctrl+F focuses in-log filter input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        filterInputRef.current?.focus();
        filterInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTerminalScroll = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setIsScrolledUp(distanceToBottom > 60);
  };

  const FOCUS_RING = 'focus-visible:ring-2 focus-visible:ring-bento-tamago focus-visible:ring-offset-1 focus-visible:outline-none';

  return (
    <>
      {/* Backdrop — aria-hidden so VoiceOver virtual cursor stays inside modal */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
        onClick={(e) => { if (e.target === e.currentTarget) { playClack(); onClose(); } }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        {...modalProps}
        aria-labelledby="log-viewer-title"
        className="fixed inset-y-0 right-0 w-full max-w-3xl bg-bento-surface border-l border-bento-border flex flex-col p-4 sm:p-6 shadow-2xl overflow-hidden z-50 animate-in slide-in-from-right duration-200"
      >
        {/* Screen-reader status region (off-screen, never aria-live on the terminal itself) */}
        <div className="sr-only" aria-live="polite" role="status">
          {isStreaming
            ? `Task ${task.task_id} is running and streaming logs.`
            : `Task log stream completed for ${task.task_id}. Showing ${displayedLogLines.length} lines.`}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-bento-border">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="log-viewer-title" className="text-base font-bold text-gray-100 flex items-center gap-2">
                <SoyFishIcon className="w-6 h-6 text-bento-salmon" aria-hidden="true" />
                Task Logs: <span className="font-mono text-bento-tamago">{task.task_id}</span>
              </h2>
              <CopyButton text={task.task_id} tooltip="Copy Task ID" iconOnly className="ml-1" />
              {isStreaming ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-bento-tamago/15 text-bento-tamago border border-bento-tamago/30 shadow-sm">
                  <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-bento-tamago animate-ping motion-reduce:animate-none" />
                  Live Simmering (SSE)
                </span>
              ) : (
                <span className="text-[10px] text-gray-500 font-mono">Stream closed</span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1 break-all">{task.command}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <button
              onClick={() => onDownloadLog(task, logContent)}
              className={`px-2.5 py-1.5 min-h-[36px] bg-bento-elevated hover:bg-bento-border text-gray-300 hover:text-white rounded-xl text-xs border border-bento-border transition flex items-center gap-1 ${FOCUS_RING}`}
              title="Download raw log file"
              aria-label="Download raw log file"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download</span>
            </button>
            <CopyButton
              text={logContent}
              tooltip="Copy all log output"
              className={`px-2.5 py-1.5 min-h-[36px] bg-bento-elevated hover:bg-bento-border text-gray-300 hover:text-white rounded-xl text-xs border border-bento-border transition flex items-center gap-1 ${FOCUS_RING}`}
              aria-label="Copy all log output to clipboard"
            />
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`text-[11px] px-2.5 py-1.5 min-h-[36px] rounded-xl border font-mono transition ${FOCUS_RING} ${
                autoScroll
                  ? 'bg-bento-matcha/15 text-bento-matcha border-bento-matcha/40 font-bold'
                  : 'bg-bento-elevated text-gray-400 border-bento-border'
              }`}
              title="Toggle automatic scrolling to bottom"
              aria-label={`Toggle automatic scrolling to bottom, currently ${autoScroll ? 'on' : 'off'}`}
              aria-pressed={autoScroll}
            >
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => { playClack(); fetchLogs(); }}
              className={`p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-bento-border rounded-xl text-gray-300 hover:text-white ${FOCUS_RING}`}
              title="Reload Logs"
              aria-label="Reload logs"
            >
              <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin text-bento-salmon' : ''}`} aria-hidden="true" />
            </button>
            <button
              onClick={() => { playClack(); onClose(); }}
              className={`px-3 py-1.5 min-h-[36px] bg-bento-elevated hover:bg-bento-border text-xs rounded-xl text-gray-300 border border-bento-border ${FOCUS_RING}`}
              aria-label="Close log viewer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Progress bar — shown when TEL-02 detects % pattern in SSE chunks */}
        {progressPct !== null && (
          <div className="mt-2 h-1.5 bg-bento-lacquer rounded-full overflow-hidden" aria-hidden="true">
            <div
              className="h-full bg-gradient-to-r from-bento-tamago to-amber-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
        {progressPct !== null && (
          <p className="sr-only" aria-live="polite" role="status">{`Task progress: ${progressPct}%`}</p>
        )}

        {/* Log scope toolbar */}
        <div className="my-3 p-2.5 bg-bento-elevated/60 border border-bento-border rounded-xl flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                ref={filterInputRef}
                type="text"
                id="log-filter-query"
                value={logFilterQuery}
                onChange={(e) => setLogFilterQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      handlePrevMatch();
                    } else {
                      handleNextMatch();
                    }
                  }
                }}
                placeholder="Filter logs (text or ⌘F)..."
                aria-label="Filter logs by text (press Cmd+F to focus, Enter/Shift+Enter to navigate matches)"
                className="w-full bg-bento-lacquer border border-bento-border rounded-lg pl-8 pr-7 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 font-mono"
              />
              {logFilterQuery && (
                <button
                  type="button"
                  onClick={() => { playClack(); setLogFilterQuery(''); }}
                  aria-label="Clear log filter"
                  className="absolute right-0 top-0 w-[36px] h-full flex items-center justify-center text-gray-400 hover:text-white"
                  title="Clear filter"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Match jumping navigation */}
            {logFilterQuery.trim() && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-gray-300 bg-bento-lacquer px-2 py-1 rounded-lg border border-bento-border shrink-0">
                <span className="text-[10px] tabular-nums text-bento-tamago font-bold">
                  {matchingLineIndices.length > 0
                    ? `${activeMatchIdx + 1}/${matchingLineIndices.length}`
                    : '0 matches'}
                </span>
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  disabled={matchingLineIndices.length === 0}
                  aria-label="Previous match (Shift+Enter)"
                  title="Previous match (Shift+Enter)"
                  className="p-0.5 rounded hover:bg-bento-border text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition focus-visible:ring-1 focus-visible:ring-bento-tamago"
                >
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMatch}
                  disabled={matchingLineIndices.length === 0}
                  aria-label="Next match (Enter)"
                  title="Next match (Enter)"
                  className="p-0.5 rounded hover:bg-bento-border text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition focus-visible:ring-1 focus-visible:ring-bento-tamago"
                >
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {/* Log Level Filter Pills */}
          <div className="flex items-center gap-1 text-[11px] font-mono" role="group" aria-label="Log level filter">
            {(['ALL', 'ERROR', 'WARN', 'INFO'] as LogLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => { playClack(); setSelectedLogLevel(level); }}
                aria-label={`Filter logs by level ${level}`}
                aria-pressed={selectedLogLevel === level}
                className={`px-2.5 py-1.5 min-h-[32px] rounded-lg border transition focus-visible:ring-2 focus-visible:outline-none ${
                  selectedLogLevel === level
                    ? level === 'ERROR'
                      ? 'bg-bento-salmon/20 text-bento-salmon border-bento-salmon/50 font-bold focus-visible:ring-bento-salmon'
                      : level === 'WARN'
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 font-bold focus-visible:ring-amber-400'
                      : level === 'INFO'
                      ? 'bg-bento-matcha/20 text-bento-matcha border-bento-matcha/50 font-bold focus-visible:ring-bento-matcha'
                      : 'bg-white/15 text-white border-white/30 font-bold focus-visible:ring-white'
                    : 'bg-transparent text-gray-300 border-transparent hover:bg-white/5 focus-visible:ring-bento-tamago'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Wrap, Line Numbers & Counter */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              aria-pressed={showLineNumbers}
              aria-label={`Toggle line numbers, currently ${showLineNumbers ? 'on' : 'off'}`}
              className={`text-[11px] px-2.5 py-1.5 min-h-[32px] rounded-xl border font-mono transition ${FOCUS_RING} ${
                showLineNumbers
                  ? 'bg-bento-tamago/15 text-bento-tamago border-bento-tamago/40 font-bold'
                  : 'bg-bento-elevated text-gray-400 border-bento-border'
              }`}
            >
              # Lines: {showLineNumbers ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setWrapLines(!wrapLines)}
              aria-label={`Toggle log line wrapping, currently ${wrapLines ? 'on' : 'off'}`}
              aria-pressed={wrapLines}
              className={`text-[11px] px-2.5 py-1.5 min-h-[32px] rounded-xl border font-mono transition ${FOCUS_RING} ${
                wrapLines
                  ? 'bg-bento-matcha/15 text-bento-matcha border-bento-matcha/40 font-bold'
                  : 'bg-bento-elevated text-gray-400 border-bento-border'
              }`}
            >
              Wrap: {wrapLines ? 'ON' : 'OFF'}
            </button>
            <span
              role="status"
              aria-live="polite"
              className="text-[11px] font-mono text-gray-300"
            >
              {processedLogLines.length > 300
                ? `Showing last 300 of ${processedLogLines.length} lines`
                : `Showing ${processedLogLines.length} line(s)`}
            </span>
          </div>
        </div>

        {/* Terminal stream */}
        <div className="relative flex-1 my-1 flex flex-col min-h-0">
          <div
            ref={terminalRef}
            onScroll={handleTerminalScroll}
            role="region"
            tabIndex={0}
            aria-label="Task terminal output"
            className={`flex-1 bg-bento-lacquer border border-bento-border rounded-xl p-4 font-mono text-xs text-bento-rice overflow-y-auto ${
              wrapLines ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
            } leading-relaxed focus:outline-none focus-visible:ring-1 focus-visible:ring-bento-tamago`}
          >
            {displayedLogLines.length > 0 ? (
              displayedLogLines.map((line, idx) => {
                const isError = /error|fatal|fail|traceback/i.test(line);
                const isWarn = /warn|warning/i.test(line);
                const isInfo = /info|serving|ready/i.test(line);

                let lineClass = 'text-gray-300';
                if (isError) lineClass = 'text-rose-400 font-semibold';
                else if (isWarn) lineClass = 'text-amber-300';
                else if (isInfo) lineClass = 'text-emerald-300';

                const isMatchLine = matchingLineIndices.includes(idx);
                const isActiveMatchLine = isMatchLine && matchingLineIndices[activeMatchIdx] === idx;

                return (
                  <div
                    key={idx}
                    ref={(el) => { lineRefs.current[idx] = el; }}
                    className={`${lineClass} ${
                      isActiveMatchLine
                        ? 'bg-amber-400/20 border-l-2 border-amber-400 pl-2'
                        : 'hover:bg-white/5 px-1'
                    } rounded flex items-start transition-colors duration-150`}
                  >
                    {showLineNumbers && (
                      <span className="text-gray-600 select-none w-9 text-right pr-3 shrink-0 tabular-nums font-mono text-[11px] pt-0.5">
                        {String(idx + 1).padStart(3, '0')}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      {logFilterQuery.trim()
                        ? highlightMatches(line, logFilterQuery.trim(), isActiveMatchLine)
                        : highlightMatches(line, '', false)}
                    </div>
                  </div>
                );
              })
            ) : (
              <span className="text-gray-500">
                {logContent ? 'No lines matching filter.' : 'Log buffer is empty.'}
              </span>
            )}
            {isStreaming && (
              <span aria-hidden="true" className="inline-block w-2 h-3.5 bg-bento-tamago animate-pulse motion-reduce:animate-none ml-0.5 align-middle" />
            )}
            <div ref={logEndRef} />
          </div>

          {/* Floating Scroll to Bottom pill when user has scrolled up */}
          {isScrolledUp && (
            <button
              type="button"
              onClick={() => {
                playClack();
                setAutoScroll(true);
                setIsScrolledUp(false);
                logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              aria-label="Scroll to bottom of logs"
              className="absolute bottom-3 right-4 bg-bento-tamago hover:bg-amber-400 text-gray-950 font-bold text-xs px-3 py-1.5 rounded-full shadow-tamago-glow transition flex items-center gap-1.5 z-10 animate-bounce"
            >
              <span>Scroll to latest</span>
              <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-bento-border flex justify-between items-center text-xs text-gray-400">
          <span>
            Status: <strong className="text-bento-tamago">{task.status}</strong>
            {progressPct !== null && (
              <span className="ml-2 text-bento-tamago font-mono">{progressPct}%</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { playClack(); onRecook(task.command, task.tag); }}
              aria-label={`Load command from task ${task.task_id} into launch form`}
              className={`px-3 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-xl transition flex items-center gap-1 font-medium ${FOCUS_RING}`}
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Re-cook
            </button>
            {task.status === 'RUNNING' && (
              <button
                onClick={() => { playClack(); onKill(task.task_id); }}
                aria-label={`Terminate process for task ${task.task_id}`}
                className={`bg-bento-salmon/20 hover:bg-bento-salmon/30 text-bento-salmon border border-bento-salmon/50 px-4 py-1.5 rounded-xl transition font-bold ${FOCUS_RING.replace('ring-bento-tamago', 'ring-bento-salmon')}`}
              >
                <Square className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                Terminate (SIGTERM)
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
