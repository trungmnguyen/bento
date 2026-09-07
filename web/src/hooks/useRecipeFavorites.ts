import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { playClack } from '../utils/audio';

export function useRecipeFavorites() {
  const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>('bento_favorite_recipes', []);

  const isFavorite = useCallback(
    (recipeId: string): boolean => {
      return favoriteIds.includes(recipeId);
    },
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    (recipeId: string) => {
      playClack();
      setFavoriteIds((prev) =>
        prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
      );
    },
    [setFavoriteIds]
  );

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    favoriteCount: favoriteIds.length,
  };
}
