import React from 'react';

/**
 * ANSI escape code regex matching standard terminal escape sequences.
 */
const ANSI_REGEX = /\x1b\[([0-9;]*)m/g;
const GENERAL_ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;

/**
 * Strips all ANSI escape sequences from a string.
 */
export function stripAnsi(str: string): string {
  if (!str || !str.includes('\x1b')) return str;
  return str.replace(GENERAL_ANSI_REGEX, '');
}

interface AnsiStyle {
  color?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

const COLOR_MAP: Record<number, string> = {
  30: 'text-gray-900',
  31: 'text-rose-400',
  32: 'text-emerald-400',
  33: 'text-amber-300',
  34: 'text-sky-400',
  35: 'text-purple-400',
  36: 'text-cyan-300',
  37: 'text-gray-200',
  90: 'text-gray-500',
  91: 'text-rose-300',
  92: 'text-emerald-300',
  93: 'text-amber-200',
  94: 'text-sky-300',
  95: 'text-purple-300',
  96: 'text-cyan-200',
  97: 'text-white',
};

/**
 * Parses a string containing ANSI escape codes into React nodes with Tailwind styling.
 */
export function parseAnsi(text: string): React.ReactNode {
  if (!text || !text.includes('\x1b')) {
    return text;
  }

  // Remove non-SGR sequences first (e.g. cursor moves, clear line)
  const cleanedText = text.replace(/\x1b\[[0-9;]*[a-ln-zA-Z]/g, '');

  const segments: React.ReactNode[] = [];
  let currentStyle: AnsiStyle = {};
  let lastIndex = 0;
  let key = 0;

  ANSI_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ANSI_REGEX.exec(cleanedText)) !== null) {
    const textChunk = cleanedText.slice(lastIndex, match.index);
    if (textChunk) {
      segments.push(renderChunk(textChunk, currentStyle, key++));
    }

    // Process ANSI codes
    const codeString = match[1] || '0';
    const codes = codeString.split(';').map((c) => parseInt(c, 10) || 0);

    for (const code of codes) {
      if (code === 0) {
        currentStyle = {};
      } else if (code === 1) {
        currentStyle.bold = true;
      } else if (code === 2) {
        currentStyle.dim = true;
      } else if (code === 3) {
        currentStyle.italic = true;
      } else if (code === 4) {
        currentStyle.underline = true;
      } else if (COLOR_MAP[code]) {
        currentStyle.color = COLOR_MAP[code];
      } else if (code === 39) {
        delete currentStyle.color;
      }
    }

    lastIndex = ANSI_REGEX.lastIndex;
  }

  const remaining = cleanedText.slice(lastIndex);
  if (remaining) {
    segments.push(renderChunk(remaining, currentStyle, key++));
  }

  return segments.length > 0 ? <>{segments}</> : text;
}

function renderChunk(text: string, style: AnsiStyle, key: number): React.ReactNode {
  const classes: string[] = [];
  if (style.color) classes.push(style.color);
  if (style.bold) classes.push('font-bold');
  if (style.dim) classes.push('opacity-60');
  if (style.italic) classes.push('italic');
  if (style.underline) classes.push('underline');

  if (classes.length === 0) {
    return text;
  }

  return (
    <span key={key} className={classes.join(' ')}>
      {text}
    </span>
  );
}
