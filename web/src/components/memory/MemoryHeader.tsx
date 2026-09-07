import React, { useRef, useEffect } from 'react';
import { Search, X, FileText, Plus, Network, Layers } from 'lucide-react';
import { OnigiriIcon } from '../icons/BentoIcons';
import { playClack } from '../../utils/audio';

interface MemoryHeaderProps {
  totalCount: number;
  viewMode: 'cards' | 'graph';
  onViewModeChange: (mode: 'cards' | 'graph') => void;
  onOpenExport: () => void;
  onOpenAdd: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const MemoryHeader: React.FC<MemoryHeaderProps> = ({
  totalCount,
  viewMode,
  onViewModeChange,
  onOpenExport,
  onOpenAdd,
  searchTerm,
  onSearchChange,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global hotkey Cmd+F / Ctrl+F to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="bg-bento-surface border border-bento-border rounded-bento p-4 sm:p-5 shadow-bento-card">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title and stats */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-bento-salmon/15 border border-bento-salmon/30 text-bento-salmon shadow-sm">
              <OnigiriIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <span>Chef&apos;s Recipe Book</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-bento-lacquer border border-bento-border text-bento-tamago">
                  {totalCount} Active Rules
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Carefully seasoned architectural axioms and negative guards protecting autonomous runs.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View mode segmented switch */}
          <div
            role="group"
            aria-label="Memory bank view mode"
            className="flex items-center bg-bento-lacquer p-1 rounded-xl border border-bento-border"
          >
            <button
              type="button"
              onClick={() => {
                playClack();
                onViewModeChange('cards');
              }}
              aria-pressed={viewMode === 'cards'}
              aria-label="Cards View"
              className={`px-3 py-1.5 min-h-[32px] rounded-lg text-xs font-bold transition flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-tamago ${
                viewMode === 'cards'
                  ? 'bg-bento-surface text-bento-salmon shadow-sm border border-bento-border/60'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playClack();
                onViewModeChange('graph');
              }}
              aria-pressed={viewMode === 'graph'}
              aria-label="Flavor Graph View"
              className={`px-3 py-1.5 min-h-[32px] rounded-lg text-xs font-bold transition flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-tamago ${
                viewMode === 'graph'
                  ? 'bg-bento-surface text-bento-matcha shadow-sm border border-bento-border/60'
                  : 'text-gray-400 hover:text-bento-matcha'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-bento-matcha" aria-hidden="true" />
              <span>Flavor Graph</span>
            </button>
          </div>

          {/* Export Rules Button */}
          <button
            type="button"
            onClick={() => {
              playClack();
              onOpenExport();
            }}
            aria-label="Export rules in AGENTS.md or JSON format"
            className="shrink-0 bg-bento-lacquer border border-bento-border hover:border-bento-matcha/60 text-gray-300 hover:text-white font-bold px-3 py-1.5 min-h-[36px] rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-tamago"
          >
            <FileText className="w-3.5 h-3.5 text-bento-matcha" aria-hidden="true" />
            <span>Export</span>
          </button>

          {/* Season Recipe Button */}
          <button
            type="button"
            onClick={() => {
              playClack();
              onOpenAdd();
            }}
            aria-label="Season new recipe axiom"
            className="shrink-0 bg-gradient-to-r from-bento-salmon to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold px-3.5 py-1.5 min-h-[36px] rounded-xl text-xs transition flex items-center gap-1.5 shadow-bento-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-salmon"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>+ Season Recipe</span>
          </button>

          {/* In-Memory Search input */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              id="memory-search-input"
              placeholder="Search recipes (⌘F)..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search recipes by title, rule, anti-pattern, or tag (press Cmd+F to focus)"
              className="w-full bg-bento-lacquer border border-bento-border rounded-xl pl-8 pr-8 py-1.5 text-xs text-bento-rice placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-salmon font-mono transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  playClack();
                  onSearchChange('');
                }}
                aria-label="Clear search input"
                className="absolute right-0 top-0 h-full w-8 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
