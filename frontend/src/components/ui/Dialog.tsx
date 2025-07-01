import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Button from './Button';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

interface BaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface ConfirmDialogProps extends BaseDialogProps {
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  icon?: ReactNode;
  children?: never;
}

interface ContentDialogProps extends BaseDialogProps {
  children: ReactNode;
  onConfirm?: never;
  title?: never;
  description?: never;
  confirmText?: never;
  cancelText?: never;
  icon?: never;
}

type DialogProps = ConfirmDialogProps | ContentDialogProps;

export default function Dialog(props: DialogProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isOpen, onClose, className } = props;

  if (!isOpen) return null;

  // If children is provided, render content dialog
  if ('children' in props) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className={cn(
          "relative rounded-lg shadow-xl backdrop-blur-lg",
          className
        )}>
          {props.children}
        </div>
      </div>
    );
  }

  // Otherwise render confirm dialog
  const { onConfirm, title, description, confirmText, cancelText, icon } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative rounded-lg w-full max-w-md p-6 shadow-xl backdrop-blur-lg",
        isDark
          ? "bg-gray-800/90 border border-gray-700"
          : "bg-white/90 border border-gray-200",
        className
      )}>
        <button
          onClick={onClose}
          className={cn(
            "absolute right-4 top-4 hover:bg-gray-100/20 p-1 rounded-full transition-colors",
            isDark
              ? "text-gray-400 hover:text-gray-300"
              : "text-gray-500 hover:text-gray-600"
          )}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          {icon && <div className="mb-4">{icon}</div>}
          <h3 className={cn(
            "text-lg font-semibold mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>{title}</h3>
          <p className={cn(
            "text-sm mb-6",
            isDark ? "text-gray-300" : "text-gray-500"
          )}>{description}</p>

          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className={cn(
                "flex-1",
                isDark 
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
                  : "border-gray-300 text-gray-700"
              )}
              onClick={onClose}
            >
              {cancelText || t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              className={cn(
                "flex-1",
                isDark 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-red-600 hover:bg-red-700"
              )}
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmText || t('common.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 