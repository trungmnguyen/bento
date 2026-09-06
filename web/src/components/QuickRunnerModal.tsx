import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  FileCode,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Scenario } from '../types';
import { playClack, playTastePass, playTasteFail } from '../utils/audio';
import { showToast } from './Toast';
import { useA11yModal } from '../hooks/useA11yModal';
import { apiFetch } from '../utils/api';

interface QuickRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: Scenario[];
  initialScenarioName?: string | null;
  onRunComplete?: () => void;
}

interface StepResult {
  step_name: string;
  status: string;
  error_message?: string | null;
}

interface RunResult {
  scenario_name: string;
  passed: boolean;
  total_duration_ms: number;
  step_results: StepResult[];
}

export const QuickRunnerModal: React.FC<QuickRunnerModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  initialScenarioName,
  onRunComplete,
}) => {
  const [selectedName, setSelectedName] = useState<string>(
    initialScenarioName || (scenarios[0]?.name ?? '')
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const { modalProps } = useA11yModal({
    isOpen,
    onClose,
    containerRef: modalRef,
  });

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let timer: any;
    if (isRunning) {
      const start = Date.now();
      timer = setInterval(() => {
        setElapsedMs(Date.now() - start);
      }, 50);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (initialScenarioName) {
      setSelectedName(initialScenarioName);
    } else if (scenarios.length > 0 && !selectedName) {
      setSelectedName(scenarios[0].name);
    }
  }, [initialScenarioName, scenarios]);

  if (!isOpen) return null;

  const handleRun = async () => {
    if (!selectedName) return;
    playClack();
    setIsRunning(true);
    setResult(null);

    try {
      const res = await apiFetch('/api/benchmarks/run-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedName }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        if (data.passed) {
          playTastePass();
          showToast({
            title: 'Flight Tasted Successfully',
            message: `${data.scenario_name} passed in ${data.total_duration_ms}ms`,
            type: 'success',
          });
        } else {
          playTasteFail();
          showToast({
            title: 'Flight Failed Tasting',
            message: `${data.scenario_name} encountered failed assertions.`,
            type: 'error',
          });
        }
        if (onRunComplete) onRunComplete();
      } else {
        playTasteFail();
        showToast({
          title: 'Run Error',
          message: data.error || 'Failed to execute scenario',
          type: 'error',
        });
      }
    } catch (err: any) {
      playTasteFail();
      showToast({
        title: 'Network Error',
        message: err.message || 'Could not connect to Bento daemon',
        type: 'error',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      playClack();
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // ignore clipboard denial
    }
  };

  const activeScenario = scenarios.find((s) => s.name === selectedName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClack();
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        {...modalProps}
        role="dialog"
        aria-modal="true"
        aria-labelledby="runner-modal-title"
        className="w-full max-w-2xl bg-bento-surface border border-bento-border rounded-bento shadow-2xl p-6 text-gray-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-bento-border/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Play className="w-4 h-4 fill-amber-300" />
            </div>
            <div>
              <h2 id="runner-modal-title" className="text-sm font-bold text-white flex items-center gap-1.5">
                Instant Tasting Flight Runner
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Live Contract
                </span>
              </h2>
              <p className="text-xs text-gray-400">Execute deterministic scenario assertions with step diffs</p>
            </div>
          </div>
          <button
            onClick={() => {
              playClack();
              onClose();
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Close Instant Tasting Flight Runner"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Scenario Picker */}
          <div className="space-y-1.5">
            <label htmlFor="tasting-contract-select" className="text-xs font-medium text-gray-300">
              Select Tasting Contract
            </label>
            <div className="flex gap-2">
              <select
                id="tasting-contract-select"
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                disabled={isRunning}
                aria-label="Select Tasting Contract"
                className="flex-1 bg-bento-elevated border border-bento-border rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-400/60 font-mono"
              >
                {scenarios.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.steps?.length || 0} steps)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning || !selectedName}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                  isRunning
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse'
                    : 'bg-amber-400 text-gray-950 hover:bg-amber-300 font-extrabold shadow-sm'
                }`}
              >
                {isRunning ? (
                  <>
                    <Flame className="w-3.5 h-3.5 animate-spin" /> Simmering...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Taste Flight
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Scenario Details Preview */}
          {activeScenario && (
            <div className="p-3 rounded-xl bg-bento-elevated/40 border border-bento-border/50 text-xs">
              <div className="text-gray-300 font-medium flex items-center justify-between">
                <span>{activeScenario.description || 'No description provided'}</span>
                <span className="font-mono text-[10px] text-gray-400">{activeScenario.steps?.length || 0} steps</span>
              </div>
              {activeScenario.tags && activeScenario.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {activeScenario.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Live Run Status & Pipeline */}
          {isRunning && (
            <div className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Flame className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Simmering Scenario: {selectedName}</span>
                </div>
                <div className="font-mono text-xs text-amber-400 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1 font-bold">
                  <Clock className="w-3 h-3 animate-pulse" />
                  <span>{elapsedMs} ms</span>
                </div>
              </div>

              {activeScenario && activeScenario.steps && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {activeScenario.steps.map((st, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-2.5 rounded-lg bg-black/40 border border-amber-400/30 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono flex items-center justify-center font-bold">
                          {sIdx + 1}
                        </span>
                        <span className="font-mono text-zinc-300 truncate">{st.name}</span>
                      </div>
                      <span className="text-[10px] text-amber-400/90 font-mono animate-pulse">simmering...</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-gray-400 text-center">Evaluating ground-truth contract assertions...</p>
            </div>
          )}

          {/* Result Inspection */}
          {result && (
            <div className="space-y-3 mt-4">
              {/* Outcome Banner */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  result.passed
                    ? 'bg-bento-matcha/15 border-bento-matcha/40 text-bento-matcha'
                    : 'bg-bento-salmon/15 border-bento-salmon/40 text-bento-salmon'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  {result.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{result.passed ? 'Flight Passed Verification' : 'Flight Burnt (Assertions Failed)'}</span>
                </div>
                <div className="font-mono text-xs flex items-center gap-1.5 text-gray-300">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{result.total_duration_ms} ms</span>
                </div>
              </div>

              {/* Step Pipeline Breakdown */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Step Execution Pipeline</div>
                <div className="space-y-2">
                  {result.step_results.map((sr, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        sr.status === 'PASSED'
                          ? 'bg-bento-elevated/40 border-bento-border/60'
                          : 'bg-rose-950/20 border-rose-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono">
                          {sr.status === 'PASSED' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-bento-matcha shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-bento-salmon shrink-0" />
                          )}
                          <span className="font-bold text-gray-200">{sr.step_name}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            sr.status === 'PASSED'
                              ? 'bg-bento-matcha/20 text-bento-matcha'
                              : 'bg-bento-salmon/20 text-bento-salmon'
                          }`}
                        >
                          {sr.status}
                        </span>
                      </div>

                      {/* Assertion Error Diff */}
                      {sr.error_message && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-black/50 border border-rose-500/30 text-[11px] font-mono relative">
                          <div className="flex justify-between items-center text-rose-300 mb-1">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Assertion Failure Diff:
                            </span>
                            <button
                              onClick={() => handleCopy(sr.error_message || '', idx)}
                              className="p-1 rounded text-gray-400 hover:text-white transition"
                              title="Copy error details"
                            >
                              {copiedIndex === idx ? <Check className="w-3 h-3 text-bento-matcha" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <pre className="text-gray-300 whitespace-pre-wrap break-all leading-relaxed">
                            {sr.error_message}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-bento-border/70 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              playClack();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
