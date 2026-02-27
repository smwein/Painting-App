import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
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
        'font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          // Variants
          'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500':
            variant === 'primary',
          'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500':
            variant === 'secondary',
          'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500':
            variant === 'outline',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500':
            variant === 'danger',

          // Sizes (ensuring min-height 44px for touch targets)
          'px-3 py-2 text-sm': size === 'sm',
          'px-4 py-2.5 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',

          // Full width
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
