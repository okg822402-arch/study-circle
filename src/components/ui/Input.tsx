import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-navy/80 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-navy/40">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`
              w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3.5 text-base sm:text-sm text-navy
              placeholder:text-navy/30 focus:outline-none focus:border-teal focus:bg-white focus:ring-2 focus:ring-teal/15
              transition-all duration-150 min-h-[44px]
              ${leftIcon ? 'pl-10' : ''}
              ${error ? '!border-feedback-danger !ring-feedback-danger/15' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error ? (
          <p className="mt-1 text-xs text-feedback-danger font-medium break-words">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-navy/50 break-words">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
