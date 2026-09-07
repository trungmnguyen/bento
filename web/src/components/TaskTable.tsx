import React, { useState, useMemo, useCallback } from 'react';
import {
  RefreshCw, CheckCircle2, XCircle, Trash2, Search,
  RotateCcw, Filter, X, Star, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { BentoBoxIcon } from './icons/BentoIcons';
import { BackgroundTask } from '../types';
import { playClack } from '../utils/audio';
import { CopyButton } from './CopyButton';
import { SimmerWaveform } from './telemetry/SimmerWaveform';
import { LiveDurationTicker } from './telemetry/LiveDurationTicker';
import { useLocalStorage } from '../hooks/useLocalStorage';

type SortField = 'status' | 'duration_sec' | 'start_time' | null;
type SortDir = 'asc' | 'desc';
type StatusFilter = 'ALL' | 'RUNNING' | 'COMPLETED' | 'FAILED';

const formatRelativeTime = (isoString?: string | null): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (isNaN(diffSec) || diffSec < 0) return '';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
};

interface TaskTableProps {
  tasks: BackgroundTask[];
  onRefresh: () => void;
  onSelectTask: (task: BackgroundTask) => void;
  onKill: (taskId: string) => void;
  onKillBatch?: (taskIds: string[]) => void;
  onRecook: (cmd: string, tag: string) => void;
  onPrune: (pinnedTaskIds: Set<string>) => void;
  isPruning: boolean;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks, onRefresh, onSelectTask, onKill, onKillBatch, onRecook, onPrune, isPruning,
}) => {
  const [tableSearch, setTableSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useLocalStorage<string[]>('bento_pinned_tasks', []);
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const availableTags = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.tag).filter(Boolean))),
    [tasks]
  );

  // Historical average runtime for matching command or tag
  const historicalAverages = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const t of tasks) {
      if (t.status === 'COMPLETED' && t.duration_sec > 0) {
        if (t.command) {
          const prevCmd = map.get(t.command) || { total: 0, count: 0 };
          prevCmd.total += t.duration_sec;
          prevCmd.count += 1;
          map.set(t.command, prevCmd);
        }
        if (t.tag) {
          const tagKey = `#${t.tag}`;
          const prevTag = map.get(tagKey) || { total: 0, count: 0 };
          prevTag.total += t.duration_sec;
          prevTag.count += 1;
          map.set(tagKey, prevTag);
        }
      }
    }
    return map;
  }, [tasks]);

  const togglePin = useCallback((taskId: string) => {
    playClack();
    setPinnedIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  }, [setPinnedIds]);

  const toggleSelect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === tasks.length ? new Set() : new Set(tasks.map((t) => t.task_id))
    );
  }, [tasks]);

  const handleBulkKill = () => {
    playClack();
    const runningIds = Array.from(selectedIds).filter((id) => {
      const task = tasks.find((t) => t.task_id === id);
      return task?.status === 'RUNNING';
    });
    if (runningIds.length > 0) {
      if (onKillBatch) {
        onKillBatch(runningIds);
      } else {
        runningIds.forEach((id) => onKill(id));
      }
    }
    setSelectedIds(new Set());
  };

  const handleSort = (field: SortField) => {
    playClack();
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-gray-500 inline ml-1" aria-hidden="true" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-bento-tamago inline ml-1" aria-hidden="true" />
      : <ChevronDown className="w-3 h-3 text-bento-tamago inline ml-1" aria-hidden="true" />;
  };

  const filteredAndSorted = useMemo(() => {
    let result = tasks;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'RUNNING') {
        result = result.filter((t) => t.status === 'RUNNING');
      } else if (statusFilter === 'COMPLETED') {
        result = result.filter((t) => t.status === 'COMPLETED');
      } else if (statusFilter === 'FAILED') {
        result = result.filter((t) => t.status !== 'RUNNING' && t.status !== 'COMPLETED');
      }
    }
    if (selectedTag) {
      result = result.filter((t) => t.tag === selectedTag);
    }
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.task_id.toLowerCase().includes(q) ||
          t.tag.toLowerCase().includes(q) ||
          t.command.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q)
      );
    }
    if (sortField) {
      result = [...result].sort((a, b) => {
        let av: string | number = a[sortField] ?? '';
        let bv: string | number = b[sortField] ?? '';
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    // Pinned tasks always float to top
    const pinned = result.filter((t) => pinnedSet.has(t.task_id));
    const unpinned = result.filter((t) => !pinnedSet.has(t.task_id));
    return [...pinned, ...unpinned];
  }, [tasks, tableSearch, sortField, sortDir, pinnedSet]);

  const runningSelected = [...selectedIds].filter(
    (id) => tasks.find((t) => t.task_id === id)?.status === 'RUNNING'
  );

  return (
    <div className="bg-bento-surface border border-bento-border rounded-bento overflow-hidden shadow-bento-card">
      <div className="px-6 py-4 border-b border-bento-border flex flex-wrap justify-between items-center bg-bento-elevated gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <BentoBoxIcon className="w-5 h-5" aria-hidden="true" /> Kitchen Orders &amp; Daemons ({tasks.length})
          </h2>
          <SimmerWaveform activeCount={tasks.filter((t) => t.status === 'RUNNING').length} />
          {/* Table Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              id="daemon-table-search"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Filter orders..."
              aria-label="Filter kitchen orders"
              className="bg-bento-lacquer border border-bento-border rounded-lg pl-8 pr-7 py-1 text-xs text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-tamago/60 font-mono w-36 sm:w-48"
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => { playClack(); setTableSearch(''); }}
                aria-label="Clear order filter"
                className="absolute right-0 top-0 w-[44px] h-full flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBulkKill}
              disabled={runningSelected.length === 0}
              aria-label={`Terminate ${runningSelected.length} selected running tasks`}
              className="px-3 py-1.5 bg-bento-salmon/15 hover:bg-bento-salmon/25 text-bento-salmon border border-bento-salmon/40 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-40"
            >
              Kill Selected ({runningSelected.length})
            </button>
          )}
          <button
            onClick={() => onPrune(pinnedSet)}
            disabled={isPruning}
            aria-label="Sweep kitchen and prune finished tasks (pinned tasks are preserved)"
            className="px-3 py-1.5 bg-bento-lacquer hover:bg-bento-border border border-bento-border rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1.5 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-bento-tamago"
            title="Prune finished tasks (pinned tasks are preserved)"
          >
            <Trash2 className="w-3.5 h-3.5 text-bento-salmon" aria-hidden="true" />
            <span>{isPruning ? 'Sweeping...' : 'Sweep Kitchen 🧹'}</span>
          </button>
          <button
            onClick={() => { playClack(); onRefresh(); }}
            aria-label="Refresh kitchen orders"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bento-border rounded-xl text-gray-400 hover:text-white transition focus-visible:ring-2 focus-visible:ring-bento-tamago"
            title="Refresh kitchen orders"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Filters Bar: Status & Tags */}
      {tasks.length > 0 && (
        <div className="px-6 py-2.5 border-b border-bento-border/60 bg-bento-lacquer/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto" role="group" aria-label="Filter orders by status">
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mr-1 shrink-0">Status:</span>
            {(['ALL', 'RUNNING', 'COMPLETED', 'FAILED'] as StatusFilter[]).map((st) => {
              const count =
                st === 'ALL'
                  ? tasks.length
                  : st === 'RUNNING'
                  ? tasks.filter((t) => t.status === 'RUNNING').length
                  : st === 'COMPLETED'
                  ? tasks.filter((t) => t.status === 'COMPLETED').length
                  : tasks.filter((t) => t.status !== 'RUNNING' && t.status !== 'COMPLETED').length;
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => { playClack(); setStatusFilter(st); }}
                  aria-pressed={isSelected}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-bento-tamago/20 text-bento-tamago border border-bento-tamago/40 font-bold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>{st === 'ALL' ? 'All' : st === 'RUNNING' ? 'Simmering' : st === 'COMPLETED' ? 'Ready' : 'Failed'}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Tag Filters */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto" role="group" aria-label="Filter orders by tag">
              <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mr-1 shrink-0">Tags:</span>
              <button
                type="button"
                onClick={() => { playClack(); setSelectedTag(null); }}
                aria-pressed={selectedTag === null}
                className={`px-2 py-0.5 rounded-lg transition shrink-0 ${
                  selectedTag === null
                    ? 'bg-white/15 text-white border border-white/30 font-bold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                #all
              </button>
              {availableTags.map((tag) => {
                const count = tasks.filter((t) => t.tag === tag).length;
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => { playClack(); setSelectedTag(isSelected ? null : tag); }}
                    aria-pressed={isSelected}
                    className={`px-2 py-0.5 rounded-lg transition flex items-center gap-1 shrink-0 ${
                      isSelected
                        ? 'bg-bento-tamago/20 text-bento-tamago border border-bento-tamago/40 font-bold'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span>#{tag}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyKitchen onSelectPantry={(cmd, tag) => { onRecook(cmd, tag); }} />
      ) : filteredAndSorted.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-50 text-gray-400" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-300">
            No orders found matching the active filters
            {tableSearch ? ` (Search: "${tableSearch}")` : ''}
            {statusFilter !== 'ALL' ? ` (Status: ${statusFilter})` : ''}
            {selectedTag ? ` (Tag: #${selectedTag})` : ''}
          </p>
          <button
            type="button"
            onClick={() => {
              playClack();
              setTableSearch('');
              setStatusFilter('ALL');
              setSelectedTag(null);
            }}
            className="mt-3 px-3 py-1.5 bg-bento-lacquer hover:bg-bento-border border border-bento-border rounded-xl text-xs text-gray-300 hover:text-white font-mono transition focus-visible:ring-2 focus-visible:ring-bento-tamago"
          >
            Reset All Filters
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
            <thead className="text-xs uppercase bg-[#1e1a25]/95 backdrop-blur-md text-gray-300 border-b border-border sticky top-0 z-20">
              <tr>
                <th scope="col" className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all tasks"
                    checked={selectedIds.size === tasks.length && tasks.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-bento-border bg-bento-lacquer accent-bento-tamago cursor-pointer"
                  />
                </th>
                <th scope="col" className="px-2 py-3 w-8 font-medium">Pin</th>
                <th scope="col" className="px-6 py-3 font-medium">Task ID / Tag</th>
                <th scope="col" className="px-6 py-3 font-medium">PID</th>
                <th scope="col" className="px-6 py-3 font-medium">
                  <button type="button" onClick={() => handleSort('status')} className="flex items-center gap-0.5 hover:text-white transition focus-visible:ring-1 focus-visible:ring-bento-tamago rounded">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 font-medium">Command</th>
                <th scope="col" className="px-6 py-3 font-medium">
                  <button type="button" onClick={() => handleSort('duration_sec')} className="flex items-center gap-0.5 hover:text-white transition focus-visible:ring-1 focus-visible:ring-bento-tamago rounded">
                    Runtime <SortIcon field="duration_sec" />
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bento-border/70">
              {filteredAndSorted.map((task) => {
                const isRunning = task.status === 'RUNNING';
                const isPinned = pinnedSet.has(task.task_id);
                const isSelected = selectedIds.has(task.task_id);
                const statusLabel = isRunning ? 'Running' : task.status === 'COMPLETED' ? 'Completed' : 'Failed';

                return (
                  <tr
                    key={task.task_id}
                    className={`hover:bg-bento-elevated/70 transition ${isPinned ? 'bg-bento-tamago/5' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Select task ${task.task_id}`}
                        checked={isSelected}
                        onChange={() => toggleSelect(task.task_id)}
                        className="rounded border-bento-border bg-bento-lacquer accent-bento-tamago cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-4">
                      <button
                        type="button"
                        onClick={() => togglePin(task.task_id)}
                        aria-label={isPinned ? `Unpin task ${task.task_id}` : `Pin task ${task.task_id} to prevent sweep`}
                        aria-pressed={isPinned}
                        title={isPinned ? 'Pinned — will not be swept' : 'Pin to prevent sweep'}
                        className="p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-bento-border transition focus-visible:ring-2 focus-visible:ring-bento-tamago"
                      >
                        <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-bento-tamago text-bento-tamago' : 'text-gray-500'}`} aria-hidden="true" />
                      </button>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-bento-tamago">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => { playClack(); onSelectTask(task); }}
                          aria-label={`View logs for task ${task.task_id}, tagged ${task.tag}`}
                          className="text-left font-mono font-medium text-bento-tamago hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-salmon rounded px-1 -ml-1 transition"
                        >
                          {task.task_id}
                          <span className="block text-xs text-gray-400 font-sans mt-0.5 font-normal">#{task.tag}</span>
                        </button>
                        <CopyButton text={task.task_id} tooltip="Copy Task ID" iconOnly className="ml-1.5" />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-300 text-xs">{task.pid || '—'}</td>
                    <td className="px-6 py-4">
                      <span
                        aria-label={`Status: ${statusLabel}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          isRunning
                            ? 'bg-bento-tamago/15 text-bento-tamago border border-bento-tamago/30 shadow-sm'
                            : task.status === 'COMPLETED'
                            ? 'bg-bento-matcha/15 text-bento-matcha border border-bento-matcha/30'
                            : 'bg-bento-salmon/15 text-bento-salmon border border-bento-salmon/30'
                        }`}
                      >
                        {isRunning ? (
                          <><span aria-hidden="true" className="w-2 h-2 rounded-full bg-bento-tamago animate-ping motion-reduce:animate-none" />Sizzling</>
                        ) : task.status === 'COMPLETED' ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />Ready to Serve</>
                        ) : (
                          <><XCircle className="w-3.5 h-3.5" aria-hidden="true" />Burnt / Failed</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-200 max-w-xs" title={task.command}>
                      <div className="flex items-center gap-1.5 group">
                        <span className="truncate flex-1">{task.command}</span>
                        <CopyButton text={task.command} tooltip="Copy Command" iconOnly className="opacity-0 group-hover:opacity-100 transition shrink-0" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-300 font-mono">
                      {isRunning ? (
                        <div>
                          <LiveDurationTicker startTime={task.start_time} />
                          {(() => {
                            const avgData = historicalAverages.get(task.command) || (task.tag ? historicalAverages.get(`#${task.tag}`) : null);
                            if (avgData && avgData.count > 0) {
                              const avg = avgData.total / avgData.count;
                              return (
                                <span
                                  className="block text-[10px] text-gray-400 font-sans mt-0.5 tabular-nums"
                                  title={`Historical average duration across ${avgData.count} completed run(s)`}
                                >
                                  ~{avg.toFixed(1)}s avg ({avgData.count}x)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <div>
                          <span className="text-gray-200 font-semibold">{task.duration_sec.toFixed(1)}s</span>
                          {task.start_time && (
                            <span className="block text-[10px] text-gray-500 font-sans mt-0.5">
                              {formatRelativeTime(task.start_time)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {isRunning ? (
                        <button
                          onClick={() => { playClack(); onKill(task.task_id); }}
                          aria-label={`Terminate running task ${task.task_id}`}
                          className="text-xs bg-bento-salmon/15 hover:bg-bento-salmon/25 text-bento-salmon border border-bento-salmon/40 px-3 py-1.5 rounded-xl transition font-medium focus-visible:ring-2 focus-visible:ring-bento-salmon"
                        >
                          Remove Pot
                        </button>
                      ) : (
                        <button
                          onClick={() => { playClack(); onRecook(task.command, task.tag); }}
                          aria-label={`Load command from task ${task.task_id} into launch form`}
                          className="text-xs bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-1.5 rounded-xl transition font-medium inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-amber-400"
                          title="Load command to cook again"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" /> Re-cook
                        </button>
                      )}
                      <button
                        onClick={() => { playClack(); onSelectTask(task); }}
                        aria-label={`Open log viewer for task ${task.task_id}`}
                        className="text-xs bg-bento-elevated hover:bg-bento-border text-gray-200 px-3 py-1.5 rounded-xl border border-bento-border transition focus-visible:ring-2 focus-visible:ring-bento-tamago"
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
  );
};

const PANTRY_ITEMS = [
  { label: 'Suite Check', cmd: 'bento suite examples/', tag: 'suite-check' },
  { label: 'Run Triad Sprint', cmd: 'bento orchestra --rounds 1', tag: 'triad-sprint' },
  { label: 'AST Hygiene Audit', cmd: 'bento check', tag: 'ast-audit' },
  { label: 'Dream Harvest', cmd: 'bento dream --benchmarks examples/ --harvest', tag: 'dream-harvest' },
  { label: 'Memory Bank', cmd: 'bento memory list', tag: 'memory-list' },
];

const EmptyKitchen: React.FC<{ onSelectPantry: (cmd: string, tag: string) => void }> = ({ onSelectPantry }) => (
  <div className="p-10 text-center text-gray-400">
    <p className="text-sm font-medium text-gray-300">Kitchen stove is clear! No background tasks cooking.</p>
    <p className="text-xs text-gray-500 mt-1 font-mono">Quick cook from pantry:</p>
    <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
      {PANTRY_ITEMS.map((pantry) => (
        <button
          key={pantry.tag}
          type="button"
          onClick={() => { playClack(); onSelectPantry(pantry.cmd, pantry.tag); }}
          aria-label={`Load "${pantry.label}" command: ${pantry.cmd}`}
          className="px-2.5 py-1.5 bg-bento-lacquer hover:bg-bento-border border border-bento-border rounded-xl text-xs font-mono text-bento-tamago hover:text-white transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-bento-tamago"
        >
          <span aria-hidden="true">✨</span>
          <span>{pantry.label}</span>
        </button>
      ))}
    </div>
  </div>
);
