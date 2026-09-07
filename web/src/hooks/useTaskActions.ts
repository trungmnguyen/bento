import { useState, useCallback } from 'react';
import { BackgroundTask } from '../types';
import { apiFetch } from '../utils/api';
import { playClack, playTastePass, playTasteFail } from '../utils/audio';
import { showToast } from '../components/Toast';

// SEC-01 (Frontend, defense-in-depth): Warn before submitting dangerous patterns.
// The backend also enforces this list; this is a UX safety gate.
const DANGEROUS_PATTERN = /\brm\s+-[rf]{1,2}f?\b|\bmkfs\b|\bdd\s+if=|\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|:\(\)\s*\{/i;

export interface UseTaskActionsReturn {
  isSubmitting: boolean;
  isPruning: boolean;
  pruneMessage: string | null;
  actionError: string | null;
  dangerousWarning: string | null;
  clearDangerousWarning: () => void;
  handleLaunch: (cmd: string, tag: string, confirmed?: boolean) => Promise<BackgroundTask | null>;
  handleKill: (taskId: string) => Promise<void>;
  handleKillBatch: (taskIds: string[]) => Promise<void>;
  handlePrune: (pinnedTaskIds?: Set<string>) => Promise<void>;
  handleRecook: (cmd: string, tag: string) => void;
  handleDownloadLog: (task: BackgroundTask, logContent: string) => void;
  clearActionError: () => void;
}

export function useTaskActions(onRefresh: () => void): UseTaskActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [pruneMessage, setPruneMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dangerousWarning, setDangerousWarning] = useState<string | null>(null);

  const clearActionError = useCallback(() => setActionError(null), []);
  const clearDangerousWarning = useCallback(() => setDangerousWarning(null), []);

  const handleLaunch = useCallback(
    async (cmd: string, tag: string, confirmed = false): Promise<BackgroundTask | null> => {
      if (!cmd.trim()) return null;

      // SEC-01: Frontend safety gate — warn before submitting destructive commands
      if (!confirmed && DANGEROUS_PATTERN.test(cmd)) {
        setDangerousWarning(
          `⚠️ This command contains a potentially destructive pattern. Are you sure you want to run it unattended in the background?`
        );
        return null;
      }

      playClack();
      setIsSubmitting(true);
      setActionError(null);
      setPruneMessage(null);
      setDangerousWarning(null);

      try {
        const res = await apiFetch('/api/bg/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd, tag }),
        });
        const data = await res.json();
        if (res.ok && data.started) {
          playTastePass();
          showToast({
            title: 'Order Started Cooking',
            message: `Task ${data.task_id} (PID ${data.pid}) launched in background.`,
            type: 'success',
          });
          onRefresh();
          const newTask: BackgroundTask = {
            task_id: data.task_id,
            tag,
            command: cmd,
            pid: data.pid,
            status: 'RUNNING',
            start_time: new Date().toISOString(),
            duration_sec: 0,
            log_file: '',
            exit_code: null,
          };
          return newTask;
        } else {
          playTasteFail();
          setActionError(data.error || 'Failed to launch task.');
          return null;
        }
      } catch {
        playTasteFail();
        setActionError('Failed to launch task.');
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onRefresh]
  );

  const handleKill = useCallback(
    async (taskId: string): Promise<void> => {
      playClack();
      try {
        const res = await apiFetch(`/api/bg/${encodeURIComponent(taskId)}/kill`, { method: 'POST' });
        if (res.ok) {
          showToast({
            title: 'Task Terminated',
            message: `Process for ${taskId} removed from stove.`,
            type: 'info',
          });
          onRefresh();
        }
      } catch {
        setActionError('Failed to stop task.');
      }
    },
    [onRefresh]
  );

  const handleKillBatch = useCallback(
    async (taskIds: string[]): Promise<void> => {
      if (!taskIds.length) return;
      playClack();
      try {
        const res = await apiFetch('/api/bg/kill-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_ids: taskIds }),
        });
        const data = await res.json();
        if (res.ok) {
          const count = data.count || 0;
          showToast({
            title: 'Tasks Terminated',
            message: `${count} process(es) removed from stove.`,
            type: 'info',
          });
          onRefresh();
        } else {
          setActionError('Failed to terminate selected tasks.');
        }
      } catch {
        setActionError('Failed to terminate selected tasks.');
      }
    },
    [onRefresh]
  );

  const handlePrune = useCallback(
    async (pinnedTaskIds: Set<string> = new Set()): Promise<void> => {
      playClack();
      setIsPruning(true);
      setPruneMessage(null);
      setActionError(null);
      try {
        const res = await apiFetch('/api/bg/prune', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Send pinned IDs so the backend (if supported) can skip them;
          // client-side filtering is handled in TaskTable.
          body: JSON.stringify({ skip_task_ids: Array.from(pinnedTaskIds) }),
        });
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
      } catch {
        setActionError('Failed to sweep kitchen.');
      } finally {
        setIsPruning(false);
      }
    },
    [onRefresh]
  );

  const handleRecook = useCallback((cmd: string, tag: string): void => {
    playClack();
    showToast({
      title: 'Recipe Loaded to Stove',
      message: 'Command copied to launch bar. Click "Start Cooking" to launch.',
      type: 'info',
    });
    // Returns cmd+tag to caller to set form state
    // (caller pattern: setNewCmd(cmd); setNewTag(tag))
    void cmd; void tag;
  }, []);

  const handleDownloadLog = useCallback((task: BackgroundTask, logContent: string): void => {
    playClack();
    // SEC-BLOB: Sanitize script/html tags from log content before Blob creation
    // so that if the user opens (not saves) the blob URL, no script executes.
    const sanitized = logContent
      .replace(/<script[\s\S]*?<\/script>/gi, '[SCRIPT REMOVED]')
      .replace(/<\/?(html|body|head)[^>]*>/gi, '');
    const blob = new Blob([sanitized], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeId = task.task_id.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const safeTag = (task.tag || 'task').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const dateStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeId}-${safeTag}-${dateStamp}.txt`; // .txt forces browser to download, not render
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return {
    isSubmitting,
    isPruning,
    pruneMessage,
    actionError,
    dangerousWarning,
    clearDangerousWarning,
    handleLaunch,
    handleKill,
    handleKillBatch,
    handlePrune,
    handleRecook,
    handleDownloadLog,
    clearActionError,
  };
}
