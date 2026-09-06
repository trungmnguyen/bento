import React, { useState, useRef } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  Flame,
  Swords,
  Layers,
  Activity,
} from 'lucide-react';
import { BentoNotification } from '../types';
import { playClack, playZenBell } from '../utils/audio';
import { useA11yModal } from '../hooks/useA11yModal';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: BentoNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onDismiss: (id: string) => void;
  onSelectTab: (tab: string) => void;
}

type CategoryFilter = 'ALL' | 'DAEMON' | 'ARENA' | 'SYSTEM';

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  onDismiss,
  onSelectTab,
}) => {
  const [filter, setFilter] = useState<CategoryFilter>('ALL');
  const drawerRef = useRef<HTMLDivElement>(null);
  const { modalProps } = useA11yModal({
    isOpen,
    onClose,
    containerRef: drawerRef,
  });

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filter === 'ALL') return true;
    if (filter === 'DAEMON') return n.category === 'DAEMON';
    if (filter === 'ARENA') return n.category === 'ARENA';
    if (filter === 'SYSTEM') return n.category === 'SYSTEM' || n.category === 'DREAM' || n.category === 'BATTERY';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getCategoryIcon = (category: string, severity: string) => {
    if (severity === 'ERROR') return <AlertTriangle className="w-4 h-4 text-bento-salmon" />;
    if (severity === 'SUCCESS') return <CheckCircle2 className="w-4 h-4 text-bento-matcha" />;
    switch (category) {
      case 'DAEMON':
        return <Flame className="w-4 h-4 text-bento-tamago" />;
      case 'ARENA':
        return <Swords className="w-4 h-4 text-indigo-400" />;
      case 'BATTERY':
        return <Layers className="w-4 h-4 text-sky-400" />;
      case 'DREAM':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-zinc-400" />;
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${Math.floor(diffHr / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          playClack();
          onClose();
        }}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          {...modalProps}
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-drawer-title"
          className="w-screen max-w-md bg-bento-surface border-l border-bento-border shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-bento-border bg-[#14121a]/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-bento-bg flex items-center justify-center border border-bento-border text-bento-salmon">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="notification-drawer-title" className="text-sm font-semibold text-zinc-100">Mission Control Hub</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-bento-salmon/20 text-bento-salmon border border-bento-salmon/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">Autonomous events & test telemetry</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    playZenBell();
                    onMarkAllRead();
                  }}
                  title="Mark all as read"
                  aria-label="Mark all notifications as read"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    playClack();
                    onClearAll();
                  }}
                  title="Clear all notifications"
                  aria-label="Clear all notifications"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-bento-salmon hover:bg-white/5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  playClack();
                  onClose();
                }}
                title="Close Mission Control"
                aria-label="Close Mission Control"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-5 py-2.5 border-b border-bento-border/60 bg-bento-bg/40 flex items-center gap-1.5">
            {(['ALL', 'DAEMON', 'ARENA', 'SYSTEM'] as CategoryFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  playClack();
                  setFilter(tab);
                }}
                aria-label={`Filter notifications by ${tab === 'ALL' ? 'all' : tab.toLowerCase()}`}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === tab
                    ? 'bg-bento-salmon/15 text-bento-salmon border border-bento-salmon/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {tab === 'ALL' && 'All'}
                {tab === 'DAEMON' && 'Chefs 🍳'}
                {tab === 'ARENA' && 'Arena ⚔️'}
                {tab === 'SYSTEM' && 'System 🚨'}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-bento-border/40 p-3 space-y-2" aria-live="polite">
            {filtered.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-bento-border flex items-center justify-center text-zinc-500 mb-3">
                  <Bell className="w-6 h-6 stroke-[1.5]" />
                </div>
                <p className="text-sm font-medium text-zinc-300">All quiet in the kitchen</p>
                <p className="text-xs text-zinc-500 max-w-xs mt-1">
                  Background tasks, arena sparring bouts, and system alerts will appear here in real time.
                </p>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    item.read
                      ? 'bg-[#181520]/40 border-bento-border/40 opacity-80'
                      : 'bg-[#1e1a29]/90 border-bento-salmon/25 shadow-xs'
                  } hover:border-bento-salmon/40 flex items-start gap-3 group`}
                >
                  <div className="p-2 rounded-lg bg-black/30 border border-white/5 shrink-0 mt-0.5">
                    {getCategoryIcon(item.category, item.severity)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-zinc-200 truncate">{item.title}</h4>
                      <span className="text-[10px] text-zinc-500 shrink-0">{formatTimeAgo(item.timestamp)}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>

                    {item.actionTab && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() => {
                            playClack();
                            onSelectTab(item.actionTab!);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.8 rounded-md text-[11px] font-medium bg-bento-salmon/15 text-bento-salmon hover:bg-bento-salmon/25 transition-colors border border-bento-salmon/25"
                        >
                          View in{' '}
                          {item.actionTab === 'daemons'
                            ? 'Kitchen'
                            : item.actionTab === 'arena'
                            ? 'Arena'
                            : item.actionTab === 'benchmarks'
                            ? 'Battery'
                            : item.actionTab}
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      playClack();
                      onDismiss(item.id);
                    }}
                    title="Dismiss"
                    aria-label={`Dismiss notification: ${item.title}`}
                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 border-t border-bento-border/60 bg-[#121017] text-center">
            <span className="text-[11px] text-zinc-500">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 font-mono text-[10px]">n</kbd> to toggle Mission Control
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
