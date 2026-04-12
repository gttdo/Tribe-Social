/**
 * Level and XP calculation utilities for Tribe Board
 * Provides consistent level progression across the app
 */

/**
 * Core level calculation functions
 */
export const levelFromXp = (xp: number) => Math.floor(xp / 100) + 1;
export const progressToNext = (xp: number) => (xp % 100) / 100;

/**
 * Calculate user level from XP points
 * @deprecated Use levelFromXp instead
 */
export function calculateLevel(xp: number): number {
  return levelFromXp(xp);
}

/**
 * Calculate XP needed for next level
 */
export function calculateXPForNextLevel(xp: number): number {
  const currentLevel = levelFromXp(xp);
  return currentLevel * 100;
}

/**
 * Calculate XP progress within current level (0-100)
 */
export function calculateLevelProgress(xp: number): number {
  return xp % 100;
}

/**
 * Calculate XP progress as percentage (0-1)
 * @deprecated Use progressToNext instead
 */
export function calculateLevelProgressPercentage(xp: number): number {
  return progressToNext(xp);
}

/**
 * Get level information for display
 */
export function getLevelInfo(xp: number) {
  const level = levelFromXp(xp);
  const progress = calculateLevelProgress(xp);
  const progressPercentage = progressToNext(xp);
  const xpForNextLevel = calculateXPForNextLevel(xp);
  const xpNeededForNext = xpForNextLevel - xp;
  
  return {
    level,
    xp,
    progress,
    progressPercentage,
    xpForNextLevel,
    xpNeededForNext,
    isMaxLevel: false // No max level for now
  };
}

/**
 * Format XP for display with k suffix for large numbers
 */
export function formatXP(xp: number): string {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}k`;
  }
  return xp.toString();
}

/**
 * Get level badge color based on level
 */
export function getLevelBadgeColor(level: number): {
  primary: string;
  secondary: string;
  background: string;
} {
  if (level >= 50) {
    return {
      primary: 'glitch-red',
      secondary: 'soft-blush',
      background: 'glitch-red'
    };
  }
  
  if (level >= 25) {
    return {
      primary: 'neon-lilac',
      secondary: 'electric-blue',
      background: 'neon-lilac'
    };
  }
  
  if (level >= 10) {
    return {
      primary: 'electric-blue',
      secondary: 'soft-blush',
      background: 'electric-blue'
    };
  }
  
  return {
    primary: 'soft-blush',
    secondary: 'muted-lavender',
    background: 'soft-blush'
  };
}

/**
 * Get level title based on level ranges
 */
export function getLevelTitle(level: number): string {
  if (level >= 50) return 'Cosmic Legend';
  if (level >= 25) return 'Realm Master';
  if (level >= 10) return 'Tribe Guardian';
  if (level >= 5) return 'Rising Star';
  return 'New Member';
}