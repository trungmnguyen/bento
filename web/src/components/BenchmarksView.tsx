import React, { useState } from 'react';
import {
  XCircle,
  RefreshCw,
  FileCode,
  Clock,
  Sparkles,
  Plus,
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Layers,
} from 'lucide-react';
import { ChopsticksIcon, WasabiBadgeIcon, BentoBoxIcon } from './icons/BentoIcons';
import { Scenario, SuiteResult, PreflightResult } from '../types';
import { playZenBell, playClack } from '../utils/audio';
import { showToast } from './Toast';

interface BenchmarksViewProps {
  scenarios: Scenario[];
  onRefresh: () => void;
}

interface DraftAssertion {
  type: string;
  target_field: string;
  expected: string;
  description: string;
}

interface DraftStep {
  name: string;
  command: string;
  timeout_sec: number;
  assertions: DraftAssertion[];
}

export const BenchmarksView: React.FC<BenchmarksViewProps> = ({ scenarios, onRefresh }) => {
  const [running, setRunning] = useState(false);
  const [runningSingle, setRunningSingle] = useState<string | null>(null);
  const [singleResults, setSingleResults] = useState<Record<string, any>>({});
  const [suiteResult, setSuiteResult] = useState<SuiteResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // Tasting Studio: Scenario Builder State
  const [showCraftModal, setShowCraftModal] = useState(false);
  const [craftName, setCraftName] = useState('');
  const [craftDesc, setCraftDesc] = useState('');
  const [craftTags, setCraftTags] = useState('tasting,contract');
  const [craftSteps, setCraftSteps] = useState<DraftStep[]>([]);

  // Draft Step Builder Inside Studio
  const [currentStepName, setCurrentStepName] = useState('');
  const [currentCommand, setCurrentCommand] = useState('');
  const [currentTimeout, setCurrentTimeout] = useState(10.0);
  const [currentAssertions, setCurrentAssertions] = useState<DraftAssertion[]>([
    { type: 'EXIT_CODE_EQUALS', target_field: 'exit_code', expected: '0', description: 'Command exits cleanly' },
  ]);

  // Preflight Testing State
  const [preflightTesting, setPreflightTesting] = useState(false);
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [craftSubmitError, setCraftSubmitError] = useState<string | null>(null);
  const [craftSubmitting, setCraftSubmitting] = useState(false);

  const handleRunSingle = async (scenarioName: string) => {
    playClack();
    setRunningSingle(scenarioName);
    try {
      const res = await fetch('/api/benchmarks/run-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: scenarioName }),
      });
      const data = await res.json();
      if (res.ok) {
        setSingleResults((prev) => ({ ...prev, [scenarioName]: data }));
        if (data.passed) {
          playZenBell();
        }
        onRefresh();
      } else {
        setRunError(data.error || `Failed to run ${scenarioName}`);
      }
    } catch (err) {
      setRunError(`Failed to run ${scenarioName}`);
    } finally {
      setRunningSingle(null);
    }
  };

  const handleRunSuite = async () => {
    playClack();
    setRunning(true);
    setRunError(null);
    showToast('info', 'Tasting Menu Started', `Serving ${scenarios.length} contract tasting flights...`);
    try {
      const res = await fetch('/api/benchmarks/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSuiteResult(data);
        if (data.all_passed) {
          playZenBell();
          showToast('success', 'Tasting Menu Complete 🍱', `All ${data.total_scenarios} contracts passed in ${data.total_duration_ms.toFixed(1)}ms!`);
        } else {
          showToast('error', 'Tasting Flaw Detected', `${data.total_scenarios - data.passed_scenarios} of ${data.total_scenarios} flights failed.`);
        }
      } else {
        const msg = data.error || 'Failed to execute benchmark suite.';
        setRunError(msg);
        showToast('error', 'Execution Error', msg);
      }
    } catch (err) {
      setRunError('Failed to execute benchmark suite.');
      showToast('error', 'Network Error', 'Could not communicate with tasting server.');
    } finally {
      setRunning(false);
    }
  };

  const handleRunPreflight = async () => {
    if (!currentCommand.trim()) {
      setPreflightError('Please enter a command to preflight test.');
      return;
    }
    playClack();
    setPreflightTesting(true);
    setPreflightError(null);
    setPreflightResult(null);

    try {
      const res = await fetch('/api/benchmarks/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: currentCommand.trim(),
          timeout_sec: currentTimeout,
          assertions: currentAssertions.map((a) => ({
            type: a.type,
            target_field: a.target_field,
            expected: a.type === 'EXIT_CODE_EQUALS' ? Number(a.expected) : a.expected,
            description: a.description,
          })),
        }),
      });

      const data = await res.json().catch(() => ({ error: 'Failed to parse response' }));
      if (res.ok) {
        setPreflightResult(data);
        if (data.all_passed) {
          playZenBell();
          showToast('success', 'Pre-flight Tasting Passed', 'All assertions verified cleanly.');
        } else {
          showToast('warning', 'Assertion Mismatch', 'One or more assertions failed.');
        }
      } else {
        const msg = data.error || `Preflight failed (HTTP ${res.status})`;
        setPreflightError(msg);
        showToast('error', 'Pre-flight Failed', msg);
      }
    } catch (err) {
      setPreflightError('Preflight execution failed.');
      showToast('error', 'Network Error', 'Could not reach Bento preflight endpoint.');
    } finally {
      setPreflightTesting(false);
    }
  };

  const handleAddStepToCraft = () => {
    if (!currentStepName.trim() || !currentCommand.trim()) {
      setPreflightError('Step Name and Command are required to add step.');
      return;
    }
    playClack();
    const newStep: DraftStep = {
      name: currentStepName.trim(),
      command: currentCommand.trim(),
      timeout_sec: currentTimeout,
      assertions: [...currentAssertions],
    };
    setCraftSteps((prev) => [...prev, newStep]);
    setCurrentStepName('');
    setCurrentCommand('');
    setCurrentTimeout(10.0);
    setCurrentAssertions([
      { type: 'EXIT_CODE_EQUALS', target_field: 'exit_code', expected: '0', description: 'Command exits cleanly' },
    ]);
    setPreflightResult(null);
    setPreflightError(null);
  };

  const handleSaveCraftedScenario = async () => {
    if (!craftName.trim()) {
      setCraftSubmitError('Scenario Name is required.');
      return;
    }
    if (craftSteps.length === 0 && !currentCommand.trim()) {
      setCraftSubmitError('At least one step is required.');
      return;
    }

    const stepsToSave = [...craftSteps];
    if (currentCommand.trim()) {
      stepsToSave.push({
        name: currentStepName.trim() || `Step ${stepsToSave.length + 1}`,
        command: currentCommand.trim(),
        timeout_sec: currentTimeout,
        assertions: [...currentAssertions],
      });
    }

    setCraftSubmitting(true);
    setCraftSubmitError(null);
    try {
      const tagList = craftTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        name: craftName.trim(),
        description: craftDesc.trim() || 'Crafted in Bento Tasting Studio',
        tags: tagList.length > 0 ? tagList : ['tasting'],
        steps: stepsToSave.map((s) => ({
          name: s.name,
          command: s.command,
          timeout_sec: s.timeout_sec,
          assertions: s.assertions.map((a) => ({
            type: a.type,
            target_field: a.target_field,
            expected: a.type === 'EXIT_CODE_EQUALS' ? Number(a.expected) : a.expected,
            description: a.description,
          })),
        })),
      };

      const res = await fetch('/api/benchmarks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({ error: 'Failed to parse response' }));
      if (res.ok) {
        playZenBell();
        showToast('success', 'Scenario Created', `Saved '${craftName}' into benchmarks/.`);
        setShowCraftModal(false);
        setCraftName('');
        setCraftDesc('');
        setCraftSteps([]);
        onRefresh();
      } else {
        const msg = data.error || `Failed to save scenario (HTTP ${res.status})`;
        setCraftSubmitError(msg);
        showToast('error', 'Creation Failed', msg);
      }
    } catch {
      setCraftSubmitError('Failed to save tasting flight.');
      showToast('error', 'Network Error', 'Could not reach Bento scenario creation endpoint.');
    } finally {
      setCraftSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Run Battery Header: Tasting Battery */}
      <div className="bg-bento-surface border border-bento-border rounded-bento p-4 sm:p-5 shadow-bento-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-gray-100 flex items-center gap-2">
            <ChopsticksIcon className="w-5 h-5 sm:w-6 sm:h-6 animate-bento-bounce shrink-0" />
            <span>Tasting Battery · Verification Contracts</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Ground-truth deterministic contract assertions ({scenarios.length} tasting flights loaded).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Tasting Studio Button */}
          <button
            onClick={() => {
              playClack();
              setShowCraftModal(true);
            }}
            className="w-full sm:w-auto bg-bento-lacquer hover:bg-bento-border border border-amber-500/40 text-amber-300 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm min-h-[42px] touch-manipulation"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Craft Flight 🥢</span>
          </button>

          <button
            onClick={handleRunSuite}
            disabled={running}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-gray-900 font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-tamago-glow shrink-0 min-h-[42px] touch-manipulation"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin text-gray-900" /> : <ChopsticksIcon className="w-4 h-4" />}
            <span>{running ? 'Tasting Battery Flights...' : 'Taste All Contracts 🥢'}</span>
          </button>
        </div>
      </div>

      {runError && (
        <div className="bg-rose-950/30 border border-bento-salmon/40 rounded-xl p-3 text-xs text-rose-200">
          {runError}
        </div>
      )}

      {/* Latest Suite Result Display */}
      {suiteResult && (
        <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card border-l-4 border-l-bento-matcha animate-fade-in">
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
                Pass Rate: {suiteResult.pass_rate.toFixed(1)}% ({suiteResult.passed_scenarios}/{suiteResult.total_scenarios})
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
              <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="text-sm font-bold text-bento-rice flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{scenario.name}</span>
                </h3>
                <button
                  onClick={() => handleRunSingle(scenario.name)}
                  disabled={runningSingle === scenario.name || running}
                  className="shrink-0 bg-bento-lacquer hover:bg-bento-border border border-bento-border rounded-lg px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition flex items-center gap-1 disabled:opacity-50"
                  title="Run single scenario contract"
                >
                  {runningSingle === scenario.name ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <ChopsticksIcon className="w-3 h-3" />
                  )}
                  <span>{runningSingle === scenario.name ? 'Tasting...' : 'Taste Flight 🥢'}</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">{scenario.description || 'No description provided.'}</p>

              {singleResults[scenario.name] && (
                <div
                  className={`mb-3 p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                    singleResults[scenario.name].passed
                      ? 'bg-emerald-950/30 border-bento-matcha/40 text-emerald-300'
                      : 'bg-rose-950/30 border-bento-salmon/40 text-rose-300'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1.5">
                    {singleResults[scenario.name].passed ? 'PASSED ✓' : 'FAILED ✗'}
                  </span>
                  <span>{singleResults[scenario.name].total_duration_ms.toFixed(1)}ms</span>
                </div>
              )}

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

      {/* Tasting Studio Modal: Craft New Tasting Flight */}
      {showCraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-bento-surface border border-bento-border rounded-bento w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
            <div className="px-6 py-4 border-b border-bento-border flex justify-between items-center bg-bento-elevated sticky top-0 z-10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ChopsticksIcon className="w-5 h-5 text-amber-400" />
                Tasting Studio · Craft New Verification Flight
              </h3>
              <button
                onClick={() => setShowCraftModal(false)}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {craftSubmitError && (
                <div className="bg-rose-950/40 border border-bento-salmon/40 rounded-xl p-3 text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{craftSubmitError}</span>
                </div>
              )}

              {/* Scenario Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Flight Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ast_purity_guard"
                    value={craftName}
                    onChange={(e) => setCraftName(e.target.value)}
                    className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3.5 py-2 text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. security, ast, gate"
                    value={craftTags}
                    onChange={(e) => setCraftTags(e.target.value)}
                    className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3.5 py-2 text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Flight Description
                </label>
                <input
                  type="text"
                  placeholder="Verifies AST domain purity across all internal packages"
                  value={craftDesc}
                  onChange={(e) => setCraftDesc(e.target.value)}
                  className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3.5 py-2 text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Already Added Steps List */}
              {craftSteps.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Steps Sequenced in Flight ({craftSteps.length})
                  </label>
                  <div className="space-y-2">
                    {craftSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="bg-bento-lacquer border border-bento-border rounded-xl p-3 flex justify-between items-start text-xs font-mono"
                      >
                        <div>
                          <div className="font-bold text-amber-300">{idx + 1}. {step.name}</div>
                          <div className="text-gray-400 truncate max-w-md">$ {step.command}</div>
                          <div className="text-bento-matcha text-[11px] mt-1">
                            {step.assertions.length} contract assertion(s)
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            playClack();
                            setCraftSteps((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-gray-500 hover:text-rose-400 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step Sequencer Box */}
              <div className="bg-bento-lacquer border border-bento-border rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-bento-border">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" /> Step Sequencer & Preflight Rig
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Step Name</label>
                    <input
                      type="text"
                      placeholder="e.g. ast_check_cli"
                      value={currentStepName}
                      onChange={(e) => setCurrentStepName(e.target.value)}
                      className="w-full bg-bento-surface border border-bento-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Timeout (sec)</label>
                    <input
                      type="number"
                      value={currentTimeout}
                      onChange={(e) => setCurrentTimeout(Number(e.target.value))}
                      className="w-full bg-bento-surface border border-bento-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Shell Command *</label>
                  <input
                    type="text"
                    placeholder="e.g. PYTHONPATH=src python3.12 -m bento.frameworks.cli check"
                    value={currentCommand}
                    onChange={(e) => setCurrentCommand(e.target.value)}
                    className="w-full bg-bento-surface border border-bento-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono transition"
                  />
                </div>

                {/* Assertions Editor */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-semibold text-gray-400">Contract Assertions</label>
                    <button
                      onClick={() => {
                        playClack();
                        setCurrentAssertions((prev) => [
                          ...prev,
                          { type: 'CONTAINS', target_field: 'stdout', expected: '', description: '' },
                        ]);
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Assertion
                    </button>
                  </div>

                  <div className="space-y-2">
                    {currentAssertions.map((assertion, aIdx) => (
                      <div key={aIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-bento-surface p-2.5 rounded-lg border border-bento-border/70 text-xs">
                        <div>
                          <select
                            value={assertion.type}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentAssertions((prev) =>
                                prev.map((item, i) => (i === aIdx ? { ...item, type: val } : item))
                              );
                            }}
                            className="w-full bg-bento-lacquer border border-bento-border rounded px-2 py-1 text-white font-mono text-[11px]"
                          >
                            <option value="EXIT_CODE_EQUALS">EXIT_CODE_EQUALS</option>
                            <option value="CONTAINS">CONTAINS</option>
                            <option value="NOT_CONTAINS">NOT_CONTAINS</option>
                            <option value="EQUALS">EQUALS</option>
                            <option value="REGEX">REGEX</option>
                          </select>
                        </div>
                        <div>
                          <select
                            value={assertion.target_field}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentAssertions((prev) =>
                                prev.map((item, i) => (i === aIdx ? { ...item, target_field: val } : item))
                              );
                            }}
                            className="w-full bg-bento-lacquer border border-bento-border rounded px-2 py-1 text-white font-mono text-[11px]"
                          >
                            <option value="stdout">stdout</option>
                            <option value="stderr">stderr</option>
                            <option value="exit_code">exit_code</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2 flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Expected string or code..."
                            value={assertion.expected}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentAssertions((prev) =>
                                prev.map((item, i) => (i === aIdx ? { ...item, expected: val } : item))
                              );
                            }}
                            className="flex-1 bg-bento-lacquer border border-bento-border rounded px-2 py-1 text-white font-mono text-[11px]"
                          />
                          {currentAssertions.length > 1 && (
                            <button
                              onClick={() => {
                                playClack();
                                setCurrentAssertions((prev) => prev.filter((_, i) => i !== aIdx));
                              }}
                              className="text-gray-500 hover:text-rose-400 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preflight Test Results Bar */}
                {preflightError && (
                  <div className="bg-rose-950/40 border border-bento-salmon/40 rounded-lg p-2.5 text-xs text-rose-200">
                    {preflightError}
                  </div>
                )}

                {preflightResult && (
                  <div className="bg-bento-surface border border-bento-border rounded-lg p-3 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span
                        className={`font-bold flex items-center gap-1.5 ${
                          preflightResult.all_passed ? 'text-bento-matcha' : 'text-bento-salmon'
                        }`}
                      >
                        {preflightResult.all_passed ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-bento-matcha" />
                            PREFLIGHT PASSED (All assertions satisfied)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-bento-salmon" />
                            PREFLIGHT FAILED
                          </>
                        )}
                      </span>
                      <span className="text-gray-400">{preflightResult.duration_ms.toFixed(1)}ms</span>
                    </div>

                    {/* Preflight Assertions Check */}
                    <div className="space-y-1">
                      {preflightResult.assertion_results.map((ar, idx) => (
                        <div
                          key={idx}
                          className={`text-[11px] p-1.5 rounded flex items-center justify-between ${
                            ar.passed ? 'bg-emerald-950/30 text-emerald-300' : 'bg-rose-950/30 text-rose-300'
                          }`}
                        >
                          <span>
                            {ar.passed ? '✓' : '✗'} [{ar.type}] on {ar.target_field}: expected "{ar.expected}"
                          </span>
                          {ar.error_message && <span className="text-rose-400 truncate max-w-xs">{ar.error_message}</span>}
                        </div>
                      ))}
                    </div>

                    {/* Stdout preview */}
                    {preflightResult.stdout && (
                      <div className="bg-bento-lacquer p-2 rounded border border-bento-border text-[11px] text-gray-300 max-h-24 overflow-y-auto">
                        <span className="text-gray-500 font-bold block mb-1">STDOUT:</span>
                        <pre className="whitespace-pre-wrap">{preflightResult.stdout.trim()}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Preflight Action Buttons */}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={handleRunPreflight}
                    disabled={preflightTesting}
                    className="bg-bento-surface hover:bg-bento-border border border-amber-400/40 text-amber-300 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {preflightTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{preflightTesting ? 'Testing Preflight...' : '⚡ Preflight Test Step'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddStepToCraft}
                    className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Step to Flight</span>
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-bento-border flex justify-end gap-3 sticky bottom-0 bg-bento-surface">
                <button
                  type="button"
                  onClick={() => setShowCraftModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCraftedScenario}
                  disabled={craftSubmitting}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-gray-900 font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 shadow-tamago-glow"
                >
                  <ChopsticksIcon className="w-4 h-4" />
                  <span>{craftSubmitting ? 'Saving Tasting Flight...' : 'Save Tasting Flight 🥢'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
