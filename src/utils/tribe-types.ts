import { 
  TribeWithDetails, 
  TribeMember, 
  TribeRole, 
  PostWithDetails 
} from './supabase/database-types'

// Enhanced tribe types that extend the database types
export interface TribeDisplay extends TribeWithDetails {
  // Display and UI properties
  recentActivity: string;
  isJoined: boolean;
  isAdmin: boolean;
  isTrending?: boolean;
  bannerColor?: string;
  
  // Extended member data
  joinStatus: 'joined' | 'pending' | 'not_joined' | 'banned';
  userRole?: TribeRole;
  joinedAt?: Date;
  
  // Activity metrics
  recentPostCount: number;
  activeMembers: number;
  growthRate: number;
  
  // Moderation
  requiresApproval: boolean;
  hasContentWarnings: boolean;
}

export interface TribeMemberDisplay extends TribeMember {
  // User display info
  username: string;
  nickname: string;
  avatarUrl?: string;
  coreRealm: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE' | null;
  
  // Activity and reputation
  lastActive?: Date;
  postCount: number;
  contributionScore: number;
  trustLevel: number;
  
  // Moderation status
  isWarned?: boolean;
  isMuted?: boolean;
  isBanned?: boolean;
  
  // Permissions
  canPost: boolean;
  canComment: boolean;
  canModerate: boolean;
  canInvite: boolean;
}

export interface TribePost extends PostWithDetails {
  // Tribe-specific properties
  isSticky?: boolean;
  isPinned?: boolean;
  isAnnouncement?: boolean;
  
  // Moderation
  isHidden?: boolean;
  isLocked?: boolean;
  moderationReason?: string;
  
  // Engagement metrics
  tribeEngagementScore: number;
  crossTribeShares: number;
}

export interface TribeBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isAwarded?: boolean;
  awardedAt?: Date;
  progress?: number; // 0-100 for completion percentage
}

export interface TribeRule {
  id: string;
  title: string;
  description: string;
  category: 'posting' | 'behavior' | 'content' | 'general';
  severity: 'guideline' | 'warning' | 'strict';
  isEnforced: boolean;
  violationCount?: number;
}

export interface TribeTheme {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  cssVars: Record<string, string>;
  previewImage?: string;
}

export interface TribeInvite {
  id: string;
  tribeId: string;
  inviterId: string;
  inviteeId?: string;
  inviteCode?: string;
  email?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  maxUses?: number;
  currentUses: number;
}

export interface TribeSettings {
  tribeId: string;
  
  // Basic settings
  isPrivate: boolean;
  requiresApproval: boolean;
  allowInvites: boolean;
  allowCrossTribeSharing: boolean;
  
  // Content settings
  allowedPostTypes: ('thought' | 'image' | 'video' | 'audio')[];
  maxPostsPerDay?: number;
  requireContentApproval: boolean;
  enableContentWarnings: boolean;
  
  // Member settings
  maxMembers?: number;
  minAge?: number;
  maxAge?: number;
  allowedRealms?: ('MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE')[];
  
  // Moderation settings
  autoModeration: boolean;
  wordFilters: string[];
  bannedDomains: string[];
  reportThreshold: number;
  
  // Gamification
  enableBadges: boolean;
  enableLeaderboards: boolean;
  xpMultiplier: number;
}

// Analytics for tribe admins
export interface TribeAnalytics {
  tribeId: string;
  period: 'day' | 'week' | 'month' | 'year';
  
  // Member metrics
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  retentionRate: number;
  
  // Content metrics
  totalPosts: number;
  postsPerDay: number;
  engagementRate: number;
  averageReactions: number;
  
  // Growth metrics
  memberGrowthRate: number;
  contentGrowthRate: number;
  viralityScore: number;
  
  // Demographics
  realmDistribution: Record<string, number>;
  ageDistribution: Record<string, number>;
  locationDistribution: Record<string, number>;
  
  // Time series data
  timeSeriesData: Array<{
    date: string;
    members: number;
    posts: number;
    engagement: number;
  }>;
}

export interface TribeDiscoveryItem {
  tribe: TribeDisplay;
  relevanceScore: number;
  recommendationReason: 'trending' | 'friends_joined' | 'similar_interests' | 'realm_match' | 'featured';
  mutualFriends?: Array<{
    id: string;
    username: string;
    nickname: string;
    avatar?: string;
  }>;
}

// Constants and enums
export const TRIBE_CATEGORIES = [
  'Tech',
  'Art',
  'Music',
  'Gaming',
  'Wellness',
  'Travel',
  'Photography',
  'Fashion',
  'Food',
  'Books',
  'Movies',
  'Sports',
  'Science',
  'Nature',
  'Business',
  'Education',
  'Anime',
  'Fitness',
  'Beauty',
  'Memes',
  'News',
  'Politics',
  'Philosophy',
  'History',
  'Language'
] as const;

export const CONTENT_TYPES = [
  'thought',
  'image',
  'video',
  'audio'
] as const;

export const BADGE_RARITIES = [
  'common',
  'rare', 
  'epic',
  'legendary'
] as const;

export const TRIBE_ROLES = [
  'member',
  'moderator',
  'admin',
  'owner'
] as const;

export const MODERATION_ACTIONS = [
  'warn',
  'mute',
  'kick',
  'ban',
  'hide_post',
  'remove_post',
  'lock_post'
] as const;

// Helper functions
export function getTribeRoleDisplayName(role: TribeRole): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'moderator':
      return 'Moderator';
    case 'member':
      return 'Member';
    default:
      return 'Member';
  }
}

export function getTribeRolePermissions(role: TribeRole): {
  canPost: boolean;
  canComment: boolean;
  canModerate: boolean;
  canInvite: boolean;
  canManageMembers: boolean;
  canEditTribe: boolean;
  canDeleteTribe: boolean;
} {
  const basePermissions = {
    canPost: true,
    canComment: true,
    canModerate: false,
    canInvite: false,
    canManageMembers: false,
    canEditTribe: false,
    canDeleteTribe: false
  };

  switch (role) {
    case 'owner':
      return {
        ...basePermissions,
        canModerate: true,
        canInvite: true,
        canManageMembers: true,
        canEditTribe: true,
        canDeleteTribe: true
      };
    case 'admin':
      return {
        ...basePermissions,
        canModerate: true,
        canInvite: true,
        canManageMembers: true,
        canEditTribe: true
      };
    case 'moderator':
      return {
        ...basePermissions,
        canModerate: true,
        canInvite: true
      };
    case 'member':
    default:
      return basePermissions;
  }
}

export function canUserPerformAction(
  userRole: TribeRole | undefined,
  action: 'post' | 'comment' | 'moderate' | 'invite' | 'manage_members' | 'edit_tribe' | 'delete_tribe'
): boolean {
  if (!userRole) return false;
  
  const permissions = getTribeRolePermissions(userRole);
  
  switch (action) {
    case 'post':
      return permissions.canPost;
    case 'comment':
      return permissions.canComment;
    case 'moderate':
      return permissions.canModerate;
    case 'invite':
      return permissions.canInvite;
    case 'manage_members':
      return permissions.canManageMembers;
    case 'edit_tribe':
      return permissions.canEditTribe;
    case 'delete_tribe':
      return permissions.canDeleteTribe;
    default:
      return false;
  }
}