import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, BookOpen, FileCode, Play, Swords, Layers, X } from 'lucide-react';
import { MemoryLesson, Scenario, BackgroundTask } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: 'daemons' | 'memory' | 'traces' | 'benchmarks' | 'arena') => void;
  lessons: MemoryLesson[];
  scenarios: Scenario[];
  tasks: BackgroundTask[];
}

interface PaletteItem {
  id: string;
  category: 'action' | 'memory' | 'contract' | 'task';
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
          // Trigger open via parent
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

  // Build items list
  const allItems: PaletteItem[] = [
    // Navigation Actions
    {
      id: 'nav-daemons',
      category: 'action',
      title: 'Kitchen Chefs (Daemons & Background Tasks)',
      subtitle: 'Monitor active background runner processes and logs',
      badge: 'Navigate',
      icon: <Play className="w-4 h-4 text-emerald-400" />,
      onSelect: () => onSelectTab('daemons'),
    },
    {
      id: 'nav-memory',
      category: 'action',
      title: 'Seasoned Recipes (Institutional Memory)',
      subtitle: 'View architectural lessons and trading axioms',
      badge: 'Navigate',
      icon: <BookOpen className="w-4 h-4 text-amber-400" />,
      onSelect: () => onSelectTab('memory'),
    },
    {
      id: 'nav-traces',
      category: 'action',
      title: 'Sensory Spark (Execution Traces & Latency Radar)',
      subtitle: 'Analyze latency percentiles and execution events',
      badge: 'Navigate',
      icon: <Layers className="w-4 h-4 text-cyan-400" />,
      onSelect: () => onSelectTab('traces'),
    },
    {
      id: 'nav-benchmarks',
      category: 'action',
      title: 'Tasting Battery (Deterministic Scenarios)',
      subtitle: 'Run contract flights and craft new assertions',
      badge: 'Navigate',
      icon: <FileCode className="w-4 h-4 text-amber-500" />,
      onSelect: () => onSelectTab('benchmarks'),
    },
    {
      id: 'nav-arena',
      category: 'action',
      title: 'Arena Sparring (Head-to-Head Matches)',
      subtitle: 'Evaluate challenger vs defender scenario contracts',
      badge: 'Navigate',
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
      subtitle: s.description || `${s.steps.length} steps`,
      badge: 'Contract',
      icon: <FileCode className="w-4 h-4 text-blue-400" />,
      onSelect: () => onSelectTab('benchmarks'),
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

  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          item.badge.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-bento-card border border-bento-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-bento-border bg-bento-surface gap-3">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search memory axioms, contracts, tasks, or jump to tabs... (Cmd+K)"
            className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-1 p-2 divide-y divide-white/5">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              No matching items found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
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
                      item.category === 'action'
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
            <span>↵ Select</span>
            <span>Esc Close</span>
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
