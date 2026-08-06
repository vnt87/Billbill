import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getPublicTournament } from '../api/client';
import { PublicTournamentDto } from '../../../../shared/tournaments/contracts';
import { Match } from '../../../../shared/tournaments/types';
import { BracketBoard } from '../components/BracketBoard';
import { StandingsTable } from '../components/StandingsTable';
import { ShareLinks } from '../components/ShareLinks';
import { SpotlightCard } from '../../../components/ui/SpotlightCard';
import { RefreshCw, AlertCircle, Eye, Share2 } from 'lucide-react';

export function TournamentPublic() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publicDto, setPublicDto] = useState<PublicTournamentDto | null>(null);
  const [showShareLinks, setShowShareLinks] = useState(false);

  const fetchPublicData = useCallback(async () => {
    if (!publicToken) return;
    setLoading(true);
    setErrorMsg(null);

    const res = await getPublicTournament(publicToken);
    setLoading(false);

    if ('error' in res) {
      setErrorMsg(res.error.message);
      return;
    }

    setPublicDto(res.data);
  }, [publicToken]);

  useEffect(() => {
    fetchPublicData();
  }, [fetchPublicData]);

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <RefreshCw size={28} className="animate-spin text-blue-600 mx-auto" />
        <p className="text-sm text-slate-500">{t.loading}</p>
      </div>
    );
  }

  if (errorMsg || !publicDto) {
    return (
      <SpotlightCard className="py-12 max-w-md mx-auto text-center space-y-4 bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-none">
        <AlertCircle size={36} className="text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.tournament.notFoundTitle}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{errorMsg || t.tournament.notFoundHint}</p>
        <button
          type="button"
          onClick={fetchPublicData}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          {t.retry}
        </button>
      </SpotlightCard>
    );
  }

  const { id, name, format, status, defaultBestOf, entrants, matches, standings, updatedAt } = publicDto;
  const isRoundRobin = format === 'round_robin';

  // Format public matches into domain Match[] for BracketBoard
  const mappedMatches: Match[] = matches.map((pm) => ({
    id: pm.id,
    tournamentId: id,
    side: pm.side,
    round: pm.round,
    position: pm.position,
    sourceA: { type: 'seed', seed: 1 },
    sourceB: { type: 'seed', seed: 2 },
    entrantAId: pm.entrantAId,
    entrantBId: pm.entrantBId,
    bestOf: pm.bestOf,
    scoreA: pm.scoreA,
    scoreB: pm.scoreB,
    winnerId: pm.winnerId,
    state: pm.state,
    privateNote: null,
  }));

  const formattedUpdated = new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <main className="space-y-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <SpotlightCard className="bg-white dark:bg-slate-900 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col space-y-4 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Eye size={20} className="text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
                {name}
              </h1>
              <span className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                status === 'completed'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
              }`}>
                {status === 'completed' ? t.tournament.completed : t.tournament.inProgress}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-3">
              <span>{t.tournament.formatLabel || 'Format'}: <strong className="text-slate-700 dark:text-slate-300 capitalize">{format.replace('_', ' ')}</strong></span>
              <span>•</span>
              <span>{(t.tournament.overrideBestOf || 'BO')} {defaultBestOf}</span>
              <span>•</span>
              <span>{t.tournament.lastUpdated}: {formattedUpdated}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowShareLinks(!showShareLinks)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <Share2 size={16} />
              <span>{t.tournament.shareLinks || 'Share Links'}</span>
            </button>
            <button
              type="button"
              onClick={fetchPublicData}
              className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors active:scale-95"
              title={t.tournament.refresh}
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">{t.tournament.refresh}</span>
            </button>
          </div>
        </div>

        {showShareLinks && (
          <div className="pt-2">
            <ShareLinks publicUrl={`/tournaments/view/${publicToken}`} />
          </div>
        )}
      </SpotlightCard>

      {/* Standings if Round Robin */}
      {isRoundRobin && standings.length > 0 && (
        <StandingsTable standings={standings} entrants={entrants} />
      )}

      {/* Bracket / Match List */}
      <BracketBoard
        matches={mappedMatches}
        entrants={entrants}
        readOnly={true}
        matchHref={(match) => `/tournaments/view/${publicToken}/matches/${match.id}`}
      />
    </main>
  );
}

export default TournamentPublic;
