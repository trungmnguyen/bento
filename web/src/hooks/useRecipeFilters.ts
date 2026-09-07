import { useState, useMemo, useCallback } from 'react';
import { MemoryLesson } from '../types';
import { normalizeTags } from '../utils/tagUtils';
import { playClack } from '../utils/audio';

export interface UseRecipeFiltersOptions {
  lessons: MemoryLesson[];
  favoriteIds: string[];
}

export function useRecipeFilters({ lessons, favoriteIds }: UseRecipeFiltersOptions) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Normalize category mapping (e.g. 'a11y' -> 'accessibility')
  const normalizeCategory = (cat?: string): string => {
    const lower = (cat || 'general').toLowerCase().trim();
    if (lower === 'a11y') return 'accessibility';
    return lower;
  };

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: lessons.length,
      architecture: 0,
      security: 0,
      accessibility: 0,
      quant: 0,
      web: 0,
      general: 0,
    };

    for (const l of lessons) {
      const cat = normalizeCategory(l.category);
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      } else {
        counts.general += 1;
      }
    }
    return counts;
  }, [lessons]);

  // Filter lessons
  const filteredLessons = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return lessons.filter((lesson) => {
      // 1. Favorites filter
      if (showOnlyFavorites && !favoriteIds.includes(lesson.id)) {
        return false;
      }

      // 2. Category filter
      if (selectedCategory && selectedCategory !== 'all') {
        const lessonCat = normalizeCategory(lesson.category);
        if (lessonCat !== selectedCategory) {
          return false;
        }
      }

      // 3. Tag filter (using normalized tags so compound tags match)
      if (selectedTag) {
        const atomized = normalizeTags(lesson.tags);
        if (!atomized.includes(selectedTag.toLowerCase())) {
          return false;
        }
      }

      // 4. Universal Search query (across title, rule, anti_pattern, context, id, tags)
      if (q) {
        const inTitle = lesson.title?.toLowerCase().includes(q) ?? false;
        const inRule = lesson.rule?.toLowerCase().includes(q) ?? false;
        const inAnti = lesson.anti_pattern?.toLowerCase().includes(q) ?? false;
        const inContext = lesson.context?.toLowerCase().includes(q) ?? false;
        const inId = lesson.id?.toLowerCase().includes(q) ?? false;
        const inTags = normalizeTags(lesson.tags).some((t) => t.includes(q));

        if (!inTitle && !inRule && !inAnti && !inContext && !inId && !inTags) {
          return false;
        }
      }

      return true;
    });
  }, [lessons, searchTerm, selectedCategory, selectedTag, showOnlyFavorites, favoriteIds]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    (selectedCategory && selectedCategory !== 'all') ||
    selectedTag ||
    showOnlyFavorites
  );

  const resetFilters = useCallback(() => {
    playClack();
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedTag(null);
    setShowOnlyFavorites(false);
  }, []);

  return {
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
    hasActiveFilters,
    resetFilters,
  };
}
