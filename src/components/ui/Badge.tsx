import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'teal' | 'amber' | 'danger' | 'success' | 'navy' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'teal',
  size = 'md',
  className = '',
  icon,
}) => {
  const variants = {
    teal: 'bg-teal-light text-teal',
    amber: 'bg-amber-light text-amber-muted',
    danger: 'bg-feedback-danger-light text-feedback-danger',
    success: 'bg-feedback-success-light text-feedback-success',
    navy: 'bg-navy/10 text-navy',
    gray: 'bg-ivory-subtle text-navy-muted border border-ivory-border',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-badge uppercase tracking-wider
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
