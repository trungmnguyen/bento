import React, { useState, useEffect } from 'react';
import { RefreshCw, FolderGit2, Sparkles } from 'lucide-react';
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
import {
  SystemStatus,
  BackgroundTask,
  MemoryLesson,
  TraceEvent,
  CrystallizedSkill,
  Scenario,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'daemons' | 'memory' | 'traces' | 'benchmarks'>('daemons');
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
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [lessons, setLessons] = useState<MemoryLesson[]>([]);
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [skills, setSkills] = useState<CrystallizedSkill[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statusRes, bgRes, memRes, tracesRes, benchRes] = await Promise.all([
        fetch('/api/status').then((r) => r.json()).catch(() => null),
        fetch('/api/bg').then((r) => r.json()).catch(() => []),
        fetch('/api/memory').then((r) => r.json()).catch(() => []),
        fetch('/api/traces').then((r) => r.json()).catch(() => ({ traces: [], skills: [] })),
        fetch('/api/benchmarks').then((r) => r.json()).catch(() => []),
      ]);

      if (statusRes) setStatus(statusRes);
      if (Array.isArray(bgRes)) setTasks(bgRes);
      if (Array.isArray(memRes)) setLessons(memRes);
      if (tracesRes) {
        setTraces(tracesRes.traces || []);
        setSkills(tracesRes.skills || []);
      }
      if (Array.isArray(benchRes)) setScenarios(benchRes);

      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen flex flex-col bg-background text-gray-100 selection:bg-bento-salmon selection:text-white">
      {/* Top Bento Telemetry Header */}
      <header className="border-b border-bento-border bg-[#18141f]/95 backdrop-blur-md sticky top-0 z-40 shadow-bento-card">
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
                <FolderGit2 className="w-3 h-3 text-gray-500" />
                <span className="text-gray-300">{status.cwd || 'Dev/bento'}</span>
              </p>
            </div>
          </div>

          {/* Bento Food Metrics Strip */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 bg-bento-surface border border-bento-border px-3.5 py-1.5 rounded-bento text-xs font-mono shadow-inner">
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

            {/* Refresh Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-xs px-3 py-1.5 rounded-bento border font-medium transition ${
                  autoRefresh
                    ? 'bg-bento-salmon/20 text-bento-salmon border-bento-salmon/40 shadow-sm'
                    : 'bg-bento-surface text-gray-400 border-bento-border hover:text-white'
                }`}
              >
                Auto: {autoRefresh ? '3s 🥢' : 'PAUSED'}
              </button>
              <button
                onClick={fetchAllData}
                className="p-1.5 bg-bento-surface border border-bento-border hover:bg-bento-elevated rounded-bento text-gray-300 hover:text-white transition"
                title="Manual Refresh Bento"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-bento-salmon' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Bento Compartment Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 border-t border-bento-border/70 pt-1">
          <button
            onClick={() => setActiveTab('daemons')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t-2 ${
              activeTab === 'daemons'
                ? 'border-bento-tamago text-bento-tamago bg-bento-tamago/10 shadow-tamago-glow'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <ChefTamagoIcon className="w-4 h-4" /> Kitchen Chefs
            {runningTasksCount > 0 && (
              <span className="bg-bento-tamago text-gray-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {runningTasksCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t-2 ${
              activeTab === 'memory'
                ? 'border-bento-salmon text-bento-salmon bg-bento-salmon/10 shadow-bento-glow'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <OnigiriIcon className="w-4 h-4" /> Seasoned Recipes ({lessons.length})
          </button>

          <button
            onClick={() => setActiveTab('traces')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t-2 ${
              activeTab === 'traces'
                ? 'border-bento-matcha text-bento-matcha bg-bento-matcha/10 shadow-matcha-glow'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <MatchaCupIcon className="w-4 h-4" /> Night Dream & Tea ({traces.length})
          </button>

          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t-2 ${
              activeTab === 'benchmarks'
                ? 'border-amber-400 text-amber-300 bg-amber-400/10'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <ChopsticksIcon className="w-4 h-4" /> Tasting Battery ({scenarios.length})
          </button>
        </div>
      </header>

      {/* Main Compartment Canvas */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {activeTab === 'daemons' && <DaemonView tasks={tasks} onRefresh={fetchAllData} />}
        {activeTab === 'memory' && <MemoryView lessons={lessons} />}
        {activeTab === 'traces' && <TracesView traces={traces} skills={skills} onRefresh={fetchAllData} />}
        {activeTab === 'benchmarks' && <BenchmarksView scenarios={scenarios} onRefresh={fetchAllData} />}
      </main>

      {/* Joyful Bento Box Footer */}
      <footer className="border-t border-bento-border/70 py-3 bg-[#131117] text-xs text-gray-500 text-center font-mono flex items-center justify-center gap-2">
        <span>🍱 Bento Harness · Packed Fresh with Zero Python Dependencies</span>
        <span>•</span>
        <span className="text-gray-400">Telemetry updated at {lastRefreshed.toLocaleTimeString()}</span>
      </footer>
    </div>
  );
}
