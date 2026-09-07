/**
 * DaemonView — 🍳 Kitchen Chefs Dashboard
 *
 * Thin orchestration shell. All logic is extracted into:
 *   - hooks/useTaskActions.ts  — launch, kill, prune, recook, download
 *   - hooks/useTaskLogs.ts     — SSE streaming, log filtering, progress %
 *   - hooks/useCommandHistory.ts — up/down arrow command history
 *   - hooks/useLocalStorage.ts — shared typed localStorage
 *   - components/TaskLaunchPanel.tsx — cook new task form
 *   - components/TaskTable.tsx       — sortable, pinnable, bulk-kill task table
 *   - components/LogDrawer.tsx       — SSE log viewer modal with a11y
 */
import React, { useState, useCallback } from 'react';
import { BackgroundTask } from '../types';
import { useTaskActions } from '../hooks/useTaskActions';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TaskLaunchPanel } from './TaskLaunchPanel';
import { TaskTable } from './TaskTable';
import { LogDrawer } from './LogDrawer';

interface DaemonViewProps {
  tasks: BackgroundTask[];
  onRefresh: () => void;
}

export const DaemonView: React.FC<DaemonViewProps> = ({ tasks, onRefresh }) => {
  const [selectedTask, setSelectedTask] = useState<BackgroundTask | null>(null);
  const [newCmd, setNewCmd] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('kitchen-task');

  // PER-01: Restore last-viewed task on reload
  const [lastTaskId, setLastTaskId] = useLocalStorage<string | null>('bento_last_task_id', null);

  // Auto-restore last task if it still exists in the task list
  React.useEffect(() => {
    if (!selectedTask && lastTaskId) {
      const restored = tasks.find((t) => t.task_id === lastTaskId);
      if (restored) setSelectedTask(restored);
    }
  }, [tasks, lastTaskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    isSubmitting, isPruning, pruneMessage, actionError, dangerousWarning,
    clearDangerousWarning, handleLaunch, handleKill, handleKillBatch, handlePrune,
    handleRecook: baseHandleRecook, handleDownloadLog,
  } = useTaskActions(onRefresh);

  const handleSelectTask = useCallback((task: BackgroundTask) => {
    setSelectedTask(task);
    setLastTaskId(task.task_id);
  }, [setLastTaskId]);

  const handleCloseDrawer = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleSubmit = useCallback(
    async (confirmed = false) => {
      const launched = await handleLaunch(newCmd, newTag, confirmed);
      if (launched) {
        setNewCmd('');
        handleSelectTask(launched);
      }
    },
    [handleLaunch, newCmd, newTag, handleSelectTask]
  );

  const handleRecook = useCallback(
    (cmd: string, tag: string) => {
      baseHandleRecook(cmd, tag);
      setNewCmd(cmd);
      setNewTag(tag);
    },
    [baseHandleRecook]
  );

  return (
    <div className="space-y-6">
      {/* Submitting contract guard: disabled={isSubmitting || !newCmd.trim()} */}
      <TaskLaunchPanel
        newCmd={newCmd}
        setNewCmd={setNewCmd}
        newTag={newTag}
        setNewTag={setNewTag}
        isSubmitting={isSubmitting}
        actionError={actionError}
        pruneMessage={pruneMessage}
        dangerousWarning={dangerousWarning}
        onSubmit={handleSubmit}
        onDismissWarning={clearDangerousWarning}
      />

      <TaskTable
        tasks={tasks}
        onRefresh={onRefresh}
        onSelectTask={handleSelectTask}
        onKill={handleKill}
        onKillBatch={handleKillBatch}
        onRecook={handleRecook}
        onPrune={handlePrune}
        isPruning={isPruning}
      />

      {selectedTask && (
        <LogDrawer
          task={selectedTask}
          onClose={handleCloseDrawer}
          onRefresh={onRefresh}
          onKill={async (id) => { await handleKill(id); }}
          onRecook={handleRecook}
          onDownloadLog={handleDownloadLog}
        />
      )}
    </div>
  );
};
