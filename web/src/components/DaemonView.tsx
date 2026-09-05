import React, { useState } from 'react';
import { Square, RefreshCw, Clock, CheckCircle2, XCircle, Flame, Sparkles, Trash2 } from 'lucide-react';
import { ChefTamagoIcon, SoyFishIcon, BentoBoxIcon } from './icons/BentoIcons';
import { BackgroundTask } from '../types';

interface DaemonViewProps {
  tasks: BackgroundTask[];
  onRefresh: () => void;
}

export const DaemonView: React.FC<DaemonViewProps> = ({ tasks, onRefresh }) => {
  const [selectedTask, setSelectedTask] = useState<BackgroundTask | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logEndRef = React.useRef<HTMLDivElement>(null);
  const [newCmd, setNewCmd] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('kitchen-task');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPruning, setIsPruning] = useState<boolean>(false);
  const [pruneMessage, setPruneMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchLogs = async (taskId: string) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/bg/${taskId}/logs`);
      const data = await res.json();
      setLogContent(data.logs || 'No logs captured yet.');
    } catch (err) {
      setLogContent('Failed to fetch logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  React.useEffect(() => {
    if (!selectedTask) return;

    setLogContent('');
    setLoadingLogs(true);
    setIsStreaming(true);

    const eventSource = new EventSource(`/api/bg/${selectedTask.task_id}/stream`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.chunk) {
          setLogContent((prev) => prev + data.chunk);
        }
        if (data.status === 'COMPLETED' || data.status === 'STOPPED') {
          setIsStreaming(false);
          eventSource.close();
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
    try {
      const res = await fetch(`/api/bg/${taskId}/kill`, { method: 'POST' });
      if (res.ok) {
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
    if (!newCmd.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch('/api/bg/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: newCmd, tag: newTag }),
      });
      if (res.ok) {
        setNewCmd('');
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || 'Failed to launch task.');
      }
    } catch (err) {
      setActionError('Failed to launch task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrune = async () => {
    setIsPruning(true);
    setPruneMessage(null);
    setActionError(null);
    try {
      const res = await fetch('/api/bg/prune', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPruneMessage(`🧹 Kitchen Swept! Cleaned ${data.pruned_tasks_count || 0} finished task(s).`);
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
            className="flex-1 min-w-0 bg-bento-lacquer border border-bento-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-tamago font-mono transition disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="Dish Tag"
            value={newTag}
            disabled={isSubmitting}
            onChange={(e) => setNewTag(e.target.value)}
            className="w-full sm:w-32 bg-bento-lacquer border border-bento-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-tamago font-mono transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newCmd.trim()}
            className="w-full sm:w-auto bg-gradient-to-r from-bento-tamago to-amber-500 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-tamago-glow min-h-[42px] touch-manipulation"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-gray-900" /> Cooking...
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 fill-gray-900" /> Start Cooking
              </>
            )}
          </button>
        </form>
        {actionError && <p className="text-bento-salmon text-xs mt-2">{actionError}</p>}
        {pruneMessage && <p className="text-emerald-400 text-xs mt-2 font-medium">{pruneMessage}</p>}
      </div>

      {/* Task Process Table */}
      <div className="bg-bento-surface border border-bento-border rounded-bento overflow-hidden shadow-bento-card">
        <div className="px-6 py-4 border-b border-bento-border flex justify-between items-center bg-bento-elevated">
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <BentoBoxIcon className="w-5 h-5" /> Kitchen Orders & Daemons ({tasks.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrune}
              disabled={isPruning}
              className="px-3 py-1.5 bg-bento-lacquer hover:bg-bento-border border border-bento-border rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1.5 disabled:opacity-50"
              title="Prune finished tasks and dead logs"
            >
              <Trash2 className="w-3.5 h-3.5 text-bento-salmon" />
              <span>{isPruning ? 'Sweeping...' : 'Sweep Kitchen 🧹'}</span>
            </button>
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-bento-border rounded-xl text-gray-400 hover:text-white transition"
              title="Refresh kitchen orders"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ChefTamagoIcon className="w-12 h-12 mx-auto mb-3 opacity-60 animate-bento-bounce" />
            <p className="text-sm font-medium text-gray-300">Kitchen stove is clear! No background tasks cooking.</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">Launch a task with: <code>bento bg run "..."</code></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-background/50 text-gray-400 border-b border-border">
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
                {tasks.map((task) => {
                  const isRunning = task.status === 'RUNNING';
                  return (
                    <tr
                      key={task.task_id}
                      className="hover:bg-bento-elevated/70 transition cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task);
                        fetchLogs(task.task_id);
                      }}
                    >
                      <td className="px-6 py-4 font-mono font-medium text-bento-tamago">
                        {task.task_id}
                        <span className="block text-xs text-gray-400 font-sans mt-0.5 font-normal">#{task.tag}</span>
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
                      <td className="px-6 py-4 font-mono text-xs text-gray-200 max-w-xs truncate">
                        {task.command}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                        {task.duration_sec.toFixed(1)}s
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isRunning && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleKill(task.task_id);
                            }}
                            className="text-xs bg-bento-salmon/15 hover:bg-bento-salmon/25 text-bento-salmon border border-bento-salmon/40 px-3 py-1 rounded-xl transition font-medium"
                          >
                            Remove Pot
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                            fetchLogs(task.task_id);
                          }}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-bento-surface border-l border-bento-border h-full flex flex-col p-6 shadow-2xl">
            <div className="flex justify-between items-start pb-4 border-b border-bento-border">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                    <SoyFishIcon className="w-6 h-6 text-bento-salmon" />
                    Task Output Logs: <span className="font-mono text-bento-tamago">{selectedTask.task_id}</span>
                  </h3>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoScroll((prev) => !prev)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl border font-mono transition ${
                    autoScroll
                      ? 'bg-bento-matcha/15 text-bento-matcha border-bento-matcha/40 font-bold'
                      : 'bg-bento-elevated text-gray-400 border-bento-border'
                  }`}
                  title="Toggle automatic scrolling to bottom"
                >
                  Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => fetchLogs(selectedTask.task_id)}
                  className="p-1.5 hover:bg-bento-border rounded-xl text-gray-300 hover:text-white"
                  title="Reload Logs"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin text-bento-salmon' : ''}`} />
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-3 py-1 bg-bento-elevated hover:bg-bento-border text-xs rounded-xl text-gray-300 border border-bento-border"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 my-4 bg-bento-lacquer border border-bento-border rounded-xl p-4 font-mono text-xs text-bento-rice overflow-y-auto whitespace-pre-wrap">
              {logContent || 'Log buffer is empty.'}
              {isStreaming && <span className="inline-block w-2 h-3.5 bg-bento-tamago animate-pulse ml-0.5 align-middle" />}
              <div ref={logEndRef} />
            </div>

            <div className="pt-3 border-t border-bento-border flex justify-between items-center text-xs text-gray-400">
              <span>Status: <strong className="text-bento-tamago">{selectedTask.status}</strong></span>
              {selectedTask.status === 'RUNNING' && (
                <button
                  onClick={() => handleKill(selectedTask.task_id)}
                  className="bg-bento-salmon/20 hover:bg-bento-salmon/30 text-bento-salmon border border-bento-salmon/50 px-4 py-1.5 rounded-xl transition font-bold"
                >
                  Terminate Process (SIGTERM)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
