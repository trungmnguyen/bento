import React, { useState, useEffect } from 'react';
import { AudioCueDetail, getAudioSettings } from '../utils/audio';

export const SoundCaptionHUD: React.FC = () => {
  const [activeCue, setActiveCue] = useState<AudioCueDetail | null>(null);
  const [visible, setVisible] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

  useEffect(() => {
    setCaptionsEnabled(getAudioSettings().visualSubtitles ?? true);

    const handleAudioCue = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const detail = customEvent?.detail;
      if (!detail || typeof detail !== 'object' || typeof detail.name !== 'string') return;
      setActiveCue({
        id: String(detail.id || `cue-${Date.now()}`),
        name: String(detail.name),
        icon: typeof detail.icon === 'string' ? detail.icon : '🥢',
        category: detail.category || 'SYSTEM',
        description: typeof detail.description === 'string' ? detail.description : '',
        musicalNote: typeof detail.musicalNote === 'string' ? detail.musicalNote : undefined,
        timestamp: Number(detail.timestamp) || Date.now(),
      });
      setVisible(true);
    };

    const handleAudioSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail?.visualSubtitles !== undefined) {
        setCaptionsEnabled(customEvent.detail.visualSubtitles);
      }
    };

    window.addEventListener('bento-audio-cue', handleAudioCue);
    window.addEventListener('bento-audio-settings-changed', handleAudioSettingsChange);

    return () => {
      window.removeEventListener('bento-audio-cue', handleAudioCue);
      window.removeEventListener('bento-audio-settings-changed', handleAudioSettingsChange);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, [visible, activeCue]);

  if (!captionsEnabled || !activeCue || !visible) return null;

  return (
    <aside
      aria-label="Soundpack Subtitles"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-16 md:bottom-12 left-4 z-40 pointer-events-none transition-all duration-300 ease-out max-w-[calc(100vw-2rem)]"
    >
      <div className="pointer-events-auto bg-[#181422]/95 border border-emerald-500/40 shadow-lg rounded-xl px-3.5 py-2 flex items-center gap-2.5 backdrop-blur-md text-xs font-mono max-w-sm">
        <span className="text-base shrink-0 animate-bounce" aria-hidden="true">{activeCue.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">{activeCue.name}</span>
            {activeCue.musicalNote && (
              <span className="text-[10px] text-zinc-400 bg-white/5 px-1 rounded border border-white/10 truncate">
                {activeCue.musicalNote}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-300 truncate mt-0.5">{activeCue.description}</p>
        </div>

        {/* Micro-equalizer animation */}
        <div className="flex items-end gap-0.5 h-3.5 px-1 shrink-0" aria-hidden="true">
          <span className="w-0.5 bg-emerald-400 rounded-full h-full animate-pulse" />
          <span className="w-0.5 bg-amber-400 rounded-full h-2 animate-pulse [animation-delay:150ms]" />
          <span className="w-0.5 bg-rose-400 rounded-full h-3 animate-pulse [animation-delay:300ms]" />
        </div>
      </div>
    </aside>
  );
};
