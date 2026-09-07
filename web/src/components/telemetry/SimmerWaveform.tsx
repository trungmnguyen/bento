import React from 'react';

interface SimmerWaveformProps {
  activeCount: number;
  className?: string;
}

export const SimmerWaveform: React.FC<SimmerWaveformProps> = ({
  activeCount,
  className = '',
}) => {
  if (activeCount <= 0) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono select-none ${className}`}
      aria-label={`${activeCount} active daemon${activeCount > 1 ? 's' : ''} simmering`}
      title={`${activeCount} daemon${activeCount > 1 ? 's' : ''} currently simmering`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>

      {/* Simmering steam wave SVG */}
      <svg
        className="w-12 h-3.5 text-amber-400/80"
        viewBox="0 0 48 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M2 7C5 3 9 3 12 7C15 11 19 11 22 7C25 3 29 3 32 7C35 11 39 11 42 7C44 4.5 46 4.5 47 7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="48"
          className="animate-steam"
        />
      </svg>

      <span className="font-bold text-[11px] uppercase tracking-wider">
        {activeCount} Simmering
      </span>
    </div>
  );
};
