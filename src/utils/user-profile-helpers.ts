// Utility functions for handling user profile data with null guards

/**
 * Safely gets a user's bio with appropriate fallback
 */
export function safeUserDescription(bio: string | null | undefined, fallback = 'No bio yet'): string {
  if (!bio || typeof bio !== 'string') return fallback;
  const trimmed = bio.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Safely gets a user's display name with fallback to username or default
 */
export function safeUserDisplayName(
  display_name: string | null | undefined,
  username: string | null | undefined,
  fallback = 'Tribe Member'
): string {
  // First try display_name
  if (display_name && typeof display_name === 'string') {
    const trimmedDisplayName = display_name.trim();
    if (trimmedDisplayName.length > 0) return trimmedDisplayName;
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
  bio: string | null | undefined,
  display_name: string | null | undefined,
  fallback = 'No bio yet'
): string {
  // First try bio
  const safeDesc = safeUserDescription(bio, '');
  if (safeDesc && safeDesc !== 'No bio yet') {
    return safeDesc;
  }

  // Then try display_name
  if (display_name && typeof display_name === 'string') {
    const trimmedDisplayName = display_name.trim();
    if (trimmedDisplayName.length > 0) return trimmedDisplayName;
  }
  
  return fallback;
}

/**
 * Safely formats user profile data for cards/avatars/titles
 */
export function safeUserProfileCard(user: {
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
}) {
  return {
    username: safeUsername(user.username),
    displayName: safeUserDisplayName(user.display_name, user.username),
    subtitle: safeUserSubtitle(user.bio, user.display_name),
    description: safeUserDescription(user.bio),
    hasValidDescription: !!(user.bio && user.bio.trim().length > 0)
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
  display_name?: string | null | undefined;
  bio?: string | null | undefined;
} {
  return user && typeof user === 'object' && 'username' in user;
}

/**
 * Safely truncates user description for preview contexts
 */
export function safeUserDescriptionPreview(
  bio: string | null | undefined,
  maxLength = 100,
  fallback = 'No bio yet'
): string {
  const safeDesc = safeUserDescription(bio, fallback);

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