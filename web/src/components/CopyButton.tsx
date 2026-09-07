import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { playShisoSnap } from '../utils/audio';
import { showToast } from './Toast';

interface CopyButtonProps {
  text: string;
  label?: string;
  tooltip?: string;
  iconOnly?: boolean;
  toastTitle?: string;
  className?: string;
  'aria-label'?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Copy',
  tooltip = 'Copy to clipboard',
  iconOnly = false,
  toastTitle,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      playShisoSnap();
      setCopied(true);
      if (toastTitle) {
        showToast({ title: toastTitle, message: 'Copied to clipboard', type: 'success' });
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ title: 'Copy Failed', message: 'Could not access clipboard', type: 'error' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel ?? (copied ? 'Copied to clipboard' : tooltip)}
      title={tooltip}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border transition text-xs font-mono select-none ${
        copied
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
          : 'bg-bento-lacquer hover:bg-bento-elevated text-zinc-300 hover:text-white border-bento-border'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50 duration-150" />
          {!iconOnly && <span className="font-bold text-emerald-300">Copied!</span>}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
          {!iconOnly && <span>{label}</span>}
        </>
      )}
    </button>
  );
};
