import React, { useState, useMemo } from 'react';
import { Search, Tag, Calendar, Layers, AlertCircle, ShieldCheck } from 'lucide-react';
import { OnigiriIcon, WasabiBadgeIcon, BentoBoxIcon } from './icons/BentoIcons';
import { MemoryLesson } from '../types';

interface MemoryViewProps {
  lessons: MemoryLesson[];
}

export const MemoryView: React.FC<MemoryViewProps> = ({ lessons }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    lessons.forEach((l) => l.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [lessons]);

  // Filter lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesSearch =
        searchTerm === '' ||
        lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.rule.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = selectedTag === null || lesson.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [lessons, searchTerm, selectedTag]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card flex flex-col md:flex-row gap-4 justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <OnigiriIcon className="w-6 h-6 animate-bento-bounce" />
            Chef's Recipe Book · Seasoned Memory Bank ({lessons.length} Active Rules)
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Carefully seasoned rules and negative guards distilled from self-healing and curriculum ingestions, automatically protecting future agent runs.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search recipes, ingredients, rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bento-lacquer border border-bento-border rounded-xl pl-9 pr-4 py-2 text-sm text-bento-rice placeholder-gray-500 focus:outline-none focus:border-bento-salmon font-mono transition"
          />
        </div>
      </div>

      {/* Ingredient Tag Chips Filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400 font-semibold flex items-center gap-1 mr-1">
            <Tag className="w-3.5 h-3.5 text-bento-salmon" /> Filter Ingredients:
          </span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`text-xs px-3.5 py-1 rounded-full transition font-bold ${
              selectedTag === null
                ? 'bg-bento-salmon text-white shadow-bento-glow'
                : 'bg-bento-surface border border-bento-border text-gray-400 hover:text-white'
            }`}
          >
            All Recipes ({lessons.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`text-xs px-3.5 py-1 rounded-full transition font-medium ${
                selectedTag === tag
                  ? 'bg-bento-salmon text-white shadow-bento-glow font-bold'
                  : 'bg-bento-surface border border-bento-border text-gray-400 hover:text-bento-salmon'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Recipe Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLessons.map((lesson) => (
          <div
            key={lesson.id}
            className="bg-bento-surface border border-bento-border rounded-bento p-5 shadow-bento-card flex flex-col justify-between hover:border-bento-salmon/60 hover:shadow-bento-glow transition duration-200"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="font-mono text-xs font-bold px-2.5 py-1 bg-bento-salmon/15 text-bento-salmon border border-bento-salmon/30 rounded-lg flex items-center gap-1.5">
                  <OnigiriIcon className="w-3.5 h-3.5" />
                  {lesson.id}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3 text-bento-tamago" /> {lesson.discovery_date || 'Enforced'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-bento-rice mb-2 flex items-center gap-1.5">
                {lesson.title}
              </h3>

              {lesson.context && (
                <p className="text-xs text-gray-300 mb-3 bg-bento-lacquer/80 p-2.5 rounded-xl border border-bento-border/70">
                  {lesson.context}
                </p>
              )}

              {/* Hard Rule Box: Seasoned Recipe */}
              <div className="bg-bento-nori border border-bento-matcha/40 rounded-xl p-3 mb-3 shadow-inner">
                <div className="flex items-center gap-1.5 text-xs font-bold text-bento-matcha mb-1">
                  <WasabiBadgeIcon className="w-4 h-4" /> GOLDEN RECIPE RULE
                </div>
                <p className="text-xs text-emerald-100/90 leading-relaxed font-sans font-medium">{lesson.rule}</p>
              </div>

              {/* Anti-Pattern Box: Burnt Dish */}
              {lesson.anti_pattern && (
                <div className="bg-rose-950/20 border border-bento-salmon/40 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-bento-salmon mb-1">
                    <AlertCircle className="w-3.5 h-3.5" /> BURNT DISH / FORBIDDEN ANTI-PATTERN
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed font-sans">{lesson.anti_pattern}</p>
                </div>
              )}
            </div>

            {/* Tags & Source footer */}
            <div className="pt-3 border-t border-bento-border/70 flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {lesson.tags.map((t) => (
                  <span key={t} className="text-[11px] font-mono text-gray-300 bg-bento-lacquer px-2.5 py-0.5 rounded-lg border border-bento-border">
                    #{t}
                  </span>
                ))}
              </div>
              {lesson.source_scenario && (
                <span className="text-[11px] text-gray-400 font-mono truncate max-w-[170px]">
                  Origin: {lesson.source_scenario}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredLessons.length === 0 && (
        <div className="p-12 text-center text-gray-400 bg-bento-surface border border-bento-border rounded-bento">
          <BentoBoxIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No culinary memory recipes match the selected ingredients.</p>
        </div>
      )}
    </div>
  );
};
