import React, { useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  imageName?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageUrl,
  imageName,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 truncate">
            <ZoomIn className="h-3.5 w-3.5" />
            <span className="truncate">{imageName || 'Image Inspection'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close preview (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Image viewport */}
        <div className="p-2 sm:p-4 flex items-center justify-center overflow-auto max-h-[82vh]">
          <img
            src={imageUrl}
            alt={imageName || 'Full preview'}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
};
