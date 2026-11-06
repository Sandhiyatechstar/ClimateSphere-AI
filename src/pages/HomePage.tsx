import React from 'react';
import { useChatContext } from '../context/ChatContext';
import { Header } from '../components/common/Header';
import { WelcomeView } from '../components/chat/WelcomeView';
import { ConversationView } from '../components/chat/ConversationView';
import { ChatInput } from '../components/chat/ChatInput';
import { ChatHistoryDrawer } from '../components/chat/ChatHistoryDrawer';
import { ToolsMenu } from '../components/chat/ToolsMenu';
import { SettingsModal } from '../components/common/SettingsModal';

export const HomePage: React.FC = () => {
  const {
    messages,
    isThinking,
    sendMessage,
    regenerateMessage,
    isHistoryOpen,
    setIsHistoryOpen,
    isToolsMenuOpen,
    setIsToolsMenuOpen,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useChatContext();

  const hasMessages = messages.length > 0;

  return (
    <div className="relative h-screen h-[100dvh] w-full flex bg-earth-orbit bg-earth-image overflow-hidden">
      {/* Background Starfield Dust & Orbital Atmospheric Glow */}
      <div className="absolute inset-0 stars-layer opacity-40 pointer-events-none" />

      {/* Atmospheric Earth Curvature Glow */}
      <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[1200px] h-[400px] rounded-[100%] bg-gradient-to-t from-cyan-500/20 via-blue-600/15 to-transparent blur-3xl pointer-events-none" />

      {/* Subtle Dark Readability Overlay */}
      <div className="absolute inset-0 bg-space-950/45 backdrop-blur-[2px] pointer-events-none" />

      {/* Collapsible Left Sidebar (Chat History) */}
      <ChatHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Right Main Conversational Workspace */}
      <div className="relative flex-1 flex flex-col min-w-0 h-full overflow-hidden z-10">
        {/* Sticky Glassmorphic Header */}
        <Header />

        {/* Main Conversational Body */}
        <main className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
          {hasMessages ? (
            <ConversationView
              messages={messages}
              isThinking={isThinking}
              onRegenerate={regenerateMessage}
              onSelectPrompt={sendMessage}
            />
          ) : (
            <WelcomeView onSelectPrompt={sendMessage} />
          )}

          {/* Floating Docked Chat Input */}
          <div className="shrink-0 z-20">
            <ChatInput />
          </div>
        </main>
      </div>

      {/* Drawers & Modals */}
      <ToolsMenu
        isOpen={isToolsMenuOpen}
        onClose={() => setIsToolsMenuOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default HomePage;
