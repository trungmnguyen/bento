import React, { useState } from 'react';
import { Swords, Trophy, Clock, Target, Play, ShieldAlert, Sparkles } from 'lucide-react';
import { Scenario } from '../types';
import { playZenBell, playClack } from '../utils/audio';
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

interface ArenaViewProps {
  scenarios: Scenario[];
}

export const ArenaView: React.FC<ArenaViewProps> = ({ scenarios }) => {
  const [challengerPath, setChallengerPath] = useState<string>('');
  const [defenderPath, setDefenderPath] = useState<string>('');
  const [metric, setMetric] = useState<string>('pass_rate');
  const [loading, setLoading] = useState<boolean>(false);
  const [scorecard, setScorecard] = useState<ArenaScorecardResponse | null>(null);

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

      if (res.ok) {
        setScorecard(data);
        playZenBell();
        const winnerName = data.winner === 'challenger' ? data.challenger_name : (data.winner === 'defender' ? data.defender_name : 'Draw');
        showToast('success', 'Arena Match Complete', `Winner: ${winnerName} (${data.metric_used})`);
      } else {
        const msg = data.error || `Arena match failed (HTTP ${res.status})`;
        showToast('error', 'Match Failed', msg);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        showToast('error', 'Match Timeout', 'Arena match timed out after 30 seconds.');
      } else {
        showToast('error', 'Network Error', 'Could not communicate with Arena endpoint.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
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
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Bento Arena · Head-to-Head Sparring
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Pit challenger contracts vs baseline defenders under identical deterministic constraints
              </p>
            </div>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center gap-2 bg-[#131117] border border-bento-border p-1 rounded-xl">
          {(['pass_rate', 'duration', 'assertions'] as const).map((m) => (
            <button
              key={m}
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

      {/* Scorecard Results */}
      {scorecard && (
        <div className="bg-bento-surface border border-bento-border rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* Victory Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              scorecard.winner === 'challenger'
                ? 'bg-red-500/10 border-red-500/40 text-red-200'
                : scorecard.winner === 'defender'
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-200'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400" />
              <div>
                <h3 className="text-base font-black tracking-tight uppercase">
                  {scorecard.winner === 'challenger'
                    ? `🏆 Challenger Victory: ${scorecard.challenger_name}`
                    : scorecard.winner === 'defender'
                    ? `🛡️ Defender Victory: ${scorecard.defender_name}`
                    : '🤝 Match Ended in a Draw'}
                </h3>
                <p className="text-xs opacity-80">
                  Evaluated on <span className="font-bold font-mono">{scorecard.metric_used.toUpperCase()}</span> · Winning Margin: {scorecard.margin.toFixed(2)}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 uppercase">
              {scorecard.winner} wins
            </span>
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
                    {scorecard.challenger_duration_ms.toFixed(1)}ms
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
                    {scorecard.defender_duration_ms.toFixed(1)}ms
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
