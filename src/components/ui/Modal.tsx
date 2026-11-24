import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxW = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`
          relative w-full ${maxW[maxWidth]} bg-white rounded-t-[24px] sm:rounded-card p-4 sm:p-6 shadow-2xl
          z-10 max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200
          pb-[max(1rem,env(safe-area-inset-bottom))]
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-ivory-border shrink-0 gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-navy truncate">{title}</h3>
            {description && (
              <p className="text-xs text-navy/60 mt-0.5 break-words">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 text-navy/40 hover:text-navy hover:bg-black/5 rounded-lg transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto overscroll-contain py-3 sm:py-4 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
