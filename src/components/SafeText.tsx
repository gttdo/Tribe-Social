import React from 'react';
import { cn } from './ui/utils';
import { supabase } from '../utils/supabase/client';

interface SafeTextProps {
  text: string | null | undefined;
  variant?: 'bio' | 'username' | 'content' | 'comment' | 'title' | 'caption' | 'inline';
  maxLength?: number;
  showFullOnClick?: boolean;
  fallback?: string | React.ReactNode;
  className?: string;
  truncateLines?: number;
}

// Safe text length limits by variant
const DEFAULT_LIMITS = {
  bio: 500,
  username: 50,
  content: 2000,
  comment: 1000,
  title: 200,
  caption: 300,
  inline: 100
};

// Safe fallbacks by variant
const DEFAULT_FALLBACKS = {
  bio: null,
  username: <span className="text-muted-foreground">Unknown user</span>,
  content: <span className="text-muted-foreground italic">No content available.</span>,
  comment: <span className="text-muted-foreground italic">Comment unavailable.</span>,
  title: <span className="text-muted-foreground">Untitled</span>,
  caption: <span className="text-muted-foreground italic">No caption.</span>,
  inline: <span className="text-muted-foreground">—</span>
};

function truncateText(text: string, maxLength: number): { text: string; isTruncated: boolean } {
  if (!text || text.length <= maxLength) {
    return { text: text || '', isTruncated: false };
  }
  
  // Find the last space before maxLength to avoid cutting words
  let truncateAt = maxLength;
  for (let i = maxLength; i > maxLength - 20 && i > 0; i--) {
    if (text[i] === ' ') {
      truncateAt = i;
      break;
    }
  }
  
  return { 
    text: text.substring(0, truncateAt).trim() + '…', 
    isTruncated: true 
  };
}

export function SafeText({ 
  text, 
  variant = 'content', 
  maxLength,
  showFullOnClick = false,
  fallback,
  className,
  truncateLines
}: SafeTextProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [currentUsername, setCurrentUsername] = React.useState<string>('frost_wave737');

  // Get current user's username
  React.useEffect(() => {
    const getCurrentUsername = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Check multiple sources for username
          let username = 'frost_wave737'; // fallback
          
          if (session.user.user_metadata?.username) {
            username = session.user.user_metadata.username;
          } else if (session.user.email) {
            username = session.user.email.split('@')[0];
          }
          
          setCurrentUsername(username);
        }
      } catch (error) {
        console.warn('Could not get username:', error);
      }
    };
    
    getCurrentUsername();
  }, []);
  
  // Handle null/undefined/empty text
  if (!text || text.trim().length === 0) {
    const defaultFallback = fallback || DEFAULT_FALLBACKS[variant];
    return <div className={cn("select-text", className)}>{defaultFallback}</div>;
  }

  // Sanitize and normalize text
  const sanitizedText = text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (!sanitizedText) {
    const defaultFallback = fallback || DEFAULT_FALLBACKS[variant];
    return <div className={cn("select-text", className)}>{defaultFallback}</div>;
  }

  const effectiveMaxLength = maxLength || DEFAULT_LIMITS[variant];
  const { text: displayText, isTruncated } = isExpanded 
    ? { text: sanitizedText, isTruncated: false }
    : truncateText(sanitizedText, effectiveMaxLength);

  // Base classes for different variants
  const variantClasses = {
    bio: "whitespace-pre-wrap break-words text-sm leading-relaxed",
    username: "break-words font-medium truncate",
    content: "whitespace-pre-wrap break-words leading-relaxed",
    comment: "whitespace-pre-wrap break-words text-sm leading-normal",
    title: "break-words leading-tight",
    caption: "whitespace-pre-wrap break-words text-sm text-muted-foreground leading-normal",
    inline: "break-words truncate"
  };

  // Apply line clamping if specified
  let lineClampClass = '';
  if (truncateLines && !isExpanded) {
    if (truncateLines === 1) lineClampClass = 'line-clamp-1';
    else if (truncateLines === 2) lineClampClass = 'line-clamp-2';
    else if (truncateLines === 3) lineClampClass = 'line-clamp-3';
    else lineClampClass = `line-clamp-${Math.min(truncateLines, 6)}`;
  }

  const baseClasses = cn(
    "select-text word-wrap text-contain text-full",
    variantClasses[variant],
    lineClampClass,
    className
  );

  const handleClick = () => {
    if (showFullOnClick && isTruncated) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={baseClasses}>
      <span 
        onClick={handleClick}
        className={showFullOnClick && isTruncated ? "cursor-pointer hover:text-primary transition-colors" : ""}
      >
        {variant === 'username' ? currentUsername : displayText}
      </span>
      {showFullOnClick && isTruncated && !isExpanded && (
        <button
          onClick={handleClick}
          className="ml-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
        >
          Show more
        </button>
      )}
      {showFullOnClick && isTruncated && isExpanded && (
        <button
          onClick={handleClick}
          className="ml-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}

// Specialized components for common use cases
export function SafeBio({ bio, description, className, showFullOnClick = true }: { 
  bio?: string | null | undefined;
  description?: string | null | undefined; 
  className?: string; 
  showFullOnClick?: boolean;
}) {
  return (
    <SafeText 
      text={bio || description} 
      variant="bio" 
      className={className}
      showFullOnClick={showFullOnClick}
      maxLength={500}
    />
  );
}

export function SafeUsername({ username, className }: { 
  username: string | null | undefined; 
  className?: string; 
}) {
  return (
    <SafeText 
      text={username} 
      variant="username" 
      className={className}
      fallback="Unknown user"
    />
  );
}

export function SafePostContent({ content, className, showFullOnClick = true }: { 
  content: string | null | undefined; 
  className?: string; 
  showFullOnClick?: boolean;
}) {
  return (
    <SafeText 
      text={content} 
      variant="content" 
      className={className}
      showFullOnClick={showFullOnClick}
      maxLength={2000}
    />
  );
}

export function SafeComment({ content, className }: { 
  content: string | null | undefined; 
  className?: string; 
}) {
  return (
    <SafeText 
      text={content} 
      variant="comment" 
      className={className}
      maxLength={1000}
      showFullOnClick={true}
    />
  );
}

export function SafeTitle({ title, className }: { 
  title: string | null | undefined; 
  className?: string; 
}) {
  return (
    <SafeText 
      text={title} 
      variant="title" 
      className={className}
      truncateLines={2}
    />
  );
}

export function SafeCaption({ caption, className, showFullOnClick = false }: { 
  caption: string | null | undefined; 
  className?: string; 
  showFullOnClick?: boolean;
}) {
  return (
    <SafeText 
      text={caption} 
      variant="caption" 
      className={className}
      showFullOnClick={showFullOnClick}
      maxLength={300}
    />
  );
}

export function SafeInlineText({ text, className, maxLength = 100 }: { 
  text: string | null | undefined; 
  className?: string;
  maxLength?: number;
}) {
  return (
    <SafeText 
      text={text} 
      variant="inline" 
      className={className}
      maxLength={maxLength}
    />
  );
}

// Utility function for safe text processing
export function sanitizeText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Utility function to check if text needs truncation
export function needsTruncation(text: string | null | undefined, maxLength: number): boolean {
  if (!text) return false;
  return sanitizeText(text).length > maxLength;
}