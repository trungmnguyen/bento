import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export function showToast(
  typeOrOptions: ToastType | { type?: ToastType; title: string; message?: string },
  title?: string,
  message?: string
) {
  let type: ToastType = 'info';
  let finalTitle = '';
  let finalMessage: string | undefined = undefined;

  if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
    type = typeOrOptions.type || 'info';
    finalTitle = typeOrOptions.title;
    finalMessage = typeOrOptions.message;
  } else {
    type = typeOrOptions;
    finalTitle = title || '';
    finalMessage = message;
  }

  const event = new CustomEvent('bento-toast', {
    detail: {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title: finalTitle,
      message: finalMessage,
    },
  });
  window.dispatchEvent(event);
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      const newToast = customEvent?.detail;
      // Defensive payload validation (WASABI-DOM-02)
      if (!newToast || typeof newToast !== 'object' || typeof newToast.title !== 'string') {
        return;
      }
      const safeToast: ToastItem = {
        id: String(newToast.id || Math.random().toString(36).substring(2, 9)),
        type: (['success', 'error', 'warning', 'info'].includes(newToast.type) ? newToast.type : 'info') as ToastType,
        title: String(newToast.title || ''),
        message: newToast.message ? String(newToast.message) : undefined,
      };

      setToasts((prev) => [...prev, safeToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== safeToast.id));
      }, 4000);
    };

    window.addEventListener('bento-toast', handleToast);
    return () => window.removeEventListener('bento-toast', handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="System notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarn = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              isSuccess
                ? 'bg-[#152418]/95 border-emerald-500/40 text-emerald-200'
                : isError
                ? 'bg-[#2a1315]/95 border-rose-500/40 text-rose-200'
                : isWarn
                ? 'bg-[#2a2213]/95 border-amber-500/40 text-amber-200'
                : 'bg-[#151c2a]/95 border-blue-500/40 text-blue-200'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {isWarn && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold leading-tight truncate">{toast.title}</h4>
              {toast.message && (
                <p className="text-[11px] opacity-80 mt-1 leading-snug break-words">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              aria-label={`Dismiss notification: ${toast.title}`}
              className="shrink-0 text-gray-400 hover:text-white transition p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
