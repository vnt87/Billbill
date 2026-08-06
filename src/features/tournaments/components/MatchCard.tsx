import { useState, useEffect, useRef } from 'react';
import { Match, Entrant } from '../../../../shared/tournaments/types';
import { BOUNDS } from '../../../../shared/tournaments/contracts';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SpotlightCard } from '../../../components/ui/SpotlightCard';
import { Check, Edit2, FileText, Lock, Share2, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MatchCardProps {
  match: Match;
  entrants: Entrant[];
  readOnly?: boolean;
  onCompleteResult?: (matchId: string, scoreA: number, scoreB: number, winnerId?: string) => void;
  onClearResult?: (matchId: string) => void;
  onSaveDraft?: (matchId: string, scoreA: number | null, scoreB: number | null) => void;
  onUpdateNote?: (matchId: string, note: string | null) => void;
  onOverrideBestOf?: (matchId: string, bestOf: number) => void;
  detailHref?: string;
  shareHref?: string;
  matchNumber?: number;
  showMatchNumberOnLeft?: boolean;
}

export function MatchCard({
  match,
  entrants,
  readOnly = false,
  onCompleteResult,
  onClearResult,
  onUpdateNote,
  onOverrideBestOf,
  detailHref,
  shareHref,
  matchNumber,
  showMatchNumberOnLeft = false,
}: MatchCardProps) {
  const { t } = useLanguage();
  const entrantMap = new Map(entrants.map((e) => [e.id, e]));

  const entrantA = match.entrantAId ? entrantMap.get(match.entrantAId) || null : null;
  const entrantB = match.entrantBId ? entrantMap.get(match.entrantBId) || null : null;

  const [isEditing, setIsEditing] = useState(false);
  const [scoreA, setScoreA] = useState<number | ''>(match.scoreA ?? 0);
  const [scoreB, setScoreB] = useState<number | ''>(match.scoreB ?? 0);
  const [note, setNote] = useState<string>(match.privateNote || '');
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [copiedMatchLink, setCopiedMatchLink] = useState(false);
  const focusedScore = useRef<'A' | 'B'>('A');
  const scoreAInputRef = useRef<HTMLInputElement>(null);
  const scoreBInputRef = useRef<HTMLInputElement>(null);

  const targetShareUrl = shareHref;

  const handleShareMatch = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!targetShareUrl) return;

    const fullUrl = window.location.origin + targetShareUrl;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        setCopiedMatchLink(true);
        setTimeout(() => setCopiedMatchLink(false), 2000);
      } else {
        const input = document.createElement('input');
        input.value = fullUrl;
        document.body.appendChild(input);
        try {
          input.select();
          const success = document.execCommand('copy');
          if (success) {
            setCopiedMatchLink(true);
            setTimeout(() => setCopiedMatchLink(false), 2000);
          }
        } finally {
          document.body.removeChild(input);
        }
      }
    } catch (err) {
      console.error('Failed to copy match URL:', err);
    }
  };

  const winsNeeded = Math.floor(match.bestOf / 2) + 1;
  const scoreChanged =
    scoreA !== (match.scoreA ?? 0) ||
    scoreB !== (match.scoreB ?? 0);

  useEffect(() => {
    setScoreA(match.scoreA ?? 0);
    setScoreB(match.scoreB ?? 0);
    setNote(match.privateNote || '');
  }, [match.scoreA, match.scoreB, match.privateNote, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const input = focusedScore.current === 'A' ? scoreAInputRef.current : scoreBInputRef.current;
    input?.focus();
    input?.select();
  }, [isEditing]);

  const getEntrantName = (entrant: Entrant | null, isA: boolean) => {
    if (entrant) return entrant.name;
    if (match.state === 'bye') return t.tournament.bye;
    const source = isA ? match.sourceA : match.sourceB;
    if (source.type === 'seed') return `Seed ${source.seed}`;
    if (source.type === 'match_winner') return `Winner of M_${source.matchId.split('_').slice(-2).join('_')}`;
    if (source.type === 'match_loser') return `Loser of M_${source.matchId.split('_').slice(-2).join('_')}`;
    return t.tournament.blocked;
  };

  const handleSaveScore = () => {
    if (!scoreChanged || scoreA === '' || scoreB === '') return;
    const valA = Number(scoreA);
    const valB = Number(scoreB);
    if (isNaN(valA) || isNaN(valB) || !Number.isInteger(valA) || !Number.isInteger(valB)) return;
    if (valA < 0 || valA > winsNeeded || valB < 0 || valB > winsNeeded) return;

    if (onCompleteResult) {
      onCompleteResult(match.id, valA, valB);
      setIsEditing(false);
    }
  };

  const handleClear = () => {
    if (onClearResult) {
      onClearResult(match.id);
      setScoreA(0);
      setScoreB(0);
      setIsEditing(false);
    }
  };

  const handleSaveNote = () => {
    if (onUpdateNote) {
      onUpdateNote(match.id, note.trim() || null);
      setShowNoteEditor(false);
    }
  };

  const cardContent = (
    <SpotlightCard className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-2.5 space-y-2 text-xs sm:text-sm min-w-[220px] max-w-[320px] rounded-none transition-all">
      {/* Header Info */}
      <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {detailHref ? (
          <Link to={detailHref} className="truncate uppercase tracking-wider hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
            {match.side.replace('_', ' ')} • R{match.round} M{match.position}
          </Link>
        ) : (
          <span className="truncate uppercase tracking-wider">{match.side.replace('_', ' ')} • R{match.round} M{match.position}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {targetShareUrl && (
            <button
              type="button"
              onClick={handleShareMatch}
              className={`p-1 transition-colors ${
                copiedMatchLink
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={copiedMatchLink ? (t.tournament.copiedMatchLink || 'Copied!') : (t.tournament.shareMatch || 'Share Match')}
              aria-label={t.tournament.shareMatch || 'Share Match'}
            >
              {copiedMatchLink ? <Check size={12} className="text-emerald-500" /> : <Share2 size={12} />}
            </button>
          )}
          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono">
            BO{match.bestOf}
          </span>
        </div>
      </div>

      {/* Entrants & Scores List */}
      <div className="space-y-1">
        {/* Entrant A */}
        <div
          className={`flex items-center justify-between border transition-colors overflow-hidden ${
            match.winnerId && match.winnerId === match.entrantAId
              ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 font-semibold'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 px-2 py-1.5 truncate min-w-0 flex-1">
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 w-4 text-center shrink-0">
              {entrantA ? entrantA.seed : '-'}
            </span>
            <span className="truncate text-slate-800 dark:text-slate-200">{getEntrantName(entrantA, true)}</span>
            {match.winnerId && match.winnerId === match.entrantAId && (
              <Trophy size={13} className="text-amber-500 dark:text-amber-400 shrink-0 ml-auto" />
            )}
          </div>
          <div
            onClick={() => {
              if (readOnly || match.state === 'blocked' || match.state === 'bye') return;
              focusedScore.current = 'A';
              setIsEditing(true);
            }}
            className={`w-9 py-1.5 text-center font-mono font-bold text-xs shrink-0 ${
              match.winnerId && match.winnerId === match.entrantAId
                ? 'bg-amber-500 text-white font-black'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            } ${!readOnly && match.state !== 'blocked' && match.state !== 'bye' ? 'cursor-pointer' : ''}`}
          >
            {!readOnly && isEditing ? (
              <input
                ref={scoreAInputRef}
                type="number"
                min={0}
                max={winsNeeded}
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value === '' ? '' : Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                aria-label={`${getEntrantName(entrantA, true)} score`}
                className="w-full bg-transparent text-center font-inherit outline-none"
              />
            ) : (match.scoreA ?? 0)}
          </div>
        </div>

        {/* Entrant B */}
        <div
          className={`flex items-center justify-between border transition-colors overflow-hidden ${
            match.winnerId && match.winnerId === match.entrantBId
              ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 font-semibold'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 px-2 py-1.5 truncate min-w-0 flex-1">
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 w-4 text-center shrink-0">
              {entrantB ? entrantB.seed : '-'}
            </span>
            <span className="truncate text-slate-800 dark:text-slate-200">{getEntrantName(entrantB, false)}</span>
            {match.winnerId && match.winnerId === match.entrantBId && (
              <Trophy size={13} className="text-amber-500 dark:text-amber-400 shrink-0 ml-auto" />
            )}
          </div>
          <div
            onClick={() => {
              if (readOnly || match.state === 'blocked' || match.state === 'bye') return;
              focusedScore.current = 'B';
              setIsEditing(true);
            }}
            className={`w-9 py-1.5 text-center font-mono font-bold text-xs shrink-0 ${
              match.winnerId && match.winnerId === match.entrantBId
                ? 'bg-amber-500 text-white font-black'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            } ${!readOnly && match.state !== 'blocked' && match.state !== 'bye' ? 'cursor-pointer' : ''}`}
          >
            {!readOnly && isEditing ? (
              <input
                ref={scoreBInputRef}
                type="number"
                min={0}
                max={winsNeeded}
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value === '' ? '' : Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                aria-label={`${getEntrantName(entrantB, false)} score`}
                className="w-full bg-transparent text-center font-inherit outline-none"
              />
            ) : (match.scoreB ?? 0)}
          </div>
        </div>
      </div>

      {/* Admin Action Bar */}
      {!readOnly && match.state !== 'bye' && (
        <div className="pt-1 space-y-2 border-t border-slate-100 dark:border-slate-800">
          {!isEditing ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={match.state === 'blocked'}
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1 transition-colors active:scale-95"
              >
                <Edit2 size={12} />
                <span>{match.state === 'completed' ? t.actions.recalculate : t.tournament.saveResult}</span>
              </button>

              <div className="flex items-center gap-1">
                {onOverrideBestOf && (
                  <select
                    value={match.bestOf}
                    onChange={(e) => onOverrideBestOf(match.id, Number(e.target.value))}
                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[11px] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
                    title={t.tournament.overrideBestOf}
                  >
                    {BOUNDS.ALLOWED_BEST_OF.map((b) => (
                      <option key={b} value={b}>
                        BO{b}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setShowNoteEditor(!showNoteEditor)}
                  className={`p-1 text-xs border transition-colors ${
                    match.privateNote
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                  title={t.tournament.notes}
                >
                  <FileText size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/80 p-2 border border-blue-200 dark:border-blue-900">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Edit Score (First to {winsNeeded}):
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!scoreChanged}
                  onClick={handleSaveScore}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Check size={12} />
                  <span>{t.tournament.saveResult}</span>
                </button>
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1">
                {match.state === 'completed' && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-red-600 dark:text-red-400 hover:underline font-medium"
                  >
                    {t.tournament.clearResult}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-500 hover:underline ml-auto"
                >
                  {t.tournament.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Private Note Editor */}
          {showNoteEditor && (
            <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                <Lock size={10} />
                <span>{t.tournament.notes}</span>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={BOUNDS.MAX_NOTE_LENGTH}
                placeholder={t.tournament.notePlaceholder}
                className="w-full p-2 text-xs bg-amber-50/50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                rows={2}
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowNoteEditor(false)}
                  className="px-2 py-0.5 text-xs text-slate-500 hover:underline"
                >
                  {t.tournament.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
                >
                  {t.tournament.saveNote}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </SpotlightCard>
  );

  if (showMatchNumberOnLeft && matchNumber !== undefined) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-4 text-right font-mono text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0">
          {matchNumber}
        </span>
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
