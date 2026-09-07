import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { MemoryLesson } from '../../types';
import { RecipeCard } from './RecipeCard';
import { playClack } from '../../utils/audio';

interface RecipeCardGridProps {
  filteredLessons: MemoryLesson[];
  totalLessonsCount: number;
  searchQuery: string;
  selectedCategory: string | null;
  selectedTag: string | null;
  showOnlyFavorites: boolean;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onSelectTag: (tag: string | null) => void;
  onResetFilters: () => void;
  onClearSearch: () => void;
  onClearCategory: () => void;
  onClearFavorites: () => void;
}

export const RecipeCardGrid: React.FC<RecipeCardGridProps> = ({
  filteredLessons,
  totalLessonsCount,
  searchQuery,
  selectedCategory,
  selectedTag,
  showOnlyFavorites,
  isFavorite,
  onToggleFavorite,
  onSelectTag,
  onResetFilters,
  onClearSearch,
  onClearCategory,
  onClearFavorites,
}) => {
  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedCategory || selectedTag || showOnlyFavorites
  );

  return (
    <div className="space-y-4">
      {/* Screen reader polite live region announcing count changes */}
      <div className="sr-only" aria-live="polite" role="status">
        {`Showing ${filteredLessons.length} of ${totalLessonsCount} seasoned recipes.`}
      </div>

      {/* Active Compound Filter HUD */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-bento-elevated/70 border border-bento-border rounded-xl text-xs font-mono">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-gray-400 font-semibold flex items-center gap-1 mr-1 text-[11px]">
              <Filter className="w-3 h-3 text-bento-tamago" aria-hidden="true" /> Active Filters:
            </span>

            {/* Category filter chip */}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bento-lacquer border border-bento-border text-gray-200">
                <span>Category: {selectedCategory}</span>
                <button
                  type="button"
                  onClick={onClearCategory}
                  aria-label={`Clear category filter ${selectedCategory}`}
                  className="hover:text-rose-400 p-0.5"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}

            {/* Tag filter chip */}
            {selectedTag && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bento-lacquer border border-bento-border text-gray-200">
                <span>Tag: #{selectedTag}</span>
                <button
                  type="button"
                  onClick={() => onSelectTag(null)}
                  aria-label={`Clear tag filter ${selectedTag}`}
                  className="hover:text-rose-400 p-0.5"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}

            {/* Search query chip */}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bento-lacquer border border-bento-border text-gray-200">
                <span>Search: &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={onClearSearch}
                  aria-label="Clear search filter"
                  className="hover:text-rose-400 p-0.5"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}

            {/* Starred favorites chip */}
            {showOnlyFavorites && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300">
                <span>Favorites Only</span>
                <button
                  type="button"
                  onClick={onClearFavorites}
                  aria-label="Clear favorites filter"
                  className="hover:text-amber-100 p-0.5"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">
              {filteredLessons.length} of {totalLessonsCount}
            </span>
            <button
              type="button"
              onClick={onResetFilters}
              aria-label="Reset all filters"
              className="px-2 py-1 rounded-lg bg-bento-lacquer hover:bg-bento-border text-gray-300 hover:text-white border border-bento-border transition flex items-center gap-1 text-[11px]"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Reset All</span>
            </button>
          </div>
        </div>
      )}

      {/* Recipe Cards Grid */}
      {filteredLessons.length > 0 ? (
        <div
          role="region"
          aria-label="Seasoned recipes collection"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {filteredLessons.map((lesson) => (
            <RecipeCard
              key={lesson.id}
              lesson={lesson}
              searchQuery={searchQuery}
              isFavorite={isFavorite(lesson.id)}
              onToggleFavorite={onToggleFavorite}
              onSelectTag={(t) => onSelectTag(t)}
            />
          ))}
        </div>
      ) : (
        /* Empty state diagnostics */
        <div className="p-12 text-center bg-bento-surface border border-bento-border rounded-bento text-gray-400">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-40 text-bento-salmon" aria-hidden="true" />
          <h4 className="text-base font-bold text-gray-200 mb-1">No recipes found matching filters</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto mb-4 font-mono">
            {searchQuery ? `Search: "${searchQuery}" ` : ''}
            {selectedCategory ? `Category: ${selectedCategory} ` : ''}
            {selectedTag ? `Tag: #${selectedTag} ` : ''}
            {showOnlyFavorites ? `(Starred only)` : ''}
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 bg-bento-lacquer hover:bg-bento-border border border-bento-border rounded-xl text-xs text-gray-200 hover:text-white font-mono transition focus-visible:ring-2 focus-visible:ring-bento-tamago"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
};
