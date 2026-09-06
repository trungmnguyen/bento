import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Tag,
  Calendar,
  Layers,
  AlertCircle,
  ShieldCheck,
  Plus,
  X,
  Sparkles,
  Network,
  Share2,
  ExternalLink,
  Eye,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Download,
  FileText,
} from 'lucide-react';
import { OnigiriIcon, WasabiBadgeIcon, BentoBoxIcon } from './icons/BentoIcons';
import { MemoryLesson, MemoryGraph, MemoryGraphNode, MemoryGraphEdge } from '../types';
import { playClack, playZenBell } from '../utils/audio';
import { useA11yModal } from '../hooks/useA11yModal';

interface MemoryViewProps {
  lessons: MemoryLesson[];
  onRefresh?: () => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ lessons, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // View Mode: Cards vs Flavor Graph
  const [viewMode, setViewMode] = useState<'cards' | 'graph'>('cards');
  const [graphData, setGraphData] = useState<MemoryGraph | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [selectedNode, setSelectedNode] = useState<MemoryGraphNode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Flavor Constellation 2.0: Pan, Zoom, and In-Graph Search HUD
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [graphQuery, setGraphQuery] = useState('');

  // Export Sheet State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'agents_md' | 'claude_md' | 'json'>('agents_md');
  const [copiedExport, setCopiedExport] = useState(false);
  const copyExportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal State: Add Recipe
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('architecture');
  const [newRule, setNewRule] = useState('');
  const [newAntiPattern, setNewAntiPattern] = useState('');
  const [newTags, setNewTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const addModalRef = useRef<HTMLDivElement>(null);
  const exportModalRef = useRef<HTMLDivElement>(null);

  const { modalProps: addModalProps } = useA11yModal({
    isOpen: showAddModal,
    onClose: () => setShowAddModal(false),
    containerRef: addModalRef,
  });

  const { modalProps: exportModalProps } = useA11yModal({
    isOpen: showExportModal,
    onClose: () => setShowExportModal(false),
    containerRef: exportModalRef,
  });

  useEffect(() => {
    return () => {
      if (copyExportTimerRef.current) {
        clearTimeout(copyExportTimerRef.current);
      }
    };
  }, []);

  // Extract unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    lessons.forEach((l) => l.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [lessons]);

  // Filter lessons for Cards View
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesSearch =
        searchTerm === '' ||
        lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.rule.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = selectedTag === null || lesson.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [lessons, searchTerm, selectedTag]);

  // Fetch Graph Data when switching to Flavor Graph
  const loadGraph = async () => {
    setLoadingGraph(true);
    try {
      const res = await fetch('/api/memory/graph');
      if (res.ok) {
        const data: MemoryGraph = await res.json();
        setGraphData(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingGraph(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'graph' && !graphData) {
      loadGraph();
    }
  }, [viewMode]);

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newRule.trim()) {
      setFormError('Recipe Title and Rule are required.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const tagList = newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/memory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory.trim() || 'architecture',
          rule: newRule.trim(),
          anti_pattern: newAntiPattern.trim(),
          tags: tagList.length > 0 ? tagList : [newCategory.trim() || 'architecture'],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        playZenBell();
        setSuccessMsg(`🍙 Seasoned new recipe: "${newTitle}" [${data.lesson?.id || ''}]`);
        setNewTitle('');
        setNewRule('');
        setNewAntiPattern('');
        setNewTags('');
        setShowAddModal(false);
        if (onRefresh) onRefresh();
        if (viewMode === 'graph') loadGraph();
      } else {
        setFormError(data.error || 'Failed to season recipe.');
      }
    } catch (err) {
      setFormError('Failed to season recipe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pan & Zoom physics handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background or svg element itself
    const target = e.target as HTMLElement;
    if (target.tagName === 'svg' || target.id === 'canvas-bg' || target.classList.contains('canvas-area')) {
      setIsPanning(true);
      setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((z) => Math.min(Math.max(0.4, Number((z + delta).toFixed(2))), 3.0));
  };

  const resetTransform = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    playClack();
  };

  // Rule Export Generation
  const exportContent = useMemo(() => {
    if (exportFormat === 'json') {
      return JSON.stringify(lessons, null, 2);
    }
    if (exportFormat === 'claude_md') {
      const lines = [
        '# Institutional Directives & Harness Guidelines',
        '',
        'Adhere strictly to these rules seasoned from automated verification runs:',
        '',
      ];
      lessons.forEach((l) => {
        lines.push(`- **${l.title}**: ${l.rule}`);
        if (l.anti_pattern) lines.push(`  *AVOID*: ${l.anti_pattern}`);
      });
      return lines.join('\n');
    }
    // Default: AGENTS.md format
    const lines = [
      '# Bento Institutional Memory Bank (AGENTS.md)',
      '',
      'Rules seasoned from automated harness testing, verification rigs, and self-healing loops.',
      '',
    ];
    const categories = Array.from(new Set(lessons.map((l) => l.category))).sort();
    categories.forEach((cat) => {
      lines.push(`## ${cat.toUpperCase()}`);
      lines.push('');
      lessons
        .filter((l) => l.category === cat)
        .forEach((l) => {
          lines.push(`### ${l.title} (\`${l.id}\`)`);
          lines.push(`- **Rule**: ${l.rule}`);
          if (l.anti_pattern) lines.push(`- **Anti-Pattern**: ${l.anti_pattern}`);
          if (l.tags && l.tags.length > 0) lines.push(`- **Tags**: ${l.tags.join(', ')}`);
          lines.push('');
        });
    });
    return lines.join('\n');
  }, [lessons, exportFormat]);

  const handleCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportContent);
      setCopiedExport(true);
      playZenBell();
      if (copyExportTimerRef.current) {
        clearTimeout(copyExportTimerRef.current);
      }
      copyExportTimerRef.current = setTimeout(() => setCopiedExport(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadExport = () => {
    const filename =
      exportFormat === 'json' ? 'bento_rules.json' : exportFormat === 'claude_md' ? 'CLAUDE.md' : 'AGENTS.md';
    const blob = new Blob([exportContent], { type: exportFormat === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    playZenBell();
  };

  // Connected edges for the selected node
  const connectedEdges = useMemo(() => {
    if (!selectedNode || !graphData) return [];
    return graphData.edges.filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id
    );
  }, [selectedNode, graphData]);

  return (
    <div className="space-y-6">
      {/* Header & View Controls */}
      <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <OnigiriIcon className="w-6 h-6 animate-bento-bounce" />
            Chef's Recipe Book · Seasoned Memory Bank ({lessons.length} Active Rules)
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Carefully seasoned architectural axioms and negative guards protecting autonomous runs.
          </p>
        </div>

        {/* Action, View Switcher & Search Bar */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* View Mode Toggle */}
          <div className="flex bg-bento-lacquer p-1 rounded-xl border border-bento-border shadow-inner">
            <button
              onClick={() => {
                playClack();
                setViewMode('cards');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-bento-surface text-white shadow-sm border border-bento-border/60'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => {
                playClack();
                setViewMode('graph');
                loadGraph();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'graph'
                  ? 'bg-bento-surface text-bento-matcha shadow-sm border border-bento-border/60'
                  : 'text-gray-400 hover:text-bento-matcha'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-bento-matcha" />
              <span>Flavor Graph 🕸️</span>
            </button>
          </div>

          <button
            onClick={() => {
              playClack();
              setShowExportModal(true);
            }}
            className="shrink-0 bg-bento-lacquer border border-bento-border hover:border-bento-matcha/60 text-gray-300 hover:text-white font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 min-h-[40px] shadow-sm"
          >
            <FileText className="w-4 h-4 text-bento-matcha" />
            <span>Export Rules 📋</span>
          </button>

          <button
            onClick={() => {
              playClack();
              setShowAddModal(true);
            }}
            className="shrink-0 bg-gradient-to-r from-bento-salmon to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 shadow-bento-glow min-h-[40px] touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span>Season Recipe 🍙</span>
          </button>

          {viewMode === 'cards' && (
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search recipes, rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-bento-lacquer border border-bento-border rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-salmon font-mono transition"
              />
            </div>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="bg-bento-nori border border-bento-salmon/50 rounded-xl p-3.5 text-xs text-rose-200 flex items-center justify-between gap-2 shadow-inner animate-fade-in">
          <div className="flex items-center gap-2">
            <WasabiBadgeIcon className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FLAVOR GRAPH VIEW */}
      {viewMode === 'graph' && (
        <div className="space-y-4">
          {/* Graph Legend & Filter Chips */}
          <div className="bg-bento-surface border border-bento-border rounded-bento p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-gray-400 font-semibold flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5 text-bento-matcha" /> Constellation Legend:
              </span>
              <span className="flex items-center gap-1.5 font-mono text-gray-300">
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-tamago-glow inline-block" />
                Category Hub
              </span>
              <span className="flex items-center gap-1.5 font-mono text-gray-300">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] inline-block" />
                Golden Axiom
              </span>
              <span className="flex items-center gap-1.5 font-mono text-gray-300">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-bento-glow inline-block" />
                Anti-Pattern Satellite
              </span>
              <span className="flex items-center gap-1.5 font-mono text-gray-300">
                <span className="w-3 h-3 rounded bg-cyan-500 inline-block" />
                Tasting Flight Scenario
              </span>
            </div>

            {graphData && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    selectedCategory === null
                      ? 'bg-bento-salmon text-white shadow-bento-glow'
                      : 'bg-bento-lacquer text-gray-400 hover:text-white'
                  }`}
                >
                  All ({graphData.nodes.length})
                </button>
                {graphData.categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      playClack();
                      setSelectedCategory(selectedCategory === cat ? null : cat);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                      selectedCategory === cat
                        ? 'bg-bento-matcha text-gray-900 font-bold'
                        : 'bg-bento-lacquer text-gray-400 hover:text-bento-matcha'
                    }`}
                  >
                    #{cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Celestial Graph Canvas & Slide-over Details Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* SVG Visualizer */}
            <div
              className="lg:col-span-2 bg-bento-surface border border-bento-border rounded-bento overflow-hidden relative shadow-2xl min-h-[550px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              {loadingGraph && (
                <div className="text-center text-gray-400 space-y-2">
                  <Network className="w-8 h-8 text-bento-matcha animate-spin mx-auto" />
                  <p className="font-mono text-xs">Simmering Flavor Constellation Graph...</p>
                </div>
              )}

              {/* In-Graph Search HUD */}
              {!loadingGraph && graphData && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#131117]/85 backdrop-blur-md border border-bento-border/80 rounded-xl px-3 py-1.5 text-xs text-white shadow-lg">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter constellation..."
                    value={graphQuery}
                    onChange={(e) => setGraphQuery(e.target.value)}
                    className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none w-36 font-mono"
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  {graphQuery && (
                    <button onClick={() => setGraphQuery('')} className="text-gray-400 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Canvas Controls HUD */}
              {!loadingGraph && graphData && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#131117]/85 backdrop-blur-md border border-bento-border/80 rounded-xl p-1 text-xs text-white shadow-lg">
                  <button
                    onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-[11px] px-1 text-gray-300 min-w-[36px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetTransform}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition ml-0.5 border-l border-white/10"
                    title="Reset View (0)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {!loadingGraph && graphData && (
                <svg
                  viewBox="0 0 1000 800"
                  className="w-full h-auto max-h-[680px] select-none pointer-events-auto"
                  style={{ background: 'radial-gradient(ellipse at center, #18191f 0%, #0d0e12 100%)' }}
                >
                  <defs>
                    <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#b45309" stopOpacity="0.4" />
                    </radialGradient>
                    <radialGradient id="ruleGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#047857" stopOpacity="0.5" />
                    </radialGradient>
                    <radialGradient id="antiGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#be123c" stopOpacity="0.5" />
                    </radialGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Transformed Canvas Group */}
                  <g
                    transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                    style={{ transformOrigin: '500px 400px', transition: isPanning ? 'none' : 'transform 150ms ease-out' }}
                  >
                    {/* Graph Grid Coordinates Subtle Rings */}
                    <circle cx="500" cy="400" r="180" fill="none" stroke="#252833" strokeDasharray="4 4" strokeWidth="1" />
                    <circle cx="500" cy="400" r="320" fill="none" stroke="#20222b" strokeDasharray="6 6" strokeWidth="1" />

                    {/* Edges */}
                    {graphData.edges.map((edge, idx) => {
                      const src = graphData.nodes.find((n) => n.id === edge.source);
                      const tgt = graphData.nodes.find((n) => n.id === edge.target);
                      if (!src || !tgt) return null;

                      const isHighlighted =
                        selectedNode && (selectedNode.id === src.id || selectedNode.id === tgt.id);

                      // Match filter
                      const q = graphQuery.toLowerCase();
                      const isMatch = !q ||
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
                          strokeOpacity={!isMatch ? 0.08 : (isHighlighted ? 0.95 : 0.45)}
                          strokeDasharray={dashArray}
                          filter={isHighlighted ? 'url(#glow)' : undefined}
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
                      const isMatch = !q ||
                        node.label.toLowerCase().includes(q) ||
                        node.id.toLowerCase().includes(q) ||
                        (node.details.rule && node.details.rule.toLowerCase().includes(q));

                      const nodeOpacity = !isMatch ? 0.15 : 1.0;
                      const hasAntiPattern =
                        node.node_type === 'golden_rule' && Boolean(node.details.anti_pattern);

                      if (node.node_type === 'category_hub') {
                        return (
                          <g
                            key={node.id}
                            className="cursor-pointer transition-transform duration-200"
                            opacity={nodeOpacity}
                            onClick={() => {
                              playClack();
                              setSelectedNode(node);
                            }}
                          >
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={isSelected ? 32 : 26}
                              fill="url(#hubGradient)"
                              stroke="#f59e0b"
                              strokeWidth={isSelected ? 3 : 1.5}
                              filter="url(#glow)"
                            />
                            <text
                              x={node.x}
                              y={node.y + 4}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="11"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {node.label.toUpperCase()}
                            </text>
                          </g>
                        );
                      }

                      if (node.node_type === 'golden_rule') {
                        return (
                          <g
                            key={node.id}
                            className="cursor-pointer"
                            opacity={nodeOpacity}
                            onClick={() => {
                              playClack();
                              setSelectedNode(node);
                            }}
                          >
                            {/* Anti-Pattern Warning Halo */}
                            {hasAntiPattern && (
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r={isSelected ? 26 : 21}
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                                className="animate-pulse"
                              />
                            )}
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={isSelected ? 22 : 17}
                              fill="url(#ruleGradient)"
                              stroke="#10b981"
                              strokeWidth={isSelected ? 2.5 : 1}
                              filter={isSelected || (q && isMatch) ? 'url(#glow)' : undefined}
                            />
                            <text
                              x={node.x}
                              y={node.y + 4}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="9"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {node.id.replace('MEM-', '')}
                            </text>
                            <text
                              x={node.x}
                              y={node.y + 26}
                              textAnchor="middle"
                              fill="#d1d5db"
                              fontSize="9"
                              fontFamily="sans-serif"
                              className="pointer-events-none"
                            >
                              {node.label.length > 16 ? node.label.slice(0, 14) + '…' : node.label}
                            </text>
                          </g>
                        );
                      }

                      if (node.node_type === 'anti_pattern') {
                        return (
                          <g
                            key={node.id}
                            className="cursor-pointer"
                            opacity={nodeOpacity}
                            onClick={() => {
                              playClack();
                              setSelectedNode(node);
                            }}
                          >
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={isSelected ? 18 : 14}
                              fill="url(#antiGradient)"
                              stroke="#f43f5e"
                              strokeWidth={isSelected ? 2.5 : 1.5}
                              filter="url(#glow)"
                            />
                            <text
                              x={node.x}
                              y={node.y + 4}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="10"
                              fontWeight="bold"
                            >
                              ✕
                            </text>
                          </g>
                        );
                      }

                      // Scenario chip
                      return (
                        <g
                          key={node.id}
                          className="cursor-pointer"
                          opacity={nodeOpacity}
                          onClick={() => {
                            playClack();
                            setSelectedNode(node);
                          }}
                        >
                          <rect
                            x={node.x - 24}
                            y={node.y - 12}
                            width="48"
                            height="24"
                            rx="6"
                            fill="#082f49"
                            stroke="#06b6d4"
                            strokeWidth={isSelected ? 2 : 1}
                          />
                          <text
                            x={node.x}
                            y={node.y + 4}
                            textAnchor="middle"
                            fill="#38bdf8"
                            fontSize="9"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            TEST
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              )}
            </div>

            {/* Slide-over Node Details Inspector */}
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
                      onClick={() => setSelectedNode(null)}
                      className="text-gray-400 hover:text-white p-1"
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
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Click any Category Hub, Golden Rule, or Anti-Pattern to inspect its distilled wisdom, relations, and verification links.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-bento-border text-center">
                <button
                  onClick={() => {
                    playClack();
                    setViewMode('cards');
                  }}
                  className="text-xs text-bento-salmon hover:underline font-bold flex items-center justify-center gap-1 mx-auto"
                >
                  <Eye className="w-3.5 h-3.5" /> Return to Recipe Cards Grid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && (
        <>
          {/* Ingredient Tag Chips Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400 font-semibold flex items-center gap-1 mr-1">
                <Tag className="w-3.5 h-3.5 text-bento-salmon" /> Filter Ingredients:
              </span>
              <button
                onClick={() => {
                  playClack();
                  setSelectedTag(null);
                }}
                className={`text-xs px-3.5 py-1 rounded-full transition font-bold ${
                  selectedTag === null
                    ? 'bg-bento-salmon text-white shadow-bento-glow'
                    : 'bg-bento-surface border border-bento-border text-gray-400 hover:text-white'
                }`}
              >
                All Recipes ({lessons.length})
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    playClack();
                    setSelectedTag(selectedTag === tag ? null : tag);
                  }}
                  className={`text-xs px-3.5 py-1 rounded-full transition font-medium ${
                    selectedTag === tag
                      ? 'bg-bento-salmon text-white shadow-bento-glow font-bold'
                      : 'bg-bento-surface border border-bento-border text-gray-400 hover:text-bento-salmon'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Recipe Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card flex flex-col justify-between hover:border-bento-salmon/60 hover:shadow-bento-glow transition duration-200"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-bento-salmon/15 text-bento-salmon border border-bento-salmon/30 rounded-lg flex items-center gap-1.5">
                      <OnigiriIcon className="w-3.5 h-3.5" />
                      {lesson.id}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-bento-tamago" /> {lesson.discovery_date || 'Enforced'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-bento-rice mb-2 flex items-center gap-1.5">
                    {lesson.title}
                  </h3>

                  {lesson.context && (
                    <p className="text-xs text-gray-300 mb-3 bg-bento-lacquer/80 p-2.5 rounded-xl border border-bento-border/70">
                      {lesson.context}
                    </p>
                  )}

                  {/* Hard Rule Box: Seasoned Recipe */}
                  <div className="bg-bento-nori border border-bento-matcha/40 rounded-xl p-3 mb-3 shadow-inner">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-bento-matcha mb-1">
                      <WasabiBadgeIcon className="w-4 h-4" /> GOLDEN RECIPE RULE
                    </div>
                    <p className="text-xs text-emerald-100/90 leading-relaxed font-sans font-medium">{lesson.rule}</p>
                  </div>

                  {/* Anti-Pattern Box: Burnt Dish */}
                  {lesson.anti_pattern && (
                    <div className="bg-rose-950/20 border border-bento-salmon/40 rounded-xl p-3 mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-bento-salmon mb-1">
                        <AlertCircle className="w-3.5 h-3.5" /> BURNT DISH / FORBIDDEN ANTI-PATTERN
                      </div>
                      <p className="text-xs text-rose-200/90 leading-relaxed font-sans">{lesson.anti_pattern}</p>
                    </div>
                  )}
                </div>

                {/* Tags & Source footer */}
                <div className="pt-3 border-t border-bento-border/70 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {lesson.tags.map((t) => (
                      <span key={t} className="text-[11px] font-mono text-gray-300 bg-bento-lacquer px-2.5 py-0.5 rounded-lg border border-bento-border">
                        #{t}
                      </span>
                    ))}
                  </div>
                  {lesson.source_scenario && (
                    <span className="text-[11px] text-gray-400 font-mono truncate max-w-[170px]">
                      Origin: {lesson.source_scenario}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredLessons.length === 0 && (
            <div className="p-12 text-center text-gray-400 bg-bento-surface border border-bento-border rounded-bento">
              <BentoBoxIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No culinary memory recipes match the selected ingredients.</p>
            </div>
          )}
        </>
      )}

      {/* Modal: Season New Recipe */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              playClack();
              setShowAddModal(false);
            }
          }}
        >
          <div
            ref={addModalRef}
            {...addModalProps}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-recipe-title"
            className="bg-bento-surface border border-bento-border rounded-bento w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up"
          >
            <div className="px-6 py-4 border-b border-bento-border flex justify-between items-center bg-bento-elevated">
              <h3 id="add-recipe-title" className="text-base font-bold text-white flex items-center gap-2">
                <OnigiriIcon className="w-5 h-5" /> Season New Recipe (Architectural Axiom)
              </h3>
              <button
                onClick={() => {
                  playClack();
                  setShowAddModal(false);
                }}
                aria-label="Close Season New Recipe modal"
                title="Close"
                className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRecipe} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-950/40 border border-bento-salmon/40 rounded-xl p-3 text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label htmlFor="new-recipe-title" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Recipe Title *
                </label>
                <input
                  id="new-recipe-title"
                  type="text"
                  placeholder="e.g. Clean Domain Port Rule"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3.5 py-2 text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-salmon transition"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new-recipe-category" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    id="new-recipe-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3.5 py-2 text-sm text-bento-rice focus:outline-none focus:border-bento-salmon transition"
                  >
                    <option value="architecture">Architecture</option>
                    <option value="security">Security</option>
                    <option value="git">Git Hygiene</option>
                    <option value="performance">Performance</option>
                    <option value="reliability">Reliability</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="new-recipe-tags" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Tags (comma-separated)
                  </label>
                  <input
                    id="new-recipe-tags"
                    type="text"
                    placeholder="e.g. domain, io, purity"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3.5 py-2 text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-salmon transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-recipe-rule" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Golden Rule (The Contract) *
                </label>
                <textarea
                  id="new-recipe-rule"
                  placeholder="State the non-negotiable rule..."
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  rows={3}
                  className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3.5 py-2 text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-salmon font-mono transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="new-recipe-antipattern" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Burnt Dish / Anti-Pattern (What to Avoid)
                </label>
                <textarea
                  id="new-recipe-antipattern"
                  placeholder="Describe the dangerous temptation or anti-pattern..."
                  value={newAntiPattern}
                  onChange={(e) => setNewAntiPattern(e.target.value)}
                  rows={2}
                  className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3.5 py-2 text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-salmon font-mono transition"
                />
              </div>

              <div className="pt-4 border-t border-bento-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-bento-salmon to-rose-600 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white font-extrabold px-5 py-2 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 shadow-bento-glow"
                >
                  {isSubmitting ? 'Seasoning...' : 'Save Recipe 🍙'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Export Rules */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              playClack();
              setShowExportModal(false);
            }
          }}
        >
          <div
            ref={exportModalRef}
            {...exportModalProps}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-rules-title"
            className="bg-bento-surface border border-bento-border rounded-bento w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[85vh]"
          >
            <div className="px-6 py-4 border-b border-bento-border flex justify-between items-center bg-bento-elevated">
              <h3 id="export-rules-title" className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-bento-matcha" /> Export Seasoned Memory Rules
              </h3>
              <button
                onClick={() => {
                  playClack();
                  setShowExportModal(false);
                }}
                aria-label="Close Export Seasoned Memory Rules modal"
                title="Close"
                className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Format Switcher */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex bg-bento-lacquer p-1 rounded-xl border border-bento-border">
                  {(['agents_md', 'claude_md', 'json'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => {
                        playClack();
                        setExportFormat(fmt);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                        exportFormat === fmt
                          ? 'bg-bento-surface text-white shadow-sm border border-bento-border/60'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {fmt === 'agents_md' ? 'AGENTS.md' : fmt === 'claude_md' ? 'CLAUDE.md' : 'JSON'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyExport}
                    aria-label="Copy memory rules export to clipboard"
                    className="px-3.5 py-1.5 rounded-xl bg-bento-matcha hover:bg-emerald-400 text-gray-950 font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedExport ? 'Copied! ✓' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownloadExport}
                    aria-label="Download memory rules export file"
                    className="px-3.5 py-1.5 rounded-xl bg-bento-lacquer border border-bento-border hover:border-bento-matcha/60 text-gray-200 hover:text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Text Area Preview */}
              <div className="relative">
                <textarea
                  readOnly
                  aria-label="Exported memory rules preview"
                  value={exportContent}
                  rows={14}
                  className="w-full bg-[#0e0d13] border border-bento-border rounded-xl p-4 font-mono text-xs text-gray-300 focus:outline-none select-all leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
