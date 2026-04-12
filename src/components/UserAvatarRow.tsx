import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { SafeUsername, SafeInlineText } from './SafeText';
import { XPDisplay, LevelBadge } from './LevelProgressBar';
import { safeUserProfileCard } from '../utils/user-profile-helpers';

interface UserAvatarRowProps {
  /** User data - can contain null/undefined fields */
  user: {
    id?: string;
    username?: string | null;
    nickname?: string | null;
    description?: string | null;
    profile_image_url?: string | null;
    coreRealm?: string | null;
    avatar?: string | null;
    xp?: number | null;
    level?: number | null;
  };
  /** Optional avatar size */
  avatarSize?: 'sm' | 'md' | 'lg';
  /** Whether to show description/bio */
  showDescription?: boolean;
  /** Whether to show realm badge */
  showRealm?: boolean;
  /** Whether to show XP information */
  showXP?: boolean;
  /** Whether to show level badge */
  showLevel?: boolean;
  /** Custom avatar colors */
  avatarColors?: {
    primary: string;
    secondary: string;
  };
  /** Click handler for the entire row */
  onClick?: () => void;
  /** Additional className for styling */
  className?: string;
  /** Whether to truncate long text */
  truncateText?: boolean;
}

export function UserAvatarRow({
  user,
  avatarSize = 'md',
  showDescription = false,
  showRealm = false,
  showXP = false,
  showLevel = false,
  avatarColors,
  onClick,
  className = '',
  truncateText = true
}: UserAvatarRowProps) {
  // Use safe profile helpers to handle null/undefined values
  const safeProfile = safeUserProfileCard(user);
  
  // Avatar sizes
  const avatarSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };
  
  // Text sizes based on avatar size
  const textSizes = {
    sm: { name: 'text-sm', subtitle: 'text-xs' },
    md: { name: 'text-sm', subtitle: 'text-xs' },
    lg: { name: 'text-base', subtitle: 'text-sm' }
  };
  
  // Default realm colors
  const getRealmColors = (realm?: string | null) => {
    if (avatarColors) return avatarColors;
    
    const colors = {
      mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
      embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
      shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    
    return colors[realm as keyof typeof colors] || colors.mirrorcore;
  };
  
  const realmColors = getRealmColors(user.coreRealm);
  const textSize = textSizes[avatarSize];
  
  return (
    <div 
      className={`flex items-center space-x-3 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Avatar */}
      <Avatar className={avatarSizes[avatarSize]}>
        {(user.profile_image_url || user.avatar) && (
          <AvatarImage 
            src={user.profile_image_url || user.avatar || ''} 
            alt={safeProfile.displayName} 
          />
        )}
        <AvatarFallback 
          className={`bg-gradient-to-r from-${realmColors.primary} to-${realmColors.secondary} text-white font-headline ${avatarSize === 'sm' ? 'text-xs' : avatarSize === 'lg' ? 'text-lg' : 'text-sm'}`}
        >
          {safeProfile.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* User Info */}
      <div className="flex-1 min-w-0">
        {/* Name and badge row */}
        <div className="flex items-center space-x-2 mb-1">
          <SafeUsername 
            username={safeProfile.username}
            className={`font-body font-medium text-pearl-white ${textSize.name} ${truncateText ? 'truncate' : ''}`}
          />
          
          {/* Level badge */}
          {showLevel && user.level && (
            <LevelBadge 
              xp={user.xp ?? 0}
              className="flex-shrink-0"
            />
          )}
          
          {/* Realm badge */}
          {showRealm && user.coreRealm && (
            <Badge 
              variant="secondary" 
              className={`bg-${realmColors.primary}/20 text-${realmColors.primary} border-${realmColors.primary}/30 text-xs flex-shrink-0`}
            >
              {user.coreRealm}
            </Badge>
          )}
        </div>
        
        {/* XP display */}
        {showXP && user.xp !== undefined && user.xp !== null && (
          <div className="mb-1">
            <XPDisplay xp={user.xp} />
          </div>
        )}
        
        {/* Description/subtitle */}
        {showDescription && (
          <SafeInlineText
            text={safeProfile.hasValidDescription ? safeProfile.description : safeProfile.subtitle}
            className={`text-muted-lavender font-body ${textSize.subtitle} ${truncateText ? 'truncate' : ''}`}
            maxLength={truncateText ? 60 : undefined}
          />
        )}
      </div>
    </div>
  );
}

// Specialized variants for common use cases
export function UserAvatarRowSmall(props: Omit<UserAvatarRowProps, 'avatarSize'>) {
  return <UserAvatarRow {...props} avatarSize="sm" />;
}

export function UserAvatarRowLarge(props: Omit<UserAvatarRowProps, 'avatarSize'>) {
  return <UserAvatarRow {...props} avatarSize="lg" />;
}

export function CommentUserAvatarRow(props: Omit<UserAvatarRowProps, 'avatarSize' | 'showDescription'>) {
  return (
    <UserAvatarRow 
      {...props} 
      avatarSize="sm" 
      showDescription={false}
      truncateText={true}
    />
  );
}

export function PostUserAvatarRow(props: Omit<UserAvatarRowProps, 'avatarSize' | 'showDescription'>) {
  return (
    <UserAvatarRow 
      {...props} 
      avatarSize="md" 
      showDescription={false}
      showRealm={true}
      truncateText={true}
    />
  );
}

export function ProfileUserAvatarRow(props: Omit<UserAvatarRowProps, 'avatarSize' | 'showDescription'>) {
  return (
    <UserAvatarRow 
      {...props} 
      avatarSize="lg" 
      showDescription={true}
      showRealm={true}
      truncateText={false}
    />
  );
}