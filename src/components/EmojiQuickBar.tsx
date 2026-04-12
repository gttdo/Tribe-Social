import React from 'react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface EmojiQuickBarProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

const QUICK_EMOJIS = [
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Angry' },
  { emoji: '👍', label: 'Like' },
  { emoji: '👎', label: 'Dislike' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '💯', label: 'Perfect' },
  { emoji: '✨', label: 'Sparkles' },
  { emoji: '💜', label: 'Purple Heart' },
  { emoji: '🌟', label: 'Star' }
];

export function EmojiQuickBar({ onEmojiSelect, className }: EmojiQuickBarProps) {
  return (
    <div className={cn(
      "flex items-center space-x-2 py-2 overflow-x-auto scrollbar-hide",
      className
    )}>
      <div className="flex items-center space-x-2">
        {QUICK_EMOJIS.map(({ emoji, label }) => (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            onClick={() => onEmojiSelect(emoji)}
            className={cn(
              "h-8 w-8 p-0 text-lg hover:bg-muted-lavender/10 hover:scale-110",
              "transition-all duration-200 rounded-full flex-shrink-0",
              "active:scale-95 touch-target"
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