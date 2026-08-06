import { Match, Entrant, BracketSide } from '../../../../shared/tournaments/types';
import { MatchCard } from './MatchCard';
import { BracketConnector } from './BracketConnector';
import { useLanguage } from '../../../contexts/LanguageContext';

interface BracketBoardProps {
  matches: Match[];
  entrants: Entrant[];
  readOnly?: boolean;
  onCompleteResult?: (matchId: string, scoreA: number, scoreB: number, winnerId?: string) => void;
  onClearResult?: (matchId: string) => void;
  onUpdateNote?: (matchId: string, note: string | null) => void;
  onOverrideBestOf?: (matchId: string, bestOf: number) => void;
  matchHref?: (match: Match) => string;
}

export function BracketBoard({
  matches,
  entrants,
  readOnly = false,
  onCompleteResult,
  onClearResult,
  onUpdateNote,
  onOverrideBestOf,
  matchHref,
}: BracketBoardProps) {
  const { t } = useLanguage();
  const isRoundRobin = matches.some((m) => m.side === 'round_robin');
  const isDoubleElimination = matches.some((m) => m.side === 'losers');

  // Pre-calculate global sequential match numbers
  const matchNumberMap = new Map<string, number>();
  const sidePriority: Record<BracketSide, number> = {
    winners: 1,
    losers: 2,
    grand_final: 3,
    round_robin: 4,
  };
  const sortedMatches = [...matches].sort((a, b) => {
    const sideA = sidePriority[a.side] || 99;
    const sideB = sidePriority[b.side] || 99;
    if (sideA !== sideB) return sideA - sideB;
    if (a.round !== b.round) return a.round - b.round;
    return a.position - b.position;
  });
  sortedMatches.forEach((m, idx) => {
    matchNumberMap.set(m.id, idx + 1);
  });

  const renderSideBracket = (side: BracketSide, title: string) => {
    const sideMatches = matches.filter((m) => m.side === side);
    if (sideMatches.length === 0) return null;

    const maxRound = Math.max(...sideMatches.map((m) => m.round));
    const roundArray = Array.from({ length: maxRound }, (_, i) => i + 1);

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-bold text-base text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
          <span>{title}</span>
        </div>
        <div className="overflow-x-auto pb-4 pt-2">
          <div className="flex items-stretch gap-0 min-w-max">
            {roundArray.map((round) => {
              const roundMatches = sideMatches
                .filter((m) => m.round === round)
                .sort((a, b) => a.position - b.position);

              const nextRoundMatches = round < maxRound
                ? sideMatches.filter((m) => m.round === round + 1).sort((a, b) => a.position - b.position)
                : [];

              let roundName = (t.tournament.roundLabel || 'Round {round}').replace('{round}', round.toString());
              if (round === maxRound && side === 'winners') roundName = t.tournament.winnersFinal || 'Winners Final';
              if (round === maxRound && side === 'losers') roundName = t.tournament.losersFinal || 'Losers Final';

              const isFirstRound = round === 1;
              const isPairing = nextRoundMatches.length > 0 && roundMatches.length === nextRoundMatches.length * 2;
              const isSingle = nextRoundMatches.length > 0 && roundMatches.length === nextRoundMatches.length;

              return (
                <div key={round} className="flex items-stretch">
                  {/* Round Column */}
                  <div className="flex flex-col flex-shrink-0 w-[260px] sm:w-[300px]">
                    <div className="bg-slate-200 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center mb-3">
                      {roundName}
                    </div>
                    <div className="flex-1 flex flex-col justify-around space-y-4">
                      {roundMatches.map((match) => (
                        <div key={match.id} className="flex items-center justify-center my-auto">
                          <MatchCard
                            match={match}
                            entrants={entrants}
                            readOnly={readOnly}
                            onCompleteResult={onCompleteResult}
                            onClearResult={onClearResult}
                            onUpdateNote={onUpdateNote}
                            onOverrideBestOf={onOverrideBestOf}
                            detailHref={matchHref?.(match)}
                            matchNumber={matchNumberMap.get(match.id)}
                            showMatchNumberOnLeft={isFirstRound}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Connector Column to Next Round */}
                  {round < maxRound && (
                    <div className="flex flex-col flex-shrink-0 w-8 sm:w-10 pt-8">
                      <div className="flex-1 flex flex-col justify-around">
                        {nextRoundMatches.map((nextMatch, idx) => {
                          const connectorType = isPairing ? 'pair' : isSingle ? 'single' : 'pair';
                          return (
                            <BracketConnector
                              key={`conn-${nextMatch.id}-${idx}`}
                              matchNumber={matchNumberMap.get(nextMatch.id)}
                              type={connectorType}
                              className="h-full"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (isRoundRobin) {
    // Group Round Robin matches by round
    const maxRound = Math.max(...matches.map((m) => m.round));
    const roundArray = Array.from({ length: maxRound }, (_, i) => i + 1);

    return (
      <div className="space-y-4">
        <div className="font-bold text-base text-slate-800 dark:text-slate-200">
          {t.tournament.matchList || 'Match List'}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roundArray.map((round) => {
            const roundMatches = matches.filter((m) => m.round === round);
            return (
              <div key={round} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                <div className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                  {(t.tournament.roundLabel || 'Round {round}').replace('{round}', round.toString())}
                </div>
                <div className="space-y-2">
                  {roundMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      entrants={entrants}
                      readOnly={readOnly}
                      onCompleteResult={onCompleteResult}
                      onClearResult={onClearResult}
                      onUpdateNote={onUpdateNote}
                      onOverrideBestOf={onOverrideBestOf}
                      detailHref={matchHref?.(match)}
                      matchNumber={matchNumberMap.get(match.id)}
                      showMatchNumberOnLeft={true}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {renderSideBracket('winners', isDoubleElimination ? (t.tournament.winnersBracket || 'Winners Bracket') : (t.tournament.bracket || 'Bracket'))}
      {isDoubleElimination && renderSideBracket('losers', t.tournament.losersBracket || 'Losers Bracket')}
      {renderSideBracket('grand_final', t.tournament.grandFinal || 'Grand Final')}
    </div>
  );
}
