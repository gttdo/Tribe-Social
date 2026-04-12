import { Visibility, TribeWithDetails } from './supabase/database-types';
import { PostWithDetails, StoryWithDetails } from './supabase/database-types';

export interface VisibilityState {
  visibility: Visibility;
  selectedTribes: string[];
}

export interface ContentAccessInfo {
  canView: boolean;
  isBlurred: boolean;
  joinPrompt?: {
    tribeName: string;
    tribeId: string;
    isPrivate: boolean;
  };
}

export interface VisibilitySettings {
  showPublicOption: boolean;
  showTribeOption: boolean;
  showPrivateOption: boolean;
  defaultVisibility: Visibility;
  requireTribeSelection: boolean;
}

/**
 * Default visibility settings for content creation
 */
export const DEFAULT_VISIBILITY_SETTINGS: VisibilitySettings = {
  showPublicOption: true,
  showTribeOption: true,
  showPrivateOption: true,
  defaultVisibility: 'public',
  requireTribeSelection: false
};

/**
 * Check if current user can view specific content based on visibility and tribe membership
 * Updated to handle profile privacy settings
 */
export function canViewContent(
  content: PostWithDetails | StoryWithDetails,
  currentUserId?: string,
  userTribeMemberships?: string[],
  userFollowingList?: string[]
): ContentAccessInfo {
  // Owner can always view their own content
  if (content.user_id === currentUserId) {
    return {
      canView: true,
      isBlurred: false
    };
  }

  // Private content only viewable by owner
  if (content.visibility === 'private') {
    return {
      canView: false,
      isBlurred: true
    };
  }

  // Tribe-only content
  if (content.visibility === 'tribe' && content.tribe_id) {
    const isMember = userTribeMemberships?.includes(content.tribe_id) || false;
    
    if (isMember) {
      return {
        canView: true,
        isBlurred: false
      };
    } else {
      // Get tribe info for join prompt
      const tribe = content.tribe;
      return {
        canView: false,
        isBlurred: true,
        joinPrompt: tribe ? {
          tribeName: tribe.name,
          tribeId: tribe.id,
          isPrivate: tribe.is_private
        } : undefined
      };
    }
  }

  // Public content depends on author's profile privacy
  if (content.visibility === 'public') {
    // Get author's profile privacy from content.user if available
    const authorProfilePrivacy = (content.user as any)?.profile_privacy;

    // If author has public profile or no privacy setting, content is visible
    if (!authorProfilePrivacy || authorProfilePrivacy === 'public') {
      return {
        canView: true,
        isBlurred: false
      };
    }

    // If author has private profile, check if viewer is following
    if (authorProfilePrivacy === 'private') {
      if (!currentUserId) {
        return {
          canView: false,
          isBlurred: true,
          joinPrompt: {
            tribeName: 'Follow to see posts',
            tribeId: content.user_id,
            isPrivate: true
          }
        };
      }

      const isFollowing = userFollowingList?.includes(content.user_id) || false;
      
      return {
        canView: isFollowing,
        isBlurred: !isFollowing,
        joinPrompt: isFollowing ? undefined : {
          tribeName: 'Follow to see posts',
          tribeId: content.user_id,
          isPrivate: true
        }
      };
    }
  }

  // Default to not viewable if no conditions met
  return {
    canView: false,
    isBlurred: true
  };
}

/**
 * Get display text for visibility option
 */
export function getVisibilityDisplayText(visibility: Visibility): string {
  switch (visibility) {
    case 'public':
      return 'Public';
    case 'tribe':
      return 'Tribe Only';
    case 'private':
      return 'Private';
    default:
      return 'Public';
  }
}

/**
 * Get description for visibility option
 * Updated to reflect profile privacy impact
 */
export function getVisibilityDescription(visibility: Visibility, profilePrivacy?: 'public' | 'private'): string {
  switch (visibility) {
    case 'public':
      if (profilePrivacy === 'private') {
        return 'Visible to your followers (private profile)';
      }
      return 'Visible to everyone on Tribe Board';
    case 'tribe':
      return 'Only visible to members of selected tribe(s)';
    case 'private':
      return 'Only visible to you';
    default:
      return 'Visible to everyone on Tribe Board';
  }
}

/**
 * Get icon name for visibility option
 */
export function getVisibilityIcon(visibility: Visibility): string {
  switch (visibility) {
    case 'public':
      return 'Globe';
    case 'tribe':
      return 'Users';
    case 'private':
      return 'Lock';
    default:
      return 'Globe';
  }
}

/**
 * Validate visibility selection
 */
export function validateVisibilitySelection(
  visibility: Visibility,
  selectedTribes: string[],
  settings: VisibilitySettings = DEFAULT_VISIBILITY_SETTINGS
): { isValid: boolean; error?: string } {
  // Check if selected visibility is allowed
  if (visibility === 'public' && !settings.showPublicOption) {
    return { isValid: false, error: 'Public visibility is not allowed' };
  }
  
  if (visibility === 'tribe' && !settings.showTribeOption) {
    return { isValid: false, error: 'Tribe visibility is not allowed' };
  }
  
  if (visibility === 'private' && !settings.showPrivateOption) {
    return { isValid: false, error: 'Private visibility is not allowed' };
  }

  // Check tribe selection for tribe visibility
  if (visibility === 'tribe' && selectedTribes.length === 0) {
    return { isValid: false, error: 'Must select at least one tribe for tribe-only content' };
  }

  // Check general tribe requirement
  if (settings.requireTribeSelection && selectedTribes.length === 0) {
    return { isValid: false, error: 'Must select at least one tribe' };
  }

  return { isValid: true };
}

/**
 * Get truncated caption for blurred content preview
 */
export function getTruncatedCaption(caption: string, maxLength: number = 50): string {
  if (!caption) return '';
  
  if (caption.length <= maxLength) {
    return caption;
  }
  
  return caption.substring(0, maxLength).trim() + '...';
}

/**
 * Get visibility color theme
 */
export function getVisibilityColor(visibility: Visibility): {
  primary: string;
  secondary: string;
  bg: string;
  border: string;
} {
  switch (visibility) {
    case 'public':
      return {
        primary: 'electric-blue',
        secondary: 'electric-blue/80',
        bg: 'electric-blue/10',
        border: 'electric-blue/30'
      };
    case 'tribe':
      return {
        primary: 'neon-lilac',
        secondary: 'neon-lilac/80',
        bg: 'neon-lilac/10',
        border: 'neon-lilac/30'
      };
    case 'private':
      return {
        primary: 'muted-lavender',
        secondary: 'muted-lavender/80',
        bg: 'muted-lavender/10',
        border: 'muted-lavender/30'
      };
    default:
      return {
        primary: 'electric-blue',
        secondary: 'electric-blue/80',
        bg: 'electric-blue/10',
        border: 'electric-blue/30'
      };
  }
}

/**
 * Check if content needs a blur overlay
 */
export function shouldBlurContent(
  content: PostWithDetails | StoryWithDetails,
  currentUserId?: string,
  userTribeMemberships?: string[]
): boolean {
  const accessInfo = canViewContent(content, currentUserId, userTribeMemberships);
  return accessInfo.isBlurred;
}

/**
 * Get tribe join URL for content
 */
export function getTribeJoinUrl(tribeId: string): string {
  return `/tribes/${tribeId}`;
}

/**
 * Format tribe names for display
 */
export function formatTribeNames(tribes: TribeWithDetails[]): string {
  if (tribes.length === 0) return '';
  if (tribes.length === 1) return tribes[0].name;
  if (tribes.length === 2) return `${tribes[0].name} and ${tribes[1].name}`;
  return `${tribes[0].name} and ${tribes.length - 1} other${tribes.length > 2 ? 's' : ''}`;
}

/**
 * Get content type display name for blur overlay
 */
export function getContentTypeDisplayName(type: string): string {
  switch (type) {
    case 'thought':
      return 'thought';
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'text':
      return 'story';
    default:
      return 'content';
  }
}

/**
 * Profile privacy helper functions
 */
export type ProfilePrivacy = 'public' | 'private';

/**
 * Get effective visibility for a post based on post visibility and profile privacy
 */
export function getEffectiveVisibility(
  postVisibility: Visibility,
  authorProfilePrivacy?: ProfilePrivacy
): {
  effectiveVisibility: string;
  description: string;
} {
  if (postVisibility === 'private') {
    return {
      effectiveVisibility: 'private',
      description: 'Only visible to you'
    };
  }

  if (postVisibility === 'tribe') {
    return {
      effectiveVisibility: 'tribe',
      description: 'Only visible to tribe members'
    };
  }

  // Public posts are affected by profile privacy
  if (postVisibility === 'public') {
    if (authorProfilePrivacy === 'private') {
      return {
        effectiveVisibility: 'followers',
        description: 'Visible to your followers only'
      };
    }
    return {
      effectiveVisibility: 'public',
      description: 'Visible to everyone'
    };
  }

  return {
    effectiveVisibility: 'unknown',
    description: 'Unknown visibility'
  };
}

/**
 * Get profile privacy display text
 */
export function getProfilePrivacyDisplayText(privacy: ProfilePrivacy): string {
  return privacy === 'public' ? 'Public Profile' : 'Private Profile';
}

/**
 * Get profile privacy description
 */
export function getProfilePrivacyDescription(privacy: ProfilePrivacy): string {
  return privacy === 'public'
    ? 'Anyone can see your public posts'
    : 'Only your followers can see your public posts';
}

/**
 * Get profile privacy icon
 */
export function getProfilePrivacyIcon(privacy: ProfilePrivacy): string {
  return privacy === 'public' ? 'Globe' : 'Users';
}