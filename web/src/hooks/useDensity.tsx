import React, { createContext, useContext, useState, useEffect } from 'react';
import { playClack } from '../utils/audio';

export type DensityMode = 'spacious' | 'compact';

interface DensityContextType {
  density: DensityMode;
  toggleDensity: () => void;
  setDensity: (mode: DensityMode) => void;
}

const DensityContext = createContext<DensityContextType>({
  density: 'spacious',
  toggleDensity: () => {},
  setDensity: () => {},
});

export const DensityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [density, setDensityState] = useState<DensityMode>(() => {
    try {
      const saved = localStorage.getItem('bento_density');
      return saved === 'compact' ? 'compact' : 'spacious';
    } catch {
      return 'spacious';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bento_density', density);
    } catch {}
  }, [density]);

  const setDensity = (mode: DensityMode) => {
    setDensityState(mode);
    try {
      localStorage.setItem('bento_density', mode);
    } catch {}
  };

  const toggleDensity = () => {
    playClack();
    setDensity(density === 'spacious' ? 'compact' : 'spacious');
  };

  return (
    <DensityContext.Provider value={{ density, toggleDensity, setDensity }}>
      <div data-density={density} className={density === 'compact' ? 'bento-compact' : ''}>
        {children}
      </div>
    </DensityContext.Provider>
  );
};

export const useDensity = () => useContext(DensityContext);
