import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-navy/10 rounded-xl ${className}`}
      {...props}
    />
  );
};

export const SkeletonTaskCard: React.FC = () => {
  return (
    <div className="bg-white rounded-card p-4 border border-ivory-border shadow-card space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-5 h-5 rounded-md shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </div>
      </div>
      <div className="pt-2 border-t border-ivory-border flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </div>
  );
};

export const SkeletonCircleCard: React.FC = () => {
  return (
    <div className="bg-white rounded-card p-4 border border-ivory-border shadow-card flex items-center gap-3.5">
      <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="h-3 w-1/3 rounded-md" />
      </div>
    </div>
  );
};

export const SkeletonSessionCard: React.FC = () => {
  return (
    <div className="bg-white rounded-card p-4 border border-ivory-border shadow-card space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-4/5 rounded-md" />
      <Skeleton className="h-3 w-1/2 rounded-md" />
    </div>
  );
};
