import React from 'react';
import { Star } from 'lucide-react';
import { playClack } from '../../utils/audio';

interface CategoryPillsProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  showOnlyFavorites: boolean;
  onToggleFavorites: (show: boolean) => void;
  categoryCounts: Record<string, number>;
  favoriteCount: number;
}

interface CategoryDef {
  id: string;
  label: string;
  emoji: string;
  countKey: string;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'all', label: 'All Recipes', emoji: '🍙', countKey: 'all' },
  { id: 'architecture', label: 'Architecture', emoji: '🏗️', countKey: 'architecture' },
  { id: 'security', label: 'Security', emoji: '🔒', countKey: 'security' },
  { id: 'accessibility', label: 'Accessibility', emoji: '♿', countKey: 'accessibility' },
  { id: 'quant', label: 'Quant & Trading', emoji: '📈', countKey: 'quant' },
  { id: 'web', label: 'Web & UI', emoji: '🎨', countKey: 'web' },
];

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
  showOnlyFavorites,
  onToggleFavorites,
  categoryCounts,
  favoriteCount,
}) => {
  const currentCategory = showOnlyFavorites ? 'favorites' : (selectedCategory || 'all');

  return (
    <div
      role="group"
      aria-label="Filter recipes by category"
      className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono"
    >
      {CATEGORIES.map((cat) => {
        const isActive = !showOnlyFavorites && currentCategory === cat.id;
        const count = categoryCounts[cat.countKey] || 0;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              playClack();
              onToggleFavorites(false);
              onSelectCategory(cat.id === 'all' ? null : cat.id);
            }}
            aria-pressed={isActive}
            aria-label={`${cat.label} (${count} recipes)`}
            className={`px-3 py-1.5 min-h-[36px] rounded-xl border font-medium whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-tamago ${
              isActive
                ? 'bg-bento-salmon text-gray-950 font-extrabold border-bento-salmon shadow-bento-glow'
                : 'bg-bento-surface border-bento-border text-gray-300 hover:text-white hover:border-gray-500'
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                isActive ? 'bg-black/20 text-gray-950' : 'bg-bento-lacquer text-gray-400'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}

      {/* Starred Favorites tab */}
      <button
        type="button"
        onClick={() => {
          playClack();
          onToggleFavorites(!showOnlyFavorites);
        }}
        aria-pressed={showOnlyFavorites}
        aria-label={`Starred recipes (${favoriteCount})`}
        className={`px-3 py-1.5 min-h-[36px] rounded-xl border font-medium whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-tamago ${
          showOnlyFavorites
            ? 'bg-amber-400 text-gray-950 font-extrabold border-amber-400 shadow-tamago-glow'
            : 'bg-bento-surface border-bento-border text-gray-300 hover:text-amber-300 hover:border-amber-400/40'
        }`}
      >
        <Star
          className={`w-3.5 h-3.5 ${
            showOnlyFavorites ? 'fill-gray-950 text-gray-950' : 'text-amber-400'
          }`}
          aria-hidden="true"
        />
        <span>Starred</span>
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
            showOnlyFavorites ? 'bg-black/20 text-gray-950' : 'bg-bento-lacquer text-gray-400'
          }`}
        >
          {favoriteCount}
        </span>
      </button>
    </div>
  );
};
