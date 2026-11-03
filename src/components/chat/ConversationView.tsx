import React, { useRef, useEffect, useState } from 'react';
import {
  Copy,
  Check,
  RotateCw,
  User,
  Loader2,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { MarkdownContent } from './MarkdownContent';
import { formatTimestamp, formatFileSize } from '../../utils/formatters';
import { ImageLightboxModal } from './ImageLightboxModal';
import logoUrl from '../../assets/logo.svg';

interface ConversationViewProps {
  messages: ChatMessage[];
  isThinking: boolean;
  onRegenerate: (messageId: string) => void;
  onSelectPrompt?: (prompt: string) => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  isThinking,
  onRegenerate,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{
    isOpen: boolean;
    url: string | null;
    name?: string;
  }>({ isOpen: false, url: null });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const isUserScrollingUpRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior,
      });
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // When the user scrolls more than 150px away from bottom, they are actively reviewing previous messages
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    isUserScrollingUpRef.current = !isNearBottom;
  };

  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    // Auto-scroll on new messages or if the user is already following along near the bottom
    if (isNewMessage || !isUserScrollingUpRef.current) {
      scrollToBottom('smooth');
      const timer = setTimeout(() => {
        if (!isUserScrollingUpRef.current) {
          scrollToBottom('smooth');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isThinking]);

  const handleCopy = async (messageId: string, content: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback for older browsers or restricted iframe environments
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy response content:', err);
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="w-full flex-1 min-h-0 overflow-y-auto overscroll-contain"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-14 space-y-6">
      {messages.map((message) => {
        const isUser = message.role === 'user';

        if (isUser) {
          return (
            <div key={message.id} className="flex justify-end animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
                <div className="flex flex-col items-end">
                  {/* Attached Files Previews in User Message */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 justify-end">
                      {message.attachments.map((att) => {
                        if (att.fileType === 'image' && att.previewUrl) {
                          return (
                            <div
                              key={att.id}
                              onClick={() =>
                                setLightboxImage({
                                  isOpen: true,
                                  url: att.previewUrl || '',
                                  name: att.name,
                                })
                              }
                              className="cursor-pointer rounded-xl overflow-hidden border border-cyan-400/40 bg-slate-900/90 shadow-md hover:scale-105 transition-transform"
                              title="Click to view full image"
                            >
                              <img
                                src={att.previewUrl}
                                alt={att.name}
                                className="h-16 w-16 sm:h-20 sm:w-20 object-cover"
                              />
                            </div>
                          );
                        }

                        const isSpreadsheet = att.extension === '.csv' || att.extension === '.xlsx';
                        const Icon = isSpreadsheet ? FileSpreadsheet : FileText;
                        return (
                          <div
                            key={att.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-slate-200 text-xs font-mono shadow-sm"
                          >
                            <Icon className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate max-w-[150px] font-medium" title={att.name}>
                              {att.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({formatFileSize(att.size)})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="px-4 py-3 rounded-2xl rounded-tr-xs bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md text-xs sm:text-sm leading-relaxed">
                    {message.content}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 mr-1">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                <div className="h-7 w-7 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        }

        // Assistant Message
        return (
          <div key={message.id} className="flex items-start gap-3.5 animate-in fade-in duration-200">
            {/* ClimateSphere AI Avatar */}
            <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-space-950 p-1 flex items-center justify-center shrink-0 border border-cyan-400/40 shadow-cyanGlow mt-1">
              <img
                src={logoUrl}
                alt="ClimateSphere AI"
                className="h-full w-full object-contain"
              />
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0 space-y-2.5">
              {/* Header Info */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono">
                  ClimateSphere AI
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>

              {/* Formatted Content */}
              <div className="p-4 sm:p-5 rounded-2xl rounded-tl-xs glass-card border border-slate-700/60 shadow-floating text-slate-100">
                <MarkdownContent content={message.content} />

                {/* Action Controls: Copy & Regenerate */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-800/70 flex items-center gap-2 text-xs text-slate-400">
                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(message.id, message.content)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                    title={copiedId === message.id ? 'Copied to clipboard' : 'Copy response to clipboard'}
                    aria-label={copiedId === message.id ? 'Copied response to clipboard' : 'Copy response to clipboard'}
                  >
                    {copiedId === message.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-mono text-[11px]" aria-live="polite">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[11px]">Copy</span>
                      </>
                    )}
                  </button>

                  {/* Regenerate Button */}
                  <button
                    type="button"
                    onClick={() => onRegenerate(message.id)}
                    disabled={isThinking}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                    title={isThinking ? 'Generation in progress...' : 'Regenerate this response'}
                    aria-label="Regenerate this response"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${isThinking ? 'animate-spin' : ''}`} />
                    <span className="text-[11px]">Regenerate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Thinking State Animation */}
      {isThinking && (
        <div className="flex items-start gap-3.5 animate-in fade-in duration-200">
          <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 p-1 flex items-center justify-center shrink-0 border border-cyan-400/40 shadow-cyanGlow">
            <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
          </div>
          <div className="p-4 rounded-2xl rounded-tl-xs glass-card border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2.5 shadow-floating">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Analyzing atmospheric parameters & synthesizing climate science...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>

    {/* Image Zoom Lightbox Modal */}
    <ImageLightboxModal
      isOpen={lightboxImage.isOpen}
      imageUrl={lightboxImage.url}
      imageName={lightboxImage.name}
      onClose={() => setLightboxImage({ isOpen: false, url: null })}
    />
  </div>
);
};
