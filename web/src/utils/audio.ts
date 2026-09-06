// Bento Sensory Feedback - Web Audio API Synthesizers
// Pure mathematical synthesis: zero external audio assets or network requests.

export type SoundPack = 'zen' | 'mechanical' | 'cyberpunk';

export interface AudioCueDetail {
  id: string;
  name: string;
  icon: string;
  category: 'NAVIGATION' | 'SUCCESS' | 'FAILURE' | 'SYSTEM';
  description: string;
  musicalNote?: string;
  timestamp: number;
}

export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0 to 1
  pack: SoundPack;
  visualSubtitles: boolean;
}

const STORAGE_KEY = 'bento_audio_settings';

const DEFAULT_SETTINGS: AudioSettings = {
  enabled: true,
  volume: 0.7,
  pack: 'zen',
  visualSubtitles: true,
};

export function getAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_SETTINGS.volume,
      pack: ['zen', 'mechanical', 'cyberpunk'].includes(parsed.pack) ? parsed.pack : DEFAULT_SETTINGS.pack,
      visualSubtitles: typeof parsed.visualSubtitles === 'boolean' ? parsed.visualSubtitles : DEFAULT_SETTINGS.visualSubtitles,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAudioSettings(settings: Partial<AudioSettings>): AudioSettings {
  const current = getAudioSettings();
  const updated: AudioSettings = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('bento-audio-settings-changed', { detail: updated }));
    } catch {
      // ignore storage errors
    }
  }
  return updated;
}

export function dispatchAudioCue(cue: Omit<AudioCueDetail, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  const settings = getAudioSettings();
  if (!settings.visualSubtitles) return;

  const detail: AudioCueDetail = {
    ...cue,
    id: `cue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };
  window.dispatchEvent(new CustomEvent('bento-audio-cue', { detail }));
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a resonant Orin Singing Bowl Zen Bell chime.
 */
export function playZenBell(): void {
  const settings = getAudioSettings();
  if (!settings.enabled || settings.volume <= 0) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = settings.volume;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.35 * vol, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
    masterGain.connect(ctx.destination);

    // Fundamental Tone (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.connect(masterGain);

    // Subtle Harmonic Overtone (1760 Hz - A6)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.15 * vol, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.5);
    osc2.stop(now + 2.5);

    dispatchAudioCue({
      name: 'Zen Orin Bell',
      icon: '🔔',
      category: 'SYSTEM',
      description: 'System notification · Orin Singing Bowl chime',
      musicalNote: '880 Hz (A5) Fundamental + 1760 Hz Harmonic',
    });
  } catch {
    // Gracefully ignore audio errors
  }
}

/**
 * Plays a short, crisp wooden chopstick clack / keypress.
 */
export function playClack(): void {
  const settings = getAudioSettings();
  if (!settings.enabled || settings.volume <= 0) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = settings.volume;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (settings.pack === 'mechanical') {
      // Crisp mechanical click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);
      gain.gain.setValueAtTime(0.25 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    } else if (settings.pack === 'cyberpunk') {
      // Cyber blip
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain.gain.setValueAtTime(0.15 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    } else {
      // Zen wooden chopstick clack
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      gain.gain.setValueAtTime(0.2 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);

    dispatchAudioCue({
      name: settings.pack === 'mechanical' ? 'Mechanical Click' : settings.pack === 'cyberpunk' ? 'Cyber Blip' : 'Chopstick Clack',
      icon: '🥢',
      category: 'NAVIGATION',
      description: 'Tactile navigation engagement',
    });
  } catch {
    // Gracefully ignore audio errors
  }
}

/**
 * Plays taste flight success chime (emerald matcha harmony).
 */
export function playTastePass(): void {
  const settings = getAudioSettings();
  if (!settings.enabled || settings.volume <= 0) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = settings.volume;

    dispatchAudioCue({
      name: 'Matcha Harmony',
      icon: '🍵',
      category: 'SUCCESS',
      description: 'Scenario Contract Passed Ground-Truth Assertions',
      musicalNote: 'Arpeggio C5 → E5 → G5 Major Triad',
    });

    if (settings.pack === 'cyberpunk') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.3 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
      return;
    }

    // Two-tone arpeggio (C5 -> E5 -> G5)
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.25 * vol, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // Gracefully ignore audio errors
  }
}

/**
 * Plays taste flight failure chord (low somber tone).
 */
export function playTasteFail(): void {
  const settings = getAudioSettings();
  if (!settings.enabled || settings.volume <= 0) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = settings.volume;

    dispatchAudioCue({
      name: 'Wasabi Discord',
      icon: '🌶️',
      category: 'FAILURE',
      description: 'Assertion Failure Detected in Flight',
      musicalNote: 'Discordant Minor 2nd Descent F3 → E3',
    });

    // Discordant minor second descent (F3 -> E3)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(174.61, now);
    osc1.frequency.exponentialRampToValueAtTime(164.81, now + 0.3);

    gain1.gain.setValueAtTime(0.18 * vol, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.45);
  } catch {
    // Gracefully ignore audio errors
  }
}

/**
 * Plays background task finished chime.
 */
export function playTaskFinished(): void {
  playZenBell();
}
