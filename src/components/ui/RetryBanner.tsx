import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface RetryBannerProps {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const RetryBanner: React.FC<RetryBannerProps> = ({
  message = 'Network connection is slow or server request failed. Please try again.',
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="p-4 bg-feedback-danger-light border border-feedback-danger/25 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-feedback-danger font-medium animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span className="leading-relaxed">{message}</span>
      </div>
      <Button
        variant="danger"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />}
        className="shrink-0 w-full sm:w-auto"
      >
        {isRetrying ? 'Retrying…' : 'Retry'}
      </Button>
    </div>
  );
};
