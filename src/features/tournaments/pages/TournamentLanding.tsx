import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarDays, KeyRound, Loader2, Plus, Trophy, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CreateEntrantInput, BOUNDS, TournamentSummary } from '../../../../shared/tournaments/contracts';
import { TournamentFormat, EntrantType } from '../../../../shared/tournaments/types';
import { getRandomDefaultPlayerNames } from '../../../../shared/tournaments/utils';
import { accessTournament, createTournament, listTournaments } from '../api/client';
import { EntrantEditor } from '../components/EntrantEditor';
import { ShareLinks } from '../components/ShareLinks';

const credentialKey = (publicId: string) => `chiabill:tournament-management:${publicId}`;

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={t.tournament.close || 'Close'}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function TournamentLanding() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [accessTarget, setAccessTarget] = useState<TournamentSummary | null>(null);
  const [createdResult, setCreatedResult] = useState<{ adminUrl: string; publicUrl: string } | null>(null);

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

  const handleAccess = async (passphrase: string): Promise<{ ok: boolean; message?: string }> => {
    if (!accessTarget) return { ok: false, message: t.tournament.accessDenied };
    const res = await accessTournament(accessTarget.publicId, passphrase);
    if ('error' in res) {
      const isAuthError = res.error.code === 'INVALID_PASSPHRASE' || res.error.code === 'ACCESS_DENIED';
      return {
        ok: false,
        message: isAuthError ? t.tournament.accessDenied : (res.error.message || t.tournament.accessDenied),
      };
    }
    localStorage.setItem(credentialKey(accessTarget.publicId), res.data.managementToken);
    navigate(res.data.adminUrl);
    return { ok: true };
  };

  const handleManage = (item: TournamentSummary) => {
    const storedToken = localStorage.getItem(credentialKey(item.publicId));
    if (storedToken) { navigate(`/tournaments/manage/${storedToken}`); return; }
    setAccessTarget(item);
  };

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

      {createdResult && <div className="space-y-4"><div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{t.tournament.createButton} ✓</div><ShareLinks adminUrl={createdResult.adminUrl} publicUrl={createdResult.publicUrl} /><div className="flex justify-center"><button type="button" onClick={() => navigate(createdResult.adminUrl)} className="bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">{t.tournament.enterAdminDashboard}</button></div></div>}
      {loadError && <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"><AlertCircle size={18} />{loadError}</div>}
      {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} />Loading...</div> : tournaments.length === 0 ? <EmptyState onCreate={() => setCreateOpen(true)} /> : <div className="space-y-8"><TournamentSection title={t.tournament.ongoing} items={ongoing} onManage={handleManage} /><TournamentSection title={t.tournament.ended} items={ended} onManage={handleManage} /></div>}

      {createOpen && <CreateTournamentModal onClose={() => setCreateOpen(false)} onCreated={(result) => { const publicId = result.publicUrl.split('/').pop(); const managementToken = result.adminUrl.split('/').pop(); if (publicId && managementToken) localStorage.setItem(credentialKey(publicId), managementToken); setCreateOpen(false); setCreatedResult(result); void refresh(); }} />}
      {accessTarget && <AccessModal tournament={accessTarget} onClose={() => setAccessTarget(null)} onSubmit={handleAccess} />}
    </main>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useLanguage();
  return <div className="border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700"><CalendarDays className="mx-auto mb-4 text-blue-500" size={32} /><h2 className="text-lg font-bold">{t.tournament.noTournaments}</h2><p className="mt-2 text-sm text-slate-500">{t.tournament.noTournamentsHint}</p><button type="button" onClick={onCreate} className="mt-6 bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">{t.tournament.createNew}</button></div>;
}

function TournamentSection({ title, items, onManage }: { title: string; items: TournamentSummary[]; onManage: (item: TournamentSummary) => void }) {
  const { t } = useLanguage();
  if (items.length === 0) return null;
  return <section className="space-y-3"><div className="flex items-center gap-3"><h2 className="text-xs font-black uppercase tracking-[.2em] text-slate-500">{title}</h2><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /><span className="text-xs font-bold text-slate-400">{items.length}</span></div><div className="grid gap-3 md:grid-cols-2">{items.map((item) => <article key={item.id} className="group border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-slate-950 dark:text-white">{item.name}</h3><p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">{item.format.replace('_', ' ')}</p></div><span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider ${item.status === 'completed' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>{item.status === 'completed' ? t.tournament.ended : t.tournament.ongoing}</span></div><div className="mt-5 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{new Date(item.updatedAt).toLocaleDateString()}</span><button type="button" onClick={() => onManage(item)} className="inline-flex items-center gap-2 bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-200"><KeyRound size={14} />{t.tournament.manage}</button></div></article>)}</div></section>;
}

function AccessModal({ tournament, onClose, onSubmit }: { tournament: TournamentSummary; onClose: () => void; onSubmit: (passphrase: string) => Promise<{ ok: boolean; message?: string }> }) {
  const { t } = useLanguage();
  const [passphrase, setPassphrase] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passphrase.trim().length < BOUNDS.MIN_MANAGEMENT_PASSPHRASE_LENGTH) {
      setError((t.tournament.passphraseTooShort || 'Management passphrase must be at least {min} characters').replace('{min}', BOUNDS.MIN_MANAGEMENT_PASSPHRASE_LENGTH.toString()));
      return;
    }
    setBusy(true);
    const res = await onSubmit(passphrase);
    setBusy(false);
    if (!res.ok) setError(res.message || t.tournament.accessDenied);
  };
  return <Modal title={t.tournament.accessTournament} onClose={onClose}><form onSubmit={submit} className="space-y-5"><p className="text-sm text-slate-500">{t.tournament.accessHint} <strong className="text-slate-800 dark:text-slate-200">{tournament.name}</strong></p><label className="block space-y-2 text-sm font-semibold"><span>{t.tournament.managementPassphraseLabel}</span><input autoFocus type="password" value={passphrase} onChange={(e) => { setPassphrase(e.target.value); setError(''); }} placeholder={t.tournament.managementPassphrasePlaceholder} className="w-full border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800" /> </label>{error && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={16} />{error}</p>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 bg-blue-700 py-3 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}{busy ? t.tournament.unlocking : t.tournament.unlock}</button></form></Modal>;
}

function CreateTournamentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (result: { adminUrl: string; publicUrl: string }) => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState(''); const [format, setFormat] = useState<TournamentFormat>('single_elimination'); const [entrantType, setEntrantType] = useState<EntrantType>('individual'); const [defaultBestOf, setDefaultBestOf] = useState(3); const [managementPassphrase, setManagementPassphrase] = useState(''); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState('');
  const [entrants, setEntrants] = useState<CreateEntrantInput[]>(() => getRandomDefaultPlayerNames(4).map((n, idx) => ({ name: n, seed: idx + 1, roster: [] })));
  const handleEntrantTypeChange = (type: EntrantType) => { setEntrantType(type); setEntrants(entrants.map((e, idx) => ({ ...e, name: type === 'individual' ? getRandomDefaultPlayerNames(entrants.length)[idx] : `Team ${idx + 1}`, roster: type === 'individual' ? [] : ['Member 1'] }))); };
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
  return <Modal title={t.tournament.createModalTitle} onClose={onClose}><form onSubmit={submit} className="space-y-6">{error && <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} />{error}</div>}<div className="space-y-2"><label htmlFor="tournament-name" className="text-sm font-semibold">{t.tournament.nameLabel} *</label><input id="tournament-name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={BOUNDS.MAX_TOURNAMENT_NAME_LENGTH} placeholder={t.tournament.namePlaceholder} className="w-full border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800" /></div><div className="space-y-2"><label className="text-sm font-semibold">{t.tournament.formatLabel}</label><div className="grid gap-2 sm:grid-cols-3">{([{ id: 'single_elimination', label: t.tournament.formatSingleElimination }, { id: 'double_elimination', label: t.tournament.formatDoubleElimination }, { id: 'round_robin', label: t.tournament.formatRoundRobin }] as const).map((item) => <button key={item.id} type="button" onClick={() => setFormat(item.id)} className={`border p-3 text-left text-xs font-semibold ${format === item.id ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>{item.label}</button>)}</div></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-sm font-semibold">{t.tournament.entrantTypeLabel}</label><div className="grid grid-cols-2 gap-2">{(['individual', 'team'] as const).map((type) => <button key={type} type="button" onClick={() => handleEntrantTypeChange(type)} className={`border py-3 text-xs font-semibold ${entrantType === type ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>{type === 'individual' ? t.tournament.entrantIndividual : t.tournament.entrantTeam}</button>)}</div></div><div className="space-y-2"><label htmlFor="default-best-of" className="text-sm font-semibold">{t.tournament.defaultBestOfLabel}</label><select id="default-best-of" value={defaultBestOf} onChange={(e) => setDefaultBestOf(Number(e.target.value))} className="w-full border border-slate-300 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">{BOUNDS.ALLOWED_BEST_OF.map((b) => <option key={b} value={b}>{(t.tournament.bestOfOption || 'Best of {count}').replace('{count}', b.toString())}</option>)}</select></div></div><div className="space-y-2"><label htmlFor="management-passphrase" className="flex items-center gap-2 text-sm font-semibold"><KeyRound size={16} />{t.tournament.managementPassphraseLabel} *</label><input id="management-passphrase" required minLength={BOUNDS.MIN_MANAGEMENT_PASSPHRASE_LENGTH} type="password" value={managementPassphrase} onChange={(e) => setManagementPassphrase(e.target.value)} placeholder={t.tournament.managementPassphrasePlaceholder} className="w-full border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800" /><p className="text-xs text-slate-500">{t.tournament.managementPassphraseHint}</p></div><div className="border-t border-slate-200 pt-5 dark:border-slate-800"><EntrantEditor entrants={entrants} entrantType={entrantType} onChange={setEntrants} /></div><button disabled={submitting} className="flex w-full items-center justify-center gap-2 bg-blue-700 py-3 text-sm font-bold text-white disabled:opacity-50">{submitting && <Loader2 size={18} className="animate-spin" />}{submitting ? t.tournament.creating : t.tournament.createButton}</button><p className="text-center text-xs text-slate-500">{t.tournament.createModalHint}</p></form></Modal>;
}

export default TournamentLanding;
