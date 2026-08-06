import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarDays, KeyRound, Loader2, Plus, Trophy, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CreateEntrantInput, BOUNDS, TournamentSummary } from '../../../../shared/tournaments/contracts';
import { TournamentFormat, EntrantType } from '../../../../shared/tournaments/types';
import { getRandomDefaultPlayerNames } from '../../../../shared/tournaments/utils';
import { createTournament, listTournaments } from '../api/client';
import { EntrantEditor } from '../components/EntrantEditor';

const credentialKey = (publicId: string) => `chiabill:tournament-management:${publicId}`;

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { t } = useLanguage();
  return createPortal((
    <div data-testid="modal-backdrop" className="fixed left-0 top-0 z-[100] flex h-[100dvh] w-screen items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <h2 className="text-base font-bold tracking-tight text-slate-950 dark:text-white sm:text-lg">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={t.tournament.close || 'Close'}>
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  ), document.body);
}

export function TournamentLanding() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const res = await listTournaments();
    setLoading(false);
    if ('error' in res) setLoadError(res.error.message);
    else { setLoadError(null); setTournaments(res.data.tournaments); }
  };

  useEffect(() => { void refresh(); }, []);

  const ongoing = useMemo(() => tournaments.filter((item) => item.status !== 'completed'), [tournaments]);
  const ended = useMemo(() => tournaments.filter((item) => item.status === 'completed'), [tournaments]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 py-8">
      <section className="relative overflow-hidden border border-slate-800 bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[30px] border-blue-500/20" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-blue-300"><Trophy size={16} /> {t.tournament.title}</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{t.tournament.hubTitle}</h1>
            <p className="max-w-md text-sm leading-6 text-slate-300">{t.tournament.hubSubtitle}</p>
          </div>
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 bg-blue-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-400 active:scale-[.98]"><Plus size={18} />{t.tournament.createNew}</button>
        </div>
      </section>

      {loadError && <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"><AlertCircle size={18} />{loadError}</div>}
      {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} />Loading...</div> : tournaments.length === 0 ? <EmptyState onCreate={() => setCreateOpen(true)} /> : <div className="space-y-8"><TournamentSection title={t.tournament.ongoing} items={ongoing} /><TournamentSection title={t.tournament.ended} items={ended} /></div>}

      {createOpen && <CreateTournamentModal onClose={() => setCreateOpen(false)} onCreated={(result) => { const publicId = result.publicUrl.split('/').pop(); const managementToken = result.adminUrl.split('/').pop(); if (publicId && managementToken) localStorage.setItem(credentialKey(publicId), managementToken); setCreateOpen(false); navigate(result.adminUrl); }} />}
    </main>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useLanguage();
  return <div className="border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700"><CalendarDays className="mx-auto mb-4 text-blue-500" size={32} /><h2 className="text-lg font-bold">{t.tournament.noTournaments}</h2><p className="mt-2 text-sm text-slate-500">{t.tournament.noTournamentsHint}</p><button type="button" onClick={onCreate} className="mt-6 bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">{t.tournament.createNew}</button></div>;
}

function TournamentSection({ title, items }: { title: string; items: TournamentSummary[] }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  if (items.length === 0) return null;
  return <section className="space-y-3"><div className="flex items-center gap-3"><h2 className="text-xs font-black uppercase tracking-[.2em] text-slate-500">{title}</h2><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /><span className="text-xs font-bold text-slate-400">{items.length}</span></div><div className="grid gap-3 md:grid-cols-2">{items.map((item) => <article key={item.id} onClick={() => navigate(`/tournaments/view/${item.publicId}`)} className="group cursor-pointer border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-slate-950 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{item.name}</h3><p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">{item.format.replace('_', ' ')}</p></div><span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider ${item.status === 'completed' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>{item.status === 'completed' ? t.tournament.ended : t.tournament.ongoing}</span></div><div className="mt-5 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{new Date(item.updatedAt).toLocaleDateString()}</span></div></article>)}</div></section>;
}

function CreateTournamentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (result: { adminUrl: string; publicUrl: string }) => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('single_elimination');
  const [entrantType, setEntrantType] = useState<EntrantType>('individual');
  const [defaultBestOf, setDefaultBestOf] = useState(3);
  const [managementPassphrase, setManagementPassphrase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [entrants, setEntrants] = useState<CreateEntrantInput[]>(() =>
    getRandomDefaultPlayerNames(4).map((n, idx) => ({ name: n, seed: idx + 1, roster: [] }))
  );

  const handleEntrantTypeChange = (type: EntrantType) => {
    setEntrantType(type);
    const randomNames = getRandomDefaultPlayerNames(entrants.length);
    setEntrants(entrants.map((entrant, idx) => ({
      ...entrant,
      name: type === 'individual' ? randomNames[idx] : `Team ${idx + 1}`,
      roster: type === 'individual' ? [] : ['Member 1'],
    })));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (managementPassphrase.trim().length < BOUNDS.MIN_MANAGEMENT_PASSPHRASE_LENGTH) {
      setError((t.tournament.passphraseTooShort || 'Management passphrase must be at least {min} characters').replace('{min}', BOUNDS.MIN_MANAGEMENT_PASSPHRASE_LENGTH.toString()));
      return;
    }
    setSubmitting(true);
    const res = await createTournament({ name, format, entrantType, defaultBestOf, entrants, managementPassphrase });
    setSubmitting(false);
    if ('error' in res) setError(res.error.message);
    else onCreated({ adminUrl: res.data.adminUrl, publicUrl: res.data.publicUrl });
  };

  return (
    <Modal title={t.tournament.createModalTitle} onClose={onClose}>
      <form onSubmit={submit} className="space-y-6">
        {error && <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} />{error}</div>}
        <div data-testid="create-tournament-layout" className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="tournament-name" className="whitespace-nowrap text-xs font-semibold">{t.tournament.nameLabel} <span className="text-red-600" aria-hidden="true">*</span></label>
              <input id="tournament-name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={BOUNDS.MAX_TOURNAMENT_NAME_LENGTH} placeholder={t.tournament.namePlaceholder} className="w-full border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800" />
            </div>

            <div className="space-y-2">
              <label className="whitespace-nowrap text-xs font-semibold">{t.tournament.formatLabel}</label>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {([{ id: 'single_elimination', label: t.tournament.formatSingleElimination }, { id: 'double_elimination', label: t.tournament.formatDoubleElimination }, { id: 'round_robin', label: t.tournament.formatRoundRobin }] as const).map((item) => (
                  <button key={item.id} type="button" onClick={() => setFormat(item.id)} className={`min-h-11 border p-2 text-left text-[10px] font-semibold leading-tight ${format === item.id ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>{item.label}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="space-y-2">
                <label className="whitespace-nowrap text-xs font-semibold">{t.tournament.entrantTypeLabel}</label>
                <div className="grid grid-cols-2 gap-2">{(['individual', 'team'] as const).map((type) => <button key={type} type="button" onClick={() => handleEntrantTypeChange(type)} className={`border py-3 text-xs font-semibold ${entrantType === type ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>{type === 'individual' ? t.tournament.entrantIndividual : t.tournament.entrantTeam}</button>)}</div>
              </div>
              <div className="space-y-2">
                <label htmlFor="default-best-of" className="whitespace-nowrap text-xs font-semibold">{t.tournament.defaultBestOfLabel}</label>
                <select id="default-best-of" value={defaultBestOf} onChange={(e) => setDefaultBestOf(Number(e.target.value))} className="w-full border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-800">{BOUNDS.ALLOWED_BEST_OF.map((b) => <option key={b} value={b}>{(t.tournament.bestOfOption || 'Best of {count}').replace('{count}', b.toString())}</option>)}</select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="management-passphrase" className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold"><KeyRound size={15} />{t.tournament.managementPassphraseLabel} <span className="text-red-600" aria-hidden="true">*</span></label>
              <input id="management-passphrase" required minLength={BOUNDS.MIN_MANAGEMENT_PASSPHRASE_LENGTH} type="password" value={managementPassphrase} onChange={(e) => setManagementPassphrase(e.target.value)} placeholder={t.tournament.managementPassphrasePlaceholder} className="w-full border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800" />
              <p className="text-xs text-slate-500">{t.tournament.managementPassphraseHint}</p>
            </div>
          </div>

          <div className="min-w-0 border-t border-slate-200 pt-5 dark:border-slate-800 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <EntrantEditor entrants={entrants} entrantType={entrantType} onChange={setEntrants} />
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 bg-blue-700 py-3 text-sm font-bold text-white disabled:opacity-50">{submitting && <Loader2 size={18} className="animate-spin" />}{submitting ? t.tournament.creating : t.tournament.createButton}</button>
          <p className="text-center text-xs text-slate-500">{t.tournament.createModalHint}</p>
        </div>
      </form>
    </Modal>
  );
}

export default TournamentLanding;
