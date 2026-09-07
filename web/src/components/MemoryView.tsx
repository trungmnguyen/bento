import React, { useState, useEffect, useMemo } from 'react';
import { Share2, X } from 'lucide-react';
import { MemoryLesson, MemoryGraph, MemoryGraphNode } from '../types';
import { WasabiBadgeIcon } from './icons/BentoIcons';
import { useRecipeFavorites } from '../hooks/useRecipeFavorites';
import { useRecipeFilters } from '../hooks/useRecipeFilters';
import { MemoryHeader } from './memory/MemoryHeader';
import { CategoryPills } from './memory/CategoryPills';
import { TagFilterBar } from './memory/TagFilterBar';
import { RecipeCardGrid } from './memory/RecipeCardGrid';
import { AddRecipeModal } from './memory/AddRecipeModal';
import { ExportRulesModal } from './memory/ExportRulesModal';
import { FlavorGraphCanvas } from './memory/FlavorGraphCanvas';
import { FlavorGraphDrawer } from './memory/FlavorGraphDrawer';
import { apiFetch } from '../utils/api';
import { playClack } from '../utils/audio';

interface MemoryViewProps {
  lessons: MemoryLesson[];
  onRefresh?: () => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ lessons, onRefresh }) => {
  const [viewMode, setViewMode] = useState<'cards' | 'graph'>('cards');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Favorites
  const { favoriteIds, isFavorite, toggleFavorite, favoriteCount } = useRecipeFavorites();

  // Multi-faceted Filters
  const {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedTag,
    setSelectedTag,
    showOnlyFavorites,
    setShowOnlyFavorites,
    filteredLessons,
    categoryCounts,
    resetFilters,
  } = useRecipeFilters({ lessons, favoriteIds });

  // Flavor Graph State
  const [graphData, setGraphData] = useState<MemoryGraph | null>(null);
  const [selectedGraphNode, setSelectedGraphNode] = useState<MemoryGraphNode | null>(null);
  const [selectedGraphCategory, setSelectedGraphCategory] = useState<string | null>(null);

  const loadGraph = async () => {
    try {
      const res = await apiFetch('/api/memory/graph');
      if (res.ok) {
        const data: MemoryGraph = await res.json();
        setGraphData(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (viewMode === 'graph' && !graphData) {
      loadGraph();
    }
  }, [viewMode, graphData]);

  // Edges connected to selectedGraphNode
  const connectedEdges = useMemo(() => {
    if (!graphData || !selectedGraphNode) return [];
    return graphData.edges.filter(
      (e) => e.source === selectedGraphNode.id || e.target === selectedGraphNode.id
    );
  }, [graphData, selectedGraphNode]);

  const handleRecipeAdded = (title: string, lessonId?: string) => {
    setSuccessMsg(`🍙 Seasoned new recipe: "${title}" [${lessonId || ''}]`);
    if (onRefresh) onRefresh();
    if (graphData) loadGraph();
  };

  return (
    <div className="space-y-4 max-w-full">
      {/* Header Toolbar */}
      <MemoryHeader
        totalCount={lessons.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAdd={() => setIsAddOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-bento-nori border border-bento-salmon/50 rounded-xl p-3 text-xs text-rose-200 flex items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <WasabiBadgeIcon className="w-4 h-4 shrink-0 text-bento-salmon" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            aria-label="Dismiss success message"
            className="text-gray-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {/* Category Tabs */}
          <CategoryPills
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            showOnlyFavorites={showOnlyFavorites}
            onToggleFavorites={setShowOnlyFavorites}
            categoryCounts={categoryCounts}
            favoriteCount={favoriteCount}
          />

          {/* Atomized Tag Filter Bar */}
          <TagFilterBar
            lessons={
              selectedCategory && selectedCategory !== 'all'
                ? lessons.filter((l) => (l.category || '').toLowerCase() === selectedCategory)
                : lessons
            }
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
          />

          {/* Recipe Cards Grid */}
          <RecipeCardGrid
            filteredLessons={filteredLessons}
            totalLessonsCount={lessons.length}
            searchQuery={searchTerm}
            selectedCategory={selectedCategory}
            selectedTag={selectedTag}
            showOnlyFavorites={showOnlyFavorites}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onSelectTag={setSelectedTag}
            onResetFilters={resetFilters}
            onClearSearch={() => setSearchTerm('')}
            onClearCategory={() => setSelectedCategory(null)}
            onClearFavorites={() => setShowOnlyFavorites(false)}
          />
        </div>
      )}

      {/* FLAVOR GRAPH VIEW */}
      {viewMode === 'graph' && (
        <div className="space-y-4">
          {/* Legend and Category chips */}
          <div className="bg-bento-surface border border-bento-border rounded-bento p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs max-w-full overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 max-w-full">
              <span className="text-gray-400 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0">
                <Share2 className="w-3.5 h-3.5 text-bento-matcha shrink-0" aria-hidden="true" /> Legend:
              </span>
              <span className="flex items-center gap-1.5 font-mono text-gray-300 whitespace-nowrap shrink-0">
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-tamago-glow shrink-0 inline-block" />
                Category Hub
              </span>
              <span className="flex items-center gap-1.5 font-mono text-gray-300 whitespace-nowrap shrink-0">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0 inline-block" />
                Golden Axiom
              </span>
              <span className="flex items-center gap-1.5 font-mono text-gray-300 whitespace-nowrap shrink-0">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-bento-glow shrink-0 inline-block" />
                Anti-Pattern Satellite
              </span>
            </div>

            {graphData && (
              <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedGraphCategory(null)}
                  aria-pressed={selectedGraphCategory === null}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                    selectedGraphCategory === null
                      ? 'bg-bento-salmon text-gray-950 font-extrabold shadow-bento-glow'
                      : 'bg-bento-lacquer text-gray-400 hover:text-white'
                  }`}
                >
                  All ({graphData.nodes.length})
                </button>
                {graphData.categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      playClack();
                      setSelectedGraphCategory(selectedGraphCategory === cat ? null : cat);
                    }}
                    aria-pressed={selectedGraphCategory === cat}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition whitespace-nowrap shrink-0 ${
                      selectedGraphCategory === cat
                        ? 'bg-bento-matcha text-gray-900 font-extrabold'
                        : 'bg-bento-lacquer text-gray-400 hover:text-bento-matcha'
                    }`}
                  >
                    #{cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Canvas & Inspector Drawer */}
          {graphData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <FlavorGraphCanvas
                  graphData={graphData}
                  selectedCategory={selectedGraphCategory}
                  selectedNode={selectedGraphNode}
                  onSelectNode={setSelectedGraphNode}
                />
              </div>
              <div className="lg:col-span-1">
                <FlavorGraphDrawer
                  selectedNode={selectedGraphNode}
                  onClose={() => setSelectedGraphNode(null)}
                  connectedEdges={connectedEdges}
                  onReturnToCards={() => setViewMode('cards')}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddRecipeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onRecipeAdded={handleRecipeAdded}
      />

      <ExportRulesModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        lessons={lessons}
      />
    </div>
  );
};
