import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

interface ScoreConfirmDialogProps {
  isOpen: boolean;
  homeName: string;
  awayName: string;
  scoreA: number;
  scoreB: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ScoreConfirmDialog({
  isOpen,
  homeName,
  awayName,
  scoreA,
  scoreB,
  onConfirm,
  onCancel,
}: ScoreConfirmDialogProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button'));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const confirmButton = dialogRef.current?.querySelector<HTMLButtonElement>('[data-autofocus]');
    confirmButton?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="score-confirm-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className="score-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-confirm-title"
      >
        <div className="score-confirm-dialog__header">
          <div className="score-confirm-dialog__title">
            <AlertTriangle size={20} aria-hidden="true" />
            <h2 id="score-confirm-title">{t.tournament.confirmScoreTitle}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label={t.tournament.cancel} className="score-icon-button">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p>{t.tournament.confirmScoreMessage}</p>
        <div className="score-confirm-dialog__result" aria-label={`${homeName} ${scoreA}, ${awayName} ${scoreB}`}>
          <span>{homeName}</span><strong>{scoreA}</strong>
          <span>{awayName}</span><strong>{scoreB}</strong>
        </div>
        <div className="score-confirm-dialog__actions">
          <button type="button" onClick={onCancel} className="score-button score-button--quiet">
            {t.tournament.cancel}
          </button>
          <button type="button" data-autofocus onClick={onConfirm} className="score-button score-button--confirm">
            {t.tournament.confirmScore}
          </button>
        </div>
      </div>
    </div>
  );
}
