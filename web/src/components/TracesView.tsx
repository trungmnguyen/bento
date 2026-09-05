import React, { useState } from 'react';
import { Sparkles, CheckCircle2, XCircle, RefreshCw, Clock, Flame } from 'lucide-react';
import { MatchaCupIcon, SoyFishIcon, WasabiBadgeIcon, BentoBoxIcon } from './icons/BentoIcons';
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
        setDreamMessage(`🍵 Overnight Tea Brewed! Dream harvested ${data.new_lessons_discovered || 0} new golden recipe lessons.`);
        onRefresh();
      } else {
        setDreamMessage('Tea steeping encountered an error.');
      }
    } catch (err) {
      setDreamMessage('Failed to brew overnight dream cycle.');
    } finally {
      setDreaming(false);
    }
  };

  return (
    <div className="space-y-6">
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
          className="bg-gradient-to-r from-bento-matcha to-emerald-600 hover:from-bento-matcha-hover hover:to-emerald-500 disabled:opacity-50 text-white font-extrabold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2 shadow-matcha-glow shrink-0"
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
            onClick={onRefresh}
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
