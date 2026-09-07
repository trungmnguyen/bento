import React from 'react';

interface HighlightMatchProps {
  text: string;
  query: string;
  className?: string;
}

export const HighlightMatch: React.FC<HighlightMatchProps> = ({ text, query, className = '' }) => {
  if (!query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  const q = query.trim().toLowerCase();
  const lowerText = text.toLowerCase();
  const firstIdx = lowerText.indexOf(q);

  if (firstIdx === -1) {
    return <span className={className}>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    const idx = remaining.toLowerCase().indexOf(q);
    if (idx === -1) {
      parts.push(remaining);
      break;
    }
    if (idx > 0) {
      parts.push(remaining.slice(0, idx));
    }
    const match = remaining.slice(idx, idx + q.length);
    parts.push(
      <mark
        key={key++}
        className="bg-amber-400/30 text-amber-200 font-semibold px-0.5 rounded shadow-sm"
      >
        {match}
      </mark>
    );
    remaining = remaining.slice(idx + q.length);
  }

  return <span className={className}>{parts}</span>;
};
