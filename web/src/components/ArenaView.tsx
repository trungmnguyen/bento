import React, { useState, useEffect, useRef } from 'react';
import { Swords, Trophy, Clock, Target, Play, ShieldAlert, Sparkles, History, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { Scenario } from '../types';
import { playZenBell, playClack, playTastePass } from '../utils/audio';
import { showToast } from './Toast';

interface ArenaScorecardResponse {
  challenger_name: string;
  defender_name: string;
  challenger_passed: number;
  challenger_failed: number;
  challenger_total_steps: number;
  challenger_duration_ms: number;
  defender_passed: number;
  defender_failed: number;
  defender_total_steps: number;
  defender_duration_ms: number;
  winner: string;
  metric_used: string;
  margin: number;
}

interface BoutHistoryItem {
  id: string;
  timestamp: string;
  challenger: string;
  defender: string;
  winner: string;
  metric: string;
  margin: number;
  scorecard: ArenaScorecardResponse;
}

interface ArenaViewProps {
  scenarios: Scenario[];
}

export const ArenaView: React.FC<ArenaViewProps> = ({ scenarios }) => {
  const [challengerPath, setChallengerPath] = useState<string>('');
  const [defenderPath, setDefenderPath] = useState<string>('');
  const [metric, setMetric] = useState<string>('pass_rate');
  const [loading, setLoading] = useState<boolean>(false);
  const [scorecard, setScorecard] = useState<ArenaScorecardResponse | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [bouts, setBouts] = useState<BoutHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('bento_arena_history');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter(
            (b): b is BoutHistoryItem =>
              Boolean(
                b &&
                  typeof b === 'object' &&
                  typeof b.id === 'string' &&
                  typeof b.challenger === 'string' &&
                  typeof b.defender === 'string' &&
                  typeof b.winner === 'string'
              )
          )
        : [];
    } catch {
      return [];
    }
  });

  // Fallback scenario options
  const scenarioOptions = scenarios.length > 0
    ? scenarios.map((s) => ({
        label: s.name,
        path: `benchmarks/${s.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.json`,
      }))
    : [
        { label: 'Core System Health Check', path: 'examples/basic_test.json' },
        { label: 'Agent Code-Gen Verification Rig', path: 'examples/task_contract.json' },
        { label: 'Dashboard Resilience Rig', path: 'examples/dashboard_resilience_contract.json' },
      ];

  const handleFight = async () => {
    const c = challengerPath || scenarioOptions[0]?.path;
    const d = defenderPath || scenarioOptions[1]?.path || scenarioOptions[0]?.path;

    if (!c || !d) {
      showToast('error', 'Select Contracts', 'Please select both a challenger and defender contract.');
      return;
    }

    playClack();
    setLoading(true);
    setScorecard(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/arena/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenger: c, defender: d, metric }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({ error: 'Failed to parse response' }));

      if (!isMountedRef.current) return;

      if (res.ok) {
        setScorecard(data);
        playZenBell();
        const winnerName = data.winner === 'challenger' ? data.challenger_name : (data.winner === 'defender' ? data.defender_name : 'Draw');
        showToast('success', 'Arena Match Complete', `Winner: ${winnerName} (${data.metric_used})`);

        // Save to Bout History
        const newBout: BoutHistoryItem = {
          id: `bout-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          challenger: data.challenger_name,
          defender: data.defender_name,
          winner: data.winner,
          metric: data.metric_used,
          margin: data.margin,
          scorecard: data,
        };
        setBouts((prev) => {
          const updated = [newBout, ...prev.filter((b) => b.challenger !== data.challenger_name || b.defender !== data.defender_name)].slice(0, 8);
          try {
            localStorage.setItem('bento_arena_history', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else {
        const msg = data.error || `Arena match failed (HTTP ${res.status})`;
        showToast('error', 'Match Failed', msg);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err?.name === 'AbortError') {
        showToast('error', 'Match Timeout', 'Arena match timed out after 30 seconds.');
      } else {
        showToast('error', 'Network Error', 'Could not communicate with Arena endpoint.');
      }
    } finally {
      clearTimeout(timeoutId);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bento-surface border border-bento-border rounded-bento p-5 sm:p-6 shadow-bento-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Bento Arena · Head-to-Head Sparring
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Pit challenger contracts vs baseline defenders under identical deterministic constraints
              </p>
            </div>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center gap-2 bg-[#131117] border border-bento-border p-1 rounded-xl" role="group" aria-label="Evaluation Metric">
          {(['pass_rate', 'duration', 'assertions'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={metric === m}
              onClick={() => {
                setMetric(m);
                playClack();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                metric === m
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {m.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Sparring Setup Arena */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        {/* Red Corner: Challenger */}
        <div className="bg-[#181419] border border-red-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-red-500/20 border-b border-l border-red-500/30 rounded-bl-xl text-[10px] font-mono font-bold text-red-300">
            RED CORNER · CHALLENGER
          </div>

          <h3 className="text-sm font-bold text-red-200 flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-red-400" />
            Select Challenger Contract
          </h3>

          <select
            aria-label="Select Challenger Contract"
            value={challengerPath || (scenarioOptions[0]?.path ?? '')}
            onChange={(e) => setChallengerPath(e.target.value)}
            className="w-full bg-[#131117] border border-bento-border rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-red-500/60"
          >
            {scenarioOptions.map((opt, i) => (
              <option key={`c-${i}`} value={opt.path}>
                {opt.label} ({opt.path})
              </option>
            ))}
          </select>
        </div>

        {/* Blue Corner: Defender */}
        <div className="bg-[#14171d] border border-blue-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500/20 border-b border-l border-blue-500/30 rounded-bl-xl text-[10px] font-mono font-bold text-blue-300">
            BLUE CORNER · DEFENDER
          </div>

          <h3 className="text-sm font-bold text-blue-200 flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            Select Defender Baseline
          </h3>

          <select
            aria-label="Select Defender Baseline"
            value={defenderPath || (scenarioOptions[1]?.path ?? scenarioOptions[0]?.path ?? '')}
            onChange={(e) => setDefenderPath(e.target.value)}
            className="w-full bg-[#131117] border border-bento-border rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500/60"
          >
            {scenarioOptions.map((opt, i) => (
              <option key={`d-${i}`} value={opt.path}>
                {opt.label} ({opt.path})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fight Action */}
      <div className="flex justify-center">
        <button
          onClick={handleFight}
          disabled={loading}
          aria-label="Launch Arena Sparring Match"
          className={`px-8 py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase transition-all shadow-xl flex items-center gap-2.5 ${
            loading
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-600 to-amber-600 text-white hover:brightness-110 hover:shadow-red-500/20 active:scale-95'
          }`}
        >
          <Swords className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Evaluating Sparring Round...' : 'Launch Arena Sparring Match 🥊'}
        </button>
      </div>

      {/* Empty State Showcase Simulator (Matcha Proposal 3) */}
      {!scorecard && bouts.length === 0 && (
        <div className="bg-bento-surface border border-bento-border rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-200">The Dojo Mat is Ready</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Select two scenario contracts above to duel head-to-head on latency and assertions, or simulate a showcase sparring bout right now:
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playTastePass();
              setScorecard({
                challenger_name: 'Fast Signal Optimizer',
                defender_name: 'Baseline Quant Calc',
                winner: 'challenger',
                margin: 42.5,
                metric_used: 'duration',
                challenger_duration_ms: 14.2,
                defender_duration_ms: 56.7,
                challenger_passed: 5,
                challenger_failed: 0,
                challenger_total_steps: 5,
                defender_passed: 4,
                defender_failed: 1,
                defender_total_steps: 5,
              });
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-bento-glow transition inline-flex items-center gap-2"
          >
            <span>🥊</span>
            <span>Simulate Showcase Spar (Demo Telemetry)</span>
          </button>
        </div>
      )}

      {/* Scorecard Results */}
      {scorecard && (
        <div className="bg-bento-surface border border-bento-border rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 overflow-hidden">
          {/* Victory Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              scorecard.winner === 'challenger'
                ? 'bg-red-500/10 border-red-500/40 text-red-200'
                : scorecard.winner === 'defender'
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-200'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-base font-black tracking-tight uppercase break-words">
                  {scorecard.winner === 'challenger'
                    ? `🏆 Challenger Victory: ${scorecard.challenger_name}`
                    : scorecard.winner === 'defender'
                    ? `🛡️ Defender Victory: ${scorecard.defender_name}`
                    : '🤝 Match Ended in a Draw'}
                </h3>
                <p className="text-xs opacity-80 break-words">
                  Evaluated on <span className="font-bold font-mono">{scorecard.metric_used.toUpperCase()}</span> · Winning Margin: {typeof scorecard.margin === 'number' ? scorecard.margin.toFixed(2) : '0.00'}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 uppercase shrink-0 self-start sm:self-auto">
              {scorecard.winner} wins
            </span>
          </div>

          {/* Arcade Versus Combat Bar */}
          <div className="bg-[#0e0d13] border border-bento-border rounded-xl p-4 shadow-inner overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold mb-2">
              <span className="text-red-400 flex items-center gap-1.5 break-all min-w-0">
                🥊 {scorecard.challenger_name}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] shrink-0">
                VS · {scorecard.metric_used.toUpperCase()}
              </span>
              <span className="text-blue-400 flex items-center gap-1.5 break-all min-w-0">
                🛡️ {scorecard.defender_name}
              </span>
            </div>

            {/* Dual Health Gauges */}
            <div className="grid grid-cols-2 gap-2 items-center">
              {/* Challenger HP Bar (Right-aligned fill) */}
              <div className="h-4 bg-red-950/40 rounded-l-md overflow-hidden flex justify-end p-0.5 border border-red-500/30">
                <div
                  className="h-full bg-gradient-to-l from-red-500 to-rose-600 rounded-sm transition-all duration-700 ease-out shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  style={{
                    width: `${
                      scorecard.challenger_total_steps > 0
                        ? (scorecard.challenger_passed / scorecard.challenger_total_steps) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              {/* Defender HP Bar (Left-aligned fill) */}
              <div className="h-4 bg-blue-950/40 rounded-r-md overflow-hidden flex justify-start p-0.5 border border-blue-500/30">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-sm transition-all duration-700 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  style={{
                    width: `${
                      scorecard.defender_total_steps > 0
                        ? (scorecard.defender_passed / scorecard.defender_total_steps) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Sub-label speed comparison */}
            <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-gray-400 font-mono mt-2 pt-2 border-t border-white/5 gap-1.5 text-center sm:text-left">
              <span>Duration: {typeof scorecard.challenger_duration_ms === 'number' ? scorecard.challenger_duration_ms.toFixed(1) : '0.0'}ms</span>
              <span className="text-amber-400 font-semibold break-words">
                {typeof scorecard.challenger_duration_ms === 'number' && typeof scorecard.defender_duration_ms === 'number'
                  ? scorecard.challenger_duration_ms < scorecard.defender_duration_ms
                    ? `⚡ Challenger ${(scorecard.defender_duration_ms - scorecard.challenger_duration_ms).toFixed(1)}ms faster`
                    : `🛡️ Defender ${(scorecard.challenger_duration_ms - scorecard.defender_duration_ms).toFixed(1)}ms faster`
                  : 'Speed Comparison'}
              </span>
              <span>Duration: {typeof scorecard.defender_duration_ms === 'number' ? scorecard.defender_duration_ms.toFixed(1) : '0.0'}ms</span>
            </div>
          </div>

          {/* Side-by-Side Comparison Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Challenger Card */}
            <div
              className={`p-4 rounded-xl border transition ${
                scorecard.winner === 'challenger'
                  ? 'bg-red-950/20 border-red-500/40 ring-1 ring-red-500/20'
                  : 'bg-[#131117] border-bento-border/60'
              }`}
            >
              <h4 className="text-xs font-bold text-red-300 mb-2 truncate">
                Challenger: {scorecard.challenger_name}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Pass Rate:</span>
                  <span className="font-mono text-white font-bold">
                    {scorecard.challenger_total_steps > 0
                      ? `${((scorecard.challenger_passed / scorecard.challenger_total_steps) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Steps Passed:</span>
                  <span className="font-mono text-white">
                    {scorecard.challenger_passed}/{scorecard.challenger_total_steps}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Duration:</span>
                  <span className="font-mono text-white">
                    {typeof scorecard.challenger_duration_ms === 'number' ? scorecard.challenger_duration_ms.toFixed(1) : '0.0'}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Defender Card */}
            <div
              className={`p-4 rounded-xl border transition ${
                scorecard.winner === 'defender'
                  ? 'bg-blue-950/20 border-blue-500/40 ring-1 ring-blue-500/20'
                  : 'bg-[#131117] border-bento-border/60'
              }`}
            >
              <h4 className="text-xs font-bold text-blue-300 mb-2 truncate">
                Defender: {scorecard.defender_name}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Pass Rate:</span>
                  <span className="font-mono text-white font-bold">
                    {scorecard.defender_total_steps > 0
                      ? `${((scorecard.defender_passed / scorecard.defender_total_steps) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Steps Passed:</span>
                  <span className="font-mono text-white">
                    {scorecard.defender_passed}/{scorecard.defender_total_steps}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Duration:</span>
                  <span className="font-mono text-white">
                    {typeof scorecard.defender_duration_ms === 'number' ? scorecard.defender_duration_ms.toFixed(1) : '0.0'}ms
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Past Bout History */}
      {bouts.length > 0 && (
        <div className="bg-bento-surface border border-bento-border rounded-2xl p-5 shadow-bento-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-bento-matcha" />
              Recent Arena Bouts ({bouts.length})
            </h3>
            <button
              onClick={() => {
                setBouts([]);
                localStorage.removeItem('bento_arena_history');
                playClack();
              }}
              className="text-[11px] text-gray-500 hover:text-gray-300 font-mono transition"
            >
              Clear Bouts
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bouts.map((b) => (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                aria-label={`Replay bout between ${b.challenger} and ${b.defender}, won by ${b.winner}`}
                onClick={() => {
                  setScorecard(b.scorecard);
                  playClack();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setScorecard(b.scorecard);
                    playClack();
                  }
                }}
                className="bg-[#131117] border border-bento-border/70 hover:border-bento-matcha/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-salmon rounded-xl p-3 text-xs cursor-pointer transition shadow-sm space-y-2 group overflow-hidden"
              >
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>{b.timestamp}</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                    b.winner === 'challenger'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : b.winner === 'defender'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {b.winner} wins
                  </span>
                </div>
                <div className="font-bold text-gray-200 truncate group-hover:text-white" title={`${b.challenger} vs ${b.defender}`}>
                  {b.challenger} vs {b.defender}
                </div>
                <div className="text-[11px] text-gray-400 flex justify-between font-mono">
                  <span>Margin: {typeof b.margin === 'number' ? b.margin.toFixed(1) : '0.0'}</span>
                  <span className="text-bento-matcha group-hover:underline flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Replay
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
