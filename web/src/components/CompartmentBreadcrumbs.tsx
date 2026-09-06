import React from 'react';
import { ChevronRight, LayoutGrid, ListFilter } from 'lucide-react';
import { useDensity } from '../hooks/useDensity';
import { BentoBoxIcon } from './icons/BentoIcons';

interface BreadcrumbsProps {
  activeTab: 'daemons' | 'memory' | 'traces' | 'benchmarks' | 'arena';
  subResource?: string | null;
  onClearSubResource?: () => void;
}

const TAB_LABELS: Record<string, { label: string; icon: string }> = {
  daemons: { label: 'Kitchen Chefs', icon: '🍳' },
  memory: { label: 'Seasoned Recipes', icon: '🍙' },
  traces: { label: 'Night Dream & Tea', icon: '🍵' },
  benchmarks: { label: 'Tasting Battery', icon: '🥢' },
  arena: { label: 'Arena Sparring', icon: '⚔️' },
};

export const CompartmentBreadcrumbs: React.FC<BreadcrumbsProps> = ({
  activeTab,
  subResource,
  onClearSubResource,
}) => {
  const { density, toggleDensity } = useDensity();
  const current = TAB_LABELS[activeTab];

  return (
    <nav
      aria-label="Compartment Breadcrumbs"
      className="bg-[#15121b]/80 border-b border-bento-border/50 px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between text-xs font-mono backdrop-blur-xs gap-2 min-w-0 overflow-hidden"
    >
      <div className="flex items-center gap-1.5 text-zinc-400 truncate min-w-0">
        <span className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition select-none shrink-0">
          <BentoBoxIcon className="w-3.5 h-3.5" /> Bento
        </span>
        <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
        <span className="text-zinc-300 font-bold flex items-center gap-1 shrink-0">
          <span>{current.icon}</span>
          <span className="hidden xs:inline">{current.label}</span>
        </span>
        {subResource && (
          <>
            <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
            <button
              type="button"
              onClick={onClearSubResource}
              className="text-amber-400 font-bold hover:underline truncate max-w-[110px] sm:max-w-[200px]"
              title={`Active Resource: ${subResource} (Click to reset)`}
            >
              {subResource}
            </button>
          </>
        )}
      </div>

      {/* Density Layout Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={toggleDensity}
          aria-label={`Current layout: ${density}. Press d to toggle density.`}
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-bento-surface hover:bg-bento-elevated border border-bento-border/80 text-[11px] font-mono text-zinc-300 hover:text-white transition shadow-xs"
          title="Toggle Density Layout (Hotkey: d)"
        >
          {density === 'spacious' ? (
            <>
              <LayoutGrid className="w-3 h-3 text-bento-tamago" />
              <span>Spacious 🍱</span>
            </>
          ) : (
            <>
              <ListFilter className="w-3 h-3 text-bento-matcha" />
              <span>Compact 🍣</span>
            </>
          )}
          <kbd className="hidden sm:inline-block bg-white/10 px-1 rounded text-[9px] text-zinc-400">d</kbd>
        </button>
      </div>
    </nav>
  );
};
