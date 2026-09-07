import React, { useState, useMemo, useRef } from 'react';
import { Search, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { MemoryGraph, MemoryGraphNode } from '../../types';
import { playClack } from '../../utils/audio';

interface FlavorGraphCanvasProps {
  graphData: MemoryGraph;
  selectedCategory: string | null;
  selectedNode: MemoryGraphNode | null;
  onSelectNode: (node: MemoryGraphNode | null) => void;
}

export const FlavorGraphCanvas: React.FC<FlavorGraphCanvasProps> = ({
  graphData,
  selectedCategory,
  selectedNode,
  onSelectNode,
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [graphQuery, setGraphQuery] = useState('');
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // O(1) resolution via nodeMap
  const nodeMap = useMemo(() => {
    const map = new Map<string, MemoryGraphNode>();
    for (const n of graphData.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [graphData.nodes]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPanning(true);
    setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.4), 2.5));
  };

  const handleZoomIn = () => {
    playClack();
    setZoom((z) => Math.min(z + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    playClack();
    setZoom((z) => Math.max(z - 0.2, 0.4));
  };

  const handleResetPanZoom = () => {
    playClack();
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="bg-[#0c0d12] border border-bento-border rounded-bento overflow-hidden relative shadow-2xl h-[380px] sm:h-[460px] lg:h-[520px] select-none touch-none max-w-full"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* In-Graph Search Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={graphQuery}
            onChange={(e) => setGraphQuery(e.target.value)}
            placeholder="Search constellation..."
            aria-label="Search constellation nodes and axioms"
            className="bg-bento-surface/90 backdrop-blur-md border border-bento-border rounded-xl pl-8 pr-7 py-1.5 text-xs text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-tamago font-mono w-44 sm:w-56 shadow-lg"
          />
          {graphQuery && (
            <button
              type="button"
              onClick={() => setGraphQuery('')}
              aria-label="Clear in-graph search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Zoom and Reset Controls HUD */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-bento-surface/90 backdrop-blur-md border border-bento-border rounded-xl p-1.5 shadow-lg">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom into constellation"
          title="Zoom In (+)"
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-bento-border transition focus-visible:ring-2 focus-visible:ring-bento-tamago min-h-[32px] min-w-[32px] flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out of constellation"
          title="Zoom Out (-)"
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-bento-border transition focus-visible:ring-2 focus-visible:ring-bento-tamago min-h-[32px] min-w-[32px] flex items-center justify-center"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-bento-border mx-0.5" />
        <button
          type="button"
          onClick={handleResetPanZoom}
          aria-label="Reset constellation view"
          title="Reset View"
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-bento-border transition focus-visible:ring-2 focus-visible:ring-bento-tamago min-h-[32px] min-w-[32px] flex items-center justify-center"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 1000 800"
        className="w-full h-full cursor-grab active:cursor-grabbing"
        role="img"
        aria-label="Interactive Flavor Constellation Graph"
      >
        <defs>
          <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
          </radialGradient>
          <radialGradient id="axiomGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
          </radialGradient>
          <radialGradient id="antiGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#be123c" stopOpacity="0.4" />
          </radialGradient>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Subtle celestial rings */}
          <circle cx="500" cy="400" r="180" fill="none" stroke="#252833" strokeDasharray="4 4" strokeWidth="1" />
          <circle cx="500" cy="400" r="320" fill="none" stroke="#20222b" strokeDasharray="6 6" strokeWidth="1" />

          {/* Edges */}
          {graphData.edges.map((edge, idx) => {
            const src = nodeMap.get(edge.source);
            const tgt = nodeMap.get(edge.target);
            if (!src || !tgt) return null;

            const isHighlighted = Boolean(
              selectedNode && (selectedNode.id === src.id || selectedNode.id === tgt.id)
            );
            const q = graphQuery.toLowerCase();
            const isMatch =
              !q ||
              src.label.toLowerCase().includes(q) ||
              tgt.label.toLowerCase().includes(q) ||
              src.id.toLowerCase().includes(q) ||
              tgt.id.toLowerCase().includes(q);

            let strokeColor = '#3f4455';
            let dashArray = 'none';
            if (edge.relation === 'has_anti_pattern') {
              strokeColor = '#f43f5e';
              dashArray = '3 3';
            } else if (edge.relation === 'verified_by') {
              strokeColor = '#06b6d4';
              dashArray = '5 3';
            } else if (edge.relation === 'category_of') {
              strokeColor = '#10b981';
            }

            return (
              <line
                key={idx}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={isHighlighted ? '#ffffff' : strokeColor}
                strokeWidth={isHighlighted ? 2.5 : 1.2}
                strokeOpacity={!isMatch ? 0.08 : isHighlighted ? 0.95 : 0.45}
                strokeDasharray={dashArray}
              />
            );
          })}

          {/* Nodes */}
          {graphData.nodes.map((node) => {
            if (selectedCategory && node.category !== selectedCategory) {
              return null;
            }

            const isSelected = selectedNode?.id === node.id;
            const q = graphQuery.toLowerCase();
            const isMatch =
              !q ||
              node.label.toLowerCase().includes(q) ||
              node.id.toLowerCase().includes(q) ||
              (typeof node.details.rule === 'string' && node.details.rule.toLowerCase().includes(q));

            const nodeOpacity = !isMatch ? 0.15 : 1.0;

            if (node.node_type === 'category_hub') {
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Category Hub: ${node.label}`}
                  className="cursor-pointer transition-transform duration-200 focus:outline-none"
                  opacity={nodeOpacity}
                  onFocus={() => setFocusedNodeId(node.id)}
                  onBlur={() => setFocusedNodeId((prev) => (prev === node.id ? null : prev))}
                  onClick={() => {
                    playClack();
                    onSelectNode(node);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      playClack();
                      onSelectNode(node);
                    }
                  }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 32 : 26}
                    fill="url(#hubGrad)"
                    stroke={isSelected ? '#ffffff' : '#f59e0b'}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />
                  {/* High contrast dark text label (7.2:1 contrast) */}
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill="#18141f"
                    fontSize="10"
                    fontWeight="800"
                    className="select-none pointer-events-none font-mono"
                  >
                    {node.label.slice(0, 10)}
                  </text>
                </g>
              );
            }

            if (node.node_type === 'golden_rule') {
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Golden Rule: ${node.label}`}
                  className="cursor-pointer transition-transform duration-200 focus:outline-none"
                  opacity={nodeOpacity}
                  onFocus={() => setFocusedNodeId(node.id)}
                  onBlur={() => setFocusedNodeId((prev) => (prev === node.id ? null : prev))}
                  onClick={() => {
                    playClack();
                    onSelectNode(node);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      playClack();
                      onSelectNode(node);
                    }
                  }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 22 : 17}
                    fill="url(#axiomGrad)"
                    stroke={isSelected ? '#ffffff' : '#10b981'}
                    strokeWidth={isSelected ? 2.5 : 1}
                  />
                  {/* High contrast dark emerald text label (6.8:1 contrast) */}
                  <text
                    x={node.x}
                    y={node.y + 3.5}
                    textAnchor="middle"
                    fill="#022c22"
                    fontSize="8"
                    fontWeight="800"
                    className="select-none pointer-events-none font-mono"
                  >
                    {node.label.slice(0, 8)}
                  </text>
                </g>
              );
            }

            // Anti-pattern satellite or other node
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={`Anti-Pattern: ${node.label}`}
                className="cursor-pointer transition-transform duration-200 focus:outline-none"
                opacity={nodeOpacity}
                onFocus={() => setFocusedNodeId(node.id)}
                onBlur={() => setFocusedNodeId((prev) => (prev === node.id ? null : prev))}
                onClick={() => {
                  playClack();
                  onSelectNode(node);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playClack();
                    onSelectNode(node);
                  }
                }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 18 : 13}
                  fill="url(#antiGrad)"
                  stroke={isSelected ? '#ffffff' : '#f43f5e'}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <text
                  x={node.x}
                  y={node.y + 3}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="7"
                  fontWeight="700"
                  className="select-none pointer-events-none font-mono"
                >
                  {node.label.slice(0, 6)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
