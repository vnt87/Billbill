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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-900 max-w-md w-full p-6 space-y-4 shadow-xl rounded-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-lg">
            <AlertTriangle size={24} />
            <h2>{t.tournament.confirmInvalidationTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
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
