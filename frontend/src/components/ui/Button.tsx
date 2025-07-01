import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const { isDark } = useTheme();

    return (
      <button
        ref={ref}
        className={cn(
          'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          {
            // Primary button
            'text-white': variant === 'primary',
            'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500': variant === 'primary' && isDark,
            'bg-sky-500 hover:bg-sky-600 focus:ring-sky-400': variant === 'primary' && !isDark,
            
            // Secondary button
            'bg-gray-700 text-gray-100 hover:bg-gray-600': variant === 'secondary' && isDark,
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary' && !isDark,
            
            // Outline button
            'bg-transparent': variant === 'outline',
            'border border-gray-600 text-gray-300 hover:bg-gray-700/50': variant === 'outline' && isDark,
            'border border-gray-300 text-gray-700 hover:bg-gray-100': variant === 'outline' && !isDark,
            
            // Destructive button
            'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'destructive',
            
            // Sizes
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export default Button;