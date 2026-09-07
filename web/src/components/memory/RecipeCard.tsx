import React, { useState } from 'react';
import { Star, Copy, Check, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { MemoryLesson } from '../../types';
import { OnigiriIcon } from '../icons/BentoIcons';
import { HighlightMatch } from './HighlightMatch';
import { normalizeTags, formatRelativeDate } from '../../utils/tagUtils';
import { playClack } from '../../utils/audio';

interface RecipeCardProps {
  lesson: MemoryLesson;
  searchQuery: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelectTag: (tag: string) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  lesson,
  searchQuery,
  isFavorite,
  onToggleFavorite,
  onSelectTag,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const tags = normalizeTags(lesson.tags);
  const cat = (lesson.category || 'general').toLowerCase();

  // Semantic category color mappings
  let borderColor = 'border-bento-border';
  let categoryBadgeClass = 'bg-gray-500/15 text-gray-300 border-gray-500/30';

  if (cat.includes('sec')) {
    borderColor = 'hover:border-rose-500/60';
    categoryBadgeClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  } else if (cat.includes('arch')) {
    borderColor = 'hover:border-indigo-400/60';
    categoryBadgeClass = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  } else if (cat.includes('access') || cat.includes('a11y')) {
    borderColor = 'hover:border-amber-400/60';
    categoryBadgeClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  } else if (cat.includes('quant') || cat.includes('trad')) {
    borderColor = 'hover:border-emerald-400/60';
    categoryBadgeClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (cat.includes('web') || cat.includes('ui')) {
    borderColor = 'hover:border-cyan-400/60';
    categoryBadgeClass = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
  }

  const handleCopyMarkdown = () => {
    playClack();
    const md = `### [${lesson.id}] ${lesson.title}\n- **Rule**: ${lesson.rule}${
      lesson.anti_pattern ? `\n- **Anti-Pattern**: ${lesson.anti_pattern}` : ''
    }\n- **Tags**: ${tags.map((t) => `#${t}`).join(', ')}`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLong = (lesson.rule?.length || 0) + (lesson.anti_pattern?.length || 0) > 350;

  return (
    <article
      aria-labelledby={`recipe-heading-${lesson.id}`}
      className={`bg-bento-surface border border-bento-border ${borderColor} rounded-bento p-5 shadow-bento-card flex flex-col justify-between transition-all duration-200 hover:shadow-bento-glow group`}
    >
      <div>
        {/* Header: ID, Category, Date, Star, Copy */}
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-bento-salmon/15 text-bento-salmon border border-bento-salmon/30 rounded-lg flex items-center gap-1.5 shrink-0">
              <OnigiriIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <HighlightMatch text={lesson.id} query={searchQuery} />
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${categoryBadgeClass}`}
            >
              {lesson.category || 'general'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {lesson.discovery_date && (
              <span
                className="text-[11px] text-gray-500 font-mono mr-1.5 flex items-center gap-1"
                title={`Discovered: ${lesson.discovery_date}`}
              >
                <Calendar className="w-3 h-3" aria-hidden="true" />
                <span>{formatRelativeDate(lesson.discovery_date)}</span>
              </span>
            )}

            {/* Favorite Star Button */}
            <button
              type="button"
              onClick={() => onToggleFavorite(lesson.id)}
              aria-label={isFavorite ? `Unstar recipe ${lesson.id}` : `Star recipe ${lesson.id}`}
              aria-pressed={isFavorite}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="p-1.5 rounded-lg hover:bg-bento-border text-gray-400 hover:text-amber-300 transition focus-visible:ring-2 focus-visible:ring-bento-tamago min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <Star
                className={`w-4 h-4 ${
                  isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-500'
                }`}
                aria-hidden="true"
              />
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyMarkdown}
              aria-label={`Copy markdown for recipe ${lesson.id}`}
              title="Copy markdown snippet"
              className="p-1.5 rounded-lg hover:bg-bento-border text-gray-400 hover:text-white transition focus-visible:ring-2 focus-visible:ring-bento-tamago min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Title */}
        <h3
          id={`recipe-heading-${lesson.id}`}
          className="text-base font-bold text-gray-100 mb-3 group-hover:text-bento-salmon transition-colors"
        >
          <HighlightMatch text={lesson.title} query={searchQuery} />
        </h3>

        {/* Golden Rule Container */}
        <div className="bg-[#121c17] border border-emerald-500/40 rounded-xl p-3 mb-3 text-xs leading-relaxed shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1.5 text-[11px] uppercase tracking-wider font-mono">
            <span aria-hidden="true">✦</span>
            <span>Golden Recipe Rule</span>
          </div>
          <p className="text-emerald-100/90 font-medium">
            <HighlightMatch text={lesson.rule} query={searchQuery} />
          </p>
        </div>

        {/* Forbidden Anti-Pattern Container */}
        {lesson.anti_pattern && (
          <div className="bg-[#241419] border border-rose-500/40 rounded-xl p-3 mb-3 text-xs leading-relaxed shadow-sm">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1.5 text-[11px] uppercase tracking-wider font-mono">
              <span aria-hidden="true">⊘</span>
              <span>Burnt Dish / Forbidden Anti-Pattern</span>
            </div>
            <p className="text-rose-100/90 font-medium">
              <HighlightMatch text={lesson.anti_pattern} query={searchQuery} />
            </p>
          </div>
        )}

        {/* Context / Origin note */}
        {lesson.context && (
          <div className="text-[11px] text-gray-400 font-mono italic mb-2">
            Origin: <HighlightMatch text={lesson.context} query={searchQuery} />
          </div>
        )}
      </div>

      {/* Footer Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-bento-border/70">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                playClack();
                onSelectTag(tag);
              }}
              aria-label={`Filter by tag #${tag}`}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-bento-lacquer border border-bento-border text-gray-400 hover:text-bento-salmon hover:border-bento-salmon/40 transition"
            >
              #<HighlightMatch text={tag} query={searchQuery} />
            </button>
          ))}
        </div>
      )}
    </article>
  );
};
