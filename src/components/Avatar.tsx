import React from 'react';
import { cn } from './ui/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showStatusRing?: boolean;
  statusColor?: 'online' | 'away' | 'offline';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-20 h-20 text-lg',
  '2xl': 'w-24 h-24 text-xl'
};

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500', 
  offline: 'bg-gray-400'
};

export function TribeAvatar({ 
  src, 
  alt, 
  username = 'User', 
  size = 'md', 
  className,
  showStatusRing = false,
  statusColor = 'offline'
}: AvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(username);
  const displayAlt = alt || username;

  return (
    <div className={cn("relative inline-block", className)}>
      <div className={cn(
        "rounded-full overflow-hidden flex items-center justify-center bg-muted border-2 border-border",
        sizeClasses[size]
      )}>
        {src ? (
          <img 
            src={src} 
            alt={displayAlt}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken image, will show initials fallback
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span className="font-medium text-muted-foreground select-none">
            {initials}
          </span>
        )}
      </div>
      
      {showStatusRing && (
        <div className={cn(
          "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
          statusColors[statusColor],
          size === 'sm' && "w-2 h-2",
          size === 'lg' && "w-4 h-4",
          size === 'xl' && "w-5 h-5",
          size === '2xl' && "w-6 h-6"
        )} />
      )}
    </div>
  );
}