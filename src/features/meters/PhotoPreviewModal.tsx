import React from 'react';
import { X, ZoomIn } from 'lucide-react';

interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/60">
          <span className="text-sm font-bold text-slate-100">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex items-center justify-center bg-slate-950 min-h-[300px]">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-lg border border-slate-800"
          />
        </div>

        <div className="px-4 py-2.5 bg-slate-900 text-xs text-slate-400 text-center border-t border-slate-800">
          Tap outside or close to return to meter list
        </div>
      </div>
    </div>
  );
};
