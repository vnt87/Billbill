export function nextPowerOfTwo(n: number): number {
  let count = 1;
  while (count < n) {
    count <<= 1;
  }
  return count;
}

/**
 * Returns standard seed pairing for a bracket of size N (must be power of 2).
 * e.g., N=4 -> [[1, 4], [2, 3]]
 * N=8 -> [[1, 8], [4, 5], [2, 7], [3, 6]]
 */
export function getStandardSeedPairs(bracketSize: number): Array<[number, number]> {
  if (bracketSize < 2 || (bracketSize & (bracketSize - 1)) !== 0) {
    throw new Error('Bracket size must be a power of 2');
  }

  let rounds: number[][] = [[1, 2]];
  while (rounds.length * 2 < bracketSize) {
    const nextRounds: number[][] = [];
    const sum = rounds.length * 4 + 1;
    for (const pair of rounds) {
      nextRounds.push([pair[0], sum - pair[0]]);
      nextRounds.push([pair[1], sum - pair[1]]);
    }
    rounds = nextRounds;
  }

  return rounds.map((pair) => [pair[0], pair[1]]);
}

export function generateStableId(prefix: string, ...parts: Array<string | number>): string {
  return `${prefix}_${parts.join('_')}`;
}

export const HARDCODED_PLAYER_NAMES = [
  'Nam',
  'Chung',
  'Huy',
  'Tính',
  'Hiếu',
  'Tuấn',
  'Thủy',
  'Khánh',
  'Long',
  'Nam Hoàng',
];

export function getRandomDefaultPlayerNames(count: number): string[] {
  const shuffled = [...HARDCODED_PLAYER_NAMES].sort(() => Math.random() - 0.5);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i < shuffled.length) {
      result.push(shuffled[i]);
    } else {
      result.push(`Player ${i + 1}`);
    }
  }
  return result;
}
