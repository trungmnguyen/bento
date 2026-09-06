import React, { useState, useMemo, useRef } from 'react';
import {
  Square,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Flame,
  Sparkles,
  Trash2,
  Search,
  Download,
  RotateCcw,
  Filter,
  X,
  AlertCircle,
} from 'lucide-react';
import { ChefTamagoIcon, SoyFishIcon, BentoBoxIcon } from './icons/BentoIcons';
import { BackgroundTask } from '../types';
import { playClack, playTaskFinished, playTasteFail, playTastePass } from '../utils/audio';
import { showToast } from './Toast';
import { useA11yModal } from '../hooks/useA11yModal';
import { CopyButton } from './CopyButton';

interface DaemonViewProps {
  tasks: BackgroundTask[];
  onRefresh: () => void;
}

type LogLevel = 'ALL' | 'ERROR' | 'WARN' | 'INFO';

const MAX_LOG_BUFFER_CHARS = 500_000; // 500 KB rolling buffer guard

export const DaemonView: React.FC<DaemonViewProps> = ({ tasks, onRefresh }) => {
  const [selectedTask, setSelectedTask] = useState<BackgroundTask | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [newCmd, setNewCmd] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('kitchen-task');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPruning, setIsPruning] = useState<boolean>(false);
  const [pruneMessage, setPruneMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Table Search Filter
  const [tableSearch, setTableSearch] = useState<string>('');

  // Log Scope Filters
  const [logFilterQuery, setLogFilterQuery] = useState<string>('');
  const [selectedLogLevel, setSelectedLogLevel] = useState<LogLevel>('ALL');
  const [wrapLines, setWrapLines] = useState<boolean>(true);
  const activeTaskIdRef = useRef<string | null>(null);
  const logDrawerRef = useRef<HTMLDivElement>(null);

  const { modalProps: logModalProps } = useA11yModal({
    isOpen: !!selectedTask,
    onClose: () => setSelectedTask(null),
    containerRef: logDrawerRef,
  });

  const fetchLogs = async (taskId: string) => {
    if (activeTaskIdRef.current !== taskId) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/bg/${encodeURIComponent(taskId)}/logs`);
      const data = await res.json();
      if (activeTaskIdRef.current === taskId) {
        setLogContent(data.logs || 'No logs captured yet.');
      }
    } catch (err) {
      if (activeTaskIdRef.current === taskId) {
        setLogContent('Failed to fetch logs.');
      }
    } finally {
      if (activeTaskIdRef.current === taskId) {
        setLoadingLogs(false);
      }
    }
  };

  React.useEffect(() => {
    if (!selectedTask) {
      activeTaskIdRef.current = null;
      return;
    }

    activeTaskIdRef.current = selectedTask.task_id;
    setLogContent('');
    setLoadingLogs(true);
    setIsStreaming(true);

    const eventSource = new EventSource(`/api/bg/${encodeURIComponent(selectedTask.task_id)}/stream`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.chunk) {
          setLogContent((prev) => {
            const next = prev + data.chunk;
            if (next.length > MAX_LOG_BUFFER_CHARS) {
              return next.slice(next.length - MAX_LOG_BUFFER_CHARS);
            }
            return next;
          });
        }
        if (data.status === 'COMPLETED' || data.status === 'STOPPED') {
          setIsStreaming(false);
          eventSource.close();
          playTaskFinished();
          onRefresh();
        }
      } catch {
        // ignore parse error
      } finally {
        setLoadingLogs(false);
      }
    };

    eventSource.addEventListener('close', () => {
      setIsStreaming(false);
      eventSource.close();
      onRefresh();
    });

    eventSource.onerror = () => {
      setIsStreaming(false);
      eventSource.close();
      fetchLogs(selectedTask.task_id);
    };

    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  }, [selectedTask?.task_id]);

  React.useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logContent, autoScroll]);

  const handleKill = async (taskId: string) => {
    playClack();
    try {
      const res = await fetch(`/api/bg/${encodeURIComponent(taskId)}/kill`, { method: 'POST' });
      if (res.ok) {
        showToast({
          title: 'Task Terminated',
          message: `Process for ${taskId} removed from stove.`,
          type: 'info',
        });
        onRefresh();
        if (selectedTask?.task_id === taskId) {
          fetchLogs(taskId);
        }
      }
    } catch (err) {
      setActionError('Failed to stop task.');
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmd.trim()) return;

    playClack();
    setIsSubmitting(true);
    setActionError(null);
    setPruneMessage(null);

    try {
      const res = await fetch('/api/bg/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: newCmd, tag: newTag }),
      });
      const data = await res.json();
      if (res.ok && data.started) {
        setNewCmd('');
        playTastePass();
        showToast({
          title: 'Order Started Cooking',
          message: `Task ${data.task_id} (PID ${data.pid}) launched in background.`,
          type: 'success',
        });
        onRefresh();
        setSelectedTask({
          task_id: data.task_id,
          tag: newTag,
          command: newCmd,
          pid: data.pid,
          status: 'RUNNING',
          start_time: new Date().toISOString(),
          duration_sec: 0,
          log_file: '',
          exit_code: null,
        });
      } else {
        playTasteFail();
        setActionError(data.error || 'Failed to launch task.');
      }
    } catch (err) {
      playTasteFail();
      setActionError('Failed to launch task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrune = async () => {
    playClack();
    setIsPruning(true);
    setPruneMessage(null);
    setActionError(null);
    try {
      const res = await fetch('/api/bg/prune', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const count = data.pruned_tasks_count || 0;
        setPruneMessage(`🧹 Kitchen Swept! Cleaned ${count} finished task(s).`);
        playTastePass();
        showToast({
          title: 'Kitchen Swept',
          message: `Cleaned ${count} finished task(s) from state.`,
          type: 'success',
        });
        onRefresh();
      } else {
        setActionError('Failed to sweep kitchen.');
      }
    } catch (err) {
      setActionError('Failed to sweep kitchen.');
    } finally {
      setIsPruning(false);
    }
  };

  // Re-cook Dish (Clone & Rerun)
  const handleRecook = (cmd: string, tag: string) => {
    playClack();
    setNewCmd(cmd);
    setNewTag(tag);
    showToast({
      title: 'Recipe Loaded to Stove',
      message: 'Command copied to launch bar. Click "Start Cooking" to launch.',
      type: 'info',
    });
  };

  // Download Raw Log
  const handleDownloadLog = () => {
    if (!selectedTask) return;
    playClack();
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTask.task_id}-${selectedTask.tag}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter Tasks Table
  const filteredTasks = useMemo(() => {
    if (!tableSearch.trim()) return tasks;
    const q = tableSearch.toLowerCase();
    return tasks.filter(
      (t) =>
        t.task_id.toLowerCase().includes(q) ||
        t.tag.toLowerCase().includes(q) ||
        t.command.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
    );
  }, [tasks, tableSearch]);

  // Pre-compiled query matcher with ReDoS protection (WASABI-DOS-01 / WASABI-UI-01)
  const queryMatcher = useMemo(() => {
    if (!logFilterQuery.trim()) return null;
    const trimmed = logFilterQuery.trim();
    if (trimmed.length > 100) {
      const lower = trimmed.toLowerCase();
      return (line: string) => line.toLowerCase().includes(lower);
    }
    try {
      // Escape regex special characters to prevent catastrophic backtracking and invalid pattern crashes
      const safePattern = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safePattern, 'i');
      return (line: string) => regex.test(line);
    } catch {
      const lower = trimmed.toLowerCase();
      return (line: string) => line.toLowerCase().includes(lower);
    }
  }, [logFilterQuery]);

  // Filter Log Lines
  const processedLogLines = useMemo(() => {
    if (!logContent) return [];
    const lines = logContent.split('\n');

    return lines.filter((line) => {
      // Level check
      if (selectedLogLevel === 'ERROR') {
        const isError = /error|fatal|fail|traceback|exception/i.test(line);
        if (!isError) return false;
      } else if (selectedLogLevel === 'WARN') {
        const isWarn = /warn|warning/i.test(line);
        if (!isWarn) return false;
      } else if (selectedLogLevel === 'INFO') {
        const isInfo = /info|serving|ready|passed|listening/i.test(line);
        if (!isInfo) return false;
      }

      // Query check using precompiled matcher
      if (queryMatcher && !queryMatcher(line)) {
        return false;
      }

      return true;
    });
  }, [logContent, selectedLogLevel, queryMatcher]);

  // Cap displayed lines in DOM to last 300 to prevent DOM explosion and screen reader hang (WASABI-UI-03)
  const displayedLogLines = useMemo(() => {
    if (processedLogLines.length <= 300) return processedLogLines;
    return processedLogLines.slice(-300);
  }, [processedLogLines]);

  return (
    <div className="space-y-6">
      {/* Kitchen Order Launch Panel */}
      <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card">
        <h3 className="text-sm font-bold uppercase tracking-wider text-bento-tamago mb-3 flex items-center gap-2">
          <ChefTamagoIcon className="w-5 h-5" /> Cook New Butler Task (Background Runner)
        </h3>
        <form onSubmit={handleLaunch} className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
          <input
            type="text"
            placeholder="Command to cook in background (e.g. bento dream --benchmarks examples/)"
            value={newCmd}
            disabled={isSubmitting}
            onChange={(e) => setNewCmd(e.target.value)}
            aria-label="Command to cook in background"
            className="flex-1 min-w-0 bg-bento-lacquer border border-bento-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-tamago font-mono transition disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="Dish Tag"
            value={newTag}
            disabled={isSubmitting}
            onChange={(e) => setNewTag(e.target.value)}
            aria-label="Dish tag or category"
            className="w-full sm:w-32 bg-bento-lacquer border border-bento-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-tamago font-mono transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newCmd.trim()}
            aria-label="Start cooking background task"
            className="w-full sm:w-auto bg-gradient-to-r from-bento-tamago to-amber-500 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-tamago-glow min-h-[42px] touch-manipulation"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-gray-950" /> Cooking...
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 fill-gray-950" /> Start Cooking
              </>
            )}
          </button>
        </form>
        {actionError && (
          <div role="alert" aria-live="assertive" className="text-bento-salmon text-xs mt-2 font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {pruneMessage && (
          <div role="status" aria-live="polite" className="text-emerald-400 text-xs mt-2 font-medium">
            {pruneMessage}
          </div>
        )}
      </div>

      {/* Task Process Table */}
      <div className="bg-bento-surface border border-bento-border rounded-bento overflow-hidden shadow-bento-card">
        <div className="px-6 py-4 border-b border-bento-border flex flex-wrap justify-between items-center bg-bento-elevated gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
              <BentoBoxIcon className="w-5 h-5" /> Kitchen Orders & Daemons ({tasks.length})
            </h2>
            {/* Table Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="daemon-table-search"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filter orders..."
                aria-label="Filter kitchen orders"
                className="bg-bento-lacquer border border-bento-border rounded-lg pl-8 pr-7 py-1 text-xs text-gray-200 focus:outline-none focus:border-bento-tamago/60 font-mono w-36 sm:w-48"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => {
                    playClack();
                    setTableSearch('');
                  }}
                  aria-label="Clear order filter"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrune}
              disabled={isPruning}
              aria-label="Sweep kitchen and prune finished tasks"
              className="px-3 py-1.5 bg-bento-lacquer hover:bg-bento-border border border-bento-border rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1.5 disabled:opacity-50"
              title="Prune finished tasks and dead logs"
            >
              <Trash2 className="w-3.5 h-3.5 text-bento-salmon" />
              <span>{isPruning ? 'Sweeping...' : 'Sweep Kitchen 🧹'}</span>
            </button>
            <button
              onClick={() => {
                playClack();
                onRefresh();
              }}
              aria-label="Refresh kitchen orders"
              className="p-2 hover:bg-bento-border rounded-xl text-gray-400 hover:text-white transition"
              title="Refresh kitchen orders"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <ChefTamagoIcon className="w-12 h-12 mx-auto mb-3 opacity-60 animate-bento-bounce" />
            <p className="text-sm font-medium text-gray-300">Kitchen stove is clear! No background tasks cooking.</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">Quick cook from pantry:</p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
              {[
                { label: 'Suite Check', cmd: 'bento suite examples/', tag: 'suite-check' },
                { label: 'Run Triad Sprint', cmd: 'bento orchestra --rounds 1', tag: 'triad-sprint' },
                { label: 'AST Hygiene Audit', cmd: 'bento check', tag: 'ast-audit' },
              ].map((pantry) => (
                <button
                  key={pantry.tag}
                  type="button"
                  onClick={() => {
                    playClack();
                    setNewCmd(pantry.cmd);
                    setNewTag(pantry.tag);
                  }}
                  className="px-2.5 py-1.5 bg-bento-lacquer hover:bg-bento-border border border-bento-border rounded-xl text-xs font-mono text-bento-tamago hover:text-white transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-bento-tamago" />
                  <span>{pantry.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-50 text-gray-400" />
            <p className="text-sm font-medium text-gray-300">No orders matching &ldquo;{tableSearch}&rdquo;</p>
            <button
              type="button"
              onClick={() => {
                playClack();
                setTableSearch('');
              }}
              className="mt-3 px-3 py-1.5 bg-bento-lacquer hover:bg-bento-border border border-bento-border rounded-xl text-xs text-gray-300 hover:text-white font-mono transition"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div
            role="region"
            tabIndex={0}
            aria-label="Background tasks table"
            className="overflow-x-auto focus:outline-none focus-visible:ring-1 focus-visible:ring-bento-tamago"
          >
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-[#1e1a25]/95 backdrop-blur-md text-gray-400 border-b border-border sticky top-0 z-20">
                <tr>
                  <th className="px-6 py-3 font-medium">Task ID / Tag</th>
                  <th className="px-6 py-3 font-medium">PID</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Command</th>
                  <th className="px-6 py-3 font-medium">Runtime</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bento-border/70">
                {filteredTasks.map((task) => {
                  const isRunning = task.status === 'RUNNING';
                  const handleSelect = () => {
                    playClack();
                    activeTaskIdRef.current = task.task_id;
                    setSelectedTask(task);
                  };

                  return (
                    <tr
                      key={task.task_id}
                      className="hover:bg-bento-elevated/70 transition"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-bento-tamago">
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={handleSelect}
                            aria-label={`View logs for task ${task.task_id} tagged ${task.tag}`}
                            className="text-left font-mono font-medium text-bento-tamago hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-salmon rounded px-1 -ml-1 transition"
                          >
                            {task.task_id}
                            <span className="block text-xs text-gray-400 font-sans mt-0.5 font-normal">#{task.tag}</span>
                          </button>
                          <CopyButton text={task.task_id} tooltip="Copy Task ID" iconOnly className="ml-1.5" />
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-400 text-xs">{task.pid || '—'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isRunning
                              ? 'bg-bento-tamago/15 text-bento-tamago border border-bento-tamago/30 shadow-sm'
                              : task.status === 'COMPLETED'
                              ? 'bg-bento-matcha/15 text-bento-matcha border border-bento-matcha/30'
                              : 'bg-bento-salmon/15 text-bento-salmon border border-bento-salmon/30'
                          }`}
                        >
                          {isRunning ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-bento-tamago animate-ping" />
                              Sizzling
                            </>
                          ) : task.status === 'COMPLETED' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ready to Serve
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Burnt / Failed
                            </>
                          )}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 font-mono text-xs text-gray-200 max-w-xs truncate"
                        title={task.command}
                      >
                        {task.command}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                        {task.duration_sec.toFixed(1)}s
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isRunning ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleKill(task.task_id);
                            }}
                            aria-label={`Terminate task ${task.task_id}`}
                            className="text-xs bg-bento-salmon/15 hover:bg-bento-salmon/25 text-bento-salmon border border-bento-salmon/40 px-3 py-1 rounded-xl transition font-medium"
                          >
                            Remove Pot
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecook(task.command, task.tag);
                            }}
                            aria-label={`Re-cook task ${task.task_id}`}
                            className="text-xs bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded-xl transition font-medium inline-flex items-center gap-1"
                            title="Load command to cook again"
                          >
                            <RotateCcw className="w-3 h-3" /> Re-cook
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect();
                          }}
                          aria-label={`Taste logs for task ${task.task_id}`}
                          className="text-xs bg-bento-elevated hover:bg-bento-border text-gray-200 px-3 py-1 rounded-xl border border-bento-border transition"
                        >
                          Taste Logs
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Viewer Modal / Drawer */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              playClack();
              setSelectedTask(null);
            }
          }}
        >
          <div
            ref={logDrawerRef}
            {...logModalProps}
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-viewer-title"
            className="w-full max-w-3xl bg-bento-surface border-l border-bento-border h-full flex flex-col p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-bento-border">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 id="log-viewer-title" className="text-base font-bold text-gray-100 flex items-center gap-2">
                    <SoyFishIcon className="w-6 h-6 text-bento-salmon" />
                    Task Output Logs: <span className="font-mono text-bento-tamago">{selectedTask.task_id}</span>
                  </h3>
                  <CopyButton text={selectedTask.task_id} tooltip="Copy Task ID" iconOnly className="ml-1" />
                  {isStreaming ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-bento-tamago/15 text-bento-tamago border border-bento-tamago/30 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-bento-tamago animate-ping" />
                      Live Simmering (SSE)
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500 font-mono">Stream closed</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">{selectedTask.command}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                <button
                  onClick={handleDownloadLog}
                  className="px-2.5 py-1 bg-bento-elevated hover:bg-bento-border text-gray-300 hover:text-white rounded-xl text-xs border border-bento-border transition flex items-center gap-1"
                  title="Download raw log file"
                  aria-label="Download raw log file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setAutoScroll((prev) => !prev)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl border font-mono transition ${
                    autoScroll
                      ? 'bg-bento-matcha/15 text-bento-matcha border-bento-matcha/40 font-bold'
                      : 'bg-bento-elevated text-gray-400 border-bento-border'
                  }`}
                  title="Toggle automatic scrolling to bottom"
                  aria-label={`Toggle automatic scrolling to bottom, currently ${autoScroll ? 'on' : 'off'}`}
                >
                  Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => {
                    playClack();
                    fetchLogs(selectedTask.task_id);
                  }}
                  className="p-1.5 hover:bg-bento-border rounded-xl text-gray-300 hover:text-white"
                  title="Reload Logs"
                  aria-label="Reload logs"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin text-bento-salmon' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    playClack();
                    setSelectedTask(null);
                  }}
                  className="px-3 py-1 bg-bento-elevated hover:bg-bento-border text-xs rounded-xl text-gray-300 border border-bento-border"
                  aria-label="Close log viewer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Chef's Log Scope Toolbar */}
            <div className="my-3 p-2.5 bg-bento-elevated/60 border border-bento-border rounded-xl flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="log-filter-query"
                    value={logFilterQuery}
                    onChange={(e) => setLogFilterQuery(e.target.value)}
                    placeholder="Filter logs (regex / text)..."
                    aria-label="Filter logs by regex or text"
                    className="w-full bg-bento-lacquer border border-bento-border rounded-lg pl-8 pr-7 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  {logFilterQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        playClack();
                        setLogFilterQuery('');
                      }}
                      aria-label="Clear log filter"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Log Level Filter Pills */}
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {(['ALL', 'ERROR', 'WARN', 'INFO'] as LogLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      playClack();
                      setSelectedLogLevel(level);
                    }}
                    aria-label={`Filter logs by level ${level}`}
                    aria-pressed={selectedLogLevel === level}
                    className={`px-2.5 py-1 rounded-lg border transition ${
                      selectedLogLevel === level
                        ? level === 'ERROR'
                          ? 'bg-bento-salmon/20 text-bento-salmon border-bento-salmon/50 font-bold'
                          : level === 'WARN'
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 font-bold'
                          : level === 'INFO'
                          ? 'bg-bento-matcha/20 text-bento-matcha border-bento-matcha/50 font-bold'
                          : 'bg-white/15 text-white border-white/30 font-bold'
                        : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {/* Line Wrap Toggle & Counter */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWrapLines((prev) => !prev)}
                  aria-label={`Toggle log line wrapping, currently ${wrapLines ? 'on' : 'off'}`}
                  className={`text-[11px] px-2.5 py-1 rounded-xl border font-mono transition ${
                    wrapLines
                      ? 'bg-bento-matcha/15 text-bento-matcha border-bento-matcha/40 font-bold'
                      : 'bg-bento-elevated text-gray-400 border-bento-border'
                  }`}
                >
                  Wrap: {wrapLines ? 'ON' : 'OFF'}
                </button>
                <span className="text-[11px] font-mono text-gray-400">
                  {processedLogLines.length > 300
                    ? `Showing last 300 of ${processedLogLines.length} lines`
                    : `Showing ${processedLogLines.length} line(s)`}
                </span>
              </div>
            </div>

            {/* Screen Reader Status Notification (WASABI-UI-03 / YUZU-A11Y-12) */}
            <div className="sr-only" aria-live="polite" role="status">
              {isStreaming
                ? `Task ${selectedTask.task_id} is running and streaming logs.`
                : `Task log stream completed for ${selectedTask.task_id}. Showing ${displayedLogLines.length} lines.`}
            </div>

            {/* Terminal Stream */}
            <div
              role="region"
              tabIndex={0}
              aria-label="Task terminal output"
              className={`flex-1 my-1 bg-bento-lacquer border border-bento-border rounded-xl p-4 font-mono text-xs text-bento-rice overflow-y-auto ${
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

                  return (
                    <div key={idx} className={`${lineClass} hover:bg-white/5 px-1 rounded`}>
                      {line}
                    </div>
                  );
                })
              ) : (
                <span className="text-gray-500">
                  {logContent ? 'No lines matching filter.' : 'Log buffer is empty.'}
                </span>
              )}
              {isStreaming && <span className="inline-block w-2 h-3.5 bg-bento-tamago animate-pulse ml-0.5 align-middle" />}
              <div ref={logEndRef} />
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-bento-border flex justify-between items-center text-xs text-gray-400">
              <span>
                Status: <strong className="text-bento-tamago">{selectedTask.status}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRecook(selectedTask.command, selectedTask.tag)}
                  aria-label={`Re-cook task ${selectedTask.task_id}`}
                  className="px-3 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-xl transition flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-cook
                </button>
                {selectedTask.status === 'RUNNING' && (
                  <button
                    onClick={() => handleKill(selectedTask.task_id)}
                    aria-label={`Terminate process for task ${selectedTask.task_id}`}
                    className="bg-bento-salmon/20 hover:bg-bento-salmon/30 text-bento-salmon border border-bento-salmon/50 px-4 py-1.5 rounded-xl transition font-bold"
                  >
                    Terminate Process (SIGTERM)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
