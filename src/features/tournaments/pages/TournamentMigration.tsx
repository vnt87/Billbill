import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { migrateTournament } from '../api/client';

export function TournamentMigration() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { legacyToken = '' } = useParams<{ legacyToken: string }>();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passphrase.trim().length < 4) { setError(t.tournament.managementPassphraseHint); return; }
    setBusy(true);
    const res = await migrateTournament(legacyToken, passphrase);
    setBusy(false);
    if ('error' in res) { setError(res.error.message); return; }
    navigate(res.data.adminUrl);
  };

  return <main className="mx-auto max-w-lg py-16"><div className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-6 flex h-12 w-12 items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><KeyRound /></div><h1 className="text-2xl font-black tracking-tight">{t.tournament.migrationTitle}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{t.tournament.migrationHint}</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block space-y-2 text-sm font-semibold"><span>{t.tournament.managementPassphraseLabel}</span><input autoFocus type="password" value={passphrase} onChange={(e) => { setPassphrase(e.target.value); setError(''); }} placeholder={t.tournament.managementPassphrasePlaceholder} className="w-full border border-slate-300 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></label>{error && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={16} />{error}</p>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 bg-blue-700 py-3 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}{busy ? t.tournament.migrating : t.tournament.migrate}</button></form></div></main>;
}

export default TournamentMigration;
