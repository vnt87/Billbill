import { Entrant, Match, StandingsRow } from './types';

export function calculateRoundRobinStandings(
  entrants: Entrant[],
  matches: Match[]
): StandingsRow[] {
  const map = new Map<string, StandingsRow>();

  for (const e of entrants) {
    map.set(e.id, {
      entrantId: e.id,
      rank: 1,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      scoreDifference: 0,
      points: 0,
    });
  }

  // Record stats from completed matches
  for (const m of matches) {
    if (m.state !== 'completed' || !m.entrantAId || !m.entrantBId) continue;
    const sA = map.get(m.entrantAId);
    const sB = map.get(m.entrantBId);
    if (!sA || !sB) continue;

    const scoreA = m.scoreA || 0;
    const scoreB = m.scoreB || 0;

    sA.played++;
    sB.played++;

    sA.scoreFor += scoreA;
    sA.scoreAgainst += scoreB;
    sB.scoreFor += scoreB;
    sB.scoreAgainst += scoreA;

    if (m.winnerId === m.entrantAId) {
      sA.won++;
      sA.points += 3;
      sB.lost++;
    } else if (m.winnerId === m.entrantBId) {
      sB.won++;
      sB.points += 3;
      sA.lost++;
    } else if (scoreA === scoreB) {
      sA.drawn++;
      sA.points += 1;
      sB.drawn++;
      sB.points += 1;
    }
  }

  for (const row of map.values()) {
    row.scoreDifference = row.scoreFor - row.scoreAgainst;
  }

  const rows = Array.from(map.values());

  // Helper for mini-table calculations among a tied set of entrant IDs
  const getMiniTableStats = (tiedIds: Set<string>) => {
    const miniStats = new Map<string, { points: number; diff: number; totalScore: number }>();
    for (const id of tiedIds) {
      miniStats.set(id, { points: 0, diff: 0, totalScore: 0 });
    }

    for (const m of matches) {
      if (m.state !== 'completed' || !m.entrantAId || !m.entrantBId) continue;
      if (tiedIds.has(m.entrantAId) && tiedIds.has(m.entrantBId)) {
        const mA = miniStats.get(m.entrantAId)!;
        const mB = miniStats.get(m.entrantBId)!;
        const sA = m.scoreA || 0;
        const sB = m.scoreB || 0;

        mA.totalScore += sA;
        mB.totalScore += sB;

        if (m.winnerId === m.entrantAId) {
          mA.points += 3;
        } else if (m.winnerId === m.entrantBId) {
          mB.points += 3;
        } else if (sA === sB) {
          mA.points += 1;
          mB.points += 1;
        }
      }
    }

    for (const [id, stats] of miniStats.entries()) {
      let miniFor = 0;
      let miniAgainst = 0;
      for (const m of matches) {
        if (m.state !== 'completed' || !m.entrantAId || !m.entrantBId) continue;
        if (tiedIds.has(m.entrantAId) && tiedIds.has(m.entrantBId)) {
          if (m.entrantAId === id) {
            miniFor += m.scoreA || 0;
            miniAgainst += m.scoreB || 0;
          } else if (m.entrantBId === id) {
            miniFor += m.scoreB || 0;
            miniAgainst += m.scoreA || 0;
          }
        }
      }
      stats.diff = miniFor - miniAgainst;
    }

    return miniStats;
  };

  // Group rows by points to resolve mini-tables
  const compareRows = (a: StandingsRow, b: StandingsRow): number => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;

    // 2. Mini-table among tied points
    const tiedGroup = rows.filter((r) => r.points === a.points).map((r) => r.entrantId);
    if (tiedGroup.length > 1) {
      const mini = getMiniTableStats(new Set(tiedGroup));
      const statsA = mini.get(a.entrantId)!;
      const statsB = mini.get(b.entrantId)!;

      if (statsB.points !== statsA.points) return statsB.points - statsA.points;
      if (statsB.diff !== statsA.diff) return statsB.diff - statsA.diff;
      if (statsB.totalScore !== statsA.totalScore) return statsB.totalScore - statsA.totalScore;
    }

    // 3. Overall score differential
    if (b.scoreDifference !== a.scoreDifference) return b.scoreDifference - a.scoreDifference;

    // 4. Overall total score
    if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor;

    // Tied completely
    return 0;
  };

  rows.sort(compareRows);

  // Assign ranks (competition ranking e.g., 1, 2, 2, 4)
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && compareRows(rows[i - 1], rows[i]) === 0) {
      rows[i].rank = rows[i - 1].rank;
    } else {
      rows[i].rank = i + 1;
    }
  }

  return rows;
}
