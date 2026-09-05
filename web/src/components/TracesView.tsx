import React, { useState } from 'react';
import { Moon, Sparkles, Activity, CheckCircle2, XCircle, Wrench, RefreshCw, Layers } from 'lucide-react';
import { TraceEvent, CrystallizedSkill } from '../types';

interface TracesViewProps {
  traces: TraceEvent[];
  skills: CrystallizedSkill[];
  onRefresh: () => void;
}

export const TracesView: React.FC<TracesViewProps> = ({ traces, skills, onRefresh }) => {
  const [dreaming, setDreaming] = useState(false);
  const [dreamMessage, setDreamMessage] = useState<string | null>(null);

  const handleTriggerDream = async () => {
    setDreaming(true);
    setDreamMessage(null);
    try {
      const res = await fetch('/api/dream', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setDreamMessage(`🌙 Dream Cycle Complete! ${data.new_lessons_discovered || 0} new lessons harvested.`);
        onRefresh();
      } else {
        setDreamMessage('Dream cycle encountered an error.');
      }
    } catch (err) {
      setDreamMessage('Failed to trigger dream cycle.');
    } finally {
      setDreaming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dream Cycle Banner */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
            <Moon className="w-5 h-5 text-purple-400" /> Level 5: Autonomous "Dreaming" Engine
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Anthropic-grade offline log synthesis: Harvests historical event traces, clusters multi-iteration self-healing episodes into new MemoryLessons, and crystallizes recurring commands into reusable procedural skills.
          </p>
        </div>
        <button
          onClick={handleTriggerDream}
          disabled={dreaming}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2 shadow-md shrink-0"
        >
          {dreaming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {dreaming ? 'Dreaming & Harvesting...' : 'Trigger Dream Cycle'}
        </button>
      </div>

      {dreamMessage && (
        <div className="bg-purple-950/40 border border-purple-500/40 rounded-lg p-3 text-xs text-purple-200">
          {dreamMessage}
        </div>
      )}

      {/* Crystallized Procedural Skills */}
      {skills.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-400" /> Crystallized Procedural Skills ({skills.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skills.map((skill) => (
              <div key={skill.name} className="bg-background/60 border border-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-mono text-xs font-semibold text-blue-400">{skill.name}</h4>
                  <div className="flex gap-1">
                    {skill.trigger_tags.map((t) => (
                      <span key={t} className="text-[10px] font-mono text-gray-500 bg-card px-1.5 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-300 mb-2">{skill.description}</p>
                <div className="bg-black/40 rounded p-2 text-[11px] font-mono text-gray-400 space-y-1">
                  {skill.steps.map((step, idx) => (
                    <div key={idx} className="text-gray-300">
                      • {step}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sensory Trace Event Timeline */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-[#151924]">
          <h3 className="text-base font-semibold text-gray-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" /> Sensory Execution Traces ({traces.length})
          </h3>
          <button
            onClick={onRefresh}
            className="p-1.5 hover:bg-border rounded text-gray-400 hover:text-white transition"
            title="Refresh Traces"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {traces.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Layers className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No execution traces recorded in <code>.bento/traces/</code> yet.</p>
            <p className="text-xs text-gray-600 mt-1">Run <code>bento auto</code> to generate self-healing traces.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {traces.map((trace, idx) => (
              <div key={idx} className="p-5 hover:bg-background/30 transition">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {trace.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-semibold text-sm text-gray-200">{trace.task_name}</span>
                    <span className="text-xs font-mono bg-border px-2 py-0.5 rounded text-gray-300">
                      Iteration {trace.iteration}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {trace.timestamp || 'Recent'}
                  </span>
                </div>

                {trace.failed_assertions && trace.failed_assertions.length > 0 && (
                  <div className="my-2 bg-red-950/20 border border-red-500/20 rounded p-2.5 text-xs text-red-300 font-mono">
                    <strong className="text-red-400">Failed Assertions:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {trace.failed_assertions.map((fail, fIdx) => (
                        <li key={fIdx}>{fail}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {trace.prompt_sent && (
                  <details className="mt-2 text-xs text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-200 select-none">View Prompt Sent</summary>
                    <pre className="mt-1 p-2 bg-background border border-border rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
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
