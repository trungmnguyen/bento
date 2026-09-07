import React, { useRef } from 'react';
import { RefreshCw, Flame, AlertCircle, AlertTriangle } from 'lucide-react';
import { ChefTamagoIcon } from './icons/BentoIcons';
import { useCommandHistory } from '../hooks/useCommandHistory';
import { playClack } from '../utils/audio';

interface TaskLaunchPanelProps {
  newCmd: string;
  setNewCmd: (v: string) => void;
  newTag: string;
  setNewTag: (v: string) => void;
  isSubmitting: boolean;
  actionError: string | null;
  pruneMessage: string | null;
  dangerousWarning: string | null;
  onSubmit: (confirmed?: boolean) => void;
  onDismissWarning: () => void;
}

export const TaskLaunchPanel: React.FC<TaskLaunchPanelProps> = ({
  newCmd, setNewCmd, newTag, setNewTag,
  isSubmitting, actionError, pruneMessage, dangerousWarning,
  onSubmit, onDismissWarning,
}) => {
  const { pushCommand, navigateHistory, resetCursor, hasHistory } = useCommandHistory();
  // Store original cmd when user starts navigating history
  const originalCmdRef = useRef<string>('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (originalCmdRef.current === '' && newCmd !== '') {
        originalCmdRef.current = newCmd;
      }
      const prev = navigateHistory(-1);
      if (prev !== null) setNewCmd(prev);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = navigateHistory(1);
      if (next !== null) {
        setNewCmd(next);
      } else {
        setNewCmd(originalCmdRef.current);
        originalCmdRef.current = '';
        resetCursor();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCmd.trim()) {
      pushCommand(newCmd);
    }
    onSubmit();
  };

  return (
    <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card">
      <h2 className="text-sm font-bold uppercase tracking-wider text-bento-tamago mb-3 flex items-center gap-2">
        <ChefTamagoIcon className="w-5 h-5" aria-hidden="true" /> Cook New Butler Task (Background Runner)
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            placeholder="Command to cook in background (e.g. bento dream --benchmarks examples/)"
            value={newCmd}
            disabled={isSubmitting}
            onChange={(e) => { resetCursor(); originalCmdRef.current = ''; setNewCmd(e.target.value); }}
            onKeyDown={handleKeyDown}
            aria-label="Command to cook in background"
            aria-describedby={hasHistory ? 'cmd-history-hint' : undefined}
            className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-tamago/60 font-mono transition disabled:opacity-50"
          />
          {hasHistory && (
            <span id="cmd-history-hint" className="sr-only">
              Use up and down arrow keys to cycle through command history.
            </span>
          )}
        </div>
        <input
          type="text"
          placeholder="Dish Tag"
          value={newTag}
          disabled={isSubmitting}
          onChange={(e) => setNewTag(e.target.value)}
          aria-label="Dish tag or category"
          className="w-full sm:w-32 bg-bento-lacquer border border-bento-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-tamago/60 font-mono transition disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSubmitting || !newCmd.trim()}
          aria-label="Start cooking background task"
          className="w-full sm:w-auto bg-gradient-to-r from-bento-tamago to-amber-500 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-tamago-glow min-h-[42px] touch-manipulation focus-visible:ring-2 focus-visible:ring-bento-tamago focus-visible:ring-offset-2"
        >
          {isSubmitting ? (
            <><RefreshCw className="w-4 h-4 animate-spin text-gray-950" /> Cooking...</>
          ) : (
            <><Flame className="w-4 h-4 fill-gray-950" aria-hidden="true" /> Start Cooking</>
          )}
        </button>
      </form>

      {/* Dangerous command warning — SEC-01 frontend safety gate */}
      {dangerousWarning && (
        <div role="alert" aria-live="assertive" className="mt-3 p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl flex flex-col gap-2">
          <div className="flex items-start gap-2 text-amber-300 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{dangerousWarning}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onDismissWarning(); onSubmit(true); playClack(); }}
              className="px-3 py-1 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded-lg transition focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Yes, run it anyway
            </button>
            <button
              type="button"
              onClick={() => { onDismissWarning(); playClack(); }}
              className="px-3 py-1 text-xs font-semibold bg-bento-elevated hover:bg-bento-border text-gray-300 border border-bento-border rounded-lg transition focus-visible:ring-2 focus-visible:ring-bento-tamago"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Always-mounted live regions (YZ-02) */}
      <div role="alert" aria-live="assertive" className={actionError ? 'text-bento-salmon text-xs mt-2 font-medium flex items-center gap-1.5' : 'sr-only'}>
        {actionError && <><AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /><span>{actionError}</span></>}
      </div>
      <div role="status" aria-live="polite" className={pruneMessage ? 'text-emerald-400 text-xs mt-2 font-medium' : 'sr-only'}>
        {pruneMessage || ''}
      </div>
    </div>
  );
};
