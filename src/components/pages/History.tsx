import { useState, useEffect, useMemo } from 'react';
import { getRecentBills, deleteBill } from '../../lib/api';
import { useDateUtils } from '../../lib/dateUtils';
import { BillData } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { Trash2, ChevronLeft, ChevronRight, Search, Calendar } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { Link } from 'react-router-dom';
import { RollingText } from '../ui/RollingText';

interface BillWithMetadata extends BillData {
  id: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 9;

export function History() {
  const { t } = useLanguage();
  const { formatDate, formatTime, formatDuration } = useDateUtils();
  const [bills, setBills] = useState<BillWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination and Filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const [filterParticipant, setFilterParticipant] = useState('');

  const loadBills = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const recentBills = await getRecentBills();
      setBills(recentBills);
    } catch (err) {
      setError(t.historyLoadError);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBills();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm(t.actions.confirmDelete)) {
      try {
        await deleteBill(id);
        await loadBills();
      } catch (err) {
        console.error('Failed to delete bill:', err);
        setError(t.historyDeleteError);
      }
    }
  };

  const clearFilters = () => {
    setFilterDate('');
    setFilterParticipant('');
  };

  const hasFilters = filterDate.length > 0 || filterParticipant.trim().length > 0;

  const getSessionSummary = (bill: BillWithMetadata) => {
    if (!bill.sessionStart || !bill.sessionEnd) {
      return t.noTimeData;
    }

    const [startHours, startMinutes] = bill.sessionStart.split(':').map(Number);
    const [endHours, endMinutes] = bill.sessionEnd.split(':').map(Number);
    let durationInMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);

    if (durationInMinutes < 0) {
      durationInMinutes += 24 * 60;
    }

    return `${formatTime(bill.sessionStart)} - ${formatTime(bill.sessionEnd)} - ${formatDuration(durationInMinutes)}`;
  };

  // Filter bills
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const matchesDate = filterDate
        ? bill.created_at && bill.created_at.startsWith(filterDate)
        : true;

      const matchesParticipant = filterParticipant
        ? bill.players.some(p => p.name.toLowerCase().includes(filterParticipant.toLowerCase()))
        : true;

      return matchesDate && matchesParticipant;
    });
  }, [bills, filterDate, filterParticipant]);

  // Pagination logic
  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterParticipant]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">{t.navigation.history}</h1>

      <div className="mb-6 rounded-none border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label
              htmlFor="history-filter-date"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {t.dateFilterLabel}
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                id="history-filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-none border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-slate-900 outline-none transition focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex-1">
            <label
              htmlFor="history-filter-participant"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {t.participantFilterLabel}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                id="history-filter-participant"
                type="text"
                value={filterParticipant}
                onChange={(e) => setFilterParticipant(e.target.value)}
                placeholder={t.participantFilterPlaceholder}
                className="w-full rounded-none border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-slate-900 outline-none transition focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="inline-flex min-w-[140px] items-center justify-center rounded-none border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
          >
            <RollingText>{t.clearFilters}</RollingText>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-none border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex justify-between mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-48 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error && bills.length === 0 ? (
        <div className="rounded-none border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/60 dark:bg-red-950/20">
          <p className="text-base font-semibold text-red-700 dark:text-red-300">{t.historyLoadError}</p>
          <p className="mt-2 text-sm text-red-600 dark:text-red-200/80">{t.historyLoadErrorHint}</p>
          <button
            type="button"
            onClick={() => void loadBills()}
            className="mt-4 inline-flex items-center justify-center rounded-none bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
          >
            <RollingText>{t.retry}</RollingText>
          </button>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="rounded-none border border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            {bills.length === 0 ? t.noHistory : t.historyNoResults}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {bills.length === 0 ? t.noHistoryHint : t.historyNoResultsHint}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center justify-center rounded-none border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            >
              <RollingText>{t.clearFilters}</RollingText>
            </button>
          )}
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {paginatedBills.map((bill) => {
              const participants = bill.players.filter((player) => player.participated);
              const previewNames = participants.slice(0, 3).map((player) => player.name).join(', ');

              return (
                <article
                  key={bill.id}
                  className="group relative rounded-none border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <button
                    onClick={() => handleDelete(bill.id)}
                    className="absolute right-3 top-3 z-10 rounded-none p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600 active:scale-[0.98] dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                    title={t.actions.delete}
                    aria-label={t.actions.delete}
                  >
                    <Trash2 size={16} />
                  </button>

                  <Link
                    to={`/bill/${bill.id}`}
                    className="block h-full rounded-none p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  >
                    <div className="pr-10 text-sm text-slate-500 dark:text-slate-400">
                      {bill.created_at ? formatDate(bill.created_at, 'MMM d, yyyy h:mm a') : t.noDate}
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                          {bill.totalAmount.toLocaleString()}k
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {getSessionSummary(bill)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-none bg-slate-50 px-3 py-3 dark:bg-slate-900/60">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t.players}</p>
                        <span className="rounded-none bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                          {participants.length}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {previewNames}
                        {participants.length > 3 ? ` +${participants.length - 3}` : ''}
                      </p>
                    </div>

                    <span className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 transition group-hover:text-blue-700 dark:text-blue-400 dark:group-hover:text-blue-300">
                      {t.viewDetails}
                    </span>
                  </Link>
                </article>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label={t.previousPage}
                className="rounded-none border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              >
                <ChevronLeft size={20} />
              </button>

              <span className="text-sm text-slate-600 dark:text-slate-400">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label={t.nextPage}
                className="rounded-none border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
