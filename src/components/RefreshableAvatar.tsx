import React from 'react';
import { TribeAvatar } from './Avatar';
import { useUserAvatarWithRefresh } from '../utils/avatar-refresh-context';

interface RefreshableAvatarProps {
  userId: string | null;
  username?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showStatusRing?: boolean;
  statusColor?: 'online' | 'away' | 'offline';
  fallbackSrc?: string;
}

export function RefreshableAvatar({ 
  userId,
  username: providedUsername,
  size = 'md',
  className,
  showStatusRing = false,
  statusColor = 'offline',
  fallbackSrc
}: RefreshableAvatarProps) {
  const { src, username: fetchedUsername, loading, error } = useUserAvatarWithRefresh(userId);

  // Use provided username if available, otherwise use fetched username
  const displayUsername = providedUsername || fetchedUsername || 'Unknown User';
  
  // Use fetched avatar src, fallback to provided fallback, or empty string
  const avatarSrc = src || fallbackSrc || '';

  if (loading) {
    // Show loading state with initials
    return (
      <TribeAvatar
        src=""
        username={displayUsername}
        size={size}
        className={className}
        showStatusRing={showStatusRing}
        statusColor={statusColor}
      />
    );
  }

  return (
    <TribeAvatar
      src={avatarSrc}
      username={displayUsername}
      size={size}
      className={className}
      showStatusRing={showStatusRing}
      statusColor={statusColor}
    />
  );
}