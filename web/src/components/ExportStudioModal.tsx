import React, { useState, useRef, useMemo } from 'react';
import { X, Download, Copy, Check, FileText, Code2, MessageSquare, Globe, Sparkles } from 'lucide-react';
import { playClack, playShisoSnap } from '../utils/audio';
import { useA11yModal } from '../hooks/useA11yModal';
import { generateHarnessReport } from '../utils/harnessReport';
import { MemoryLesson, TraceEvent, TelemetryMetrics, SystemVitals, SystemStatus, BackgroundTask } from '../types';

interface ExportStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemStatus;
  tasks: BackgroundTask[];
  lessons: MemoryLesson[];
  traces: TraceEvent[];
  telemetry: TelemetryMetrics | null;
  vitals: SystemVitals | null;
  runningTasksCount: number;
}

type ExportFormat = 'markdown' | 'json' | 'slack' | 'html';

export const ExportStudioModal: React.FC<ExportStudioModalProps> = ({
  isOpen,
  onClose,
  status,
  tasks,
  lessons,
  traces,
  telemetry,
  vitals,
  runningTasksCount,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('markdown');
  const [isCopied, setIsCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { modalProps } = useA11yModal({
    isOpen,
    onClose,
    containerRef: modalRef,
  });

  // Generate content based on format
  const exportContent = useMemo(() => {
    switch (activeFormat) {
      case 'markdown':
        return generateHarnessReport({
          status,
          tasks,
          lessons,
          telemetry,
          vitals,
        });

      case 'json':
        return JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            bento_version: '0.5.0',
            vitals,
            telemetry,
            summary: {
              rules_count: lessons.length,
              traces_count: traces.length,
              running_tasks: runningTasksCount,
            },
            memory_rules: lessons,
            recent_traces: traces.slice(0, 20),
          },
          null,
          2
        );

      case 'slack': {
        const passRate = telemetry ? `${telemetry.pass_rate.toFixed(1)}%` : 'N/A';
        const p90 = telemetry ? `${telemetry.p90_latency_ms.toFixed(0)}ms` : 'N/A';
        return `*🍱 Bento Harness Telemetry Digest*\n` +
          `• *Status:* Serving Fresh\n` +
          `• *Memory Bank:* ${lessons.length} Active Rules\n` +
          `• *Pass Rate:* ${passRate} (P90: ${p90})\n` +
          `• *Simmering Daemons:* ${runningTasksCount} Active\n` +
          `• *Host:* ${vitals?.os || 'macOS'} (Python ${vitals?.python_version || '3.12'})\n` +
          `_Exported: ${new Date().toLocaleString()}_`;
      }

      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Bento Harness Telemetry Digest</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #131117; color: #fbf9f5; padding: 2rem; }
    h1 { color: #ff6b6b; font-size: 1.5rem; }
    .badge { background: #2a2334; padding: 0.2rem 0.5rem; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>🍱 Bento Harness Executive Digest</h1>
  <p><strong>Exported:</strong> ${new Date().toISOString()}</p>
  <p><strong>Rules:</strong> <span class="badge">${lessons.length}</span> | <strong>Traces:</strong> <span class="badge">${traces.length}</span></p>
  <p><strong>Pass Rate:</strong> <span class="badge">${telemetry ? telemetry.pass_rate.toFixed(1) : 100}%</span></p>
</body>
</html>`;

      default:
        return '';
    }
  }, [activeFormat, lessons, traces, telemetry, vitals, runningTasksCount]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportContent);
      playShisoSnap();
      setIsCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    playClack();
    const dateStr = new Date().toISOString().split('T')[0];
    let ext = 'md';
    let mimeType = 'text/markdown; charset=utf-8';

    if (activeFormat === 'json') {
      ext = 'json';
      mimeType = 'application/json; charset=utf-8';
    } else if (activeFormat === 'slack') {
      ext = 'txt';
      mimeType = 'text/plain; charset=utf-8';
    } else if (activeFormat === 'html') {
      ext = 'html';
      mimeType = 'text/html; charset=utf-8';
    }

    const filename = `bento-telemetry-${dateStr}.${ext}`;
    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 150);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        {...modalProps}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-bento-surface border border-bento-border rounded-bento shadow-2xl p-5 sm:p-6 text-gray-100 relative focus:outline-none flex flex-col max-h-[90vh]"
        aria-labelledby="export-studio-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-bento-border/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-bento-salmon/15 border border-bento-salmon/30 flex items-center justify-center text-bento-salmon">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="export-studio-title" className="text-base font-extrabold text-white flex items-center gap-2">
                Export Studio 🍱
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Multi-format snapshot of memory axioms & telemetry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Export Studio"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Strip */}
        <div className="flex items-center gap-1.5 py-3 border-b border-bento-border/50 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => {
              playClack();
              setActiveFormat('markdown');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeFormat === 'markdown'
                ? 'bg-bento-salmon text-white shadow-bento-glow'
                : 'bg-bento-lacquer text-zinc-400 hover:text-white border border-bento-border'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Markdown Report (.md)
          </button>
          <button
            type="button"
            onClick={() => {
              playClack();
              setActiveFormat('json');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeFormat === 'json'
                ? 'bg-bento-salmon text-white shadow-bento-glow'
                : 'bg-bento-lacquer text-zinc-400 hover:text-white border border-bento-border'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" /> Structured JSON (.json)
          </button>
          <button
            type="button"
            onClick={() => {
              playClack();
              setActiveFormat('slack');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeFormat === 'slack'
                ? 'bg-bento-salmon text-white shadow-bento-glow'
                : 'bg-bento-lacquer text-zinc-400 hover:text-white border border-bento-border'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Slack Mrkdwn
          </button>
          <button
            type="button"
            onClick={() => {
              playClack();
              setActiveFormat('html');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeFormat === 'html'
                ? 'bg-bento-salmon text-white shadow-bento-glow'
                : 'bg-bento-lacquer text-zinc-400 hover:text-white border border-bento-border'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> HTML Digest (.html)
          </button>
        </div>

        {/* Content Preview */}
        <div className="my-3 flex-1 min-h-[220px] max-h-[400px] overflow-hidden rounded-xl border border-bento-border bg-[#0d0a12] p-3">
          <pre className="w-full h-full overflow-auto text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed selection:bg-bento-salmon selection:text-white">
            {exportContent}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-bento-border/70 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] font-mono text-zinc-500 hidden sm:block">
            UTF-8 encoded · Zero secrets included
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                isCopied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-bento-lacquer hover:bg-white/10 text-zinc-300 border-bento-border'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Content</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 bg-gradient-to-r from-bento-salmon to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white shadow-bento-glow"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
