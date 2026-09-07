import React from 'react';
import { X, Sparkles, AlertCircle, Eye } from 'lucide-react';
import { MemoryGraphNode, MemoryGraphEdge } from '../../types';
import { WasabiBadgeIcon } from '../icons/BentoIcons';
import { playClack } from '../../utils/audio';

interface FlavorGraphDrawerProps {
  selectedNode: MemoryGraphNode | null;
  onClose: () => void;
  connectedEdges: MemoryGraphEdge[];
  onReturnToCards: () => void;
}

export const FlavorGraphDrawer: React.FC<FlavorGraphDrawerProps> = ({
  selectedNode,
  onClose,
  connectedEdges,
  onReturnToCards,
}) => {
  return (
    <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card flex flex-col justify-between">
      {selectedNode ? (
        <div className="space-y-4">
          <div className="flex justify-between items-start pb-3 border-b border-bento-border">
            <div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  selectedNode.node_type === 'golden_rule'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    : selectedNode.node_type === 'anti_pattern'
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                    : selectedNode.node_type === 'category_hub'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                    : 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {selectedNode.node_type.replace('_', ' ')}
              </span>
              <h3 className="text-sm font-bold text-white mt-1.5 flex items-center gap-1.5">
                {selectedNode.label}
              </h3>
              <span className="text-xs text-gray-400 font-mono">ID: {selectedNode.id}</span>
            </div>
            <button
              onClick={() => {
                playClack();
                onClose();
              }}
              aria-label="Close node details inspector"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-bento-border min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedNode.details.rule && (
            <div className="bg-bento-nori border border-bento-matcha/40 rounded-xl p-3 shadow-inner">
              <div className="text-[11px] font-bold text-bento-matcha mb-1 flex items-center gap-1">
                <WasabiBadgeIcon className="w-3.5 h-3.5" /> GOLDEN ARCHITECTURAL AXIOM
              </div>
              <p className="text-xs text-emerald-100 font-medium leading-relaxed">
                {selectedNode.details.rule}
              </p>
            </div>
          )}

          {selectedNode.details.anti_pattern && (
            <div className="bg-rose-950/30 border border-bento-salmon/40 rounded-xl p-3 shadow-inner">
              <div className="text-[11px] font-bold text-bento-salmon mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> FORBIDDEN BURNT DISH
              </div>
              <p className="text-xs text-rose-200 leading-relaxed">
                {selectedNode.details.anti_pattern}
              </p>
            </div>
          )}

          {selectedNode.details.context && (
            <div className="text-xs text-gray-300 bg-bento-lacquer p-3 rounded-xl border border-bento-border">
              <div className="text-[11px] font-semibold text-gray-400 mb-1">CONTEXT</div>
              {selectedNode.details.context}
            </div>
          )}

          {/* Connected Edges */}
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Connected Relations ({connectedEdges.length})
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {connectedEdges.map((edge, idx) => (
                <div
                  key={idx}
                  className="text-xs font-mono bg-bento-lacquer p-2 rounded-lg border border-bento-border/70 flex items-center justify-between"
                >
                  <span className="text-gray-400 text-[11px]">{edge.relation}</span>
                  <span className="text-bento-rice font-bold text-[11px] truncate max-w-[150px]">
                    {edge.source === selectedNode.id ? edge.target : edge.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-16 space-y-2">
          <Sparkles className="w-8 h-8 text-bento-tamago mx-auto opacity-60" />
          <h4 className="text-xs font-bold text-gray-300">Select Any Constellation Node</h4>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Click any Category Hub, Golden Rule, or Anti-Pattern to inspect its distilled wisdom, relations, and verification links.
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-bento-border text-center">
        <button
          onClick={() => {
            playClack();
            onReturnToCards();
          }}
          className="text-xs text-bento-salmon hover:underline font-bold flex items-center justify-center gap-1 mx-auto min-h-[36px]"
        >
          <Eye className="w-3.5 h-3.5" /> Return to Recipe Cards Grid
        </button>
      </div>
    </div>
  );
};
