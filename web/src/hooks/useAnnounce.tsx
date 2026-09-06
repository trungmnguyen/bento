import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type AnnouncePoliteness = 'polite' | 'assertive';

interface AnnounceContextValue {
  announce: (message: string, politeness?: AnnouncePoliteness) => void;
}

const AnnounceContext = createContext<AnnounceContextValue | null>(null);

export const AnnounceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string, politeness: AnnouncePoliteness = 'polite') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (politeness === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }

    timeoutRef.current = setTimeout(() => {
      setPoliteMessage('');
      setAssertiveMessage('');
    }, 6000);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <AnnounceContext.Provider value={{ announce }}>
      {children}
      {/* Hidden ARIA Live Announcement Regions for Screen Readers */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        id="bento-live-polite"
      >
        {politeMessage}
      </div>
      <div
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        id="bento-live-assertive"
      >
        {assertiveMessage}
      </div>
    </AnnounceContext.Provider>
  );
};

export function useAnnounce() {
  const context = useContext(AnnounceContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    return (message: string, _politeness: AnnouncePoliteness = 'polite') => {
      // no-op fallback
      console.debug('[useAnnounce fallback]:', message);
    };
  }
  return context.announce;
}
