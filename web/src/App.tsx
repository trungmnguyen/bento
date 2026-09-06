import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  FolderGit2,
  Sparkles,
  Swords,
  Search,
  Volume2,
  VolumeX,
  Keyboard,
  Activity,
  Play,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import {
  BentoBoxIcon,
  OnigiriIcon,
  ChefTamagoIcon,
  MatchaCupIcon,
  ChopsticksIcon,
} from './components/icons/BentoIcons';
import { DaemonView } from './components/DaemonView';
import { MemoryView } from './components/MemoryView';
import { TracesView } from './components/TracesView';
import { BenchmarksView } from './components/BenchmarksView';
import { ArenaView } from './components/ArenaView';
import { CommandPalette } from './components/CommandPalette';
import { ToastContainer, showToast } from './components/Toast';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { QuickRunnerModal } from './components/QuickRunnerModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { SoundCaptionHUD } from './components/SoundCaptionHUD';
import { CompartmentBreadcrumbs } from './components/CompartmentBreadcrumbs';
import { runA11yDoctor } from './utils/a11yDoctor';
import { copyHarnessReport } from './utils/harnessReport';
import {
  SystemStatus,
  BackgroundTask,
  MemoryLesson,
  TraceEvent,
  CrystallizedSkill,
  Scenario,
  TelemetryMetrics,
  BentoNotification,
} from './types';
import { getAudioSettings, playClack, playZenBell } from './utils/audio';
import { AnnounceProvider, useAnnounce } from './hooks/useAnnounce';
import { DensityProvider, useDensity } from './hooks/useDensity';

function BentoDashboard() {
  const announce = useAnnounce();
  const { toggleDensity } = useDensity();
  const [activeTab, setActiveTab] = useState<'daemons' | 'memory' | 'traces' | 'benchmarks' | 'arena'>('daemons');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<SystemStatus>({
    status: 'ACTIVE',
    uptime_sec: 0,
    active_tasks_count: 0,
    total_lessons_count: 0,
    recent_traces_count: 0,
    benchmarks_count: 0,
    cwd: '',
  });
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isQuickRunnerOpen, setIsQuickRunnerOpen] = useState<boolean>(false);
  const [quickRunnerScenario, setQuickRunnerScenario] = useState<string | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<BentoNotification[]>(() => {
    try {
      const saved = localStorage.getItem('bento_notifications');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (n): n is BentoNotification =>
          Boolean(n && typeof n === 'object' && typeof n.id === 'string' && typeof n.title === 'string')
      );
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bento_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  const addNotification = (notif: Omit<BentoNotification, 'id' | 'timestamp' | 'read'>) => {
    const item: BentoNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [item, ...prev.slice(0, 49)]);
  };

  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [lessons, setLessons] = useState<MemoryLesson[]>([]);
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [skills, setSkills] = useState<CrystallizedSkill[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryMetrics | null>(null);
  const [vitals, setVitals] = useState<{ rss_mb: number; load_avg: number[]; active_daemons: number } | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Sync audio enabled state
  useEffect(() => {
    setAudioEnabled(getAudioSettings().enabled);
    const handleAudioChange = (e: any) => {
      if (e.detail?.enabled !== undefined) {
        setAudioEnabled(e.detail.enabled);
      }
    };
    window.addEventListener('bento-audio-settings-changed', handleAudioChange);
    return () => window.removeEventListener('bento-audio-settings-changed', handleAudioChange);
  }, []);

  // OmniPalette open toggle
  useEffect(() => {
    const handleToggle = () => setIsPaletteOpen((prev) => !prev);
    window.addEventListener('toggle-omni-palette', handleToggle);
    return () => window.removeEventListener('toggle-omni-palette', handleToggle);
  }, []);

  // Global Keymap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        isPaletteOpen ||
        isAudioModalOpen ||
        isShortcutsModalOpen ||
        isQuickRunnerOpen ||
        isNotificationDrawerOpen
      ) {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        playClack();
        setActiveTab('daemons');
      } else if (e.key === '2') {
        e.preventDefault();
        playClack();
        setActiveTab('memory');
      } else if (e.key === '3') {
        e.preventDefault();
        playClack();
        setActiveTab('traces');
      } else if (e.key === '4') {
        e.preventDefault();
        playClack();
        setActiveTab('benchmarks');
      } else if (e.key === '5') {
        e.preventDefault();
        playClack();
        setActiveTab('arena');
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        playClack();
        setIsNotificationDrawerOpen((prev) => !prev);
      } else if (e.key === 't') {
        e.preventDefault();
        playClack();
        setQuickRunnerScenario(scenarios[0]?.name || null);
        setIsQuickRunnerOpen(true);
      } else if (e.key === 'r') {
        e.preventDefault();
        playClack();
        fetchAllData();
      } else if (e.key === '?') {
        e.preventDefault();
        playClack();
        setIsShortcutsModalOpen(true);
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        toggleDensity();
      } else if (e.key === '/') {
        e.preventDefault();
        playClack();
        const searchInputMap: Record<string, string> = {
          daemons: 'daemon-table-search',
          memory: 'memory-search-input',
          traces: 'trace-search-query',
          benchmarks: 'benchmark-filter-input',
        };
        const inputId = searchInputMap[activeTab];
        if (inputId) {
          const el = document.getElementById(inputId) as HTMLInputElement | null;
          el?.focus();
          el?.select();
        }
      } else if (e.key === 'E' && e.shiftKey) {
        e.preventDefault();
        playClack();
        copyHarnessReport({
          status,
          tasks,
          lessons,
          traces,
          scenarios,
          telemetry,
        }).then((ok: boolean) => {
          if (ok) {
            showToast({
              title: 'Executive Snapshot Copied! 📋',
              message: 'Full harness health & telemetry snapshot copied to clipboard.',
              type: 'success',
            });
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPaletteOpen,
    isAudioModalOpen,
    isShortcutsModalOpen,
    isQuickRunnerOpen,
    isNotificationDrawerOpen,
    scenarios,
    activeTab,
    toggleDensity,
    status,
    tasks,
    lessons,
    traces,
    telemetry,
  ]);

  const isFetchingRef = React.useRef(false);
  const prevTasksRef = React.useRef<Map<string, string>>(new Map());

  const fetchAllData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const [statusRes, bgRes, memRes, tracesRes, benchRes, telemRes, vitalsRes] = await Promise.all([
        fetch('/api/status').then((r) => r.json()).catch(() => null),
        fetch('/api/bg').then((r) => r.json()).catch(() => []),
        fetch('/api/memory').then((r) => r.json()).catch(() => []),
        fetch('/api/traces').then((r) => r.json()).catch(() => ({ traces: [], skills: [] })),
        fetch('/api/benchmarks').then((r) => r.json()).catch(() => []),
        fetch('/api/telemetry').then((r) => r.json()).catch(() => null),
        fetch('/api/system/vitals').then((r) => r.json()).catch(() => null),
      ]);

      if (statusRes) {
        setStatus(statusRes);
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }

      if (Array.isArray(bgRes)) {
        // Prune stale task IDs to avoid unbounded memory leaks (WASABI-UI-07)
        const currentIds = new Set(bgRes.map((t: BackgroundTask) => t.task_id));
        for (const id of prevTasksRef.current.keys()) {
          if (!currentIds.has(id)) {
            prevTasksRef.current.delete(id);
          }
        }

        // Detect task completions, trigger visual notification and screen-reader announcement
        bgRes.forEach((t: BackgroundTask) => {
          const prevStatus = prevTasksRef.current.get(t.task_id);
          if (prevStatus === 'RUNNING' && t.status !== 'RUNNING') {
            addNotification({
              category: 'DAEMON',
              severity: t.status === 'COMPLETED' ? 'SUCCESS' : 'WARNING',
              title: `Task ${t.tag} ${t.status}`,
              description: `Command: ${t.command.slice(0, 60)}...`,
              actionTab: 'daemons',
            });
            announce(`Kitchen task ${t.tag} completed with status ${t.status}.`, 'polite');
          }
          prevTasksRef.current.set(t.task_id, t.status);
        });
        setTasks(bgRes);
      }

      if (Array.isArray(memRes)) setLessons(memRes);
      if (tracesRes) {
        setTraces(tracesRes.traces || []);
        setSkills(tracesRes.skills || []);
      }
      if (Array.isArray(benchRes)) setScenarios(benchRes);
      if (telemRes?.metrics) setTelemetry(telemRes.metrics);
      if (vitalsRes) setVitals(vitalsRes);

      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAllData();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const runningTasksCount = tasks.filter((t) => t.status === 'RUNNING').length;

  // Header Ambient Sparkline Points
  const ambientSparklinePoints = useMemo(() => {
    if (!telemetry || !telemetry.recent_latencies || telemetry.recent_latencies.length < 2) return '';
    const lats = telemetry.recent_latencies.slice(-15);
    const minVal = Math.min(...lats);
    const maxVal = Math.max(...lats);
    const span = maxVal - minVal || 1;
    const width = 80;
    const height = 20;
    const padding = 2;

    return lats
      .map((val, idx) => {
        const x = padding + (idx / (lats.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((val - minVal) / span) * (height - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [telemetry]);

  const tabKeys: Array<'daemons' | 'memory' | 'traces' | 'benchmarks' | 'arena'> = [
    'daemons',
    'memory',
    'traces',
    'benchmarks',
    'arena',
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = tabKeys.indexOf(activeTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextTab = tabKeys[(currentIndex + 1) % tabKeys.length];
      setActiveTab(nextTab);
      playClack();
      document.getElementById(`tab-${nextTab}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevTab = tabKeys[(currentIndex - 1 + tabKeys.length) % tabKeys.length];
      setActiveTab(prevTab);
      playClack();
      document.getElementById(`tab-${prevTab}`)?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      const firstTab = tabKeys[0];
      setActiveTab(firstTab);
      playClack();
      document.getElementById(`tab-${firstTab}`)?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const lastTab = tabKeys[tabKeys.length - 1];
      setActiveTab(lastTab);
      playClack();
      document.getElementById(`tab-${lastTab}`)?.focus();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-gray-100 selection:bg-bento-salmon selection:text-white">
      {/* Accessible Multi-Landmark Skip Dock (WCAG 2.4.1 / Matcha Proposal 1) */}
      <nav aria-label="Skip navigation links" className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-3 focus-within:left-3 focus-within:z-50 focus-within:flex focus-within:gap-2 focus-within:bg-bento-surface focus-within:border focus-within:border-bento-border focus-within:p-2 focus-within:rounded-xl focus-within:shadow-2xl">
        <a
          href="#main-content"
          className="px-3 py-1.5 bg-bento-salmon text-white font-mono text-xs font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          Skip to Canvas 🥢
        </a>
        <a
          href="#tab-daemons"
          onClick={() => setActiveTab('daemons')}
          className="px-3 py-1.5 bg-bento-elevated text-gray-200 font-mono text-xs font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          Skip to Chefs 🍳
        </a>
        <a
          href="#tab-memory"
          onClick={() => setActiveTab('memory')}
          className="px-3 py-1.5 bg-bento-elevated text-gray-200 font-mono text-xs font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          Skip to Recipes 🍙
        </a>
      </nav>

      {/* Offline / Reconnecting Banner */}
      {isOffline && (
        <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-b border-rose-500/40 text-rose-200 px-4 py-1.5 text-xs text-center font-mono flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>Disconnected from Bento Daemon · Reconnecting...</span>
        </div>
      )}

      {/* Top Bento Telemetry Header */}
      <header role="banner" className="border-b border-bento-border bg-[#18141f]/95 backdrop-blur-md sticky top-0 z-40 shadow-bento-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center gap-4">
          {/* Logo & Kitchen Tagline */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-bento bg-gradient-to-tr from-bento-salmon to-rose-600 p-1 flex items-center justify-center shadow-bento-glow hover:rotate-3 transition duration-200 cursor-pointer">
              <BentoBoxIcon className="w-8 h-8 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  BENTO <span className="text-bento-salmon">HARNESS</span>
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-bento-salmon/15 text-bento-salmon border border-bento-salmon/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 animate-spin" /> Bento Kitchen
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                <FolderGit2 className="w-3 h-3 text-gray-500 shrink-0" />
                <span className="text-gray-300 truncate max-w-[150px] sm:max-w-md" title={status.cwd}>
                  {status.cwd || 'Dev/bento'}
                </span>
              </p>
            </div>
          </div>

          {/* Right Strip Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Food Metrics Strip */}
            <div className="hidden md:flex items-center gap-3 bg-bento-surface border border-bento-border px-3 py-1.5 rounded-bento text-xs font-mono shadow-inner">
              <span className="flex items-center gap-1.5 text-bento-matcha font-medium">
                <span className="w-2 h-2 rounded-full bg-bento-matcha animate-ping inline-block" />
                Freshly Serving
              </span>
              <span className="text-bento-border">|</span>
              <span className="text-gray-300 flex items-center gap-1.5">
                <ChefTamagoIcon className="w-4 h-4" />
                <span className="text-bento-tamago font-semibold">{runningTasksCount}</span> Simmering
              </span>
              <span className="text-bento-border">|</span>
              <span className="text-gray-300 flex items-center gap-1.5">
                <OnigiriIcon className="w-4 h-4" />
                <span className="text-bento-rice font-semibold">{lessons.length}</span> Recipes
              </span>
              <span className="text-bento-border">|</span>
              <span className="text-gray-300 flex items-center gap-1.5">
                <MatchaCupIcon className="w-4 h-4" />
                <span className="text-bento-matcha font-semibold">{traces.length}</span> Tastes
              </span>
            </div>

            {/* Ambient Header Sparkline Button (YUZU-A11Y-01) */}
            {telemetry && ambientSparklinePoints && (
              <button
                type="button"
                onClick={() => {
                  playClack();
                  setActiveTab('traces');
                }}
                aria-label={`Telemetry Sparkline: ${telemetry.pass_rate.toFixed(0)}% Pass, P90 latency ${telemetry.p90_latency_ms.toFixed(0)}ms. Click to view Traces.`}
                className="hidden lg:flex items-center gap-2 bg-bento-surface border border-bento-border hover:border-bento-matcha/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-matcha px-2.5 py-1.5 rounded-bento text-xs font-mono cursor-pointer transition shadow-inner text-left"
                title={`Pass Rate: ${telemetry.pass_rate.toFixed(1)}% · P90: ${telemetry.p90_latency_ms.toFixed(1)}ms (Click to view traces)`}
              >
                <div className="flex flex-col text-[10px]">
                  <span className="text-emerald-400 font-bold leading-tight">{telemetry.pass_rate.toFixed(0)}% Pass</span>
                  <span className="text-gray-400 text-[9px] leading-tight font-mono">{telemetry.p90_latency_ms.toFixed(0)}ms</span>
                </div>
                <div className="w-20 h-5" aria-hidden="true">
                  <svg viewBox="0 0 80 20" className="w-full h-full overflow-visible" focusable="false">
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={ambientSparklinePoints}
                    />
                  </svg>
                </div>
              </button>
            )}

            {/* Kitchen Vitals Telemetry Badge */}
            {vitals && (() => {
              const loadList = Array.isArray(vitals.load_avg) ? vitals.load_avg : [0.0, 0.0, 0.0];
              const primaryLoad = typeof loadList[0] === 'number' ? loadList[0] : 0.0;
              return (
                <div
                  className="hidden xl:flex items-center gap-2.5 bg-bento-surface border border-bento-border px-2.5 py-1.5 rounded-bento text-xs font-mono shadow-inner"
                  title={`Daemon RSS: ${vitals.rss_mb ?? 0}MB · System Load: ${loadList.join(', ')} · Active Daemons: ${vitals.active_daemons ?? 0}`}
                >
                  <div className="flex items-center gap-1 text-[11px] text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-gray-400">RSS:</span>
                    <span className="text-white font-bold">{vitals.rss_mb ?? 0}MB</span>
                  </div>
                  <span className="text-bento-border">|</span>
                  <div className="flex items-center gap-1 text-[11px] text-gray-300">
                    <span className="text-gray-400">Load:</span>
                    <span className={`font-bold ${primaryLoad > 2.0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {primaryLoad.toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* OmniPalette Trigger */}
            <button
              type="button"
              onClick={() => {
                playClack();
                setIsPaletteOpen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={isPaletteOpen}
              aria-label="Open OmniSearch command palette (Cmd+K)"
              className="hidden sm:flex items-center gap-2 bg-bento-surface border border-bento-border hover:border-amber-500/40 px-3 py-1.5 rounded-bento text-xs text-gray-300 hover:text-white transition min-h-[38px] shadow-sm"
              title="Open OmniPalette (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>OmniSearch</span>
              <kbd className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">⌘K</kbd>
            </button>

            {/* Audio Studio Trigger */}
            <button
              type="button"
              onClick={() => {
                playClack();
                setIsAudioModalOpen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={isAudioModalOpen}
              aria-label="Sensory Web Audio Feedback Settings"
              className={`p-2 border rounded-bento transition min-h-[38px] min-w-[38px] flex items-center justify-center ${
                audioEnabled
                  ? 'bg-bento-surface border-bento-border text-cyan-300 hover:border-cyan-400/50'
                  : 'bg-bento-surface border-bento-border text-gray-500 hover:text-gray-300'
              }`}
              title="Sensory Web Audio Feedback Settings"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Shortcuts Cheatsheet Trigger */}
            <button
              type="button"
              onClick={() => {
                playClack();
                setIsShortcutsModalOpen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={isShortcutsModalOpen}
              aria-label="Keyboard Shortcuts Cheatsheet (?)"
              className="p-2 bg-bento-surface border border-bento-border hover:border-amber-400/50 text-gray-300 hover:text-white rounded-bento transition min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Keyboard Shortcuts Cheatsheet (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Notification Hub Trigger */}
            <button
              type="button"
              onClick={() => {
                playClack();
                setIsNotificationDrawerOpen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={isNotificationDrawerOpen}
              aria-label={`Mission Control Notifications (${notifications.filter((n) => !n.read).length} unread)`}
              className="relative p-2 bg-bento-surface border border-bento-border hover:border-bento-salmon/50 text-gray-300 hover:text-white rounded-bento transition min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Mission Control Notifications (n)"
            >
              <Bell className="w-4 h-4" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-bento-salmon text-white text-[9px] font-bold flex items-center justify-center animate-pulse shadow-sm">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>

            {/* Refresh Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  playClack();
                  setAutoRefresh(!autoRefresh);
                }}
                aria-label={autoRefresh ? 'Pause auto-refresh' : 'Enable auto-refresh'}
                className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-bento border font-medium transition min-h-[38px] flex items-center ${
                  autoRefresh
                    ? 'bg-bento-salmon/20 text-bento-salmon border-bento-salmon/40 shadow-sm'
                    : 'bg-bento-surface text-gray-400 border-bento-border hover:text-white'
                }`}
              >
                Auto: {autoRefresh ? '3s 🥢' : 'PAUSED'}
              </button>
              <button
                type="button"
                onClick={() => {
                  playClack();
                  fetchAllData();
                }}
                aria-label="Manual refresh Bento telemetry"
                className="p-2 bg-bento-surface border border-bento-border hover:bg-bento-elevated rounded-bento text-gray-300 hover:text-white transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Manual Refresh Bento"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-bento-salmon' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Bento Compartment Navigation (Segmented Tabs with Roving Tabindex) */}
        <nav aria-label="Bento Compartments Navigation" className="border-t border-bento-border/60 bg-[#16131c]/70 relative">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative after:pointer-events-none after:absolute after:right-0 after:top-0 after:bottom-0 after:w-8 after:bg-gradient-to-l after:from-[#16131c] after:to-transparent sm:after:hidden">
            <div
              role="tablist"
              aria-label="Bento Compartments"
              onKeyDown={handleTabKeyDown}
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-2 -mx-1 px-1 sm:mx-0 sm:px-0"
            >
              {/* Tab 1: Kitchen Chefs */}
              <button
                type="button"
                role="tab"
                id="tab-daemons"
                tabIndex={activeTab === 'daemons' ? 0 : -1}
                aria-controls="panel-daemons"
                aria-selected={activeTab === 'daemons'}
                onClick={() => {
                  playClack();
                  setActiveTab('daemons');
                }}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 min-h-[42px] touch-manipulation select-none border ${
                  activeTab === 'daemons'
                    ? 'bg-bento-tamago/15 text-bento-tamago border-bento-tamago/40 shadow-tamago-glow ring-1 ring-bento-tamago/20'
                    : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <ChefTamagoIcon className="w-4 h-4 shrink-0" />
                <span>Kitchen Chefs</span>
                <span
                  className={`ml-0.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold transition ${
                    runningTasksCount > 0
                      ? 'bg-bento-tamago text-gray-950 shadow-sm animate-pulse'
                      : activeTab === 'daemons'
                      ? 'bg-bento-tamago text-gray-950 shadow-sm'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {runningTasksCount > 0 ? `${runningTasksCount} simmering` : tasks.length}
                </span>
              </button>

              {/* Tab 2: Seasoned Recipes */}
              <button
                type="button"
                role="tab"
                id="tab-memory"
                tabIndex={activeTab === 'memory' ? 0 : -1}
                aria-controls="panel-memory"
                aria-selected={activeTab === 'memory'}
                onClick={() => {
                  playClack();
                  setActiveTab('memory');
                }}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 min-h-[42px] touch-manipulation select-none border ${
                  activeTab === 'memory'
                    ? 'bg-bento-salmon/15 text-bento-salmon border-bento-salmon/40 shadow-bento-glow ring-1 ring-bento-salmon/20'
                    : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <OnigiriIcon className="w-4 h-4 shrink-0" />
                <span>Seasoned Recipes</span>
                <span
                  className={`ml-0.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold transition ${
                    activeTab === 'memory'
                      ? 'bg-bento-salmon text-white shadow-sm'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {lessons.length}
                </span>
              </button>

              {/* Tab 3: Night Dream & Tea */}
              <button
                type="button"
                role="tab"
                id="tab-traces"
                tabIndex={activeTab === 'traces' ? 0 : -1}
                aria-controls="panel-traces"
                aria-selected={activeTab === 'traces'}
                onClick={() => {
                  playClack();
                  setActiveTab('traces');
                }}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 min-h-[42px] touch-manipulation select-none border ${
                  activeTab === 'traces'
                    ? 'bg-bento-matcha/15 text-bento-matcha border-bento-matcha/40 shadow-matcha-glow ring-1 ring-bento-matcha/20'
                    : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <MatchaCupIcon className="w-4 h-4 shrink-0" />
                <span>Night Dream & Tea</span>
                <span
                  className={`ml-0.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold transition ${
                    activeTab === 'traces'
                      ? 'bg-bento-matcha text-gray-950 shadow-sm'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {traces.length}
                </span>
              </button>

              {/* Tab 4: Tasting Battery */}
              <button
                type="button"
                role="tab"
                id="tab-benchmarks"
                tabIndex={activeTab === 'benchmarks' ? 0 : -1}
                aria-controls="panel-benchmarks"
                aria-selected={activeTab === 'benchmarks'}
                onClick={() => {
                  playClack();
                  setActiveTab('benchmarks');
                }}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 min-h-[42px] touch-manipulation select-none border ${
                  activeTab === 'benchmarks'
                    ? 'bg-amber-400/15 text-amber-300 border-amber-400/40 shadow-tamago-glow ring-1 ring-amber-400/20'
                    : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <ChopsticksIcon className="w-4 h-4 shrink-0" />
                <span>Tasting Battery</span>
                <span
                  className={`ml-0.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold transition ${
                    activeTab === 'benchmarks'
                      ? 'bg-amber-400 text-gray-950 shadow-sm'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {scenarios.length}
                </span>
              </button>

              {/* Tab 5: Arena Sparring */}
              <button
                type="button"
                role="tab"
                id="tab-arena"
                tabIndex={activeTab === 'arena' ? 0 : -1}
                aria-controls="panel-arena"
                aria-selected={activeTab === 'arena'}
                onClick={() => {
                  playClack();
                  setActiveTab('arena');
                }}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 min-h-[42px] touch-manipulation select-none border ${
                  activeTab === 'arena'
                    ? 'bg-red-500/15 text-red-300 border-red-500/40 shadow-sm ring-1 ring-red-500/20'
                    : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Swords className="w-4 h-4 shrink-0 text-red-400" />
                <span>Arena Sparring</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Kitchen Vitals Telemetry Sub-strip */}
        <div className="bg-[#121017] border-b border-bento-border/70 px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="text-amber-400">🍱</span>
              <strong className="text-zinc-200">Bento v0.5.0</strong>
            </span>
            <span className="text-zinc-600 hidden sm:inline">|</span>
            <span className="hidden sm:flex items-center gap-1">
              <span>🐍 Python 3.12 (CPython)</span>
            </span>
            <span className="text-zinc-600 hidden sm:inline">|</span>
            <span className="flex items-center gap-1">
              <span>🧠 Memory: <strong className="text-zinc-200">{lessons.length}</strong> Rules</span>
            </span>
            <span className="text-zinc-600 hidden md:inline">|</span>
            <span className="hidden md:flex items-center gap-1">
              <span>📜 Traces: <strong className="text-zinc-200">{traces.length}</strong> Runs</span>
            </span>
            <span className="text-zinc-600 hidden lg:inline">|</span>
            <span className="hidden lg:flex items-center gap-1">
              <span>⚡ Active SSE: <strong className="text-emerald-400">{vitals?.active_daemons || 0}</strong> Daemons</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playZenBell();
                const a11yResult = runA11yDoctor();
                if (a11yResult.passed) {
                  showToast({
                    title: `Bento Doctor: Healthy (${a11yResult.score}%)`,
                    message: `${a11yResult.checks.filter((c) => c.passed).length}/${a11yResult.checks.length} diagnostics passed (Subsystems + WCAG 2.1 AA verified).`,
                    type: 'success',
                  });
                } else {
                  const failed = a11yResult.checks.find((c) => !c.passed);
                  showToast({
                    title: `Bento Doctor: A11y Notice (${a11yResult.score}%)`,
                    message: failed?.details || 'Review accessibility telemetry in console.',
                    type: 'warning',
                  });
                }
                console.table(a11yResult.checks);
              }}
              aria-label="Run Bento Subsystem and Accessibility Doctor Diagnostics"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-[11px] touch-manipulation"
              title="Click to verify subsystem & A11y diagnostics"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Doctor ➔ Healthy ✓</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Compartment Canvas */}
      <main id="main-content" tabIndex={-1} className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 flex-1 pb-safe focus:outline-none">
        <CompartmentBreadcrumbs activeTab={activeTab} />
        <div id="panel-daemons" role="tabpanel" tabIndex={0} aria-labelledby="tab-daemons" hidden={activeTab !== 'daemons'}>
          {activeTab === 'daemons' && <DaemonView tasks={tasks} onRefresh={fetchAllData} />}
        </div>
        <div id="panel-memory" role="tabpanel" tabIndex={0} aria-labelledby="tab-memory" hidden={activeTab !== 'memory'}>
          {activeTab === 'memory' && <MemoryView lessons={lessons} onRefresh={fetchAllData} />}
        </div>
        <div id="panel-traces" role="tabpanel" tabIndex={0} aria-labelledby="tab-traces" hidden={activeTab !== 'traces'}>
          {activeTab === 'traces' && <TracesView traces={traces} skills={skills} onRefresh={fetchAllData} />}
        </div>
        <div id="panel-benchmarks" role="tabpanel" tabIndex={0} aria-labelledby="tab-benchmarks" hidden={activeTab !== 'benchmarks'}>
          {activeTab === 'benchmarks' && <BenchmarksView scenarios={scenarios} onRefresh={fetchAllData} />}
        </div>
        <div id="panel-arena" role="tabpanel" tabIndex={0} aria-labelledby="tab-arena" hidden={activeTab !== 'arena'}>
          {activeTab === 'arena' && <ArenaView scenarios={scenarios} />}
        </div>
      </main>

      {/* Joyful Bento Box Footer */}
      <footer className="border-t border-bento-border/70 py-3 bg-[#131117] text-xs text-gray-400 text-center font-mono flex flex-wrap items-center justify-center gap-2 px-4 pb-safe">
        <span>🍱 Bento Harness · Packed Fresh with Zero Python Dependencies</span>
        <span>•</span>
        <span className="text-gray-400">Telemetry updated at {lastRefreshed.toLocaleTimeString()}</span>
      </footer>

      {/* OmniPalette (Cmd+K Context Navigator) */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
        lessons={lessons}
        scenarios={scenarios}
        tasks={tasks}
        onOpenQuickRunner={(name) => {
          setQuickRunnerScenario(name || scenarios[0]?.name || null);
          setIsQuickRunnerOpen(true);
        }}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenAudioSettings={() => setIsAudioModalOpen(true)}
        onRefreshAll={fetchAllData}
      />

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Instant Tasting Flight Runner Modal */}
      <QuickRunnerModal
        isOpen={isQuickRunnerOpen}
        onClose={() => setIsQuickRunnerOpen(false)}
        scenarios={scenarios}
        initialScenarioName={quickRunnerScenario}
        onRunComplete={fetchAllData}
      />

      {/* Mission Control Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAllRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onClearAll={() => {
          setNotifications([]);
        }}
        onDismiss={(id) => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }}
        onSelectTab={(tab) => {
          if (['daemons', 'memory', 'traces', 'benchmarks', 'arena'].includes(tab)) {
            setActiveTab(tab as any);
          }
        }}
      />

      {/* Sensory Soundpack Closed-Caption HUD */}
      <SoundCaptionHUD />

      {/* Global Toast Notification Container */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AnnounceProvider>
      <DensityProvider>
        <BentoDashboard />
      </DensityProvider>
    </AnnounceProvider>
  );
}
