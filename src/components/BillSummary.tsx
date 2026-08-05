import { useState, useRef } from 'react';
import { BillData, Player, ConsumableItem } from '../types';
import { differenceInMinutes, parse } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';
import { Toast } from './Toast';
import { useDateUtils } from '../lib/dateUtils';
import { saveBill } from '../lib/api';
import html2canvas from 'html2canvas';
import { Link } from 'react-router-dom';
import { ChevronDown, ReceiptText } from 'lucide-react';
import { RollingText } from './ui/RollingText';
import { SpotlightCard } from './ui/SpotlightCard';

interface BillSummaryProps {
  data: BillData;
  sharedItems?: ConsumableItem[];
  validationErrors?: string[];
  isValid?: boolean;
}

export function BillSummary({ data, sharedItems = [], validationErrors = [], isValid = validationErrors.length === 0 }: BillSummaryProps) {
  const { t } = useLanguage();
  const { formatDuration } = useDateUtils();
  const summaryRef = useRef<HTMLElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [savedBillId, setSavedBillId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const canComplete = isValid;

  const handleSave = async () => {
    if (!canComplete) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      // Filter out non-participating players before saving
      const billToSave = {
        ...data,
        players: data.players.filter(player => player.participated)
      };
      const savedBill = await saveBill(billToSave);
      setSavedBillId(savedBill.id);
    } catch (error) {
      setSaveError(t.saveFailed);
      console.error('Error saving bill:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!summaryRef.current || !exportButtonRef.current || !footerRef.current) return;
    
    try {
      // Hide button and show footer
      exportButtonRef.current.style.display = 'none';
      footerRef.current.style.display = 'block';

      const canvas = await html2canvas(summaryRef.current, {
        background: window.getComputedStyle(document.body).backgroundColor,
      });
      
      // Format current date as MMDDYYYY
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const year = now.getFullYear();
      const dateString = `${month}${day}${year}`;
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `bill-summary-${dateString}.png`;
      link.click();
    } catch (error) {
      console.error('Error exporting bill summary:', error);
    } finally {
      // Restore original visibility
      if (exportButtonRef.current && footerRef.current) {
        exportButtonRef.current.style.display = 'block';
        footerRef.current.style.display = 'none';
      }
    }
  };

  const calculateTotalTime = () => {
    if (!data.sessionStart || !data.sessionEnd) return 0;
    const start = parse(data.sessionStart, 'HH:mm', new Date());
    const end = parse(data.sessionEnd, 'HH:mm', new Date());
    const minutes = differenceInMinutes(end, start);
    return minutes < 0 ? minutes + 24 * 60 : minutes;
  };

  const calculatePlayerTime = (player: Player): number => {
    if (!player.startTime || !player.endTime) return 0;
    const start = parse(player.startTime, 'HH:mm', new Date());
    const end = parse(player.endTime, 'HH:mm', new Date());
    const minutes = differenceInMinutes(end, start);
    return minutes < 0 ? minutes + 24 * 60 : minutes;
  };

  const totalTime = calculateTotalTime();
  const participatingPlayers = data.players.filter(p => p.participated);
  const totalPlayerMinutes = participatingPlayers.reduce((sum, player) => 
    sum + calculatePlayerTime(player), 0);

  const calculatePlayerConsumables = (player: Player): number => {
    if (!player.consumables) return 0;
    return player.consumables.reduce((sum, item) => 
      sum + (item.quantity * item.costPerUnit), 0);
  };

  const calculateSharedItemsCost = (): number => {
    return sharedItems.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
  };

  const calculatePlayerShare = (player: Player): number => {
    // Calculate total consumables cost for all players
    const totalIndividualConsumablesCost = participatingPlayers.reduce((sum, p) => 
      sum + calculatePlayerConsumables(p), 0);
    
    // Calculate total cost of shared items
    const totalSharedItemsCost = calculateSharedItemsCost();
    
    // The base amount should be total amount minus all consumables (individual and shared)
    const baseAmount = Math.max(0, data.totalAmount - totalIndividualConsumablesCost - totalSharedItemsCost);
    
    // Get player's individual consumables cost
    const playerConsumables = calculatePlayerConsumables(player);
    
    // Calculate player's share of shared items (split evenly)
    const sharedItemsShare = totalSharedItemsCost / participatingPlayers.length;
    
    // If we have valid time data, use time-based calculation for base amount
    if (totalPlayerMinutes > 0) {
      const playerTime = calculatePlayerTime(player);
      const baseShare = (baseAmount * playerTime) / totalPlayerMinutes;
      return baseShare + playerConsumables + sharedItemsShare;
    }
    
    // If no valid time data, split base amount equally
    const equalShare = baseAmount / participatingPlayers.length;
    return equalShare + playerConsumables + sharedItemsShare;
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toFixed(0)}k`;
  };

  const shareUrl = savedBillId ? `${window.location.origin}/bill/${savedBillId}` : null;

  return (
    <SpotlightCard
      as="aside"
      ref={summaryRef}
      aria-label={t.billSummary}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:inset-auto lg:top-6 lg:z-auto lg:rounded-none lg:border lg:shadow-none"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left lg:hidden"
        onClick={() => setIsExpanded(value => !value)}
        aria-expanded={isExpanded}
        aria-controls="mobile-bill-summary"
        aria-label={isExpanded ? t.accessibility.collapseSummary : t.accessibility.expandSummary}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <ReceiptText size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t.billSummary}</span>
            <span className="block truncate text-lg font-bold text-slate-950 dark:text-white">{formatCurrency(data.totalAmount)}</span>
          </span>
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {participatingPlayers.length} {t.players.toLowerCase()}
          <ChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} size={20} aria-hidden="true" />
        </span>
      </button>

      <div id="mobile-bill-summary" className={`${isExpanded ? 'block' : 'hidden'} max-h-[70dvh] overflow-y-auto border-t border-slate-200 p-5 dark:border-slate-800 lg:block lg:max-h-none lg:overflow-visible lg:border-t-0 lg:p-6`}>
      <h2 className="hidden text-xl font-bold text-slate-950 dark:text-white lg:block">{t.billSummary}</h2>
      
      <div className="space-y-3 lg:mt-5">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">{t.sessionDuration}</span>
          <span className="font-semibold dark:text-white">{formatDuration(totalTime)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">{t.numberOfParticipants}</span>
          <span className="font-semibold dark:text-white">{participatingPlayers.length}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">{t.baseAmount}</span>
          <span className="font-semibold dark:text-white">{formatCurrency(data.totalAmount)}</span>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-2">{t.individualBreakdown}</h3>
          {validationErrors.includes(t.validation.participantsRequired) && participatingPlayers.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{t.validation.participantsRequired}</p>
          )}
          {participatingPlayers.map(player => {
            const playerShare = calculatePlayerShare(player);
            const playerTime = calculatePlayerTime(player);
            const hasItems = player.consumables && player.consumables.length > 0;
            
            return (
              <div key={player.name} className="py-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">
                    {player.name}
                    {totalPlayerMinutes > 0 && ` (${formatDuration(playerTime)})`}
                  </span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(playerShare)}
                  </span>
                </div>
                {hasItems && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 pl-4">
                    {player.consumables.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex justify-between">
                        <span>{item.name} (x{item.quantity})</span>
                        <span>{formatCurrency(item.quantity * item.costPerUnit)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {sharedItems.length > 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 pl-4">
                    {sharedItems.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex justify-between">
                        <span>{item.name} ({item.quantity}/{participatingPlayers.length})</span>
                        <span>{formatCurrency((item.quantity * item.costPerUnit) / participatingPlayers.length)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {saveError && (
        <div role="alert" className="rounded-none bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">{saveError}</div>
      )}

      {shareUrl && (
        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-none mt-4">
          <label htmlFor="share-url" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.shareThisBill}</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              id="share-url"
              readOnly
              value={shareUrl}
              className="min-w-0 w-full flex-1 rounded-none border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setShowToast(true);
              }}
              aria-label={t.accessibility.copyLink}
              className="rolling-text-trigger shrink-0 rounded-none bg-slate-200 px-3 py-2 font-semibold text-slate-800 hover:bg-slate-300 active:scale-[0.98] dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            >
              <RollingText>{t.copy}</RollingText>
            </button>
          </div>
          <Toast
            message={t.urlCopied}
            isVisible={showToast}
            onClose={() => setShowToast(false)}
          />
          <div className="mt-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <Link className="rolling-text-trigger inline-block" to={`/bill/${savedBillId}`}><RollingText>{t.viewDetails}</RollingText></Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={handleSave}
          disabled={!canComplete || isSaving}
          className="rolling-text-trigger min-h-11 rounded-none bg-blue-700 px-3 py-2 font-semibold text-white transition hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
        >
          <RollingText>{isSaving ? t.saving : t.saveAndShare}</RollingText>
        </button>

        <button
          ref={exportButtonRef}
          onClick={handleExport}
          disabled={!canComplete}
          className="rolling-text-trigger min-h-11 rounded-none border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800 transition hover:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          <RollingText>{t.exportAsImage}</RollingText>
        </button>
      </div>

      <div
        ref={footerRef}
        className="hidden text-xs text-center mt-4 text-slate-500 dark:text-slate-400"
      >
        Generated with<br />
        <span className="text-blue-700 dark:text-blue-300">https://chiabill.pages.dev</span>
      </div>
      </div>
    </SpotlightCard>
  );
}
