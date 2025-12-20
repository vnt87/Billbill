import { useState, useEffect, useMemo } from 'react';
import { getRecentBills, deleteBill } from '../../lib/api';
import { formatDate, formatTime, formatDuration } from '../../lib/dateUtils';
import { differenceInMinutes } from 'date-fns';
import { parse } from 'date-fns';
import { BillData } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { Trash2, ChevronLeft, ChevronRight, Search, Calendar } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

interface BillWithMetadata extends BillData {
  id: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 9;

export function History() {
  const { t } = useLanguage();
  const [bills, setBills] = useState<BillWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination and Filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const [filterParticipant, setFilterParticipant] = useState('');

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      const recentBills = await getRecentBills();
      setBills(recentBills);
    } catch (err) {
      setError('Failed to load bills');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t.actions.confirmDelete)) {
      try {
        await deleteBill(id);
        await loadBills();
      } catch (err) {
        console.error('Failed to delete bill:', err);
        setError('Failed to delete bill');
      }
    }
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

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t.navigation.history}</h1>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Filter by date"
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={filterParticipant}
            onChange={(e) => setFilterParticipant(e.target.value)}
            placeholder="Filter by participant..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
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
      ) : filteredBills.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          {bills.length === 0 ? t.noHistory : 'No bills found matching your filters'}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {paginatedBills.map((bill) => (
              <div key={bill.id} className="p-4 border dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {bill.created_at ? formatDate(bill.created_at, 'MMM d, yyyy h:mm a') : 'No date'}
                  </div>
                  <button
                    onClick={() => handleDelete(bill.id)}
                    className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-1"
                    title={t.actions.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mb-2">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {bill.totalAmount.toLocaleString()}k
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {bill.sessionStart && bill.sessionEnd ? (
                      <>
                        {formatTime(bill.sessionStart)} • {formatTime(bill.sessionEnd)} • {formatDuration(
                          differenceInMinutes(
                            parse(bill.sessionEnd, 'HH:mm', new Date()),
                            parse(bill.sessionStart, 'HH:mm', new Date())
                          )
                        )}
                      </>
                    ) : (
                      'No time data'
                    )}
                  </div>
                </div>

                <div className="text-sm">
                  <div className="font-medium mb-1 text-gray-800 dark:text-gray-200">{t.players}:</div>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                    {bill.players.filter(p => p.participated).map((player) => (
                      <li key={player.id}>
                        {player.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={`/bill/${bill.id}`}
                  className="mt-4 inline-block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                >
                  {t.viewDetails} →
                </a>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                <ChevronLeft size={20} />
              </button>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
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
