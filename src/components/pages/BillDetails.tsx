import { useState, useEffect } from 'react';
import { getBill, deleteBill } from '../../lib/api';
import { useDateUtils } from '../../lib/dateUtils';
import { BillData, Player } from '../../types';
import { parse } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Check as CheckIcon, Copy as ClipboardCopyIcon, RefreshCw } from 'lucide-react';
import { RollingText } from '../ui/RollingText';
import { SpotlightCard } from '../ui/SpotlightCard';

interface BillWithMetadata extends BillData {
  id: string;
  created_at: string;
}

interface BillDetailsProps {
  id: string;
}

export function BillDetails({ id }: BillDetailsProps) {
  const { t } = useLanguage();
  const { formatDate, formatTime, formatDuration } = useDateUtils();
  const navigate = useNavigate();
  const [bill, setBill] = useState<BillWithMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const currentURL = window.location.href;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculatePlayerTime = (player: Player): number => {
    if (!player.startTime || !player.endTime) return 0;
    const start = parse(player.startTime, 'HH:mm', new Date());
    const end = parse(player.endTime, 'HH:mm', new Date());
    const minutes = (end.getHours() * 60 + end.getMinutes()) - (start.getHours() * 60 + start.getMinutes());
    return minutes < 0 ? minutes + 24 * 60 : minutes; // Handle overnight sessions
  };

  const calculatePlayerConsumables = (player: Player): number => {
    if (!player.consumables) return 0;
    return player.consumables.reduce((sum, item) => 
      sum + (item.quantity * item.costPerUnit), 0);
  };

  const calculatePlayerShare = (player: Player, players: Player[]): number => {
    const participatingPlayers = players.filter(p => p.participated);
    const totalPlayerMinutes = participatingPlayers.reduce((sum, p) => 
      sum + calculatePlayerTime(p), 0);

    // Calculate total consumables cost for all players
    const totalConsumablesCost = participatingPlayers.reduce((sum, p) => 
      sum + calculatePlayerConsumables(p), 0);
    
    // The base amount should be total amount minus consumables
    const baseAmount = Math.max(0, (bill?.totalAmount ?? 0) - totalConsumablesCost);
    
    // Get player's consumables cost
    const playerConsumables = calculatePlayerConsumables(player);
    
    // If we have valid time data, use time-based calculation
    if (totalPlayerMinutes > 0) {
      const playerTime = calculatePlayerTime(player);
      const baseShare = (baseAmount * playerTime) / totalPlayerMinutes;
      return baseShare + playerConsumables;
    }
    
    // If no valid time data, split base amount equally
    return (baseAmount / participatingPlayers.length) + playerConsumables;
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toFixed(0)}k`;
  };

  const loadBill = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const billData = await getBill(id);
      setBill(billData);
    } catch (err) {
      setError(t.failedToLoad);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBill();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm(t.actions?.confirmDelete || 'Are you sure you want to delete this bill?')) {
      setIsDeleting(true);
      try {
        await deleteBill(id);
        navigate('/history');
      } catch (err) {
        setError(t.failedToDelete);
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      setError(null);
      await navigator.clipboard.writeText(currentURL);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy bill link:', err);
      setError(t.copyLinkFailed);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-none border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-none border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/60 dark:bg-red-950/20">
          <p className="text-base font-semibold text-red-700 dark:text-red-300">{error || t.billNotFound}</p>
          <p className="mt-2 text-sm text-red-600 dark:text-red-200/80">{t.failedToLoadHint}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadBill()}
              className="inline-flex items-center justify-center rounded-none bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
            >
              <RollingText>{t.retry}</RollingText>
            </button>
            <Link
              to="/history"
              className="inline-flex items-center justify-center rounded-none border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white active:scale-[0.99] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            >
              <RollingText>{t.backToHistory}</RollingText>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          to="/history" 
          className="inline-flex items-center text-blue-600 transition hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 rounded-none"
        >
          <ArrowLeft className="mr-2" size={16} />
          <RollingText>{t.backToHistory}</RollingText>
        </Link>
      </div>

      <SpotlightCard as="section" aria-labelledby="bill-details-heading" className="rounded-none border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 id="bill-details-heading" className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{t.billDetails}</h1>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t.createdOn} {bill.created_at ? formatDate(bill.created_at, 'MMMM d, yyyy HH:mm') : t.noDate}
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {t.total}: {bill.totalAmount.toLocaleString()}k
          </div>
        </div>

        <section className="mb-6 rounded-none bg-slate-50 px-4 py-4 dark:bg-slate-900/60" aria-labelledby="bill-session-info">
          <h2 id="bill-session-info" className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">{t.sessionInfo}</h2>
            <div className="text-slate-600 dark:text-slate-400">
              {bill.sessionStart && bill.sessionEnd ? (
                <>
                  {(() => {
                    const [startHours, startMinutes] = bill.sessionStart.split(':').map(Number);
                    const [endHours, endMinutes] = bill.sessionEnd.split(':').map(Number);
                    let durationInMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
                    if (durationInMinutes < 0) durationInMinutes += 24 * 60; // Handle overnight sessions
                    return (
                      <span>
                        {formatTime(bill.sessionStart)} - {formatTime(bill.sessionEnd)} - ({formatDuration(durationInMinutes)})
                      </span>
                    );
                  })()}
                </>
              ) : (
                t.noTimeData
              )}
            </div>
        </section>

        <section className="mb-6" aria-labelledby="bill-participant-breakdown">
          <h2 id="bill-participant-breakdown" className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t.participantBreakdown}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bill.players.filter(p => p.participated).map((player) => (
              <SpotlightCard as="article" key={player.id} className="rounded-none border border-slate-200 p-4 shadow-sm dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-900 dark:text-white">{player.name}</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {formatCurrency(calculatePlayerShare(player, bill.players.filter(p => p.participated)))}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {player.startTime && player.endTime ? (
                    <>
                      {(() => {
                        const [startHours, startMinutes] = player.startTime.split(':').map(Number);
                        const [endHours, endMinutes] = player.endTime.split(':').map(Number);
                        let durationInMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
                        if (durationInMinutes < 0) durationInMinutes += 24 * 60; // Handle overnight sessions
                        return (
                          <span>
                            {formatTime(player.startTime)} - {formatTime(player.endTime)} - ({formatDuration(durationInMinutes)})
                          </span>
                        );
                      })()}
                    </>
                  ) : (
                    player.isFullSession ? t.fullSession : t.noTimeData
                  )}
                </div>
                {player.consumables.length > 0 && (
                  <div className="mt-3 rounded-none bg-slate-50 px-3 py-3 dark:bg-slate-900/60">
                    <div className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">{t.additionalItems}</div>
                    <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      {player.consumables.map((item) => (
                        <li key={item.id} className="flex justify-between">
                          <span>{item.name} x{item.quantity}</span>
                          <span>{(item.costPerUnit * item.quantity).toLocaleString()}k</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </SpotlightCard>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-4 border-t border-slate-200 pt-4 dark:border-slate-700 lg:grid-cols-[minmax(0,1fr)_auto]">
          <section className="rounded-none border border-slate-200 p-4 dark:border-slate-700" aria-labelledby="share-bill-heading">
            <h2 id="share-bill-heading" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t.shareActions}
            </h2>
            <label htmlFor="share-bill-link" className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t.shareLinkLabel}
            </label>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.shareLinkHint}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                id="share-bill-link"
                type="text"
                value={currentURL}
                readOnly
                aria-label={t.shareLinkLabel}
                className="min-w-0 flex-1 rounded-none border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                aria-label={t.copyShareLinkLabel}
                className={`inline-flex items-center justify-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${
                  isCopied 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {isCopied ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <RollingText>{t.urlCopied}</RollingText>
                  </>
                ) : (
                  <>
                    <ClipboardCopyIcon className="w-4 h-4" />
                    <RollingText>{t.copyShareLink}</RollingText>
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="rounded-none border border-slate-200 p-4 dark:border-slate-700" aria-labelledby="manage-bill-heading">
            <h2 id="manage-bill-heading" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t.manageBill}
            </h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={() => navigate('/calculator', { state: { initialData: bill } })}
                className="inline-flex items-center justify-center gap-2 rounded-none bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 active:scale-[0.99] dark:bg-blue-500 dark:hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                <RefreshCw size={18} />
                <RollingText>{t.actions.recalculate}</RollingText>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-none bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
              >
                <Trash2 size={18} />
                <RollingText>{isDeleting ? t.loading : t.actions.delete}</RollingText>
              </button>
            </div>
          </section>
        </div>
      </SpotlightCard>
    </div>
  );
}
