import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, X, Sparkles, Music, Subtitles } from 'lucide-react';
import {
  AudioSettings,
  SoundPack,
  getAudioSettings,
  saveAudioSettings,
  playClack,
  playZenBell,
  playTastePass,
  playTasteFail,
} from '../utils/audio';
import { useA11yModal } from '../hooks/useA11yModal';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AudioSettings>(getAudioSettings());
  const modalRef = useRef<HTMLDivElement>(null);

  const { modalProps } = useA11yModal({
    isOpen,
    onClose,
    containerRef: modalRef,
  });

  useEffect(() => {
    if (isOpen) {
      setSettings(getAudioSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleEnabled = () => {
    const updated = saveAudioSettings({ enabled: !settings.enabled });
    setSettings(updated);
    if (updated.enabled) {
      playClack();
    }
  };

  const handleToggleSubtitles = () => {
    const updated = saveAudioSettings({ visualSubtitles: !settings.visualSubtitles });
    setSettings(updated);
    playClack();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    const updated = saveAudioSettings({ volume: vol });
    setSettings(updated);
  };

  const handlePackChange = (pack: SoundPack) => {
    const updated = saveAudioSettings({ pack });
    setSettings(updated);
    playTastePass();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        {...modalProps}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bento-surface border border-bento-border rounded-bento shadow-2xl p-6 text-gray-100 relative focus:outline-none"
        aria-labelledby="audio-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-bento-border/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-bento-salmon/15 border border-bento-salmon/30 flex items-center justify-center text-bento-salmon">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 id="audio-modal-title" className="text-sm font-bold text-white flex items-center gap-1.5">
                Sensory Audio Studio
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-bento-matcha/20 text-bento-matcha border border-bento-matcha/30">
                  Web Audio
                </span>
              </h2>
              <p className="text-xs text-gray-400">Zero external sound assets · Mathematical synthesis</p>
            </div>
          </div>
          <button
            onClick={() => {
              playClack();
              onClose();
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Close audio settings dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Master Enable / Mute */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bento-elevated/60 border border-bento-border/70">
            <div className="flex items-center gap-2.5">
              {settings.enabled ? (
                <Volume2 className="w-5 h-5 text-bento-matcha" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <div className="text-xs font-bold text-white">Master Sound Feedback</div>
                <div className="text-[11px] text-gray-400">Tactile audio cues for tests and tasks</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleEnabled}
              aria-label={settings.enabled ? 'Mute sound feedback' : 'Enable sound feedback'}
              aria-pressed={settings.enabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                settings.enabled
                  ? 'bg-bento-matcha/20 text-bento-matcha border-bento-matcha/40 shadow-sm'
                  : 'bg-white/5 text-gray-400 border-white/10'
              }`}
            >
              {settings.enabled ? 'Enabled 🔔' : 'Muted 🔕'}
            </button>
          </div>

          {/* Visual Sound Subtitles (A11y Closed-Captions) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bento-elevated/60 border border-bento-border/70">
            <div className="flex items-center gap-2.5">
              <Subtitles className={`w-5 h-5 ${settings.visualSubtitles ? 'text-amber-400' : 'text-gray-400'}`} />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Visual Sound Subtitles
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 uppercase font-mono">
                    A11y
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">On-screen HUD subtitles for hearing accessibility</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSubtitles}
              aria-label={settings.visualSubtitles ? 'Disable visual sound subtitles' : 'Enable visual sound subtitles'}
              aria-pressed={settings.visualSubtitles}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                settings.visualSubtitles
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm'
                  : 'bg-white/5 text-gray-400 border-white/10'
              }`}
            >
              {settings.visualSubtitles ? 'Captions ON 💬' : 'Captions OFF'}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 font-medium">Output Volume</span>
              <span className="font-mono text-amber-300 font-bold">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={handleVolumeChange}
              disabled={!settings.enabled}
              aria-label="Audio feedback output volume"
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-bento-salmon disabled:opacity-40"
            />
          </div>

          {/* Sound Pack Selection */}
          <div className="space-y-2">
            <label id="soundpack-label" className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Sound Pack Flavor
            </label>
            <div
              role="radiogroup"
              aria-labelledby="soundpack-label"
              className="grid grid-cols-3 gap-2"
            >
              {[
                { id: 'zen' as SoundPack, name: 'Zen Garden', desc: 'Singing bowl' },
                { id: 'mechanical' as SoundPack, name: 'Mechanical', desc: 'Clicky switch' },
                { id: 'cyberpunk' as SoundPack, name: 'Cyber 808', desc: 'Digital synth' },
              ].map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  role="radio"
                  aria-checked={settings.pack === pack.id}
                  disabled={!settings.enabled}
                  onClick={() => handlePackChange(pack.id)}
                  className={`p-2.5 rounded-xl text-left border transition disabled:opacity-40 ${
                    settings.pack === pack.id
                      ? 'bg-bento-salmon/20 text-white border-bento-salmon shadow-bento-glow ring-1 ring-bento-salmon/30'
                      : 'bg-bento-elevated/40 text-gray-300 border-bento-border/70 hover:bg-white/5'
                  }`}
                >
                  <div className="text-xs font-bold">{pack.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{pack.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Test Soundboard */}
          <div className="p-3 rounded-xl bg-bento-elevated/40 border border-bento-border/50">
            <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">Test Soundboard</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!settings.enabled}
                onClick={playClack}
                className="px-2.5 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-gray-300 transition text-center disabled:opacity-40"
              >
                🥢 Tactile Clack
              </button>
              <button
                type="button"
                disabled={!settings.enabled}
                onClick={playZenBell}
                className="px-2.5 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-gray-300 transition text-center disabled:opacity-40"
              >
                🔔 Zen Orin Bell
              </button>
              <button
                type="button"
                disabled={!settings.enabled}
                onClick={playTastePass}
                className="px-2.5 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs text-emerald-300 transition text-center disabled:opacity-40"
              >
                🍵 Taste Passed
              </button>
              <button
                type="button"
                disabled={!settings.enabled}
                onClick={playTasteFail}
                className="px-2.5 py-1.5 rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-xs text-rose-300 transition text-center disabled:opacity-40"
              >
                🌶️ Taste Failed
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-bento-border/70 flex justify-end">
          <button
            type="button"
            onClick={() => {
              playClack();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-bento-salmon text-white text-xs font-bold hover:bg-rose-600 transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
