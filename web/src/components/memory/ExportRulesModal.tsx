import React, { useRef, useState, useMemo } from 'react';
import { X, Copy, Check, Download, FileText } from 'lucide-react';
import { MemoryLesson } from '../../types';
import { useA11yModal } from '../../hooks/useA11yModal';
import { playClack } from '../../utils/audio';

interface ExportRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: MemoryLesson[];
}

type ExportFormat = 'agents_md' | 'claude_md' | 'json';

export const ExportRulesModal: React.FC<ExportRulesModalProps> = ({
  isOpen,
  onClose,
  lessons,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<ExportFormat>('agents_md');
  const [copied, setCopied] = useState(false);

  const { modalProps } = useA11yModal({
    isOpen,
    onClose,
    containerRef: modalRef,
  });

  const exportText = useMemo(() => {
    if (format === 'json') {
      return JSON.stringify(lessons, null, 2);
    }

    const lines: string[] = [
      '# Bento Institutional Memory Bank',
      '',
      'Rules seasoned from automated harness testing, verification rigs, and self-healing loops.',
      '',
    ];

    const categories = Array.from(new Set(lessons.map((l) => l.category || 'general'))).sort();

    for (const cat of categories) {
      lines.push(`## ${cat.toUpperCase()}`);
      lines.push('');
      const catLessons = lessons.filter((l) => (l.category || 'general') === cat);
      for (const l of catLessons) {
        lines.push(`### ${l.title} (\`${l.id}\`)`);
        lines.push(`- **Rule**: ${l.rule}`);
        if (l.anti_pattern) {
          lines.push(`- **Anti-Pattern**: ${l.anti_pattern}`);
        }
        if (l.tags && l.tags.length > 0) {
          lines.push(`- **Tags**: ${l.tags.map((t) => `#${t}`).join(', ')}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }, [lessons, format]);

  const handleCopy = () => {
    playClack();
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    playClack();
    const filename =
      format === 'json'
        ? 'bento_memory.json'
        : format === 'claude_md'
        ? 'CLAUDE.md'
        : 'AGENTS.md';
    const mime = format === 'json' ? 'application/json' : 'text/markdown';
    const blob = new Blob([exportText], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-150"
        onClick={() => {
          playClack();
          onClose();
        }}
      />
      <div
        ref={modalRef}
        {...modalProps}
        role="dialog"
        aria-labelledby="export-modal-title"
        aria-modal="true"
        className="fixed inset-x-4 top-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-bento-surface border border-bento-border rounded-bento shadow-2xl p-6 z-50 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-bento-border">
          <h3 id="export-modal-title" className="text-base font-bold text-gray-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-bento-matcha" aria-hidden="true" />
            Export Memory Rules ({lessons.length})
          </h3>
          <button
            type="button"
            onClick={() => {
              playClack();
              onClose();
            }}
            aria-label="Close export modal"
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-bento-border"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Format Switcher */}
        <div className="my-3 flex items-center justify-between gap-3 flex-wrap">
          <div
            role="radiogroup"
            aria-label="Select export format"
            className="flex items-center gap-1 bg-bento-lacquer p-1 rounded-xl border border-bento-border text-xs font-mono"
          >
            {(['agents_md', 'claude_md', 'json'] as ExportFormat[]).map((fmt) => (
              <button
                key={fmt}
                type="button"
                role="radio"
                aria-checked={format === fmt}
                onClick={() => {
                  playClack();
                  setFormat(fmt);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  format === fmt
                    ? 'bg-bento-surface text-bento-salmon font-bold shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {fmt === 'agents_md' ? 'AGENTS.md' : fmt === 'claude_md' ? 'CLAUDE.md' : 'JSON'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-bento-lacquer hover:bg-bento-border border border-bento-border rounded-xl text-xs font-mono text-gray-200 transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-1.5 bg-bento-matcha/20 hover:bg-bento-matcha/30 border border-bento-matcha/40 text-bento-matcha rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Preview terminal */}
        <div className="flex-1 bg-bento-lacquer border border-bento-border rounded-xl p-3 font-mono text-xs text-gray-300 overflow-y-auto max-h-96 whitespace-pre">
          {exportText}
        </div>
      </div>
    </>
  );
};
