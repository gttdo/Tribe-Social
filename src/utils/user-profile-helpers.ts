// Utility functions for handling user profile data with null guards

/**
 * Safely gets a user's description with appropriate fallback
 */
export function safeUserDescription(description: string | null | undefined, fallback = 'No bio yet'): string {
  if (!description || typeof description !== 'string') return fallback;
  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Safely gets a user's display name with fallback to username or default
 */
export function safeUserDisplayName(
  nickname: string | null | undefined, 
  username: string | null | undefined, 
  fallback = 'Tribe Member'
): string {
  // First try nickname
  if (nickname && typeof nickname === 'string') {
    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length > 0) return trimmedNickname;
  }
  
  // Then try username
  if (username && typeof username === 'string') {
    const trimmedUsername = username.trim();
    if (trimmedUsername.length > 0) return trimmedUsername;
  }
  
  return fallback;
}

/**
 * Safely gets a user's username with fallback
 */
export function safeUsername(username: string | null | undefined, fallback = 'unknown_user'): string {
  if (!username || typeof username !== 'string') return fallback;
  const trimmed = username.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Creates a safe user profile subtitle for cards/lists
 */
export function safeUserSubtitle(
  description: string | null | undefined,
  nickname: string | null | undefined,
  fallback = 'No bio yet'
): string {
  // First try description
  const safeDesc = safeUserDescription(description, '');
  if (safeDesc && safeDesc !== 'No bio yet') {
    return safeDesc;
  }
  
  // Then try nickname
  if (nickname && typeof nickname === 'string') {
    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length > 0) return trimmedNickname;
  }
  
  return fallback;
}

/**
 * Safely formats user profile data for cards/avatars/titles
 */
export function safeUserProfileCard(user: {
  username?: string | null;
  nickname?: string | null;
  description?: string | null;
}) {
  return {
    username: safeUsername(user.username),
    displayName: safeUserDisplayName(user.nickname, user.username),
    subtitle: safeUserSubtitle(user.description, user.nickname),
    description: safeUserDescription(user.description),
    hasValidDescription: !!(user.description && user.description.trim().length > 0)
  };
}

/**
 * Interface for safe user profile data
 */
export interface SafeUserProfile {
  username: string;
  displayName: string;
  subtitle: string;
  description: string;
  hasValidDescription: boolean;
}

/**
 * Type guard to check if a user object has required profile fields
 */
export function hasUserProfileFields(user: any): user is {
  username: string | null | undefined;
  nickname?: string | null | undefined;
  description?: string | null | undefined;
} {
  return user && typeof user === 'object' && 'username' in user;
}

/**
 * Safely truncates user description for preview contexts
 */
export function safeUserDescriptionPreview(
  description: string | null | undefined,
  maxLength = 100,
  fallback = 'No bio yet'
): string {
  const safeDesc = safeUserDescription(description, fallback);
  
  if (safeDesc === fallback) return safeDesc;
  
  if (safeDesc.length <= maxLength) return safeDesc;
  
  // Find last space before maxLength to avoid cutting words
  let truncateAt = maxLength;
  for (let i = maxLength; i > maxLength - 20 && i > 0; i--) {
    if (safeDesc[i] === ' ') {
      truncateAt = i;
      break;
    }
  }
  
  return safeDesc.substring(0, truncateAt).trim() + '…';
}