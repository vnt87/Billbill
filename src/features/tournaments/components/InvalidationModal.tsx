import { useEffect, useRef } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AlertTriangle, X } from 'lucide-react';

interface InvalidationModalProps {
  isOpen: boolean;
  invalidatedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function InvalidationModal({
  isOpen,
  invalidatedCount,
  onConfirm,
  onCancel,
}: InvalidationModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Move focus into modal
    setTimeout(() => {
      if (dialogRef.current) {
        const confirmBtn = dialogRef.current.querySelector<HTMLElement>('button[data-autofocus]');
        if (confirmBtn) confirmBtn.focus();
        else dialogRef.current.focus();
      }
    }, 0);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invalidation-modal-title"
        tabIndex={-1}
        className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-900 max-w-md w-full p-6 space-y-4 shadow-xl rounded-none focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-lg">
            <AlertTriangle size={24} />
            <h2 id="invalidation-modal-title">{t.tournament.confirmInvalidationTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t.tournament.cancel || 'Close'}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300">
          {t.tournament.confirmInvalidationMessage.replace('{count}', invalidatedCount.toString())}
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium transition-colors"
          >
            {t.tournament.cancel}
          </button>
          <button
            type="button"
            data-autofocus
            onClick={onConfirm}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors shadow-sm"
          >
            {t.tournament.confirmInvalidationProceed}
          </button>
        </div>
      </div>
    </div>
  );
}
