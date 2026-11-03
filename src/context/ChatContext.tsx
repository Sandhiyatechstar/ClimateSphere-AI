import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatMessage, ChatSession, FileAttachment } from '../types';
import { chatService } from '../services/chatService';

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string;
  currentSession: ChatSession | undefined;
  messages: ChatMessage[];
  isThinking: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredSessions: ChatSession[];
  // Actions
  sendMessage: (content: string, attachments?: FileAttachment[]) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  startNewChat: () => void;
  selectSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  // UI Drawers & Modals
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
  toggleHistory: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  toggleSettings: () => void;
  isToolsMenuOpen: boolean;
  setIsToolsMenuOpen: (open: boolean) => void;
  toggleToolsMenu: () => void;
}

const STORAGE_KEY = 'climatesphere_chat_sessions_v2';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with an empty session by default so the welcome view shows
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If the most recent conversation already has messages, automatically open
          // a fresh new chat session so reopening the app lands on a fresh New Chat
          if (parsed[0].messages && parsed[0].messages.length > 0) {
            const fresh: ChatSession = {
              id: `session-${Date.now()}`,
              title: 'New Planetary Inquiry',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: [],
            };
            return [fresh, ...parsed];
          }
          return parsed;
        }
      }
    } catch {
      // Fallback
    }

    const initialId = `session-${Date.now()}`;
    return [
      {
        id: initialId,
        title: 'New Planetary Inquiry',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [], // Empty initially so Welcome section is displayed!
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || `session-${Date.now()}`);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI state for drawers/modals - on desktop, default open as side-by-side sidebar
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Storage unavailable
    }
  }, [sessions]);

  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = currentSession?.messages || [];

  const toggleHistory = () => setIsHistoryOpen((prev) => !prev);
  const toggleSettings = () => setIsSettingsOpen((prev) => !prev);
  const toggleToolsMenu = () => setIsToolsMenuOpen((prev) => !prev);

  const startNewChat = () => {
    // If current session already has 0 messages, just keep it
    if (currentSession && currentSession.messages.length === 0) {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsHistoryOpen(false);
      }
      return;
    }

    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Planetary Inquiry',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsHistoryOpen(false);
    }
  };

  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    // On mobile devices auto-close drawer to view the conversation; on desktop keep side-by-side
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsHistoryOpen(false);
    }
  };

  const renameSession = (sessionId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: trimmed, updatedAt: new Date().toISOString() } : s))
    );
  };

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (remaining.length === 0) {
        const fresh: ChatSession = {
          id: `session-${Date.now()}`,
          title: 'New Planetary Inquiry',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        };
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  const clearAllSessions = () => {
    const fresh: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Planetary Inquiry',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
  };

  const sendMessage = async (content: string, attachments?: FileAttachment[]) => {
    const trimmed = content.trim();
    const hasAttachments = attachments && attachments.length > 0;
    if ((!trimmed && !hasAttachments) || isThinking) return;

    const displayPrompt = trimmed || (hasAttachments ? `Analyze ${attachments.map(a => a.name).join(', ')}` : '');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: displayPrompt,
      timestamp: new Date().toISOString(),
      attachments: hasAttachments ? attachments : undefined,
    };

    // Update session title dynamically from first prompt if needed
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const isFirstMessage = s.messages.length === 0;
          const newTitle = isFirstMessage
            ? displayPrompt.length > 38
              ? `${displayPrompt.slice(0, 38)}...`
              : displayPrompt
            : s.title;

          return {
            ...s,
            title: newTitle,
            updatedAt: new Date().toISOString(),
            messages: [...s.messages, userMessage],
          };
        }
        return s;
      })
    );

    setIsThinking(true);

    try {
      const botResponse = await chatService.sendMessage(trimmed, messages, attachments);
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, botResponse],
            };
          }
          return s;
        })
      );
    } catch (err) {
      console.error('Error generating AI response:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '### ⚠️ Connection Notice\n\nUnable to complete inquiry due to an unexpected client-side exception. Please verify the backend connection and click **Regenerate**.',
        timestamp: new Date().toISOString(),
        dataSources: ['Client Diagnostics'],
        suggestedFollowUps: ['Weather in Chennai', 'Forecast for London'],
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...s.messages, errMsg],
            };
          }
          return s;
        })
      );
    } finally {
      setIsThinking(false);
    }
  };

  const regenerateMessage = async (messageId: string) => {
    if (isThinking || !currentSession) return;

    // Find the assistant message index
    const msgIndex = currentSession.messages.findIndex((m) => m.id === messageId);
    if (msgIndex < 0) return;

    // Locate the closest preceding user prompt that triggered this response
    let userPromptMsg: ChatMessage | null = null;
    let userPromptIndex = -1;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (currentSession.messages[i].role === 'user') {
        userPromptMsg = currentSession.messages[i];
        userPromptIndex = i;
        break;
      }
    }
    if (!userPromptMsg || userPromptIndex < 0) return;

    // Truncate history up to and including the user prompt, discarding subsequent turns
    const truncated = currentSession.messages.slice(0, userPromptIndex + 1);
    const priorHistory = currentSession.messages.slice(0, userPromptIndex);

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: truncated } : s))
    );

    setIsThinking(true);

    try {
      const newResponse = await chatService.sendMessage(
        userPromptMsg.content,
        priorHistory,
        userPromptMsg.attachments
      );
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...truncated, newResponse], updatedAt: new Date().toISOString() }
            : s
        )
      );
    } catch (err) {
      console.error('Error regenerating AI response:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '### ⚠️ Refresh Notice\n\nUnable to refresh response. Please verify the backend connection and try clicking **Regenerate** again.',
        timestamp: new Date().toISOString(),
        dataSources: ['Diagnostics Service'],
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...truncated, errMsg], updatedAt: new Date().toISOString() }
            : s
        )
      );
    } finally {
      setIsThinking(false);
    }
  };

  // Filter sessions by search query
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        currentSession,
        messages,
        isThinking,
        searchQuery,
        setSearchQuery,
        filteredSessions,
        sendMessage,
        regenerateMessage,
        startNewChat,
        selectSession,
        renameSession,
        deleteSession,
        clearAllSessions,
        isHistoryOpen,
        setIsHistoryOpen,
        toggleHistory,
        isSettingsOpen,
        setIsSettingsOpen,
        toggleSettings,
        isToolsMenuOpen,
        setIsToolsMenuOpen,
        toggleToolsMenu,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function useChatContext(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
