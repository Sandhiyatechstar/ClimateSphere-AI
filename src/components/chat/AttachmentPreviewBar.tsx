import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  File,
  X,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { FileAttachment } from '../../types';
import { formatFileSize } from '../../utils/formatters';

interface AttachmentPreviewBarProps {
  attachments: FileAttachment[];
  onRemove: (id: string) => void;
  onPreviewImage?: (url: string, name: string) => void;
}

export const AttachmentPreviewBar: React.FC<AttachmentPreviewBarProps> = ({
  attachments,
  onRemove,
  onPreviewImage,
}) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 pt-1 pb-2">
      {attachments.map((att) => {
        const isImage = att.fileType === 'image';
        const isSpreadsheet = att.extension === '.csv' || att.extension === '.xlsx';
        const isPdf = att.extension === '.pdf';
        const isWord = att.extension === '.docx';

        if (isImage && att.previewUrl) {
          return (
            <div
              key={att.id}
              className={`relative group rounded-xl overflow-hidden border ${
                att.error
                  ? 'border-rose-500/80 bg-rose-950/20'
                  : 'border-cyan-500/40 bg-slate-900/90 shadow-md'
              } transition-all duration-200`}
            >
              <div className="relative h-16 w-16 bg-slate-950/80">
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className="h-full w-full object-cover rounded-xl"
                />

                {att.isUploading && (
                  <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                  </div>
                )}

                {att.error && (
                  <div className="absolute inset-0 bg-rose-950/80 flex items-center justify-center p-1 text-center">
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                  </div>
                )}

                {/* Hover overlay to preview image */}
                {!att.isUploading && !att.error && onPreviewImage && (
                  <button
                    type="button"
                    onClick={() => onPreviewImage(att.previewUrl || '', att.name)}
                    className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-cyan-300 transition-opacity"
                    title="Click to zoom image"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemove(att.id)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-rose-600 border border-slate-600 shadow flex items-center justify-center transition-colors"
                title={`Remove ${att.name}`}
                aria-label={`Remove ${att.name}`}
              >
                <X className="h-3 w-3 stroke-[2.5]" />
              </button>

              {/* Tiny filename tooltip on hover */}
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 px-1 py-0.5 text-[9px] font-mono text-slate-300 truncate text-center">
                {formatFileSize(att.size)}
              </div>
            </div>
          );
        }

        // Document or Data File Card
        let IconComponent = File;
        let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';

        if (isSpreadsheet) {
          IconComponent = FileSpreadsheet;
          badgeColor = 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30';
        } else if (isPdf) {
          IconComponent = FileText;
          badgeColor = 'bg-rose-950/50 text-rose-300 border-rose-500/30';
        } else if (isWord) {
          IconComponent = FileText;
          badgeColor = 'bg-blue-950/50 text-blue-300 border-blue-500/30';
        }

        return (
          <div
            key={att.id}
            className={`relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border ${
              att.error
                ? 'border-rose-500/80 bg-rose-950/20 text-rose-200'
                : 'border-slate-700/80 text-slate-200 shadow-md'
            } transition-all duration-200 max-w-[240px]`}
          >
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center border shrink-0 ${badgeColor}`}
            >
              {att.isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              ) : (
                <IconComponent className="h-4 w-4" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-medium truncate text-slate-100" title={att.name}>
                {att.name}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                <span className="uppercase text-cyan-400">
                  {att.extension.replace('.', '') || att.fileType}
                </span>
                <span>•</span>
                <span>{formatFileSize(att.size)}</span>
              </div>
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemove(att.id)}
              className="h-5 w-5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
              title={`Remove ${att.name}`}
              aria-label={`Remove ${att.name}`}
            >
              <X className="h-3.5 w-3.5 stroke-[2]" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
