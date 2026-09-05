import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Activity,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { MatchaCupIcon, SoyFishIcon, WasabiBadgeIcon, BentoBoxIcon } from './icons/BentoIcons';
import { TraceEvent, CrystallizedSkill, TelemetryMetrics } from '../types';
import { playZenBell, playClack } from '../utils/audio';

interface TracesViewProps {
  traces: TraceEvent[];
  skills: CrystallizedSkill[];
  onRefresh: () => void;
}

export const TracesView: React.FC<TracesViewProps> = ({ traces, skills, onRefresh }) => {
  const [dreaming, setDreaming] = useState(false);
  const [dreamMessage, setDreamMessage] = useState<string | null>(null);

  // Telemetry Metrics State
  const [telemetry, setTelemetry] = useState<TelemetryMetrics | null>(null);
  const [sparklineStr, setSparklineStr] = useState<string>('');
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  const fetchTelemetry = async () => {
    setLoadingTelemetry(true);
    try {
      const res = await fetch('/api/telemetry');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data.metrics);
        setSparklineStr(data.sparkline || '');
      }
    } catch {
      // ignore
    } finally {
      setLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, [traces]);

  const handleTriggerDream = async () => {
    playClack();
    setDreaming(true);
    setDreamMessage(null);
    try {
      const res = await fetch('/api/dream', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        playZenBell();
        setDreamMessage(`🍵 Overnight Tea Brewed! Dream harvested ${data.new_lessons_discovered || 0} new golden recipe lessons.`);
        onRefresh();
        fetchTelemetry();
      } else {
        setDreamMessage('Tea steeping encountered an error.');
      }
    } catch (err) {
      setDreamMessage('Failed to brew overnight dream cycle.');
    } finally {
      setDreaming(false);
    }
  };

  // Build SVG sparkline points
  const sparklinePoints = React.useMemo(() => {
    if (!telemetry || telemetry.recent_latencies.length < 2) return '';
    const lats = telemetry.recent_latencies;
    const minVal = Math.min(...lats);
    const maxVal = Math.max(...lats);
    const span = maxVal - minVal || 1.0;
    const width = 280;
    const height = 48;
    const padding = 6;

    return lats
      .map((val, idx) => {
        const x = padding + (idx / (lats.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((val - minVal) / span) * (height - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [telemetry]);

  return (
    <div className="space-y-6">
      {/* Sensory Spark Telemetry Banner */}
      {telemetry && (
        <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card">
          <div className="flex flex-wrap justify-between items-center mb-4 pb-3 border-b border-bento-border">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-bento-matcha" />
              <h3 className="text-sm font-bold text-gray-100">
                Sensory Spark Telemetry · Quality & Latency Percentiles
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-gray-400">
              <span>{telemetry.total_runs} Total Executions</span>
              <span className="text-gray-600">|</span>
              <span className="text-emerald-400">{telemetry.passed_runs} Passed</span>
              <span className="text-gray-600">|</span>
              <span className="text-rose-400">{telemetry.failed_runs} Failed</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">Pass Rate</div>
              <div className="text-lg font-bold text-bento-matcha font-mono mt-0.5">
                {telemetry.pass_rate.toFixed(1)}%
              </div>
            </div>

            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">P50 (Median)</div>
              <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
                {telemetry.p50_latency_ms.toFixed(1)}ms
              </div>
            </div>

            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">P90 (Tail)</div>
              <div className="text-lg font-bold text-orange-300 font-mono mt-0.5">
                {telemetry.p90_latency_ms.toFixed(1)}ms
              </div>
            </div>

            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">P99 (Anomaly)</div>
              <div className="text-lg font-bold text-rose-300 font-mono mt-0.5">
                {telemetry.p99_latency_ms.toFixed(1)}ms
              </div>
            </div>

            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">Average</div>
              <div className="text-lg font-bold text-cyan-300 font-mono mt-0.5">
                {telemetry.avg_latency_ms.toFixed(1)}ms
              </div>
            </div>
          </div>

          {/* Sparkline Graphic */}
          {sparklinePoints && (
            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <BarChart3 className="w-4 h-4 text-bento-matcha" />
                <span>Recent Latency Trend:</span>
                <span className="font-mono text-emerald-400 text-sm tracking-widest">{sparklineStr}</span>
              </div>
              <div className="h-12 w-72 flex items-center justify-end">
                <svg viewBox="0 0 280 48" className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparklinePoints}
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dream Cycle Banner: Matcha Tea House */}
      <div className="bg-gradient-to-r from-[#1b271e] to-[#261f2d] border border-bento-matcha/40 rounded-bento p-5 shadow-bento-card flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <MatchaCupIcon className="w-6 h-6 animate-bento-bounce" />
            Night Dream & Tea House · Level 5 Autonomous Dreaming
          </h2>
          <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
            Anthropic-grade offline trace synthesis: Harvests historical daytime execution traces, distills multi-iteration recoveries into new Memory recipes, and crystallizes recurring commands into reusable procedural skills.
          </p>
        </div>
        <button
          onClick={handleTriggerDream}
          disabled={dreaming}
          className="w-full sm:w-auto justify-center bg-gradient-to-r from-bento-matcha to-emerald-600 hover:from-bento-matcha-hover hover:to-emerald-500 disabled:opacity-50 text-white font-extrabold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2 shadow-matcha-glow shrink-0 min-h-[42px] touch-manipulation"
        >
          {dreaming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MatchaCupIcon className="w-4 h-4" />}
          {dreaming ? 'Steeping & Dreaming...' : 'Brew Overnight Dream 🍵'}
        </button>
      </div>

      {dreamMessage && (
        <div className="bg-bento-nori border border-bento-matcha/50 rounded-xl p-3.5 text-xs text-emerald-200 flex items-center gap-2 shadow-inner">
          <WasabiBadgeIcon className="w-4 h-4 shrink-0" />
          <span>{dreamMessage}</span>
        </div>
      )}

      {/* Secret Sauce: Crystallized Procedural Skills */}
      {skills.length > 0 && (
        <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card">
          <h3 className="text-sm font-bold uppercase tracking-wider text-bento-salmon mb-3 flex items-center gap-2">
            <SoyFishIcon className="w-5 h-5 text-bento-salmon" /> Secret Sauce Recipes · Crystallized Skills ({skills.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {skills.map((skill) => (
              <div key={skill.name} className="bg-bento-lacquer border border-bento-border rounded-xl p-4 hover:border-bento-salmon/40 transition">
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="font-mono text-xs font-bold text-bento-salmon">{skill.name}</h4>
                  <div className="flex gap-1">
                    {skill.trigger_tags.map((t) => (
                      <span key={t} className="text-[10px] font-mono text-gray-400 bg-bento-elevated px-2 py-0.5 rounded-full border border-bento-border">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-300 mb-2.5">{skill.description}</p>
                <div className="bg-[#100e14] rounded-lg p-2.5 text-[11px] font-mono text-gray-300 space-y-1 border border-bento-border/60">
                  {skill.steps.map((step, idx) => (
                    <div key={idx} className="text-bento-rice flex items-center gap-1.5">
                      <span className="text-bento-tamago font-bold">↳</span> {step}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sensory Tasting Notes Event Timeline */}
      <div className="bg-bento-surface border border-bento-border rounded-bento overflow-hidden shadow-bento-card">
        <div className="px-6 py-4 border-b border-bento-border flex justify-between items-center bg-bento-elevated">
          <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <BentoBoxIcon className="w-5 h-5" /> Tasting Notes Timeline · Sensory Execution Traces ({traces.length})
          </h3>
          <button
            onClick={() => {
              playClack();
              onRefresh();
              fetchTelemetry();
            }}
            className="p-1.5 hover:bg-bento-border rounded-xl text-gray-400 hover:text-white transition"
            title="Refresh Traces"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {traces.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <MatchaCupIcon className="w-12 h-12 mx-auto mb-3 opacity-50 animate-bento-bounce" />
            <p className="text-sm font-medium text-gray-300">No sensory taste logs recorded in <code>.bento/traces/</code> yet.</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">Run <code>bento auto</code> to generate self-healing taste notes.</p>
          </div>
        ) : (
          <div className="divide-y divide-bento-border/70">
            {traces.map((trace, idx) => (
              <div key={idx} className="p-5 hover:bg-bento-elevated/40 transition">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    {trace.passed ? (
                      <WasabiBadgeIcon className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4 text-bento-salmon" />
                    )}
                    <span className="font-bold text-sm text-gray-100">{trace.task_name}</span>
                    <span className="text-xs font-mono bg-bento-lacquer border border-bento-border px-2 py-0.5 rounded-lg text-bento-tamago font-semibold">
                      Iteration {trace.iteration}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    {trace.timestamp || 'Recent'}
                  </span>
                </div>

                {trace.failed_assertions && trace.failed_assertions.length > 0 && (
                  <div className="my-2.5 bg-rose-950/20 border border-bento-salmon/30 rounded-xl p-3 text-xs text-rose-200 font-mono">
                    <strong className="text-bento-salmon font-bold">Failed Assertions:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-300">
                      {trace.failed_assertions.map((fail, fIdx) => (
                        <li key={fIdx}>{fail}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {trace.prompt_sent && (
                  <details className="mt-2 text-xs text-gray-400">
                    <summary className="cursor-pointer hover:text-bento-salmon select-none font-medium">View Prompt Sent to Chef</summary>
                    <pre className="mt-1 p-3 bg-bento-lacquer border border-bento-border rounded-xl font-mono text-[11px] text-bento-rice overflow-x-auto whitespace-pre-wrap">
                      {trace.prompt_sent}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
