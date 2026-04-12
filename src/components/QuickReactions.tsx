import React from 'react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface QuickReactionsProps {
  onReaction: (emoji: string) => void;
  className?: string;
}

const QUICK_REACTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😍', label: 'Love' },
  { emoji: '💯', label: 'Perfect' },
  { emoji: '✨', label: 'Sparkles' },
  { emoji: '💜', label: 'Heart' },
  { emoji: '🌟', label: 'Star' }
];

export function QuickReactions({ onReaction, className }: QuickReactionsProps) {
  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3",
      "border-t border-muted-lavender/20 bg-midnight-black/50",
      className
    )}>
      <span className="text-muted-lavender font-body text-xs font-medium">
        Quick reactions:
      </span>
      <div className="flex items-center gap-1">
        {QUICK_REACTIONS.map(({ emoji, label }) => (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            onClick={() => onReaction(emoji)}
            className={cn(
              "h-8 w-8 p-0 text-base hover:bg-neon-lilac/20 hover:scale-110",
              "transition-all duration-200 rounded-lg touch-target"
            )}
            title={label}
          >
            {emoji}
          </Button>
        ))}
      </div>
    </div>
  );
}