import React, { useRef, useEffect } from 'react';
import { POST_TEXT_LIMIT, POST_CAPTION_LIMIT } from './post-constants';

interface PostTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  hasMedia: boolean;
  autoFocus?: boolean;
}

export function PostTextArea({ value, onChange, hasMedia, autoFocus = true }: PostTextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const limit = hasMedia ? POST_CAPTION_LIMIT : POST_TEXT_LIMIT;
  const remaining = limit - value.length;
  const showCounter = value.length > limit * 0.7;
  const isOver = remaining < 0;

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hasMedia ? 'Add a caption...' : "What's on your mind?"}
        className="w-full bg-transparent text-pearl-white placeholder:text-muted-lavender/40 text-base leading-relaxed resize-none outline-none min-h-[120px] max-h-[300px] overflow-y-auto font-body"
        rows={1}
        aria-label={hasMedia ? 'Post caption' : 'Post text'}
      />
      {showCounter && (
        <div className={`absolute bottom-2 right-2 text-xs font-mono transition-colors ${
          isOver ? 'text-glitch-red font-semibold' : remaining < 30 ? 'text-soft-blush' : 'text-muted-lavender/50'
        }`}>
          {remaining}
        </div>
      )}
    </div>
  );
}
