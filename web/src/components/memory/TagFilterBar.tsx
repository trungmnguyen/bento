import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Tag, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { MemoryLesson } from '../../types';
import { getTagFrequencies } from '../../utils/tagUtils';
import { playClack } from '../../utils/audio';

interface TagFilterBarProps {
  lessons: MemoryLesson[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

const TOP_TAG_LIMIT = 8;

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  lessons,
  selectedTag,
  onSelectTag,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [popoverSearch, setPopoverSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute tag frequencies from lessons
  const tagList = useMemo(() => getTagFrequencies(lessons), [lessons]);

  const topTags = useMemo(() => tagList.slice(0, TOP_TAG_LIMIT), [tagList]);
  const remainingTags = useMemo(() => tagList.slice(TOP_TAG_LIMIT), [tagList]);

  const filteredRemainingTags = useMemo(() => {
    if (!popoverSearch.trim()) return remainingTags;
    const q = popoverSearch.toLowerCase().trim();
    return remainingTags.filter(({ tag }) => tag.includes(q));
  }, [remainingTags, popoverSearch]);

  // Close popover on outside click
  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  if (tagList.length === 0) return null;

  return (
    <div className="relative flex flex-wrap items-center gap-1.5 py-1 text-xs">
      <span className="text-gray-400 font-semibold flex items-center gap-1 mr-1 shrink-0 font-mono text-[11px]">
        <Tag className="w-3.5 h-3.5 text-bento-salmon" aria-hidden="true" />
        Tags:
      </span>

      {/* Top Tag Pills */}
      {topTags.map(({ tag, count }) => {
        const isSelected = selectedTag === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => {
              playClack();
              onSelectTag(isSelected ? null : tag);
            }}
            aria-pressed={isSelected}
            aria-label={`Tag #${tag}, ${count} rules`}
            className={`px-2.5 py-1 min-h-[30px] rounded-lg border font-mono text-[11px] whitespace-nowrap transition flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-tamago ${
              isSelected
                ? 'bg-bento-salmon text-gray-950 font-extrabold border-bento-salmon shadow-bento-glow'
                : 'bg-bento-surface border-bento-border text-gray-300 hover:text-white hover:border-gray-500'
            }`}
          >
            <span>#{tag}</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded-full tabular-nums ${
                isSelected ? 'bg-black/25 text-gray-950 font-bold' : 'bg-bento-lacquer text-gray-400'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}

      {/* Expand More Tags Button */}
      {remainingTags.length > 0 && (
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => {
              playClack();
              setIsExpanded(!isExpanded);
            }}
            aria-expanded={isExpanded}
            aria-label={`Show ${remainingTags.length} more tags`}
            className={`px-2.5 py-1 min-h-[30px] rounded-lg border font-mono text-[11px] whitespace-nowrap transition flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-bento-tamago ${
              isExpanded || (selectedTag && remainingTags.some((t) => t.tag === selectedTag))
                ? 'bg-bento-elevated border-bento-salmon/50 text-bento-salmon font-bold'
                : 'bg-bento-lacquer border-bento-border text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>+{remainingTags.length} more</span>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3 h-3" aria-hidden="true" />
            )}
          </button>

          {/* More Tags Popover Dropdown */}
          {isExpanded && (
            <div className="absolute left-0 top-full mt-2 w-72 max-w-[90vw] bg-bento-surface border border-bento-border rounded-xl shadow-2xl p-3 z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={popoverSearch}
                  onChange={(e) => setPopoverSearch(e.target.value)}
                  placeholder="Search tags..."
                  aria-label="Filter tags in popover"
                  className="w-full bg-bento-lacquer border border-bento-border rounded-lg pl-7 pr-7 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-bento-tamago font-mono"
                  autoFocus
                />
                {popoverSearch && (
                  <button
                    type="button"
                    onClick={() => setPopoverSearch('')}
                    aria-label="Clear tag search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredRemainingTags.length > 0 ? (
                  filteredRemainingTags.map(({ tag, count }) => {
                    const isSelected = selectedTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          playClack();
                          onSelectTag(isSelected ? null : tag);
                          setIsExpanded(false);
                        }}
                        aria-pressed={isSelected}
                        className={`w-full text-left px-2 py-1 rounded-lg text-xs font-mono flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-bento-salmon text-gray-950 font-bold'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="truncate">#{tag}</span>
                        <span className="text-[10px] opacity-70 tabular-nums ml-2">{count}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-gray-500 text-xs py-2 text-center font-mono">
                    No matching tags
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
