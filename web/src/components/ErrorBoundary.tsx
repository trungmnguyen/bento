import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Bento Web Monitor uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.removeItem('bento_notifications');
      localStorage.removeItem('bento_arena_history');
      localStorage.removeItem('bento_bout_history');
      localStorage.removeItem('bento_audio_settings');
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#131117] text-gray-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1e1a24] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Bento Kitchen Recovery</h1>
                <p className="text-xs text-rose-300/80">A client-side runtime error was caught safely.</p>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-xs font-mono text-zinc-300 max-h-40 overflow-y-auto break-all">
              {this.state.error?.message || 'Unknown runtime error occurred.'}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-bento-salmon hover:bg-rose-600 text-white text-xs font-medium rounded-xl transition shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Monitor
              </button>
              <button
                onClick={this.handleClearStorageAndReload}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/10 text-xs rounded-xl transition"
                title="Clear local storage cache and reload"
              >
                <Trash2 className="w-4 h-4" />
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
