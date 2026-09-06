import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Activity,
  TrendingUp,
  BarChart3,
  Copy,
  Check,
  Share2,
  X,
} from 'lucide-react';
import { MatchaCupIcon, SoyFishIcon, WasabiBadgeIcon, BentoBoxIcon } from './icons/BentoIcons';
import { TraceEvent, CrystallizedSkill, TelemetryMetrics } from '../types';
import { playZenBell, playClack, playTastePass, playShisoSnap } from '../utils/audio';
import { showToast } from './Toast';
import { useA11yModal } from '../hooks/useA11yModal';
import { apiFetch } from '../utils/api';

interface TracesViewProps {
  traces: TraceEvent[];
  skills: CrystallizedSkill[];
  onRefresh: () => void;
}

type RangeOption = '20' | '50' | 'ALL';
type LatencyBucket = 'lt50' | '50to150' | '150to500' | 'gt500' | null;

interface HoveredPoint {
  index: number;
  val: number;
  x: number;
  y: number;
  trace?: TraceEvent;
}

export const TracesView: React.FC<TracesViewProps> = ({ traces, skills, onRefresh }) => {
  const [dreaming, setDreaming] = useState(false);
  const [dreamMessage, setDreamMessage] = useState<string | null>(null);

  // Telemetry Metrics State
  const [telemetry, setTelemetry] = useState<TelemetryMetrics | null>(null);
  const [sparklineStr, setSparklineStr] = useState<string>('');
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // Radar Interactive State
  const [rangeFilter, setRangeFilter] = useState<RangeOption>('20');
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Faceted Filtering & Histogram State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [latencyBucket, setLatencyBucket] = useState<LatencyBucket>(null);
  const [selectedTrace, setSelectedTrace] = useState<TraceEvent | null>(null);
  const [detailTab, setDetailTab] = useState<'prompt' | 'output' | 'assertions' | 'raw'>('prompt');

  const drawerRef = useRef<HTMLDivElement>(null);
  const { modalProps } = useA11yModal({
    isOpen: !!selectedTrace,
    onClose: () => setSelectedTrace(null),
    containerRef: drawerRef,
  });

  const fetchTelemetry = async (signal?: AbortSignal) => {
    setLoadingTelemetry(true);
    try {
      const res = await apiFetch('/api/telemetry', signal ? { signal } : undefined);
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data.metrics);
        setSparklineStr(data.sparkline || '');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        // ignore non-abort errors
      }
    } finally {
      setLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTelemetry(controller.signal);
    return () => {
      controller.abort();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [traces]);

  const handleTriggerDream = async () => {
    playClack();
    setDreaming(true);
    setDreamMessage(null);
    try {
      const res = await apiFetch('/api/dream', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        playZenBell();
        const lessons = data.new_lessons_discovered || 0;
        const skillsCount = data.crystallized_skills_count || 0;
        setDreamMessage(
          `🍵 Overnight Tea Brewed! Harvested ${lessons} new golden rules and crystallized ${skillsCount} procedural skills into .bento/skills/.`
        );
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

  // Filtered latencies based on range filter
  const displayedLatencies = useMemo(() => {
    if (!telemetry?.recent_latencies) return [];
    const all = telemetry.recent_latencies;
    if (rangeFilter === '20') return all.slice(-20);
    if (rangeFilter === '50') return all.slice(-50);
    return all;
  }, [telemetry?.recent_latencies, rangeFilter]);

  // Interactive SVG points calculation with finite number protection (WASABI-DOS-03)
  const radarChartData = useMemo(() => {
    const lats = displayedLatencies.filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (lats.length < 2) return null;

    const minVal = Math.min(...lats);
    const maxVal = Math.max(...lats);
    const span = maxVal - minVal || 1.0;
    const width = 600;
    const height = 120;
    const paddingX = 20;
    const paddingY = 16;

    const points = lats.map((val, idx) => {
      const x = paddingX + (idx / (lats.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - ((val - minVal) / span) * (height - 2 * paddingY);
      return { x, y, val, idx };
    });

    const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    return { points, polylineStr, minVal, maxVal, width, height };
  }, [displayedLatencies]);

  // Interactive Latency Distribution Histogram Bins
  const histogramBins = useMemo(() => {
    const lats = telemetry?.recent_latencies || [];
    const bins: Array<{ id: NonNullable<LatencyBucket>; label: string; count: number; color: string; desc: string }> = [
      { id: 'lt50', label: '< 50ms', count: 0, color: '#40c057', desc: 'Optimal' },
      { id: '50to150', label: '50-150ms', count: 0, color: '#38d9a9', desc: 'Fast' },
      { id: '150to500', label: '150-500ms', count: 0, color: '#ffd43b', desc: 'Nominal' },
      { id: 'gt500', label: '> 500ms', count: 0, color: '#ff6b6b', desc: 'Heavy' },
    ];
    lats.forEach((l) => {
      if (l < 50) bins[0].count++;
      else if (l < 150) bins[1].count++;
      else if (l < 500) bins[2].count++;
      else bins[3].count++;
    });
    const maxCount = Math.max(1, ...bins.map((b) => b.count));
    return { bins, maxCount };
  }, [telemetry?.recent_latencies]);

  // Filtered Traces with Faceted Search and Status Filtering
  const filteredTraces = useMemo(() => {
    return traces.filter((t) => {
      if (statusFilter === 'PASSED' && !t.passed) return false;
      if (statusFilter === 'FAILED' && t.passed) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.task_name?.toLowerCase().includes(q);
        const matchesFails = t.failed_assertions?.some((f) => f.toLowerCase().includes(q));
        const matchesPrompt = t.prompt_sent?.toLowerCase().includes(q);
        if (!matchesName && !matchesFails && !matchesPrompt) return false;
      }
      return true;
    });
  }, [traces, statusFilter, searchQuery]);

  // 1-Click Export Markdown Report
  const handleExportReport = async () => {
    if (!telemetry) return;
    playClack();

    const md = [
      '# 🍱 Bento Sensory Telemetry & Quality Report',
      `*Generated at ${new Date().toLocaleString()}*`,
      '',
      '## Quality & Execution Percentiles',
      `- **Total Executions:** ${telemetry.total_runs}`,
      `- **Pass Rate:** ${telemetry.pass_rate.toFixed(1)}% (${telemetry.passed_runs} passed / ${telemetry.failed_runs} failed)`,
      `- **P50 Latency (Median):** ${telemetry.p50_latency_ms.toFixed(1)} ms`,
      `- **P90 Latency (Tail):** ${telemetry.p90_latency_ms.toFixed(1)} ms`,
      `- **P99 Latency (Anomaly):** ${telemetry.p99_latency_ms.toFixed(1)} ms`,
      `- **Average Latency:** ${telemetry.avg_latency_ms.toFixed(1)} ms`,
      '',
      '## Latency Sparkline',
      `\`${sparklineStr || '—'}\``,
      '',
      '---',
      '*Packed Fresh by Bento Harness Engineering with Zero External Dependencies*',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(md);
      setIsCopied(true);
      playShisoSnap();
      showToast({
        title: 'Telemetry Report Exported',
        message: 'Markdown report copied to clipboard. Ready for PR or Slack!',
        type: 'success',
      });
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setIsCopied(false), 2500);
    } catch {
      showToast({ title: 'Clipboard Failed', message: 'Could not access clipboard.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sensory Spark Telemetry Banner */}
      {telemetry && (
        <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card">
          <div className="flex flex-wrap justify-between items-center mb-4 pb-3 border-b border-bento-border gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-bento-matcha" />
              <h2 className="text-sm font-bold text-gray-100">
                Sensory Telemetry Radar · Quality & Latency Percentiles
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 font-mono text-xs text-gray-400">
                <span>{telemetry.total_runs} Total Executions</span>
                <span className="text-gray-600">|</span>
                <span className="text-emerald-400 font-semibold">{telemetry.passed_runs} Passed</span>
                <span className="text-gray-600">|</span>
                <span className="text-rose-400 font-semibold">{telemetry.failed_runs} Failed</span>
              </div>
              <button
                onClick={handleExportReport}
                className="px-3 py-1.5 rounded-xl bg-bento-lacquer hover:bg-bento-border border border-bento-border text-xs text-gray-300 hover:text-white transition flex items-center gap-1.5 font-medium"
                title="Copy Telemetry Markdown Report"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-bento-matcha" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Export Report'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">Pass Rate</div>
              <div className="text-lg font-bold text-bento-matcha font-mono mt-0.5">
                {(telemetry.pass_rate ?? 0).toFixed(1)}%
              </div>
            </div>

            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">P50 (Median)</div>
              <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
                {(telemetry.p50_latency_ms ?? 0).toFixed(1)}ms
              </div>
            </div>

            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">P90 (Tail)</div>
              <div className="text-lg font-bold text-orange-300 font-mono mt-0.5">
                {(telemetry.p90_latency_ms ?? 0).toFixed(1)}ms
              </div>
            </div>

            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">P99 (Anomaly)</div>
              <div className="text-lg font-bold text-rose-300 font-mono mt-0.5">
                {(telemetry.p99_latency_ms ?? 0).toFixed(1)}ms
              </div>
            </div>

            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-3 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">Average</div>
              <div className="text-lg font-bold text-cyan-300 font-mono mt-0.5">
                {(telemetry.avg_latency_ms ?? 0).toFixed(1)}ms
              </div>
            </div>
          </div>

          {/* Interactive Latency Radar SVG Canvas */}
          {radarChartData && (
            <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-4">
              <div className="flex flex-wrap justify-between items-center mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <BarChart3 className="w-4 h-4 text-bento-matcha" />
                  <span className="font-semibold text-gray-200">Interactive Latency Radar:</span>
                  <span className="font-mono text-emerald-400 text-sm tracking-widest">{sparklineStr}</span>
                </div>

                {/* Range Filter Pills */}
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  {(['20', '50', 'ALL'] as RangeOption[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        playClack();
                        setRangeFilter(opt);
                      }}
                      className={`px-2.5 py-0.5 rounded-lg border transition ${
                        rangeFilter === opt
                          ? 'bg-bento-matcha/20 text-bento-matcha border-bento-matcha/40 font-bold'
                          : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5'
                      }`}
                    >
                      {opt === 'ALL' ? 'All Traces' : `Last ${opt}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* SVG Chart with Scrubber */}
              <div
                role="region"
                tabIndex={0}
                aria-label="Interactive latency radar chart. Use Left and Right arrow keys to scrub data points."
                onKeyDown={(e) => {
                  if (!radarChartData || radarChartData.points.length === 0) return;
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    setHoveredPoint((prev) => {
                      const nextIdx = Math.min((prev?.index ?? -1) + 1, radarChartData.points.length - 1);
                      const pt = radarChartData.points[nextIdx];
                      const traceIdx = traces.length - 1 - (radarChartData.points.length - 1 - nextIdx);
                      const matchedTrace = traceIdx >= 0 && traceIdx < traces.length ? traces[traceIdx] : undefined;
                      return { index: nextIdx, val: pt.val, x: pt.x, y: pt.y, trace: matchedTrace };
                    });
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    setHoveredPoint((prev) => {
                      const prevIdx = Math.max((prev?.index ?? 1) - 1, 0);
                      const pt = radarChartData.points[prevIdx];
                      const traceIdx = traces.length - 1 - (radarChartData.points.length - 1 - prevIdx);
                      const matchedTrace = traceIdx >= 0 && traceIdx < traces.length ? traces[traceIdx] : undefined;
                      return { index: prevIdx, val: pt.val, x: pt.x, y: pt.y, trace: matchedTrace };
                    });
                  }
                }}
                className="relative h-28 w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-bento-matcha rounded-lg"
              >
                <svg
                  viewBox={`0 0 ${radarChartData.width} ${radarChartData.height}`}
                  className="w-full h-full overflow-visible cursor-crosshair"
                  onMouseLeave={() => setHoveredPoint(null)}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relX = (e.clientX - rect.left) / rect.width;
                    const approxIdx = Math.round(relX * (radarChartData.points.length - 1));
                    const boundedIdx = Math.max(0, Math.min(radarChartData.points.length - 1, approxIdx));
                    const pt = radarChartData.points[boundedIdx];
                    // Find corresponding trace with defensive bounds check (WASABI-DOS-03)
                    const traceIdx = traces.length - 1 - (radarChartData.points.length - 1 - boundedIdx);
                    const matchedTrace = traceIdx >= 0 && traceIdx < traces.length ? traces[traceIdx] : undefined;
                    setHoveredPoint({
                      index: boundedIdx,
                      val: pt.val,
                      x: pt.x,
                      y: pt.y,
                      trace: matchedTrace,
                    });
                  }}
                >
                  {/* Subtle Grid Baseline */}
                  <line
                    x1="20"
                    y1={radarChartData.height - 16}
                    x2={radarChartData.width - 20}
                    y2={radarChartData.height - 16}
                    stroke="#2e2738"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />

                  {/* Latency Polyline Curve */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={radarChartData.polylineStr}
                  />

                  {/* Scatter Dots */}
                  {radarChartData.points.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredPoint?.index === idx ? 5 : 2.5}
                      className="transition-all duration-150"
                      fill={hoveredPoint?.index === idx ? '#ffd43b' : '#10b981'}
                      stroke={hoveredPoint?.index === idx ? '#ffffff' : '#047857'}
                      strokeWidth={hoveredPoint?.index === idx ? 2 : 1}
                    />
                  ))}

                  {/* Active Scrubber Vertical Crosshair */}
                  {hoveredPoint && (
                    <line
                      x1={hoveredPoint.x}
                      y1="0"
                      x2={hoveredPoint.x}
                      y2={radarChartData.height}
                      stroke="#ffd43b"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  )}
                </svg>

                {/* Floating Tooltip Card */}
                {hoveredPoint && (
                  <div
                    className="absolute z-10 bg-bento-surface border border-bento-border/90 shadow-2xl rounded-xl p-2.5 text-xs text-gray-200 pointer-events-none transform -translate-x-1/2 -top-16"
                    style={{ left: `${(hoveredPoint.x / radarChartData.width) * 100}%` }}
                  >
                    <div className="font-mono text-[11px] text-amber-300 font-bold flex items-center gap-1.5">
                      <span>{hoveredPoint.val.toFixed(1)} ms</span>
                      {hoveredPoint.trace?.passed !== undefined && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] ${
                            hoveredPoint.trace.passed
                              ? 'bg-bento-matcha/20 text-bento-matcha'
                              : 'bg-bento-salmon/20 text-bento-salmon'
                          }`}
                        >
                          {hoveredPoint.trace.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      )}
                    </div>
                    {hoveredPoint.trace?.task_name && (
                      <div className="text-[10px] text-gray-400 font-sans truncate max-w-[160px] mt-0.5">
                        {hoveredPoint.trace.task_name}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Latency Distribution Histogram */}
          <div className="bg-bento-lacquer border border-bento-border/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-bento-matcha" />
                Latency Distribution Bins (Click to Filter)
              </span>
              {latencyBucket && (
                <button
                  onClick={() => {
                    playClack();
                    setLatencyBucket(null);
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition underline font-mono"
                >
                  Clear Bin Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {histogramBins.bins.map((bin) => {
                const isSelected = latencyBucket === bin.id;
                const pct = ((bin.count / histogramBins.maxCount) * 100).toFixed(0);
                return (
                  <button
                    key={bin.id}
                    onClick={() => {
                      playClack();
                      setLatencyBucket(isSelected ? null : bin.id);
                    }}
                    aria-label={`Filter traces by latency ${bin.label}, ${bin.count} traces`}
                    aria-pressed={isSelected}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-white/10 border-white/40 shadow-sm ring-1 ring-white/20'
                        : 'bg-bento-surface/60 border-bento-border hover:border-bento-border/90 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[11px] font-mono text-gray-400 mb-1">
                      <span>{bin.label}</span>
                      <span className="font-bold text-gray-200">{bin.count}</span>
                    </div>
                    {/* Visual Bar */}
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: bin.color }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 font-mono">{bin.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
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
              <div key={skill.name} className="bg-bento-lacquer border border-bento-border rounded-xl p-4 hover:border-bento-salmon/40 transition overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h4 className="font-mono text-xs font-bold text-bento-salmon break-all sm:break-normal min-w-0">
                    {skill.name}
                  </h4>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {skill.trigger_tags.map((t) => (
                      <span key={t} className="text-[10px] font-mono text-gray-400 bg-bento-elevated px-2 py-0.5 rounded-full border border-bento-border whitespace-nowrap">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-300 mb-2.5 break-words">{skill.description}</p>
                <div className="bg-[#100e14] rounded-lg p-2.5 text-[11px] font-mono text-gray-300 space-y-1 border border-bento-border/60 overflow-x-auto">
                  {skill.steps.map((step, idx) => (
                    <div key={idx} className="text-bento-rice flex items-start gap-1.5 break-words">
                      <span className="text-bento-tamago font-bold shrink-0">↳</span> <span>{step}</span>
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
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <BentoBoxIcon className="w-5 h-5" /> Tasting Notes Timeline · Sensory Execution Traces ({traces.length})
          </h2>
          <button
            onClick={() => {
              playClack();
              onRefresh();
              fetchTelemetry();
            }}
            className="p-1.5 hover:bg-bento-border rounded-xl text-gray-400 hover:text-white transition"
            title="Refresh Traces"
            aria-label="Refresh traces"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Faceted Filter & Search Bar */}
        <div className="p-4 border-b border-bento-border/70 bg-bento-lacquer/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                id="trace-search-query"
                type="text"
                placeholder="Search traces (task, prompt, failed assertions)..."
                aria-label="Search execution traces"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-bento-surface border border-bento-border rounded-lg pl-3 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-bento-salmon/50 font-mono w-64 sm:w-72 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    playClack();
                    setSearchQuery('');
                  }}
                  aria-label="Clear trace search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-bento-border/60 text-xs" role="group" aria-label="Trace Status Filter">
              {(['ALL', 'PASSED', 'FAILED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  aria-pressed={statusFilter === st}
                  onClick={() => {
                    playClack();
                    setStatusFilter(st);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    statusFilter === st
                      ? 'bg-bento-salmon/20 text-bento-salmon font-bold border border-bento-salmon/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'PASSED' ? 'Passed ✓' : 'Failed ✗'}
                </button>
              ))}
            </div>

            {latencyBucket && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                Bin: {histogramBins.bins.find((b) => b.id === latencyBucket)?.label}
                <button
                  onClick={() => {
                    playClack();
                    setLatencyBucket(null);
                  }}
                  aria-label="Remove latency bin filter"
                  className="hover:text-white ml-0.5"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          <div className="text-xs text-zinc-400 font-mono">
            Showing <strong className="text-zinc-200">{filteredTraces.length}</strong> of {traces.length} traces
          </div>
        </div>

        {filteredTraces.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <MatchaCupIcon className="w-12 h-12 mx-auto mb-3 opacity-50 animate-bento-bounce" />
            <p className="text-sm font-medium text-gray-300">No sensory taste logs match the current filters.</p>
            <button
              onClick={() => {
                playClack();
                setSearchQuery('');
                setStatusFilter('ALL');
                setLatencyBucket(null);
              }}
              className="mt-2 text-xs text-bento-salmon hover:underline font-mono"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-bento-border/70">
            {filteredTraces.map((trace, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                aria-label={`Inspect trace for ${trace.task_name} iteration ${trace.iteration}, status ${trace.passed ? 'passed' : 'failed'}`}
                onClick={() => {
                  playClack();
                  setSelectedTrace(trace);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playClack();
                    setSelectedTrace(trace);
                  }
                }}
                className="p-5 hover:bg-bento-elevated/40 transition cursor-pointer group focus:outline-none focus:bg-white/5"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {trace.passed ? (
                      <WasabiBadgeIcon className="w-4 h-4 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-bento-salmon shrink-0" />
                    )}
                    <span className="font-bold text-sm text-gray-100 group-hover:text-amber-300 transition break-words">{trace.task_name}</span>
                    <span className="text-xs font-mono bg-bento-lacquer border border-bento-border px-2 py-0.5 rounded-lg text-bento-tamago font-semibold shrink-0">
                      Iteration {trace.iteration}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {trace.timestamp || 'Recent'}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 group-hover:text-zinc-300 transition">
                      Inspect ➔
                    </span>
                  </div>
                </div>

                {trace.failed_assertions && trace.failed_assertions.length > 0 && (
                  <div className="my-2.5 bg-rose-950/20 border border-bento-salmon/30 rounded-xl p-3 text-xs text-rose-200 font-mono break-words overflow-x-auto">
                    <strong className="text-bento-salmon font-bold">Failed Assertions:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-300">
                      {trace.failed_assertions.map((fail, fIdx) => (
                        <li key={fIdx} className="break-all">{fail}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {trace.prompt_sent && (
                  <div className="mt-2 text-xs text-gray-400 min-w-0">
                    <span className="text-zinc-500 font-mono text-[11px]">Prompt:</span>{' '}
                    <span className="text-zinc-300 font-mono text-[11px] truncate inline-block max-w-full sm:max-w-xl align-bottom">
                      {trace.prompt_sent.slice(0, 120)}...
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-Over Trace Detail Drawer */}
      {selectedTrace && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => {
              playClack();
              setSelectedTrace(null);
            }}
          />
          <div
            ref={drawerRef}
            {...modalProps}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trace-drawer-title"
            className="relative w-screen max-w-xl bg-bento-surface border-l border-bento-border shadow-2xl flex flex-col z-10"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-bento-border bg-[#14121a] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {selectedTrace.passed ? (
                  <WasabiBadgeIcon className="w-5 h-5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-bento-salmon shrink-0" />
                )}
                <div className="truncate">
                  <h3 id="trace-drawer-title" className="text-sm font-bold text-zinc-100 truncate">{selectedTrace.task_name}</h3>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 mt-0.5">
                    <span>Iteration {selectedTrace.iteration}</span>
                    <span>·</span>
                    <span className={selectedTrace.passed ? 'text-bento-matcha font-bold' : 'text-bento-salmon font-bold'}>
                      {selectedTrace.passed ? 'PASSED ✓' : 'FAILED ✗'}
                    </span>
                    <span>·</span>
                    <span>Exit: {selectedTrace.exit_code}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={async () => {
                    playTastePass();
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(selectedTrace, null, 2));
                      showToast({ title: 'Trace Copied', message: 'Trace JSON copied to clipboard', type: 'success' });
                    } catch {
                      showToast({ title: 'Copy Failed', message: 'Clipboard access denied', type: 'error' });
                    }
                  }}
                  title="Copy Trace JSON"
                  aria-label="Copy Trace JSON"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    playClack();
                    setSelectedTrace(null);
                  }}
                  title="Close trace details"
                  aria-label="Close trace details"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Selector */}
            <div role="tablist" aria-label="Trace detail sections" className="px-5 py-2.5 border-b border-bento-border bg-[#16131c] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {(['prompt', 'output', 'assertions', 'raw'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`trace-tab-${tab}`}
                  aria-controls={`trace-panel-${tab}`}
                  aria-selected={detailTab === tab}
                  tabIndex={detailTab === tab ? 0 : -1}
                  onClick={() => {
                    playClack();
                    setDetailTab(tab);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition whitespace-nowrap shrink-0 ${
                    detailTab === tab
                      ? 'bg-bento-salmon/20 text-bento-salmon border border-bento-salmon/30 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  {tab === 'prompt' && 'Prompt Sent'}
                  {tab === 'output' && 'Agent Output'}
                  {tab === 'assertions' && `Failed (${selectedTrace.failed_assertions?.length || 0})`}
                  {tab === 'raw' && 'Raw JSON'}
                </button>
              ))}
            </div>

            {/* Drawer Content */}
            <div
              id={`trace-panel-${detailTab}`}
              role="tabpanel"
              aria-labelledby={`trace-tab-${detailTab}`}
              tabIndex={0}
              className="flex-1 overflow-y-auto p-5 focus:outline-none"
            >
              {detailTab === 'prompt' && (
                <div>
                  <h4 className="text-xs font-mono text-zinc-400 mb-2 font-semibold">Prompt Dispatched to Agent:</h4>
                  <pre className="p-4 rounded-xl bg-black/60 border border-bento-border font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {selectedTrace.prompt_sent || 'No prompt content recorded.'}
                  </pre>
                </div>
              )}

              {detailTab === 'output' && (
                <div>
                  <h4 className="text-xs font-mono text-zinc-400 mb-2 font-semibold">Agent Execution Output / Diff:</h4>
                  <pre className="p-4 rounded-xl bg-black/60 border border-bento-border font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {selectedTrace.agent_output || 'No output recorded.'}
                  </pre>
                </div>
              )}

              {detailTab === 'assertions' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-zinc-400 font-semibold">Contract Assertion Failures:</h4>
                  {selectedTrace.failed_assertions && selectedTrace.failed_assertions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTrace.failed_assertions.map((fail, i) => (
                        <div key={i} className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs font-mono text-rose-200">
                          {fail}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 font-mono">
                      All assertions satisfied cleanly! Zero contract violations.
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'raw' && (
                <div>
                  <h4 className="text-xs font-mono text-zinc-400 mb-2 font-semibold">Complete Event JSON Record:</h4>
                  <pre className="p-4 rounded-xl bg-black/60 border border-bento-border font-mono text-xs text-amber-200 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {JSON.stringify(selectedTrace, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
