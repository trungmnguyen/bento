import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface LiveDurationTickerProps {
  startTime?: string | number | null;
  className?: string;
}

export const LiveDurationTicker: React.FC<LiveDurationTickerProps> = ({
  startTime,
  className = '',
}) => {
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    if (!startTime) {
      setElapsedSec(0);
      return;
    }

    const startMs = typeof startTime === 'number'
      ? (startTime > 1e12 ? startTime : startTime * 1000)
      : new Date(startTime).getTime();

    if (isNaN(startMs)) {
      setElapsedSec(0);
      return;
    }

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startMs) / 1000));
      setElapsedSec(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatDuration = (sec: number): string => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-zinc-300 font-medium ${className}`}
      aria-label={`Running for ${elapsedSec} seconds`}
      title={`Live duration: ${formatDuration(elapsedSec)}`}
    >
      <Timer className="w-3 h-3 text-bento-tamago animate-spin [animation-duration:4s]" />
      <span className="tabular-nums">{formatDuration(elapsedSec)}</span>
    </span>
  );
};
