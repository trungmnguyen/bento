import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Command,
  BookOpen,
  FileCode,
  Play,
  Swords,
  Layers,
  X,
  Trash2,
  Sparkles,
  Terminal,
  Volume2,
  Keyboard,
  RotateCw,
} from 'lucide-react';
import { MemoryLesson, Scenario, BackgroundTask } from '../types';
import { playClack, playTastePass, playTasteFail, playZenBell } from '../utils/audio';
import { showToast } from './Toast';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: 'daemons' | 'memory' | 'traces' | 'benchmarks' | 'arena') => void;
  lessons: MemoryLesson[];
  scenarios: Scenario[];
  tasks: BackgroundTask[];
  onOpenQuickRunner?: (name?: string) => void;
  onOpenShortcuts?: () => void;
  onOpenAudioSettings?: () => void;
  onRefreshAll?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'direct-action' | 'navigation' | 'memory' | 'contract' | 'task';
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  lessons,
  scenarios,
  tasks,
  onOpenQuickRunner,
  onOpenShortcuts,
  onOpenAudioSettings,
  onRefreshAll,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          const event = new CustomEvent('toggle-omni-palette');
          window.dispatchEvent(event);
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Action Mode Handlers
  const handleSweepKitchen = async () => {
    playClack();
    try {
      const res = await fetch('/api/bg/prune', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        playTastePass();
        showToast({
          title: 'Kitchen Swept 🧹',
          message: `Cleaned ${data.pruned_tasks_count || 0} finished task(s).`,
          type: 'success',
        });
        if (onRefreshAll) onRefreshAll();
      }
    } catch {
      showToast({ title: 'Sweep Failed', message: 'Could not contact daemon.', type: 'error' });
    }
  };

  const handleTasteSuite = async () => {
    playClack();
    showToast({
      title: 'Tasting Suite Triggered',
      message: 'Executing all benchmark scenarios...',
      type: 'info',
    });
    try {
      const res = await fetch('/api/benchmarks/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (data.all_passed) {
          playTastePass();
          showToast({
            title: 'Tasting Suite Passed',
            message: `${data.passed_scenarios}/${data.total_scenarios} passed in ${data.total_duration_ms}ms`,
            type: 'success',
          });
        } else {
          playTasteFail();
          showToast({
            title: 'Tasting Suite Issues',
            message: `${data.passed_scenarios}/${data.total_scenarios} passed. Some assertions failed.`,
            type: 'warning',
          });
        }
        if (onRefreshAll) onRefreshAll();
      }
    } catch {
      showToast({ title: 'Run Failed', message: 'Failed to execute suite.', type: 'error' });
    }
  };

  const handleBrewDream = async () => {
    playClack();
    showToast({
      title: 'Steeping Overnight Dream...',
      message: 'Harvesting historical execution traces into memory...',
      type: 'info',
    });
    try {
      const res = await fetch('/api/dream', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        playZenBell();
        showToast({
          title: '🍵 Dream Tea Brewed',
          message: `Consolidated ${data.consolidated_lessons_count || 0} lessons and discovered ${data.new_lessons_discovered || 0} recipes.`,
          type: 'success',
        });
        if (onRefreshAll) onRefreshAll();
      }
    } catch {
      showToast({ title: 'Dream Failed', message: 'Failed to run dream cycle.', type: 'error' });
    }
  };

  const isDirectActionMode = query.trim().startsWith('>');
  const cleanQuery = query.trim().replace(/^>\s*/, '');

  // Direct Execution Actions
  const directActions: PaletteItem[] = [
    {
      id: 'act-taste-suite',
      category: 'direct-action',
      title: '> Taste All Flights (Run Suite)',
      subtitle: 'Execute full benchmark battery against current codebase',
      badge: 'Execute',
      icon: <Play className="w-4 h-4 text-emerald-400" />,
      onSelect: handleTasteSuite,
    },
    {
      id: 'act-sweep',
      category: 'direct-action',
      title: '> Sweep Kitchen (Prune Dead Daemons)',
      subtitle: 'Clean stopped tasks and temporary logs from the stove',
      badge: 'Execute',
      icon: <Trash2 className="w-4 h-4 text-rose-400" />,
      onSelect: handleSweepKitchen,
    },
    {
      id: 'act-dream',
      category: 'direct-action',
      title: '> Brew Overnight Dream (Consolidate Memory)',
      subtitle: 'Distill execution traces into golden architectural lessons',
      badge: 'Execute',
      icon: <Sparkles className="w-4 h-4 text-bento-matcha" />,
      onSelect: handleBrewDream,
    },
    {
      id: 'act-quick-taste',
      category: 'direct-action',
      title: '> Instant Taste Flight Runner',
      subtitle: 'Open the single-scenario execution modal with assertion diffs',
      badge: 'Modal',
      icon: <Terminal className="w-4 h-4 text-amber-300" />,
      onSelect: () => {
        if (onOpenQuickRunner) onOpenQuickRunner();
      },
    },
    {
      id: 'act-audio',
      category: 'direct-action',
      title: '> Configure Audio Feedback Studio',
      subtitle: 'Adjust sound packs (Zen, Mechanical, Cyberpunk) & volume',
      badge: 'Settings',
      icon: <Volume2 className="w-4 h-4 text-cyan-300" />,
      onSelect: () => {
        if (onOpenAudioSettings) onOpenAudioSettings();
      },
    },
    {
      id: 'act-shortcuts',
      category: 'direct-action',
      title: '> Open Keyboard Shortcuts Cheatsheet',
      subtitle: 'View all Vim-spiced global navigation hotkeys',
      badge: 'Help',
      icon: <Keyboard className="w-4 h-4 text-purple-300" />,
      onSelect: () => {
        if (onOpenShortcuts) onOpenShortcuts();
      },
    },
  ];

  // Standard Navigation & Content Items
  const standardItems: PaletteItem[] = [
    // Navigation
    {
      id: 'nav-daemons',
      category: 'navigation',
      title: 'Kitchen Chefs (Daemons & Background Tasks)',
      subtitle: 'Monitor active background runner processes and logs',
      badge: 'Tab 1',
      icon: <Play className="w-4 h-4 text-emerald-400" />,
      onSelect: () => onSelectTab('daemons'),
    },
    {
      id: 'nav-memory',
      category: 'navigation',
      title: 'Seasoned Recipes (Institutional Memory)',
      subtitle: 'View architectural lessons and trading axioms',
      badge: 'Tab 2',
      icon: <BookOpen className="w-4 h-4 text-amber-400" />,
      onSelect: () => onSelectTab('memory'),
    },
    {
      id: 'nav-traces',
      category: 'navigation',
      title: 'Sensory Spark (Execution Traces & Latency Radar)',
      subtitle: 'Analyze latency percentiles and execution events',
      badge: 'Tab 3',
      icon: <Layers className="w-4 h-4 text-cyan-400" />,
      onSelect: () => onSelectTab('traces'),
    },
    {
      id: 'nav-benchmarks',
      category: 'navigation',
      title: 'Tasting Battery (Deterministic Scenarios)',
      subtitle: 'Run contract flights and craft new assertions',
      badge: 'Tab 4',
      icon: <FileCode className="w-4 h-4 text-amber-500" />,
      onSelect: () => onSelectTab('benchmarks'),
    },
    {
      id: 'nav-arena',
      category: 'navigation',
      title: 'Arena Sparring (Head-to-Head Matches)',
      subtitle: 'Evaluate challenger vs defender scenario contracts',
      badge: 'Tab 5',
      icon: <Swords className="w-4 h-4 text-rose-400" />,
      onSelect: () => onSelectTab('arena'),
    },
    // Memory Axioms
    ...lessons.map((l) => ({
      id: `mem-${l.id}`,
      category: 'memory' as const,
      title: l.title,
      subtitle: l.rule,
      badge: l.category,
      icon: <BookOpen className="w-4 h-4 text-amber-400" />,
      onSelect: () => onSelectTab('memory'),
    })),
    // Contracts
    ...scenarios.map((s) => ({
      id: `scen-${s.name}`,
      category: 'contract' as const,
      title: s.name,
      subtitle: s.description || `${s.steps?.length || 0} steps`,
      badge: 'Contract',
      icon: <FileCode className="w-4 h-4 text-blue-400" />,
      onSelect: () => {
        if (onOpenQuickRunner) onOpenQuickRunner(s.name);
        else onSelectTab('benchmarks');
      },
    })),
    // Background Tasks
    ...tasks.map((t) => ({
      id: `task-${t.task_id}`,
      category: 'task' as const,
      title: `Task ${t.task_id} (${t.tag})`,
      subtitle: t.command,
      badge: t.status,
      icon: <Play className="w-4 h-4 text-purple-400" />,
      onSelect: () => onSelectTab('daemons'),
    })),
  ];

  // Filtering
  const displayedItems = useMemo(() => {
    if (isDirectActionMode) {
      if (!cleanQuery) return directActions;
      const q = cleanQuery.toLowerCase();
      return directActions.filter(
        (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
      );
    }

    const all = [...directActions, ...standardItems];
    if (!query.trim()) return all;

    const q = query.toLowerCase();
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q)
    );
  }, [isDirectActionMode, cleanQuery, query, directActions, standardItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, displayedItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + displayedItems.length) % Math.max(1, displayedItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayedItems[selectedIndex]) {
        playClack();
        displayedItems[selectedIndex].onSelect();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClack();
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="OmniCommand Palette"
        className="w-full max-w-2xl bg-bento-card border border-bento-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-bento-border bg-bento-surface gap-3">
          {isDirectActionMode ? (
            <Terminal className="w-5 h-5 text-bento-matcha shrink-0 animate-pulse" />
          ) : (
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-autocomplete="list"
            aria-activedescendant={displayedItems[selectedIndex] ? displayedItems[selectedIndex].id : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder='Type ">" for action mode, or search recipes, contracts, and tabs... (Cmd+K)'
            className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none font-sans"
          />
          {isDirectActionMode && (
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-bento-matcha/20 text-bento-matcha border border-bento-matcha/30 shrink-0">
              Action Mode
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              playClack();
              onClose();
            }}
            aria-label="Close command palette"
            className="p-1 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div
          id="command-palette-results"
          role="listbox"
          aria-label="Command palette options"
          className="overflow-y-auto flex-1 p-2 divide-y divide-white/5"
        >
          {displayedItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              No matching items found for "{query}".
            </div>
          ) : (
            displayedItems.map((item: PaletteItem, idx: number) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  id={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    playClack();
                    item.onSelect();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3.5 py-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-white/5 shrink-0">{item.icon}</div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-200 truncate">{item.title}</div>
                      <div className="text-[11px] text-gray-400 truncate mt-0.5">{item.subtitle}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                      item.category === 'direct-action'
                        ? 'bg-bento-matcha/20 text-bento-matcha border border-bento-matcha/30'
                        : item.category === 'navigation'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : item.category === 'memory'
                        ? 'bg-amber-500/20 text-amber-300'
                        : item.category === 'contract'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2 bg-bento-surface/50 border-t border-bento-border text-[11px] text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select / Run</span>
            <span>Esc Close</span>
            <span className="text-amber-400 font-mono">&gt; Action Mode</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
};
