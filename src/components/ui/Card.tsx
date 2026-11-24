import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  accentBorder?: 'teal' | 'danger' | 'amber' | 'none';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  accentBorder = 'none',
  interactive = false,
  className = '',
  ...props
}) => {
  const accentStyles = {
    none: '',
    teal: 'border-l-4 border-l-teal',
    danger: 'border-l-4 border-l-feedback-danger',
    amber: 'border-l-4 border-l-amber',
  };

  return (
    <div
      className={`
        bg-white rounded-card border border-ivory-border shadow-card
        ${accentStyles[accentBorder]}
        ${interactive ? 'cursor-pointer hover:border-ivory-border-strong transition-all duration-150 btn-press' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
