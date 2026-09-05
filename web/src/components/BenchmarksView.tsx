import React, { useState } from 'react';
import { CheckCircle2, XCircle, Play, RefreshCw, FileCode, CheckSquare, Clock } from 'lucide-react';
import { Scenario, SuiteResult } from '../types';

interface BenchmarksViewProps {
  scenarios: Scenario[];
  onRefresh: () => void;
}

export const BenchmarksView: React.FC<BenchmarksViewProps> = ({ scenarios, onRefresh }) => {
  const [running, setRunning] = useState(false);
  const [suiteResult, setSuiteResult] = useState<SuiteResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const handleRunSuite = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch('/api/benchmarks/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSuiteResult(data);
      } else {
        setRunError(data.error || 'Failed to execute benchmark suite.');
      }
    } catch (err) {
      setRunError('Failed to execute benchmark suite.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Run Battery Header */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" /> Verification Contracts & Benchmarks
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Ground-truth deterministic contract assertions ({scenarios.length} scenarios loaded).
          </p>
        </div>
        <button
          onClick={handleRunSuite}
          disabled={running}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2 shadow-md shrink-0"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Evaluating Battery...' : 'Run All Contracts'}
        </button>
      </div>

      {runError && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-3 text-xs text-red-200">
          {runError}
        </div>
      )}

      {/* Latest Suite Result Display */}
      {suiteResult && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg border-l-4 border-l-emerald-500">
          <div className="flex flex-wrap justify-between items-center mb-4 pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">{suiteResult.suite_name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Evaluated {suiteResult.total_scenarios} scenarios in {suiteResult.total_duration_ms.toFixed(1)}ms
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  suiteResult.all_passed
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                Pass Rate: {(suiteResult.pass_rate * 100).toFixed(1)}% ({suiteResult.passed_scenarios}/{suiteResult.total_scenarios})
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {suiteResult.results.map((res, idx) => (
              <div
                key={idx}
                className="bg-background/50 border border-border/60 rounded-lg p-3 flex justify-between items-center text-xs"
              >
                <div className="flex items-center gap-2">
                  {res.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="font-semibold text-gray-200">{res.scenario_name}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400 font-mono">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {res.duration_ms.toFixed(1)}ms</span>
                  <span className={res.passed ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                    {res.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenarios List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((scenario) => (
          <div key={scenario.name} className="bg-card border border-border rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-400" /> {scenario.name}
                </h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">{scenario.description || 'No description provided.'}</p>

              <div className="space-y-2 mb-3">
                {scenario.steps.map((step, sIdx) => (
                  <div key={sIdx} className="bg-background/60 border border-border/50 rounded p-2 text-xs font-mono">
                    <div className="text-gray-300 font-semibold mb-1">Step: {step.name}</div>
                    <div className="text-gray-500 truncate mb-1.5">$ {step.command}</div>
                    <div className="space-y-0.5">
                      {step.assertions.map((a, aIdx) => (
                        <div key={aIdx} className="text-[11px] text-emerald-400/90">
                          ✓ [{a.type}] {a.description || `${a.target_field} == ${a.expected}`}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border">
              {scenario.tags.map((t) => (
                <span key={t} className="text-[11px] font-mono text-gray-400 bg-background px-2 py-0.5 rounded border border-border">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
