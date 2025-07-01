import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
  size?: 'default' | 'lg';
}

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'relative inline-flex items-center justify-center overflow-hidden rounded-md transition-all duration-300',
          'before:absolute before:inset-0 before:transition-all before:duration-300 hover:before:scale-110',
          variant === 'default'
            ? 'before:bg-gradient-to-r before:from-indigo-500 before:via-purple-500 before:to-pink-500'
            : 'before:bg-gradient-to-r before:from-indigo-500/10 before:via-purple-500/10 before:to-pink-500/10 border border-neutral-700/50',
          size === 'lg' ? 'text-lg px-8 py-3' : 'text-sm px-4 py-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        ref={ref}
        {...props}
      >
        <span className="relative z-10 text-white font-medium">{props.children}</span>
      </button>
    );
  }
); 