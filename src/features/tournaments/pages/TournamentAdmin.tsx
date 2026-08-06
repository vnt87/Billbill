import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getAdminTournament, updateTournament, updateMatch } from '../api/client';
import { AdminTournamentDto, CreateEntrantInput, MatchCommand } from '../../../../shared/tournaments/contracts';
import { BracketBoard } from '../components/BracketBoard';
import { StandingsTable } from '../components/StandingsTable';
import { EntrantEditor } from '../components/EntrantEditor';
import { ShareLinks } from '../components/ShareLinks';
import { InvalidationModal } from '../components/InvalidationModal';
import { SpotlightCard } from '../../../components/ui/SpotlightCard';
import {
  RefreshCw,
  Trophy,
  AlertCircle,
  Share2,
  Users,
  LayoutGrid,
} from 'lucide-react';

export function TournamentAdmin() {
  const { adminToken } = useParams<{ adminToken: string }>();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [adminDto, setAdminDto] = useState<AdminTournamentDto | null>(null);
  const [version, setVersion] = useState<number>(1);
  const [showShareLinks, setShowShareLinks] = useState(false);
  const [activeTab, setActiveTab] = useState<'bracket' | 'standings' | 'entrants'>('bracket');

  // Pending confirmation state for invalidation
  const [pendingInvalidation, setPendingInvalidation] = useState<{
    type: 'entrants' | 'match';
    matchId?: string;
    payload: any;
    invalidatedMatchIds: string[];
  } | null>(null);

  const fetchAdminData = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    setErrorMsg(null);

    const res = await getAdminTournament(adminToken);
    setLoading(false);

    if ('error' in res) {
      setErrorMsg(res.error.message);
      return;
    }

    setAdminDto(res.data);
    if (res.version) setVersion(res.version);
  }, [adminToken]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleUpdateEntrants = async (newEntrantsInput: CreateEntrantInput[], confirmedIds?: string[]) => {
    if (!adminToken || !adminDto) return;
    setErrorMsg(null);

    const res = await updateTournament(adminToken, {
      expectedVersion: version,
      command: { type: 'updateEntrants', entrants: newEntrantsInput },
      confirmInvalidation: confirmedIds,
    });

    if ('error' in res) {
      if (res.error.code === 'INVALIDATION_CONFIRMATION_REQUIRED' && res.error.fields?.invalidatedMatchIds) {
        const ids: string[] = JSON.parse(res.error.fields.invalidatedMatchIds);
        setPendingInvalidation({
          type: 'entrants',
          payload: newEntrantsInput,
          invalidatedMatchIds: ids,
        });
      } else if (res.error.code === 'STALE_VERSION') {
        setErrorMsg(res.error.message);
        fetchAdminData();
      } else {
        setErrorMsg(res.error.message);
      }
      return;
    }

    setAdminDto(res.data);
    if (res.version) setVersion(res.version);
    setPendingInvalidation(null);
  };

  const handleMatchCommand = async (matchId: string, command: MatchCommand, confirmedIds?: string[]) => {
    if (!adminToken || !adminDto) return;
    setErrorMsg(null);

    const res = await updateMatch(adminToken, matchId, {
      expectedVersion: version,
      command,
      confirmInvalidation: confirmedIds,
    });

    if ('error' in res) {
      if (res.error.code === 'INVALIDATION_CONFIRMATION_REQUIRED' && res.error.fields?.invalidatedMatchIds) {
        const ids: string[] = JSON.parse(res.error.fields.invalidatedMatchIds);
        setPendingInvalidation({
          type: 'match',
          matchId,
          payload: command,
          invalidatedMatchIds: ids,
        });
      } else if (res.error.code === 'STALE_VERSION') {
        setErrorMsg(res.error.message);
        fetchAdminData();
      } else {
        setErrorMsg(res.error.message);
      }
      return;
    }

    setAdminDto(res.data);
    if (res.version) setVersion(res.version);
    setPendingInvalidation(null);
  };

  const handleConfirmInvalidation = () => {
    if (!pendingInvalidation) return;
    if (pendingInvalidation.type === 'entrants') {
      handleUpdateEntrants(pendingInvalidation.payload, pendingInvalidation.invalidatedMatchIds);
    } else if (pendingInvalidation.type === 'match' && pendingInvalidation.matchId) {
      handleMatchCommand(pendingInvalidation.matchId, pendingInvalidation.payload, pendingInvalidation.invalidatedMatchIds);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <RefreshCw size={28} className="animate-spin text-blue-600 mx-auto" />
        <p className="text-sm text-slate-500">{t.loading}</p>
      </div>
    );
  }

  if (errorMsg && !adminDto) {
    return (
      <SpotlightCard className="py-12 max-w-md mx-auto text-center space-y-4 bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-none">
        <AlertCircle size={36} className="text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.tournament.notFoundTitle}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{errorMsg || t.tournament.notFoundHint}</p>
        <button
          type="button"
          onClick={fetchAdminData}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          {t.retry}
        </button>
      </SpotlightCard>
    );
  }

  if (!adminDto) return null;

  const { aggregate, standings, publicUrl } = adminDto;
  const { tournament, entrants, matches } = aggregate;
  const isRoundRobin = tournament.format === 'round_robin';

  return (
    <main className="space-y-6 py-6">
      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <SpotlightCard className="bg-white dark:bg-slate-900 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
                {tournament.name}
              </h1>
              <span className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                tournament.status === 'completed'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
              }`}>
                {tournament.status === 'completed' ? t.tournament.completed : t.tournament.inProgress}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-3">
              <span>{t.tournament.formatLabel || 'Format'}: <strong className="text-slate-700 dark:text-slate-300 capitalize">{tournament.format.replace('_', ' ')}</strong></span>
              <span>•</span>
              <span>{(t.tournament.overrideBestOf || 'BO')} {tournament.defaultBestOf}</span>
              <span>•</span>
              <span>v{version}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShareLinks(!showShareLinks)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <Share2 size={16} />
              <span>{t.tournament.shareLinks || 'Share Links'}</span>
            </button>
            <button
              type="button"
              onClick={fetchAdminData}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors active:scale-95"
              title={t.tournament.refresh}
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">{t.tournament.refresh}</span>
            </button>
          </div>
        </div>

        {showShareLinks && (
          <div className="pt-2">
            <ShareLinks adminUrl={`/tournaments/manage/${adminToken}`} publicUrl={publicUrl} />
          </div>
        )}
      </SpotlightCard>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('bracket')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'bracket'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LayoutGrid size={16} />
          <span>{isRoundRobin ? t.tournament.matches : t.tournament.bracket}</span>
        </button>

        {isRoundRobin && (
          <button
            type="button"
            onClick={() => setActiveTab('standings')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'standings'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Trophy size={16} />
            <span>{t.tournament.standings}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('entrants')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'entrants'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users size={16} />
          <span>{t.tournament.entrantsLabel}</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'bracket' && (
        <div className="space-y-6">
          {isRoundRobin && standings.length > 0 && (
            <StandingsTable standings={standings} entrants={entrants} />
          )}

          <BracketBoard
            matches={matches}
            entrants={entrants}
            readOnly={false}
            onCompleteResult={(mId, sA, sB, wId) =>
              handleMatchCommand(mId, { type: 'completeResult', scoreA: sA, scoreB: sB, winnerId: wId })
            }
            onClearResult={(mId) => handleMatchCommand(mId, { type: 'clearResult' })}
            onUpdateNote={(mId, note) => handleMatchCommand(mId, { type: 'updatePrivateNote', note })}
            onOverrideBestOf={(mId, bestOf) => handleMatchCommand(mId, { type: 'overrideBestOf', bestOf })}
            matchHref={(match) => `/tournaments/manage/${adminToken}/matches/${match.id}`}
          />
        </div>
      )}

      {activeTab === 'standings' && isRoundRobin && (
        <StandingsTable standings={standings} entrants={entrants} />
      )}

      {activeTab === 'entrants' && (
        <SpotlightCard className="bg-white dark:bg-slate-900 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl rounded-none">
          <EntrantEditor
            entrants={entrants.map((e) => ({ name: e.name, seed: e.seed, roster: e.roster || [] }))}
            entrantType={tournament.entrantType}
            onChange={(updatedInput) => handleUpdateEntrants(updatedInput)}
          />
        </SpotlightCard>
      )}

      {/* Invalidation Confirmation Modal */}
      <InvalidationModal
        isOpen={pendingInvalidation !== null}
        invalidatedCount={pendingInvalidation?.invalidatedMatchIds.length || 0}
        onConfirm={handleConfirmInvalidation}
        onCancel={() => setPendingInvalidation(null)}
      />
    </main>
  );
}

export default TournamentAdmin;
