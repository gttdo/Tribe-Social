// Level calculation utilities for Tribe Board
export type LevelInfo = {
  level: number;
  xp: number;
  nextLevelXp: number;     // total XP needed to reach next level
  progress: number;        // 0..1 toward next level
  label: string;           // e.g. "Level 4"
};

function xpForLevel(n: number) {
  // tweak curve as you like
  return Math.floor(50 * n * (n + 1)); // 0, 100, 300, 600, 1000, ...
}

export function getLevelInfo(xp: number | null | undefined): LevelInfo {
  const safe = Math.max(0, Number(xp ?? 0));
  let level = 0;
  while (xpForLevel(level + 1) <= safe) level++;
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const progress = next === cur ? 1 : (safe - cur) / (next - cur);

  return {
    level,
    xp: safe,
    nextLevelXp: next,
    progress: Math.min(Math.max(progress, 0), 1),
    label: `Level ${level}`,
  };
}