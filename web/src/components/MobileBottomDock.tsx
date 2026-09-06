import React from 'react';
import { ChefHat, ScrollText, BookOpen, Utensils, Swords, Search } from 'lucide-react';
import { playShisoSnap } from '../utils/audio';

export type TabType = 'daemons' | 'memory' | 'traces' | 'benchmarks' | 'arena';

interface MobileBottomDockProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenPalette: () => void;
  runningTasksCount: number;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  activeTab,
  onSelectTab,
  onOpenPalette,
  runningTasksCount,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'daemons',
      label: 'Chefs',
      icon: <ChefHat className="w-4 h-4" />,
      badge: runningTasksCount > 0 ? runningTasksCount : undefined,
    },
    {
      id: 'traces',
      label: 'Traces',
      icon: <ScrollText className="w-4 h-4" />,
    },
    {
      id: 'memory',
      label: 'Recipes',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'benchmarks',
      label: 'Tasting',
      icon: <Utensils className="w-4 h-4" />,
    },
    {
      id: 'arena',
      label: 'Arena',
      icon: <Swords className="w-4 h-4" />,
    },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Mobile Navigation Dock"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#16131c]/95 backdrop-blur-md border-t border-bento-border/70 shadow-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 pt-1.5"
    >
      <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                playShisoSnap();
                onSelectTab(item.id);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition touch-manipulation relative ${
                isActive
                  ? 'text-white font-bold bg-white/5 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <span
                  className={`inline-block transition-transform duration-150 ${
                    isActive ? 'scale-110 text-bento-salmon' : ''
                  }`}
                >
                  {item.icon}
                </span>
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 bg-bento-tamago text-gray-950 font-mono text-[9px] font-extrabold rounded-full animate-pulse shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono tracking-tight truncate mt-0.5 max-w-full">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-bento-salmon mt-0.5 shadow-bento-glow" />
              )}
            </button>
          );
        })}

        {/* Quick Search Trigger */}
        <button
          type="button"
          onClick={() => {
            playShisoSnap();
            onOpenPalette();
          }}
          aria-label="Open Command Search Palette"
          className="flex-none flex flex-col items-center justify-center py-1 px-2 text-zinc-400 hover:text-bento-matcha transition touch-manipulation rounded-xl"
        >
          <Search className="w-4 h-4" />
          <span className="text-[10px] font-mono tracking-tight mt-0.5">Find</span>
        </button>
      </div>
    </nav>
  );
};
