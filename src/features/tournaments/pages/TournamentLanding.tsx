import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CreateEntrantInput, BOUNDS } from '../../../../shared/tournaments/contracts';
import { TournamentFormat, EntrantType } from '../../../../shared/tournaments/types';
import { getRandomDefaultPlayerNames } from '../../../../shared/tournaments/utils';
import { createTournament } from '../api/client';
import { EntrantEditor } from '../components/EntrantEditor';
import { ShareLinks } from '../components/ShareLinks';
import { SpotlightCard } from '../../../components/ui/SpotlightCard';
import { Trophy, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export function TournamentLanding() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('single_elimination');
  const [entrantType, setEntrantType] = useState<EntrantType>('individual');
  const [defaultBestOf, setDefaultBestOf] = useState<number>(3);
  const [entrants, setEntrants] = useState<CreateEntrantInput[]>(() => {
    const randomNames = getRandomDefaultPlayerNames(4);
    return randomNames.map((n, idx) => ({ name: n, seed: idx + 1, roster: [] }));
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{ adminUrl: string; publicUrl: string } | null>(null);

  const handleEntrantTypeChange = (type: EntrantType) => {
    setEntrantType(type);
    if (type === 'individual') {
      const randomNames = getRandomDefaultPlayerNames(entrants.length);
      setEntrants(
        entrants.map((e, idx) => ({
          ...e,
          name: randomNames[idx],
          roster: [],
        }))
      );
    } else {
      setEntrants(
        entrants.map((e, idx) => ({
          ...e,
          name: `Team ${idx + 1}`,
          roster: ['Member 1'],
        }))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const res = await createTournament({
      name,
      format,
      entrantType,
      defaultBestOf,
      entrants,
    });

    setSubmitting(false);

    if ('error' in res) {
      setErrorMsg(res.error.message);
      return;
    }

    setCreatedResult({
      adminUrl: res.data.adminUrl,
      publicUrl: res.data.publicUrl,
    });
  };

  return (
    <main className="space-y-6 py-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-none mb-1">
          <Trophy size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t.tournament.createTitle}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          {t.tournament.subtitle}
        </p>
      </div>

      {createdResult ? (
        <div className="space-y-6">
          <ShareLinks adminUrl={createdResult.adminUrl} publicUrl={createdResult.publicUrl} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => navigate(createdResult.adminUrl)}
              className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm flex items-center gap-2 transition-colors active:scale-95 shadow-md"
            >
              <span>Enter Admin Dashboard</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        <SpotlightCard as="form" onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm rounded-none">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tournament Name */}
          <div className="space-y-1.5">
            <label htmlFor="tournament-name" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t.tournament.nameLabel} <span className="text-red-500">*</span>
            </label>
            <input
              id="tournament-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={BOUNDS.MAX_TOURNAMENT_NAME_LENGTH}
              placeholder={t.tournament.namePlaceholder}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t.tournament.formatLabel}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'single_elimination', label: t.tournament.formatSingleElimination },
                  { id: 'double_elimination', label: t.tournament.formatDoubleElimination },
                  { id: 'round_robin', label: t.tournament.formatRoundRobin },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={`p-3 text-left border text-xs sm:text-sm font-medium transition-colors ${
                    format === f.id
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entrant Type & Default Best-of */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t.tournament.entrantTypeLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleEntrantTypeChange('individual')}
                  className={`py-2 text-center border text-xs sm:text-sm font-medium transition-colors ${
                    entrantType === 'individual'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {t.tournament.entrantIndividual}
                </button>
                <button
                  type="button"
                  onClick={() => handleEntrantTypeChange('team')}
                  className={`py-2 text-center border text-xs sm:text-sm font-medium transition-colors ${
                    entrantType === 'team'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {t.tournament.entrantTeam}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="default-best-of" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t.tournament.defaultBestOfLabel}
              </label>
              <select
                id="default-best-of"
                value={defaultBestOf}
                onChange={(e) => setDefaultBestOf(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-600"
              >
                {BOUNDS.ALLOWED_BEST_OF.map((b) => (
                  <option key={b} value={b}>
                    Best of {b} (First to {Math.floor(b / 2) + 1})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Entrants Editor */}
          <EntrantEditor
            entrants={entrants}
            entrantType={entrantType}
            onChange={setEntrants}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-base transition-colors active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>{t.tournament.creating}</span>
              </>
            ) : (
              <span>{t.tournament.createButton}</span>
            )}
          </button>
        </SpotlightCard>
      )}
    </main>
  );
}

export default TournamentLanding;
