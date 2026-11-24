import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  isLoading = false,
}) => {
  if (totalCount <= pageSize && currentPage === 1) {
    return null; // No pagination controls needed if fewer than 1 page
  }

  const startRecord = Math.min(totalCount, (currentPage - 1) * pageSize + 1);
  const endRecord = Math.min(totalCount, currentPage * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-ivory-border">
      <div className="text-xs text-navy/60 font-medium">
        Showing <span className="font-bold text-navy">{startRecord}</span> –{' '}
        <span className="font-bold text-navy">{endRecord}</span> of{' '}
        <span className="font-bold text-navy">{totalCount}</span> records
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-ivory-border text-navy hover:bg-ivory-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <span className="text-xs font-bold text-navy px-2">
          {currentPage} / {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-ivory-border text-navy hover:bg-ivory-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors min-h-[44px]"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
