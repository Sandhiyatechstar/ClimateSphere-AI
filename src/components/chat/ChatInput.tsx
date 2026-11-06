import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  Compass,
  Mic,
  Loader2,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { FileAttachment } from '../../types';
import { chatService } from '../../services/chatService';
import { AttachmentPreviewBar } from './AttachmentPreviewBar';
import { ImageLightboxModal } from './ImageLightboxModal';

const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp',
  '.pdf', '.docx', '.txt',
  '.csv', '.xlsx'
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_FILES = 5;

export const ChatInput: React.FC = () => {
  const { sendMessage, isThinking, toggleToolsMenu } = useChatContext();
  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [micNotice, setMicNotice] = useState<boolean>(false);
  // New states for voice input
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognizerRef = useRef<SpeechRecognition | null>(null);

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    url: string | null;
    name?: string;
  }>({ isOpen: false, url: null });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const dragCounterRef = useRef<number>(0);

  // Auto-resize textarea as content changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 180); // max height ~180px
    textarea.style.height = `${Math.max(newHeight, 44)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter without Shift; allow Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const processAndUploadFiles = async (fileList: FileList | File[]) => {
    const incomingFiles = Array.from(fileList);
    if (incomingFiles.length === 0) return;

    setUploadError(null);

    // Enforce total file count limit
    if (attachments.length + incomingFiles.length > MAX_TOTAL_FILES) {
      setUploadError(`Maximum ${MAX_TOTAL_FILES} files allowed per inquiry.`);
      setTimeout(() => setUploadError(null), 4000);
      return;
    }

    const validFilesToUpload: File[] = [];
    const localPlaceholders: FileAttachment[] = [];

    for (const file of incomingFiles) {
      const ext = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';

      // Format validation
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        setUploadError(`Unsupported format '${ext || file.type}'. Allowed: Images (PNG, JPG, WEBP), Documents (PDF, DOCX, TXT), Data (CSV, XLSX).`);
        setTimeout(() => setUploadError(null), 4500);
        return;
      }

      // Size validation (10 MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File '${file.name}' exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
        setTimeout(() => setUploadError(null), 4500);
        return;
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      let fileCategory: 'image' | 'document' | 'data' = 'document';
      if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        fileCategory = 'image';
      } else if (['.csv', '.xlsx'].includes(ext)) {
        fileCategory = 'data';
      }

      const localPreviewUrl = fileCategory === 'image' ? URL.createObjectURL(file) : undefined;

      validFilesToUpload.push(file);
      localPlaceholders.push({
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        fileType: fileCategory,
        extension: ext,
        previewUrl: localPreviewUrl,
        isUploading: true,
      });
    }

    if (validFilesToUpload.length === 0) return;

    // Immediately show placeholder cards with loading spinners
    setAttachments((prev) => [...prev, ...localPlaceholders]);

    try {
      const uploadedResults = await chatService.uploadFiles(validFilesToUpload);

      setAttachments((prev) => {
        // Map placeholders to uploaded responses
        const placeholderIds = new Set(localPlaceholders.map((p) => p.id));
        const unchanged = prev.filter((p) => !placeholderIds.has(p.id));
        return [...unchanged, ...uploadedResults];
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Upload failed.';
      setUploadError(errMsg);
      setTimeout(() => setUploadError(null), 5000);

      // Remove failed uploading placeholders
      setAttachments((prev) =>
        prev.map((att) =>
          localPlaceholders.some((p) => p.id === att.id)
            ? { ...att, isUploading: false, error: errMsg }
            : att
        )
      );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processAndUploadFiles(e.target.files);
    }
    // Reset file input so selecting the same file again triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndUploadFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    const hasAttachments = attachments.length > 0;
    const isAnyUploading = attachments.some((a) => a.isUploading);

    if ((!trimmed && !hasAttachments) || isThinking || isAnyUploading || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    try {
      await sendMessage(trimmed, currentAttachments);
    } catch {
      // Restore input and attachments in case of unhandled failure
      setInput(trimmed);
      setAttachments(currentAttachments);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  // Initialize SpeechRecognition on component mount
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn('Web Speech API not supported in this browser.');
      return;
    }
    const recognizer = new SpeechRecognitionAPI();
    recognizer.continuous = false;
    recognizer.interimResults = true;
    recognizer.lang = 'en-US';
    recognizer.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setInput(transcript);
    };
    recognizer.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', e);
      setIsRecording(false);
    };
    recognizer.onend = () => {
      setIsRecording(false);
    };
    recognizerRef.current = recognizer;
    return () => {
      recognizer.stop();
      recognizerRef.current = null;
    };
  }, []);

  const startRecording = () => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Failed to start speech recognition', e);
      }
    } else {
      console.warn('SpeechRecognition not initialized');
    }
  };

  const stopRecording = () => {
    recognizerRef.current?.stop();
    setIsRecording(false);
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
    setMicNotice(true);
    setTimeout(() => setMicNotice(false), 2400);
  };

  const isUploadingAny = attachments.some((a) => a.isUploading);
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isThinking && !isUploadingAny;

  return (
    <div
      className="relative w-full max-w-3xl mx-auto px-4 pb-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,text/plain,.txt,text/csv,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Pop-up notices and error alerts */}
      {uploadError && (
        <div className="absolute -top-11 left-6 right-6 px-3 py-1.5 rounded-xl bg-rose-950/95 border border-rose-500/50 text-rose-200 text-xs font-mono shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 z-20">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span className="truncate">{uploadError}</span>
        </div>
      )}

      {micNotice && (
        <div className="absolute -top-9 right-16 px-3 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
          🎙️ Voice queries & Gemini Live speech integration ready
        </div>
      )}

      {/* Glassmorphism Chat Input Container with Drag Overlay */}
      <div
        className={`relative rounded-2xl glass-input p-2 shadow-floating transition-all duration-200 ${
          isDragging
            ? 'border-cyan-400 ring-2 ring-cyan-400/30 shadow-inputGlow bg-slate-900/90'
            : 'focus-within:border-cyan-400/50 focus-within:shadow-inputGlow'
        }`}
      >
        {/* Full Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-30 rounded-2xl bg-slate-950/85 backdrop-blur-sm border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center gap-1.5 pointer-events-none animate-in fade-in duration-150 shadow-cyanGlow">
            <UploadCloud className="h-7 w-7 text-cyan-400 animate-bounce" />
            <span className="text-xs font-mono font-medium text-cyan-200">
              Drop files to attach (Images, PDF, Word, CSV, Excel)
            </span>
          </div>
        )}

        {/* Attachment Previews Bar */}
        {attachments.length > 0 && (
          <AttachmentPreviewBar
            attachments={attachments}
            onRemove={handleRemoveAttachment}
            onPreviewImage={(url, name) => setPreviewModal({ isOpen: true, url, name })}
          />
        )}

        {/* Multiline Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            attachments.length > 0
              ? 'Ask a question about the attached file(s)... (or press Enter to analyze)'
              : 'Ask anything about weather, climate, or attach files...'
          }
          rows={1}
          disabled={isThinking}
          className="w-full bg-transparent text-slate-100 placeholder:text-slate-400 text-sm px-3 pt-1.5 pb-2 resize-none focus:outline-none leading-relaxed min-h-[44px] max-h-[180px]"
        />

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between pt-1 px-1.5 border-t border-slate-800/60">
          {/* Left Controls: Attachment & Tools Menu */}
          <div className="flex items-center gap-1.5">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={handlePaperclipClick}
              disabled={isThinking || attachments.length >= MAX_TOTAL_FILES}
              className={`p-2 rounded-xl transition-colors ${
                attachments.length > 0
                  ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60'
              } ${attachments.length >= MAX_TOTAL_FILES ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Attach satellite imagery, documents (PDF/DOCX/TXT), or data (CSV/XLSX)"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Tools Menu Trigger */}
            <button
              type="button"
              onClick={toggleToolsMenu}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/40 text-xs font-medium transition-all"
              title="Open ClimateSphere Tools Menu"
            >
              <Compass className="h-3.5 w-3.5 text-cyan-400" />
              <span>Tools</span>
            </button>
          </div>

          {/* Right Controls: Microphone & Send Button */}
          <div className="flex items-center gap-2">
            {/* Microphone Icon Placeholder */}
            <button
              type="button"
              onClick={handleMicClick}
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors"
              title="Voice input (Future integration)"
              aria-label="Voice input"
            >
              <Mic className="h-4 w-4" />
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              className={`p-2 rounded-xl flex items-center justify-center transition-all duration-200 ${
                canSend
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-cyanGlow hover:scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title={
                isUploadingAny
                  ? 'Uploading attachments...'
                  : isThinking
                  ? 'Thinking...'
                  : 'Send message (Enter)'
              }
              aria-label="Send message"
            >
              {isThinking || isUploadingAny ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
              ) : (
                <ArrowUp className="h-4 w-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal for Inspection */}
      <ImageLightboxModal
        isOpen={previewModal.isOpen}
        imageUrl={previewModal.url}
        imageName={previewModal.name}
        onClose={() => setPreviewModal({ isOpen: false, url: null })}
      />

      {/* Subtle Bottom Disclaimer */}
      <div className="mt-2 text-center text-[11px] font-mono text-slate-400/80">
        ClimateSphere AI may provide estimated data. Verify critical weather advisories with official meteorological agencies.
      </div>
    </div>
  );
};

