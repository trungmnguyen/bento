import React, { useRef } from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { playClack } from '../utils/audio';
import { useA11yModal } from '../hooks/useA11yModal';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { modalProps } = useA11yModal({
    isOpen,
    onClose,
    containerRef: modalRef,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        {...modalProps}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-bento-surface border border-bento-border rounded-bento shadow-2xl p-6 text-gray-100 relative focus:outline-none"
        aria-labelledby="shortcuts-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-bento-border/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-sm font-bold text-white flex items-center gap-1.5">
                Bento Hotkey Cheatsheet
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Vim Spiced
                </span>
              </h2>
              <p className="text-xs text-gray-400">Navigate and operate the harness at terminal velocity</p>
            </div>
          </div>
          <button
            onClick={() => {
              playClack();
              onClose();
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Content */}
        <div className="mt-4 space-y-4 text-xs">
          {/* Section 1: Navigation */}
          <div>
            <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Command className="w-3 h-3 text-bento-salmon" /> Compartment Navigation
            </div>
            <div className="grid grid-cols-2 gap-2 bg-bento-elevated/40 p-3 rounded-xl border border-bento-border/50">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Kitchen Chefs</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-amber-300 font-bold">1</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Seasoned Recipes</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-amber-300 font-bold">2</kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-300">Night Dream & Tea</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-amber-300 font-bold">3</kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-300">Tasting Battery</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-amber-300 font-bold">4</kbd>
              </div>
              <div className="flex justify-between items-center py-1 col-span-2 border-t border-white/5">
                <span className="text-gray-300">Arena Sparring</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-amber-300 font-bold">5</kbd>
              </div>
            </div>
          </div>

          {/* Section 2: Quick Actions */}
          <div>
            <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">Instant Actions</div>
            <div className="grid grid-cols-2 gap-2 bg-bento-elevated/40 p-3 rounded-xl border border-bento-border/50">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">OmniPalette</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-bento-salmon font-bold">⌘K</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Instant Taste Flight</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-bento-matcha font-bold">t</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Toggle Density Mode</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-bento-tamago font-bold">d</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Focus Search</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-gray-300 font-bold">/</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Executive Snapshot</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-amber-300 font-bold">⇧E</kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-300">Manual Refresh</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-gray-300 font-bold">r</kbd>
              </div>
              <div className="flex justify-between items-center py-1 col-span-2 border-t border-white/5">
                <span className="text-gray-300">Shortcuts Cheatsheet</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-amber-300 font-bold">?</kbd>
              </div>
            </div>
          </div>

          {/* Section 3: OmniPalette Action Mode */}
          <div>
            <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">OmniPalette Direct Actions</div>
            <div className="bg-bento-elevated/40 p-3 rounded-xl border border-bento-border/50 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-gray-300">
                <span><strong className="text-bento-matcha">&gt; sweep</strong> or <strong className="text-bento-matcha">&gt; prune</strong></span>
                <span className="text-gray-400 font-sans">Clean stopped daemons</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span><strong className="text-bento-matcha">&gt; taste all</strong> or <strong className="text-bento-matcha">&gt; run suite</strong></span>
                <span className="text-gray-400 font-sans">Execute full tasting suite</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span><strong className="text-bento-matcha">&gt; dream</strong></span>
                <span className="text-gray-400 font-sans">Trigger memory consolidation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-bento-border/70 flex justify-end">
          <button
            type="button"
            onClick={() => {
              playClack();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-bento-salmon text-white text-xs font-bold hover:bg-rose-600 transition shadow-sm"
          >
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
