import React, { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, Terminal, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { BackgroundTask } from '../types';

interface DaemonViewProps {
  tasks: BackgroundTask[];
  onRefresh: () => void;
}

export const DaemonView: React.FC<DaemonViewProps> = ({ tasks, onRefresh }) => {
  const [selectedTask, setSelectedTask] = useState<BackgroundTask | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [newCmd, setNewCmd] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('task');
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
      setActionError('Failed to terminate task.');
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmd.trim()) return;
    try {
      const res = await fetch('/api/bg/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: newCmd, tag: newTag }),
      });
      if (res.ok) {
        setNewCmd('');
        onRefresh();
      }
    } catch (err) {
      setActionError('Failed to launch task.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Launch Control Panel */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" /> Launch Butler Daemon Task
        </h3>
        <form onSubmit={handleLaunch} className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Command to run in background (e.g. bento dream --benchmarks examples/)"
            value={newCmd}
            onChange={(e) => setNewCmd(e.target.value)}
            className="flex-1 min-w-[300px] bg-background border border-border rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          <input
            type="text"
            placeholder="Tag / Label"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2 rounded-lg text-sm transition flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Start Detached
          </button>
        </form>
        {actionError && <p className="text-red-400 text-xs mt-2">{actionError}</p>}
      </div>

      {/* Task Process Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-[#151924]">
          <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
            Butler Daemon Processes ({tasks.length})
          </h2>
          <button
            onClick={onRefresh}
            className="p-1.5 hover:bg-border rounded-lg text-gray-400 hover:text-white transition"
            title="Refresh process list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No background Butler tasks currently running.</p>
            <p className="text-xs text-gray-600 mt-1">Start a task via CLI: <code>bento bg run "..."</code></p>
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
              <tbody className="divide-y divide-border/60">
                {tasks.map((task) => {
                  const isRunning = task.status === 'RUNNING';
                  return (
                    <tr
                      key={task.task_id}
                      className="hover:bg-background/40 transition cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task);
                        fetchLogs(task.task_id);
                      }}
                    >
                      <td className="px-6 py-4 font-mono font-medium text-blue-400">
                        {task.task_id}
                        <span className="block text-xs text-gray-500 font-sans">{task.tag}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-400">{task.pid || '—'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isRunning
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : task.status === 'COMPLETED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {isRunning ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          ) : task.status === 'COMPLETED' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-300 max-w-xs truncate">
                        {task.command}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {task.duration_sec.toFixed(1)}s
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isRunning && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleKill(task.task_id);
                            }}
                            className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded transition"
                          >
                            Kill
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                            fetchLogs(task.task_id);
                          }}
                          className="text-xs bg-border hover:bg-gray-700 text-gray-200 px-3 py-1 rounded transition"
                        >
                          Logs
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col p-6 shadow-2xl">
            <div className="flex justify-between items-start pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-400" />
                  Task Logs: <span className="font-mono text-blue-400">{selectedTask.task_id}</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-1">{selectedTask.command}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchLogs(selectedTask.task_id)}
                  className="p-1.5 hover:bg-border rounded text-gray-400 hover:text-white"
                  title="Reload Logs"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-3 py-1 bg-border hover:bg-gray-700 text-xs rounded text-gray-300"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 my-4 bg-[#090b10] border border-border rounded-lg p-4 font-mono text-xs text-gray-300 overflow-y-auto whitespace-pre-wrap">
              {logContent || 'Log buffer is empty.'}
            </div>

            <div className="pt-3 border-t border-border flex justify-between items-center text-xs text-gray-500">
              <span>Status: <strong className="text-gray-300">{selectedTask.status}</strong></span>
              {selectedTask.status === 'RUNNING' && (
                <button
                  onClick={() => handleKill(selectedTask.task_id)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-4 py-1.5 rounded transition font-medium"
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
