/**
 * Pure Query Parser Utility for Bento Telemetry Search.
 * Extracts structured tokens (e.g. status:passed, tag:sprint, id:bg-123) and raw keywords.
 * Zero external dependencies, pure functional logic.
 */

export interface ParsedQuery {
  raw: string;
  tokens: Record<string, string>;
  keywords: string[];
}

export function parseSearchQuery(query: string): ParsedQuery {
  if (!query || typeof query !== 'string') {
    return { raw: '', tokens: {}, keywords: [] };
  }

  const trimmed = query.trim();
  const tokens: Record<string, string> = {};
  const keywords: string[] = [];

  // Match key:value or key:"value with spaces"
  const tokenRegex = /(\w+):(?:"([^"]+)"|(\S+))/g;
  let match: RegExpExecArray | null;

  // Extract all key:value pairs
  while ((match = tokenRegex.exec(trimmed)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2] || match[3] || '';
    tokens[key] = value.toLowerCase();
  }

  // Remove the matched tokens to extract remaining keywords
  const stripped = trimmed.replace(tokenRegex, ' ').replace(/\s+/g, ' ').trim();
  if (stripped) {
    keywords.push(...stripped.toLowerCase().split(' ').filter(Boolean));
  }

  return {
    raw: trimmed,
    tokens,
    keywords,
  };
}
