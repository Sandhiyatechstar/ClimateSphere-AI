import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot } from 'lucide-react';
import { Header } from '../common/Header';
import { useChatContext } from '../../context/ChatContext';

interface ToolPageLayoutProps {
  title: string;
  category: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  aiSuggestedPrompt?: string;
  children: ReactNode;
}

export const ToolPageLayout: React.FC<ToolPageLayoutProps> = ({
  title,
  category,
  description,
  icon: Icon,
  badge = 'Dedicated Observatory Tool',
  aiSuggestedPrompt,
  children,
}) => {
  const navigate = useNavigate();
  const { sendMessage } = useChatContext();

  const handleAskAi = () => {
    if (aiSuggestedPrompt) {
      sendMessage(aiSuggestedPrompt);
      navigate('/');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col bg-earth-orbit overflow-x-hidden">
      {/* Background Starfield */}
      <div className="fixed inset-0 stars-layer opacity-40 pointer-events-none" />
      <div className="fixed inset-0 bg-space-950/50 backdrop-blur-[2px] pointer-events-none" />

      {/* Header */}
      <Header />

      {/* Tool Container */}
      <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation & Tool Identity Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mr-2 group"
              >
                <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to AI Chat</span>
              </button>
              <span className="text-slate-700">|</span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                {category}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {badge}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Icon className="h-5 w-5" />
              </div>
              <span>{title}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              {description}
            </p>
          </div>

          {/* AI Quick Query Shortcut */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={handleAskAi}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs tracking-tight shadow-cyanGlow transition-all"
            >
              <Bot className="h-4 w-4" />
              <span>Query Tool with AI</span>
            </button>
          </div>
        </div>

        {/* Dedicated Tool Content */}
        {children}
      </div>
    </div>
  );
};
