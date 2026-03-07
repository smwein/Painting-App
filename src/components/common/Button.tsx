import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'cta';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'font-display font-700 uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          'bg-teal-500 text-white hover:bg-teal-600 focus:ring-teal-400':
            variant === 'primary',
          'bg-navy text-white hover:bg-navy-light focus:ring-navy':
            variant === 'secondary',
          'border-2 border-teal-500 text-teal-500 hover:bg-teal-50 focus:ring-teal-400':
            variant === 'outline',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500':
            variant === 'danger',
          'bg-gold text-navy hover:bg-gold-light focus:ring-gold':
            variant === 'cta',

          'px-3 py-2 text-sm': size === 'sm',
          'px-5 py-2.5 text-sm': size === 'md',
          'px-8 py-3 text-base': size === 'lg',

          'w-full': fullWidth,
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
