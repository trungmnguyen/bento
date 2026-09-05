import React, { useState, useMemo } from 'react';
import { Brain, Search, Tag, ShieldCheck, AlertTriangle, Calendar, Layers } from 'lucide-react';
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
      <div className="bg-card border border-border rounded-xl p-5 shadow-lg flex flex-col md:flex-row gap-4 justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" /> Persistent Memory Bank ({lessons.length} Enforced Rules)
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Rules and anti-patterns distilled from self-healing and curriculum ingestions, automatically guarding prompts.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search rules, tags, anti-patterns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tag Chips Filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400 font-medium flex items-center gap-1 mr-1">
            <Tag className="w-3.5 h-3.5" /> Filter by Tag:
          </span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`text-xs px-3 py-1 rounded-full transition ${
              selectedTag === null
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-card border border-border text-gray-400 hover:text-white'
            }`}
          >
            All ({lessons.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`text-xs px-3 py-1 rounded-full transition ${
                selectedTag === tag
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-card border border-border text-gray-400 hover:text-white'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLessons.map((lesson) => (
          <div
            key={lesson.id}
            className="bg-card border border-border rounded-xl p-5 shadow-lg flex flex-col justify-between hover:border-indigo-500/50 transition duration-200"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                  {lesson.id}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {lesson.discovery_date || 'Enforced'}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-gray-100 mb-2">{lesson.title}</h3>

              {lesson.context && (
                <p className="text-xs text-gray-400 mb-3 bg-background/50 p-2.5 rounded border border-border/50">
                  {lesson.context}
                </p>
              )}

              {/* Hard Rule Box */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> HARD RULE
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">{lesson.rule}</p>
              </div>

              {/* Anti-Pattern Box */}
              {lesson.anti_pattern && (
                <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> FORBIDDEN ANTI-PATTERN
                  </div>
                  <p className="text-xs text-red-200/90 leading-relaxed font-sans">{lesson.anti_pattern}</p>
                </div>
              )}
            </div>

            {/* Tags & Source footer */}
            <div className="pt-3 border-t border-border flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {lesson.tags.map((t) => (
                  <span key={t} className="text-[11px] font-mono text-gray-400 bg-background px-2 py-0.5 rounded border border-border">
                    #{t}
                  </span>
                ))}
              </div>
              {lesson.source_scenario && (
                <span className="text-[11px] text-gray-500 truncate max-w-[150px]">
                  Source: {lesson.source_scenario}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredLessons.length === 0 && (
        <div className="p-12 text-center text-gray-500 bg-card border border-border rounded-xl">
          <Layers className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No memory lessons match the selected criteria.</p>
        </div>
      )}
    </div>
  );
};
