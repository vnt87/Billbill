import { StandingsRow, Entrant, EntrantType } from '../../../../shared/tournaments/types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SpotlightCard } from '../../../components/ui/SpotlightCard';
import { Trophy, Award, Medal } from 'lucide-react';

interface StandingsTableProps {
  standings: StandingsRow[];
  entrants: Entrant[];
  entrantType?: EntrantType;
}

export function StandingsTable({ standings, entrants, entrantType }: StandingsTableProps) {
  const { t } = useLanguage();
  const entrantMap = new Map(entrants.map((e) => [e.id, e]));

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy size={16} className="text-amber-500 fill-amber-500 inline" />;
    if (rank === 2) return <Award size={16} className="text-slate-400 fill-slate-400 inline" />;
    if (rank === 3) return <Medal size={16} className="text-amber-700 fill-amber-700 inline" />;
    return <span className="text-xs text-slate-500 font-mono">#{rank}</span>;
  };

  return (
    <SpotlightCard className="space-y-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-sm rounded-none">
      <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-slate-100">
        <Trophy size={18} className="text-amber-500" />
        <span>{t.tournament.standings}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              <th scope="col" className="py-2 px-2 text-center w-10">#</th>
              <th scope="col" className="py-2 px-3">
                {entrantType === 'team' ? t.tournament.entrantTeam : t.tournament.entrantIndividual}
              </th>
              <th scope="col" className="py-2 px-2 text-center">
                <abbr title={t.tournament.played || 'Played'}>P</abbr>
              </th>
              <th scope="col" className="py-2 px-2 text-center">
                <abbr title={t.tournament.won || 'Won'}>W</abbr>
              </th>
              <th scope="col" className="py-2 px-2 text-center">
                <abbr title={t.tournament.drawn || 'Drawn'}>D</abbr>
              </th>
              <th scope="col" className="py-2 px-2 text-center">
                <abbr title={t.tournament.lost || 'Lost'}>L</abbr>
              </th>
              <th scope="col" className="py-2 px-2 text-center hidden sm:table-cell font-mono">+ / -</th>
              <th scope="col" className="py-2 px-2 text-center font-mono">
                <abbr title={t.tournament.diff || 'Diff'}>Diff</abbr>
              </th>
              <th scope="col" className="py-2 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                <abbr title={t.tournament.points || 'Points'}>Pts</abbr>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {standings.map((row) => {
              const entrant = entrantMap.get(row.entrantId);
              const name = entrant ? entrant.name : row.entrantId;

              return (
                <tr
                  key={row.entrantId}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                    row.rank === 1 ? 'font-semibold bg-amber-50/40 dark:bg-amber-950/20' : ''
                  }`}
                >
                  <td className="py-2.5 px-2 text-center font-bold">{getRankBadge(row.rank)}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{name}</div>
                    {entrant?.roster && entrant.roster.length > 0 && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {entrant.roster.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400">{row.played}</td>
                  <td className="py-2.5 px-2 text-center font-medium text-emerald-600 dark:text-emerald-400">{row.won}</td>
                  <td className="py-2.5 px-2 text-center text-slate-500 dark:text-slate-400">{row.drawn}</td>
                  <td className="py-2.5 px-2 text-center text-red-600 dark:text-red-400">{row.lost}</td>
                  <td className="py-2.5 px-2 text-center hidden sm:table-cell font-mono text-xs text-slate-500">
                    {row.scoreFor} : {row.scoreAgainst}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-xs text-slate-700 dark:text-slate-300">
                    {row.scoreDifference > 0 ? `+${row.scoreDifference}` : row.scoreDifference}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-sm text-blue-700 dark:text-blue-300">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SpotlightCard>
  );
}
