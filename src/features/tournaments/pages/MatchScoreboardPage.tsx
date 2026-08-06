import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Edit3, FileText, Lock, RefreshCw, Save, Trophy } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getAdminTournament, getPublicTournament, updateMatch } from '../api/client';
import { AdminTournamentDto, MatchCommand, PublicTournamentDto } from '../../../../shared/tournaments/contracts';
import { Entrant, Match } from '../../../../shared/tournaments/types';
import { BOUNDS } from '../../../../shared/tournaments/contracts';
import { DigitalScore } from '../components/DigitalScore';
import { ScoreConfirmDialog } from '../components/ScoreConfirmDialog';
import { InvalidationModal } from '../components/InvalidationModal';

type Mode = 'admin' | 'public';

interface MatchScoreboardPageProps { mode: Mode }

function getEntrantName(match: Match, entrant: Entrant | null, isA: boolean, byeLabel: string, blockedLabel: string) {
  if (entrant) return entrant.name;
  if (match.state === 'bye') return byeLabel;
  const source = isA ? match.sourceA : match.sourceB;
  if (!source) return blockedLabel;
  if (source.type === 'seed') return `Seed ${source.seed}`;
  if (source.type === 'match_winner') return `Winner of ${source.matchId}`;
  if (source.type === 'match_loser') return `Loser of ${source.matchId}`;
  return blockedLabel;
}

export function MatchScoreboardPage({ mode }: MatchScoreboardPageProps) {
  const { adminToken, publicToken, matchId } = useParams<{ adminToken?: string; publicToken?: string; matchId?: string }>();
  const { t } = useLanguage();
  const token = mode === 'admin' ? adminToken : publicToken;
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [adminDto, setAdminDto] = useState<AdminTournamentDto | null>(null);
  const [publicDto, setPublicDto] = useState<PublicTournamentDto | null>(null);
  const [version, setVersion] = useState(1);
  const [draftA, setDraftA] = useState(0);
  const [draftB, setDraftB] = useState(0);
  const [editingCompleted, setEditingCompleted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingInvalidatedIds, setPendingInvalidatedIds] = useState<string[]>([]);
  const [pendingCommand, setPendingCommand] = useState<MatchCommand | null>(null);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    if (mode === 'admin') {
      const res = await getAdminTournament(token);
      setLoading(false);
      if ('error' in res) {
        setErrorMsg(res.error.message);
        return;
      }
      setAdminDto(res.data);
      setVersion(res.version || 1);
    } else {
      const res = await getPublicTournament(token);
      setLoading(false);
      if ('error' in res) {
        setErrorMsg(res.error.message);
        return;
      }
      setPublicDto(res.data);
    }
  }, [mode, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const aggregate = adminDto?.aggregate;
  const publicMatch = publicDto?.matches.find((match) => match.id === matchId);
  const match: Match | null = aggregate?.matches.find((item) => item.id === matchId) || (publicMatch && publicDto ? {
    ...publicMatch,
    tournamentId: publicDto.id,
    privateNote: null,
  } as Match : null);
  const entrants = aggregate?.entrants || publicDto?.entrants || [];
  const entrantMap = useMemo(() => new Map(entrants.map((entrant) => [entrant.id, entrant])), [entrants]);
  const entrantA = match?.entrantAId ? entrantMap.get(match.entrantAId) || null : null;
  const entrantB = match?.entrantBId ? entrantMap.get(match.entrantBId) || null : null;
  const homeName = match ? getEntrantName(match, entrantA, true, t.tournament.bye, t.tournament.blocked) : '';
  const awayName = match ? getEntrantName(match, entrantB, false, t.tournament.bye, t.tournament.blocked) : '';
  const winsNeeded = match ? Math.floor(match.bestOf / 2) + 1 : 1;
  const isAdmin = mode === 'admin';
  const isCompleted = match?.state === 'completed';
  const editable = isAdmin && match && match.state !== 'blocked' && match.state !== 'bye';
  const canAdjust = editable && (!isCompleted || editingCompleted);
  const backPath = isAdmin ? `/tournaments/manage/${adminToken}` : `/tournaments/view/${publicToken}`;

  useEffect(() => {
    if (!match) return;
    setDraftA(match.scoreA ?? 0);
    setDraftB(match.scoreB ?? 0);
    setNote(match.privateNote || '');
    setEditingCompleted(false);
  }, [match?.id, match?.scoreA, match?.scoreB, match?.privateNote]);

  const applyAdminCommand = async (command: MatchCommand, confirmedIds?: string[]) => {
    if (!adminToken || !match) return;
    const result = await updateMatch(adminToken, match.id, { expectedVersion: version, command, confirmInvalidation: confirmedIds });
    if ('error' in result) {
      if (result.error.code === 'INVALIDATION_CONFIRMATION_REQUIRED' && result.error.fields?.invalidatedMatchIds) {
        try {
          const parsed = JSON.parse(result.error.fields.invalidatedMatchIds);
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
            setPendingCommand(command);
            setPendingInvalidatedIds(parsed);
            return false;
          }
        } catch {
          // Fallthrough to generic error handler
        }
        setErrorMsg(result.error.message);
      } else if (result.error.code === 'STALE_VERSION') {
        setErrorMsg(result.error.message);
        fetchData();
      } else setErrorMsg(result.error.message);
      return false;
    }
    setAdminDto(result.data);
    setVersion(result.version || version);
    return true;
  };

  const changeScore = async (side: 'A' | 'B', delta: number) => {
    if (!match || !canAdjust) return;
    const isRoundRobin = match.side === 'round_robin';
    const limitA = isRoundRobin ? Math.max(0, draftA + delta) : Math.max(0, Math.min(winsNeeded, draftA + delta));
    const limitB = isRoundRobin ? Math.max(0, draftB + delta) : Math.max(0, Math.min(winsNeeded, draftB + delta));
    const nextA = side === 'A' ? limitA : draftA;
    const nextB = side === 'B' ? limitB : draftB;
    if (isCompleted || editingCompleted) {
      setDraftA(nextA);
      setDraftB(nextB);
      return;
    }
    const ok = await applyAdminCommand({ type: 'saveDraftScore', scoreA: nextA, scoreB: nextB });
    if (ok) { setDraftA(nextA); setDraftB(nextB); }
  };

  const beginEdit = () => {
    if (!match) return;
    setDraftA(match.scoreA ?? 0);
    setDraftB(match.scoreB ?? 0);
    setEditingCompleted(true);
  };

  const confirmScore = async () => {
    setConfirmOpen(false);
    if (!match) return;
    const ok = await applyAdminCommand({ type: 'completeResult', scoreA: draftA, scoreB: draftB });
    if (ok) setEditingCompleted(false);
  };

  const saveNote = async () => {
    const ok = await applyAdminCommand({ type: 'updatePrivateNote', note: note.trim() || null });
    if (ok) setNoteOpen(false);
  };

  if (loading) return <div className="py-16 text-center"><RefreshCw size={28} className="animate-spin text-amber-600 mx-auto" /><p className="mt-3 text-sm text-slate-500">{t.loading}</p></div>;
  if (errorMsg || !match || (!adminDto && !publicDto)) {
    return <div className="scoreboard-error"><h1>{t.tournament.notFoundTitle}</h1><p>{errorMsg || t.tournament.notFoundHint}</p><button type="button" onClick={fetchData}>{t.retry}</button></div>;
  }

  const statusLabel = isCompleted ? t.tournament.completed : match.state === 'draft' ? t.tournament.draftScore : match.state === 'ready' ? t.tournament.ready : t.tournament.blocked;
  const canConfirm = editable && (match.side === 'round_robin' ? draftA !== draftB : Math.max(draftA, draftB) === winsNeeded && draftA !== draftB);

  return (
    <main className="match-scoreboard-page">
      <div className="match-scoreboard-page__topline">
        <Link to={backPath} className="scoreboard-back"><ArrowLeft size={16} aria-hidden="true" />{t.tournament.backToTournament}</Link>
        <button type="button" onClick={fetchData} className="scoreboard-refresh"><RefreshCw size={15} aria-hidden="true" />{t.tournament.refresh}</button>
      </div>
      <section className="scoreboard-shell" aria-labelledby="match-scoreboard-title">
        <div className="scoreboard-shell__lights" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
        <header className="scoreboard-shell__header">
          <div><p className="scoreboard-kicker">{t.tournament.scoreboardLabel}</p><h1 id="match-scoreboard-title">{adminDto?.aggregate.tournament.name || publicDto?.name}</h1></div>
          <div className={`scoreboard-status scoreboard-status--${match.state}`}><span />{statusLabel}</div>
        </header>
        <div className="scoreboard-meta"><span>{match.side.replace('_', ' ')}</span><span>R{match.round} / M{match.position}</span><span>BO{match.bestOf} · {t.tournament.firstTo} {winsNeeded}</span></div>
        <div className="scoreboard-players">
          <div className="scoreboard-player scoreboard-player--home">
            <p className="scoreboard-player__role">{t.tournament.home}</p><h2>{homeName}</h2>{entrantA && <span>#{entrantA.seed}</span>}
            <DigitalScore value={isAdmin ? draftA : match.scoreA} label={t.tournament.home} accent="home" />
            {canAdjust && <div className="scoreboard-controls"><button type="button" onClick={() => changeScore('A', -1)} aria-label={`${t.tournament.decreaseScore} ${homeName}`}><ChevronDown size={22} /></button><button type="button" onClick={() => changeScore('A', 1)} aria-label={`${t.tournament.increaseScore} ${homeName}`}><ChevronUp size={22} /></button></div>}
          </div>
          <div className="scoreboard-versus" aria-hidden="true"><span>VS</span><i /></div>
          <div className="scoreboard-player scoreboard-player--away">
            <p className="scoreboard-player__role">{t.tournament.away}</p><h2>{awayName}</h2>{entrantB && <span>#{entrantB.seed}</span>}
            <DigitalScore value={isAdmin ? draftB : match.scoreB} label={t.tournament.away} accent="away" />
            {canAdjust && <div className="scoreboard-controls"><button type="button" onClick={() => changeScore('B', -1)} aria-label={`${t.tournament.decreaseScore} ${awayName}`}><ChevronDown size={22} /></button><button type="button" onClick={() => changeScore('B', 1)} aria-label={`${t.tournament.increaseScore} ${awayName}`}><ChevronUp size={22} /></button></div>}
          </div>
        </div>
        {isAdmin && editable && (
          <div className="scoreboard-actionbar">
            <div className="scoreboard-actionbar__hint">{isCompleted ? t.tournament.editingCompletedScore : match.state === 'draft' ? t.tournament.draftSaved : t.tournament.adjustScoreHint}</div>
            {isCompleted && !editingCompleted ? <button type="button" onClick={beginEdit} className="score-button score-button--quiet"><Edit3 size={15} />{t.actions.recalculate}</button> : <button type="button" disabled={!canConfirm} onClick={() => setConfirmOpen(true)} className="score-button score-button--confirm"><Save size={15} />{t.tournament.saveResult}</button>}
          </div>
        )}
        {isAdmin && (
          <div className="scoreboard-tools">
            <button type="button" onClick={() => setNoteOpen(!noteOpen)} className="score-tool"><FileText size={15} />{t.tournament.notes}{match.privateNote ? <Check size={13} /> : null}</button>
            {noteOpen && <div className="score-note"><div><Lock size={13} />{t.tournament.notes}</div><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={BOUNDS.MAX_NOTE_LENGTH} placeholder={t.tournament.notePlaceholder} /><button type="button" onClick={saveNote} className="score-button score-button--confirm">{t.tournament.saveNote}</button></div>}
          </div>
        )}
        {isCompleted && match.winnerId && <div className="scoreboard-winner"><Trophy size={16} />{t.tournament.winner}: {match.winnerId === match.entrantAId ? homeName : awayName}</div>}
      </section>
      <ScoreConfirmDialog isOpen={confirmOpen} homeName={homeName} awayName={awayName} scoreA={draftA} scoreB={draftB} onConfirm={confirmScore} onCancel={() => setConfirmOpen(false)} />
      <InvalidationModal isOpen={pendingInvalidatedIds.length > 0} invalidatedCount={pendingInvalidatedIds.length} onConfirm={() => { if (pendingCommand) applyAdminCommand(pendingCommand, pendingInvalidatedIds); setPendingInvalidatedIds([]); setPendingCommand(null); }} onCancel={() => { setPendingInvalidatedIds([]); setPendingCommand(null); }} />
    </main>
  );
}

export function MatchAdminScoreboardPage() { return <MatchScoreboardPage mode="admin" />; }
export function MatchPublicScoreboardPage() { return <MatchScoreboardPage mode="public" />; }

export default MatchScoreboardPage;
