import React from 'react';
import { Badge } from './ui/badge';

interface NotificationBadgeProps {
  count: number;
  children: React.ReactNode;
  className?: string;
}

export function NotificationBadge({ count, children, className = '' }: NotificationBadgeProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      {children}
      {count > 0 && (
        <Badge 
          className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 p-0 flex items-center justify-center bg-electric-blue text-midnight-black text-xs border-2 border-midnight-black animate-pulse"
          style={{
            backgroundColor: '#00BCD4',
            color: '#0A0A0A',
            borderColor: '#0A0A0A'
          }}
        >
          {count > 99 ? '99+' : count}
        </Badge>
      )}
    </div>
  );
}