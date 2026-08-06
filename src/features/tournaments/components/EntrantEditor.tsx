import { useLanguage } from '../../../contexts/LanguageContext';
import { CreateEntrantInput, BOUNDS } from '../../../../shared/tournaments/contracts';
import { EntrantType } from '../../../../shared/tournaments/types';
import { HARDCODED_PLAYER_NAMES } from '../../../../shared/tournaments/utils';
import { SpotlightCard } from '../../../components/ui/SpotlightCard';
import { Plus, Trash2, Shuffle, Users, User } from 'lucide-react';

interface EntrantEditorProps {
  entrants: CreateEntrantInput[];
  entrantType: EntrantType;
  onChange: (entrants: CreateEntrantInput[]) => void;
}

export function EntrantEditor({ entrants, entrantType, onChange }: EntrantEditorProps) {
  const { t } = useLanguage();

  const handleNameChange = (index: number, name: string) => {
    const next = [...entrants];
    next[index] = { ...next[index], name };
    onChange(next);
  };

  const handleAddEntrant = () => {
    if (entrants.length >= BOUNDS.MAX_ENTRANTS) return;
    const newSeed = entrants.length + 1;

    let defaultName = `Team ${newSeed}`;
    if (entrantType === 'individual') {
      const usedNames = new Set(entrants.map((e) => e.name));
      const unusedNames = HARDCODED_PLAYER_NAMES.filter((n) => !usedNames.has(n));
      if (unusedNames.length > 0) {
        defaultName = unusedNames[Math.floor(Math.random() * unusedNames.length)];
      } else {
        defaultName = `Player ${newSeed}`;
      }
    }

    const defaultRoster = entrantType === 'team' ? ['Member 1'] : [];
    onChange([...entrants, { name: defaultName, seed: newSeed, roster: defaultRoster }]);
  };

  const handleRemoveEntrant = (index: number) => {
    if (entrants.length <= BOUNDS.MIN_ENTRANTS) return;
    const next = entrants.filter((_, i) => i !== index).map((e, idx) => ({ ...e, seed: idx + 1 }));
    onChange(next);
  };

  const handleRandomize = () => {
    const shuffled = [...entrants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const reseeded = shuffled.map((e, idx) => ({ ...e, seed: idx + 1 }));
    onChange(reseeded);
  };

  const handleRosterChange = (entrantIndex: number, memberIndex: number, value: string) => {
    const next = [...entrants];
    const roster = [...(next[entrantIndex].roster || [])];
    roster[memberIndex] = value;
    next[entrantIndex] = { ...next[entrantIndex], roster };
    onChange(next);
  };

  const handleAddRosterMember = (entrantIndex: number) => {
    const next = [...entrants];
    const roster = [...(next[entrantIndex].roster || [])];
    roster.push(`Member ${roster.length + 1}`);
    next[entrantIndex] = { ...next[entrantIndex], roster };
    onChange(next);
  };

  const handleRemoveRosterMember = (entrantIndex: number, memberIndex: number) => {
    const next = [...entrants];
    const roster = [...(next[entrantIndex].roster || [])];
    if (roster.length <= 1) return;
    roster.splice(memberIndex, 1);
    next[entrantIndex] = { ...next[entrantIndex], roster };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
          {entrantType === 'individual' ? <User size={18} /> : <Users size={18} />}
          <span className="truncate">{t.tournament.entrantsLabel} ({entrants.length}/{BOUNDS.MAX_ENTRANTS})</span>
        </div>
        <button
          type="button"
          onClick={handleRandomize}
          className="shrink-0 whitespace-nowrap px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium flex items-center gap-1.5 transition-colors active:scale-95"
        >
          <Shuffle size={14} />
          <span>{t.tournament.randomizeSeeds}</span>
        </button>
      </div>

      <div className="space-y-3">
        {entrants.map((entrant, idx) => (
          <SpotlightCard
            key={idx}
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 rounded-none"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 text-center text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                #{entrant.seed}
              </span>
              <input
                type="text"
                value={entrant.name}
                onChange={(e) => handleNameChange(idx, e.target.value)}
                maxLength={BOUNDS.MAX_NAME_LENGTH}
                placeholder={entrantType === 'individual' ? `Player ${idx + 1}` : `Team ${idx + 1}`}
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleRemoveEntrant(idx)}
                disabled={entrants.length <= BOUNDS.MIN_ENTRANTS}
                className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-40 transition-colors"
                title="Remove entrant"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Team Roster Sub-editor */}
            {entrantType === 'team' && (
              <div className="ml-8 space-y-1.5 pl-3 border-l-2 border-slate-200 dark:border-slate-800">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t.tournament.rosterLabel}
                </div>
                {(entrant.roster || []).map((member, mIdx) => (
                  <div key={mIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={member}
                      onChange={(e) => handleRosterChange(idx, mIdx, e.target.value)}
                      maxLength={BOUNDS.MAX_NAME_LENGTH}
                      placeholder={`Member ${mIdx + 1}`}
                      className="flex-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                    />
                    {(entrant.roster || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRosterMember(idx, mIdx)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddRosterMember(idx)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1"
                >
                  <Plus size={12} />
                  <span>{t.tournament.addRosterMember}</span>
                </button>
              </div>
            )}
          </SpotlightCard>
        ))}
      </div>

      {entrants.length < BOUNDS.MAX_ENTRANTS && (
        <button
          type="button"
          onClick={handleAddEntrant}
          className="w-full py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
        >
          <Plus size={16} />
          <span>{t.tournament.addEntrant}</span>
        </button>
      )}
    </div>
  );
}
