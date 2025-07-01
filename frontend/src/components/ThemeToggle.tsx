import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label={t('common.toggleTheme')}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      )}
    </button>
  );
} 