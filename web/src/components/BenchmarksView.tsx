import React, { useState } from 'react';
import { XCircle, RefreshCw, FileCode, Clock, Sparkles } from 'lucide-react';
import { ChopsticksIcon, WasabiBadgeIcon, BentoBoxIcon } from './icons/BentoIcons';
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
      {/* Run Battery Header: Tasting Battery */}
      <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <ChopsticksIcon className="w-6 h-6 animate-bento-bounce" />
            Tasting Battery · Verification Contracts & Benchmarks
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Ground-truth deterministic contract assertions ({scenarios.length} tasting flights loaded).
          </p>
        </div>
        <button
          onClick={handleRunSuite}
          disabled={running}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-gray-900 font-extrabold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2 shadow-tamago-glow shrink-0"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin text-gray-900" /> : <ChopsticksIcon className="w-4 h-4" />}
          {running ? 'Tasting Battery Flights...' : 'Taste All Contracts 🥢'}
        </button>
      </div>

      {runError && (
        <div className="bg-rose-950/30 border border-bento-salmon/40 rounded-xl p-3 text-xs text-rose-200">
          {runError}
        </div>
      )}

      {/* Latest Suite Result Display */}
      {suiteResult && (
        <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card border-l-4 border-l-bento-matcha">
          <div className="flex flex-wrap justify-between items-center mb-4 pb-3 border-b border-bento-border">
            <div>
              <h3 className="text-sm font-bold text-bento-rice flex items-center gap-2">
                <BentoBoxIcon className="w-4 h-4" />
                {suiteResult.suite_name}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                Evaluated {suiteResult.total_scenarios} scenarios in {suiteResult.total_duration_ms.toFixed(1)}ms
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-3.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                  suiteResult.all_passed
                    ? 'bg-bento-matcha/15 text-bento-matcha border border-bento-matcha/30 shadow-matcha-glow'
                    : 'bg-bento-salmon/15 text-bento-salmon border border-bento-salmon/30'
                }`}
              >
                {suiteResult.all_passed && <WasabiBadgeIcon className="w-3.5 h-3.5" />}
                Pass Rate: {(suiteResult.pass_rate * 100).toFixed(1)}% ({suiteResult.passed_scenarios}/{suiteResult.total_scenarios})
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {suiteResult.results.map((res, idx) => (
              <div
                key={idx}
                className="bg-bento-lacquer border border-bento-border rounded-xl p-3 flex justify-between items-center text-xs hover:border-bento-border/90 transition"
              >
                <div className="flex items-center gap-2.5">
                  {res.passed ? (
                    <WasabiBadgeIcon className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4 text-bento-salmon" />
                  )}
                  <span className="font-bold text-gray-200">{res.scenario_name}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400 font-mono">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-500" /> {res.duration_ms.toFixed(1)}ms</span>
                  <span className={res.passed ? 'text-bento-matcha font-bold' : 'text-bento-salmon font-bold'}>
                    {res.passed ? 'PASSED ✓' : 'FAILED ✗'}
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
          <div key={scenario.name} className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card flex flex-col justify-between hover:border-amber-400/40 transition">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-bold text-bento-rice flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-400" /> {scenario.name}
                </h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">{scenario.description || 'No description provided.'}</p>

              <div className="space-y-2 mb-3">
                {scenario.steps.map((step, sIdx) => (
                  <div key={sIdx} className="bg-bento-lacquer border border-bento-border rounded-xl p-2.5 text-xs font-mono">
                    <div className="text-bento-tamago font-bold mb-1">Step: {step.name}</div>
                    <div className="text-gray-400 truncate mb-1.5">$ {step.command}</div>
                    <div className="space-y-0.5">
                      {step.assertions.map((a, aIdx) => (
                        <div key={aIdx} className="text-[11px] text-bento-matcha font-medium">
                          ✓ [{a.type}] {a.description || `${a.target_field} == ${a.expected}`}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-bento-border">
              {scenario.tags.map((t) => (
                <span key={t} className="text-[11px] font-mono text-gray-300 bg-bento-lacquer px-2.5 py-0.5 rounded-lg border border-bento-border">
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
