import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getPublicTournament, accessTournament, deleteTournament } from '../api/client';
import { PublicTournamentDto, BOUNDS } from '../../../../shared/tournaments/contracts';
import { Match } from '../../../../shared/tournaments/types';
import { BracketBoard } from '../components/BracketBoard';
import { StandingsTable } from '../components/StandingsTable';
import { ShareLinks } from '../components/ShareLinks';
import { SpotlightCard } from '../../../components/ui/SpotlightCard';
import { RefreshCw, AlertCircle, Eye, Share2, MoreVertical, KeyRound, Trash2, Loader2, X } from 'lucide-react';

export function TournamentPublic() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publicDto, setPublicDto] = useState<PublicTournamentDto | null>(null);
  const [showShareLinks, setShowShareLinks] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [passphraseError, setPassphraseError] = useState('');
  const [busy, setBusy] = useState(false);

  const credentialKey = publicToken ? `chiabill:tournament-management:${publicToken}` : '';

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

  const handleManageClick = () => {
    setMenuOpen(false);
    if (!publicToken) return;
    const storedToken = localStorage.getItem(credentialKey);
    if (storedToken) {
      navigate(`/tournaments/manage/${storedToken}`);
    } else {
      setPassphrase('');
      setPassphraseError('');
      setShowManageModal(true);
    }
  };

  const handlePassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicToken) return;
    if (passphrase.trim().length < BOUNDS.MIN_MANAGEMENT_PASSPHRASE_LENGTH) {
      setPassphraseError((t.tournament.passphraseTooShort || 'Management passphrase must be at least {min} characters').replace('{min}', BOUNDS.MIN_MANAGEMENT_PASSPHRASE_LENGTH.toString()));
      return;
    }
    setBusy(true);
    setPassphraseError('');
    const res = await accessTournament(publicToken, passphrase);
    setBusy(false);
    if ('error' in res) {
      setPassphraseError(res.error.message || t.tournament.accessDenied);
    } else {
      localStorage.setItem(credentialKey, res.data.managementToken);
      setShowManageModal(false);
      navigate(res.data.adminUrl);
    }
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!publicToken || !publicDto) return;
    const storedToken = localStorage.getItem(credentialKey);
    if (!storedToken) {
      setShowDeleteConfirm(false);
      setPassphrase('');
      setPassphraseError('');
      setShowManageModal(true);
      return;
    }
    setBusy(true);
    const res = await deleteTournament(storedToken, publicDto.version);
    setBusy(false);
    if ('error' in res) {
      setErrorMsg(res.error.message);
      setShowDeleteConfirm(false);
    } else {
      localStorage.removeItem(credentialKey);
      navigate('/tournaments');
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

          <div className="flex items-center gap-2 self-start sm:self-auto relative">
            <button
              type="button"
              onClick={() => setShowShareLinks(!showShareLinks)}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center justify-center transition-colors active:scale-95"
              title={t.tournament.shareLinks || 'Share Links'}
              aria-label={t.tournament.shareLinks || 'Share Links'}
            >
              <Share2 size={16} />
            </button>
            <button
              type="button"
              onClick={fetchPublicData}
              className="p-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium flex items-center justify-center transition-colors active:scale-95"
              title={t.tournament.refresh}
              aria-label={t.tournament.refresh}
            >
              <RefreshCw size={16} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium flex items-center justify-center transition-colors active:scale-95"
                title="Options"
                aria-label="Options"
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 w-44 border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 py-1">
                  <button
                    type="button"
                    onClick={handleManageClick}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <KeyRound size={14} />
                    <span>{t.tournament.manage}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                  >
                    <Trash2 size={14} />
                    <span>{t.tournament.deleteTournamentButton || 'Delete'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showShareLinks && (
          <div className="pt-2">
            <ShareLinks publicUrl={`/tournaments/view/${publicToken}`} />
          </div>
        )}
      </SpotlightCard>

      {/* Passphrase Modal for Manage access */}
      {showManageModal && (
        <div className="fixed left-0 top-0 z-[100] flex h-[100dvh] w-screen items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="public-manage-tournament-heading">
          <div className="my-auto w-full max-w-md overflow-y-auto border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 id="public-manage-tournament-heading" className="text-lg font-bold text-slate-950 dark:text-white">{t.tournament.accessTournament}</h2>
              <button type="button" onClick={() => setShowManageModal(false)} aria-label={t.tournament.close || 'Close'} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePassphraseSubmit} className="space-y-4 pt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t.tournament.accessHint} <strong className="text-slate-800 dark:text-slate-200">{name}</strong>
              </p>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.tournament.managementPassphraseLabel}
                </label>
                <input
                  autoFocus
                  type="password"
                  value={passphrase}
                  onChange={(e) => { setPassphrase(e.target.value); setPassphraseError(''); }}
                  placeholder={t.tournament.managementPassphrasePlaceholder}
                  className="w-full border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              {passphraseError && (
                <p className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle size={14} />
                  {passphraseError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManageModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  {t.tournament.close || 'Cancel'}
                </button>
                <button
                  disabled={busy}
                  type="submit"
                  className="flex items-center gap-2 bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {busy ? t.tournament.unlocking : t.tournament.unlock}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed left-0 top-0 z-[100] flex h-[100dvh] w-screen items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="public-delete-tournament-heading">
          <div className="my-auto w-full max-w-md border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 id="public-delete-tournament-heading" className="text-lg font-bold text-red-600 dark:text-red-400">{t.tournament.deleteTournamentTitle || 'Delete Tournament'}</h2>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} aria-label={t.tournament.close || 'Close'} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <div className="py-4 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t.tournament.deleteTournamentConfirm || 'Are you sure you want to delete this tournament? This action cannot be undone.'}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {t.tournament.close || 'Cancel'}
              </button>
              <button
                disabled={busy}
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-2 bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {busy ? (t.tournament.deleting || 'Deleting...') : (t.tournament.deleteTournamentButton || 'Delete Tournament')}
              </button>
            </div>
          </div>
        </div>
      )}

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
