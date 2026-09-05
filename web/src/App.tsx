import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Brain,
  Moon,
  CheckSquare,
  Activity,
  RefreshCw,
  Cpu,
  Layers,
  FolderGit2,
} from 'lucide-react';
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
    <div className="min-h-screen flex flex-col bg-background text-gray-100">
      {/* Top Telemetry Header */}
      <header className="border-b border-border bg-[#0d0f17]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
              🍱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">BENTO HARNESS</h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Telemetry Monitor
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                <FolderGit2 className="w-3 h-3 text-gray-500" />
                {status.cwd || 'Dev/bento'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-0.5" />
                {status.status}
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-300 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-blue-400" /> {runningTasksCount} Daemon{runningTasksCount !== 1 ? 's' : ''}
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-300 flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-indigo-400" /> {lessons.length} Rules
              </span>
            </div>

            {/* Refresh Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                  autoRefresh
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                    : 'bg-card text-gray-400 border-border hover:text-white'
                }`}
              >
                Auto (3s): {autoRefresh ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={fetchAllData}
                className="p-1.5 bg-card border border-border hover:bg-border rounded-lg text-gray-400 hover:text-white transition"
                title="Manual Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-border/50">
          <button
            onClick={() => setActiveTab('daemons')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'daemons'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Terminal className="w-4 h-4" /> Butler Daemons
            {runningTasksCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {runningTasksCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'memory'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Brain className="w-4 h-4" /> Memory Bank ({lessons.length})
          </button>

          <button
            onClick={() => setActiveTab('traces')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'traces'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Moon className="w-4 h-4" /> Dreaming & Traces ({traces.length})
          </button>

          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'benchmarks'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Contracts ({scenarios.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {activeTab === 'daemons' && <DaemonView tasks={tasks} onRefresh={fetchAllData} />}
        {activeTab === 'memory' && <MemoryView lessons={lessons} />}
        {activeTab === 'traces' && <TracesView traces={traces} skills={skills} onRefresh={fetchAllData} />}
        {activeTab === 'benchmarks' && <BenchmarksView scenarios={scenarios} onRefresh={fetchAllData} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-3 bg-[#0d0f17] text-xs text-gray-500 text-center font-mono">
        Bento Harness 0.5.0 • Clean Architecture Enforced • Telemetry Updated: {lastRefreshed.toLocaleTimeString()}
      </footer>
    </div>
  );
}
