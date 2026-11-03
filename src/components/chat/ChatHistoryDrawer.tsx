import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  X,
  Clock,
  Sparkles,
  Pencil,
  Check,
} from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { ChatSession } from '../../types';

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DateGroup {
  label: string;
  sessions: ChatSession[];
}

function getGroupedSessions(sessions: ChatSession[]): DateGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startOfYesterday = startOfToday - oneDayMs;
  const startOf7Days = startOfToday - 6 * oneDayMs;

  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const previous7Days: ChatSession[] = [];
  const older: ChatSession[] = [];

  sessions.forEach((s) => {
    const timestamp = new Date(s.updatedAt || s.createdAt).getTime();
    if (timestamp >= startOfToday) {
      today.push(s);
    } else if (timestamp >= startOfYesterday) {
      yesterday.push(s);
    } else if (timestamp >= startOf7Days) {
      previous7Days.push(s);
    } else {
      older.push(s);
    }
  });

  const groups: DateGroup[] = [
    { label: 'Today', sessions: today },
    { label: 'Yesterday', sessions: yesterday },
    { label: 'Previous 7 Days', sessions: previous7Days },
    { label: 'Older', sessions: older },
  ];

  return groups.filter((g) => g.sessions.length > 0);
}

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeSessionId,
    filteredSessions,
    searchQuery,
    setSearchQuery,
    selectSession,
    renameSession,
    deleteSession,
    clearAllSessions,
    startNewChat,
  } = useChatContext();

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  if (!isOpen) return null;

  const grouped = getGroupedSessions(filteredSessions);

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
    setConfirmDeleteId(null);
  };

  const saveRename = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editingSessionId && editTitle.trim()) {
      renameSession(editingSessionId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const cancelRename = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSessionId(null);
  };

  // Reusable inner content rendered both as in-flow sidebar (desktop) and slide-out modal (mobile)
  const renderSidebarContent = () => (
    <>
      {/* Top Header & New Chat */}
      <div className="space-y-3.5 shrink-0">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-wider uppercase font-mono text-slate-200">
              Chat History
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close history"
            title="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New Chat Primary Button */}
        <button
          onClick={() => {
            startNewChat();
          }}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs tracking-tight shadow-cyanGlow transition-all"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Start New Chat</span>
        </button>

        {/* Search Conversations Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sessions List Grouped by Date */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain my-3 space-y-3 pr-1">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 font-mono">
            No conversations found.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 py-0.5 flex items-center gap-1.5">
                <span>{group.label}</span>
                <span className="text-[9px] text-slate-600 font-sans">
                  ({group.sessions.length})
                </span>
              </div>

              {group.sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isEditing = editingSessionId === session.id;
                const isConfirmingDelete = confirmDeleteId === session.id;

                // 1. Inline Delete Confirmation View
                if (isConfirmingDelete) {
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs animate-in fade-in duration-150"
                    >
                      <span className="text-rose-200 text-[11px] font-mono truncate mr-2">
                        Delete chat?
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-semibold transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                // 2. Inline Renaming View
                if (isEditing) {
                  return (
                    <div
                      key={session.id}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900 border border-cyan-500/50"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename();
                          if (e.key === 'Escape') cancelRename();
                        }}
                        autoFocus
                        className="flex-1 bg-transparent px-2 py-1 text-xs text-slate-100 focus:outline-none font-medium"
                      />
                      <button
                        onClick={saveRename}
                        className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title="Save title"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={cancelRename}
                        className="p-1 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                }

                // 3. Standard Session Row
                return (
                  <div
                    key={session.id}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/40 shadow-xs'
                        : 'text-slate-300 hover:bg-slate-900/80 border border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => {
                        selectSession(session.id);
                      }}
                      className="flex-1 min-w-0 text-left flex items-start gap-2.5 pr-1.5"
                    >
                      <MessageSquare
                        className={`h-4 w-4 shrink-0 mt-0.5 ${
                          isActive
                            ? 'text-cyan-400'
                            : 'text-slate-500 group-hover:text-slate-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-xs leading-snug">
                          {session.title || 'Untitled Chat'}
                        </p>
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(session.updatedAt || session.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                          {' • '}
                          {session.messages.length} msg{session.messages.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </button>

                    {/* Row Action Controls (Rename & Delete) */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startEditing(e, session)}
                        className="p-1 rounded-md text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                        title="Rename conversation"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(session.id);
                        }}
                        className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <span className="font-mono">ClimateSphere Storage</span>
        {confirmClearAll ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-rose-300">Clear all?</span>
            <button
              onClick={() => {
                clearAllSessions();
                setConfirmClearAll(false);
              }}
              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-semibold transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmClearAll(false)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClearAll(true)}
            className="hover:text-rose-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* 1. Mobile Drawer with Backdrop (< md screens) */}
      <div className="fixed inset-0 z-50 flex md:hidden">
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative w-full max-w-xs h-full bg-space-950/95 border-r border-cyan-500/20 p-4 shadow-2xl backdrop-blur-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
          {renderSidebarContent()}
        </div>
      </div>

      {/* 2. Desktop In-flow Left Sidebar (md and up screens) */}
      <aside className="hidden md:flex w-72 sm:w-80 h-full shrink-0 flex-col justify-between bg-space-950/95 border-r border-cyan-500/20 p-4 shadow-2xl backdrop-blur-2xl z-20 animate-in slide-in-from-left duration-200">
        {renderSidebarContent()}
      </aside>
    </>
  );
};
