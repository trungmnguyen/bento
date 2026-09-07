import React, { useRef, useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { WasabiBadgeIcon } from '../icons/BentoIcons';
import { useA11yModal } from '../../hooks/useA11yModal';
import { playClack, playZenBell } from '../../utils/audio';
import { apiFetch } from '../../utils/api';

interface AddRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeAdded: (title: string, lessonId?: string) => void;
}

const CATEGORIES = [
  { id: 'architecture', label: 'Architecture' },
  { id: 'security', label: 'Security' },
  { id: 'accessibility', label: 'Accessibility (A11y)' },
  { id: 'git', label: 'Git & Shield Hygiene' },
  { id: 'performance', label: 'Performance' },
  { id: 'reliability', label: 'Reliability' },
  { id: 'quant', label: 'Quant & Trading' },
  { id: 'ui', label: 'Web & UI UX' },
  { id: 'general', label: 'General Axioms' },
];

export const AddRecipeModal: React.FC<AddRecipeModalProps> = ({
  isOpen,
  onClose,
  onRecipeAdded,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('architecture');
  const [rule, setRule] = useState('');
  const [antiPattern, setAntiPattern] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { modalProps } = useA11yModal({
    isOpen,
    onClose,
    containerRef: modalRef,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rule.trim()) {
      setError('Recipe Title and Golden Rule are required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch('/api/memory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim(),
          rule: rule.trim(),
          anti_pattern: antiPattern.trim(),
          tags: tags.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        playZenBell();
        onRecipeAdded(title.trim(), data.lesson?.id);
        setTitle('');
        setRule('');
        setAntiPattern('');
        setTags('');
        onClose();
      } else {
        setError(data.error || 'Failed to season recipe.');
      }
    } catch {
      setError('Network failure while seasoning recipe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-150"
        onClick={() => {
          playClack();
          onClose();
        }}
      />
      <div
        ref={modalRef}
        {...modalProps}
        role="dialog"
        aria-labelledby="add-recipe-title"
        aria-modal="true"
        className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl bg-bento-surface border border-bento-border rounded-bento shadow-2xl p-6 z-50 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150"
      >
        <div className="flex justify-between items-center pb-4 border-b border-bento-border">
          <h3 id="add-recipe-title" className="text-base font-bold text-gray-100 flex items-center gap-2">
            <WasabiBadgeIcon className="w-5 h-5 text-bento-salmon" aria-hidden="true" />
            Season New Recipe Axiom
          </h3>
          <button
            type="button"
            onClick={() => {
              playClack();
              onClose();
            }}
            aria-label="Close add recipe modal"
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-bento-border"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs font-mono">
          <div>
            <label htmlFor="recipe-title-input" className="block text-gray-300 font-semibold mb-1">
              Recipe Title *
            </label>
            <input
              ref={titleInputRef}
              type="text"
              id="recipe-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Clean Architecture Port Rule"
              required
              className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-bento-salmon"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="recipe-category-select" className="block text-gray-300 font-semibold mb-1">
              Category
            </label>
            <select
              id="recipe-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-bento-salmon"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="recipe-rule-input" className="block text-gray-300 font-semibold mb-1">
              ✦ Golden Recipe Rule *
            </label>
            <textarea
              id="recipe-rule-input"
              rows={3}
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              placeholder="Describe the non-negotiable architectural invariant or trading rule..."
              required
              className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label htmlFor="recipe-anti-input" className="block text-gray-300 font-semibold mb-1">
              ⊘ Burnt Dish / Forbidden Anti-Pattern
            </label>
            <textarea
              id="recipe-anti-input"
              rows={2}
              value={antiPattern}
              onChange={(e) => setAntiPattern(e.target.value)}
              placeholder="Describe the anti-pattern or forbidden failure mode..."
              className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label htmlFor="recipe-tags-input" className="block text-gray-300 font-semibold mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="recipe-tags-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="domain, purity, isolation"
              className="w-full bg-bento-lacquer border border-bento-border rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-bento-salmon"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-bento-border">
            <button
              type="button"
              onClick={() => {
                playClack();
                onClose();
              }}
              className="px-4 py-2 bg-bento-lacquer hover:bg-bento-border rounded-xl text-gray-300 hover:text-white border border-bento-border transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !rule.trim()}
              className="px-5 py-2 bg-gradient-to-r from-bento-salmon to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold rounded-xl shadow-bento-glow transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Seasoning...' : 'Season Recipe'}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
