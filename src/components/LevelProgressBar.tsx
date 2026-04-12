import React from 'react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Star, Sparkles, Zap } from 'lucide-react';
import { getLevelInfo } from '../utils/level';

// Helper functions for formatting and colors (moved inline)
function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return Math.floor(xp / 1000000) + 'M';
  }
  if (xp >= 1000) {
    return Math.floor(xp / 1000) + 'K';
  }
  return xp.toString();
}

function getLevelBadgeColor(level: number) {
  const tiers = [
    { min: 0, max: 4, primary: 'muted-lavender', secondary: 'soft-blush', background: 'midnight-black' },
    { min: 5, max: 9, primary: 'electric-blue', secondary: 'neon-lilac', background: 'midnight-black' },
    { min: 10, max: 19, primary: 'neon-lilac', secondary: 'electric-blue', background: 'midnight-black' },
    { min: 20, max: 49, primary: 'soft-blush', secondary: 'neon-lilac', background: 'midnight-black' },
    { min: 50, max: Infinity, primary: 'glitch-red', secondary: 'neon-lilac', background: 'midnight-black' }
  ];
  
  return tiers.find(tier => level >= tier.min && level <= tier.max) || tiers[0];
}

function getLevelTitle(level: number): string {
  if (level < 5) return 'New Member';
  if (level < 10) return 'Active Member';
  if (level < 20) return 'Veteran';
  if (level < 50) return 'Elite';
  return 'Legend';
}

interface LevelProgressBarProps {
  xp: number;
  /** Show the full info or just basic level badge */
  variant?: 'full' | 'compact' | 'minimal';
  /** Custom className */
  className?: string;
  /** Whether to show the sparkle animation */
  animated?: boolean;
  /** Hide the level badge (useful when level is shown elsewhere) */
  hideLevelBadge?: boolean;
}

export function LevelProgressBar({ 
  xp, 
  variant = 'full', 
  className = '',
  animated = true,
  hideLevelBadge = false
}: LevelProgressBarProps) {
  const levelInfo = getLevelInfo(xp ?? 0);
  const colors = getLevelBadgeColor(levelInfo.level);
  const levelTitle = getLevelTitle(levelInfo.level);
  
  // Minimal variant - just level number
  if (variant === 'minimal') {
    return (
      <Badge 
        className={`bg-${colors.background}/20 border-${colors.primary}/40 text-${colors.primary} text-xs font-accent ${className}`}
      >
        Level {levelInfo.level}
      </Badge>
    );
  }
  
  // Compact variant - level + XP
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge 
          className={`bg-${colors.background}/20 border-${colors.primary}/40 text-${colors.primary} text-xs font-accent`}
        >
          Level {levelInfo.level}
        </Badge>
        <div className="flex items-center space-x-1">
          <Sparkles className={`w-3 h-3 text-${colors.secondary} ${animated ? 'animate-pulse' : ''}`} />
          <span className={`text-${colors.secondary} text-xs font-body`}>
            {formatXP(levelInfo.xp)} XP
          </span>
        </div>
      </div>
    );
  }
  
  // Full variant - everything
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Level badge and title - only show if not hidden */}
      {!hideLevelBadge && (
        <div className="flex items-center space-x-2">


        </div>
      )}
      
      {/* XP Display */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          <Sparkles className={`w-3 h-3 text-${colors.secondary} ${animated ? 'animate-pulse' : ''}`} />
          <span className={`text-${colors.secondary} font-body`}>
            {formatXP(levelInfo.xp)} XP
          </span>
        </div>
        <span className="text-muted-lavender font-body">
          {formatXP(levelInfo.nextLevelXp - levelInfo.xp)} to Level {levelInfo.level + 1}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="relative">
        <Progress 
          value={levelInfo.progress * 100} 
          className="h-2 bg-midnight-black/50 border border-muted-lavender/20"
        />
        <div 
          className={`absolute top-0 left-0 h-full bg-gradient-to-r from-${colors.primary} to-${colors.secondary} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${levelInfo.progress * 100}%` }}
        />
        {levelInfo.progress > 0.1 && (
          <Star 
            className={`absolute top-0.5 right-1 w-3 h-3 text-pearl-white ${animated ? 'animate-pulse' : ''}`} 
            style={{ transform: 'translateX(-50%)' }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Simple level badge component for headers and compact displays
 */
export function LevelBadge({ xp, level, className = '' }: { xp?: number; level?: number; className?: string }) {
  const calculatedLevel = level ?? (xp ? getLevelInfo(xp).level : 1);
  const colors = getLevelBadgeColor(calculatedLevel);
  
  return (
    <Badge 
      className={`bg-${colors.background}/20 border-${colors.primary}/40 text-${colors.primary} text-xs font-accent ${className}`}
    >
      Level {calculatedLevel}
    </Badge>
  );
}

/**
 * XP display component for showing just XP with sparkle icon
 */
export function XPDisplay({ xp, className = '' }: { xp: number; className?: string }) {
  const colors = getLevelBadgeColor(getLevelInfo(xp ?? 0).level);
  
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Sparkles className={`w-3 h-3 text-${colors.secondary} animate-pulse`} />
      <span className={`text-${colors.secondary} text-xs font-body`}>
        {formatXP(xp ?? 0)} XP
      </span>
    </div>
  );
}

/**
 * Compact level info for user cards
 */
export function UserLevelInfo({ xp, showProgress = false, className = '' }: { 
  xp: number; 
  showProgress?: boolean;
  className?: string;
}) {
  if (showProgress) {
    return <LevelProgressBar xp={xp} variant="full" className={className} />;
  }
  
  return <LevelProgressBar xp={xp} variant="compact" className={className} />;
}