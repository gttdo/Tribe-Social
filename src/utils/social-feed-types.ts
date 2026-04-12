import { 
  PostWithDetails, 
  CommentWithDetails, 
  StoryWithDetails, 
  TribeWithDetails,
  PostType,
  ReactionType,
  Visibility,
  MediaDimensions
} from './supabase/database-types'

// Legacy FeedPost interface for backward compatibility with existing components
export interface FeedPost {
  id: string;
  username: string;
  nickname: string;
  avatar?: string | null; // User's profile image URL
  coreRealm: string;
  timestamp: string;
  caption: string;
  content?: string; // For thought posts - main text content
  imageUrl: string | null;
  mediaThumbnailUrl?: string | null; // Video thumbnail URL from database
  liked: boolean;
  bookmarked: boolean;
  likes: number;
  comments: FeedComment[];
  xpEarned: number;
  type: string;
  location?: string;
  
  // User relationship fields
  userId?: string; // Post author's user ID
  user_id?: string; // Alternative field name for user ID
  authorId?: string; // Clickable author ID for navigation
  authorName?: string; // Author name for navigation
  isFollowing?: boolean; // Whether current user follows the post author
  isFollowedBy?: boolean; // Whether the post author follows current user
  
  // New fields for UGC visibility system
  visibility?: 'public' | 'tribe' | 'private';
  tribeId?: string | null;
  tribeName?: string | null;
  hasPermissionError?: boolean;
}

// Legacy FeedComment interface for backward compatibility
export interface FeedComment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  coreRealm: string;
}

// Updated post type that extends the legacy interface
export interface EnhancedFeedPost extends FeedPost, PostWithDetails {
  // Additional display fields
  userDisplayName: string;
  userNickname: string;
  userAvatar?: string;
  
  // Interaction states
  isLiked: boolean;
  isBookmarked: boolean;
  userReactionType?: ReactionType;
  
  // Media display properties
  mediaThumbnails?: string[];
  mediaAspectRatio?: string;
  hasMultipleMedia?: boolean;
  
  // Visibility and access
  isVisible: boolean;
  canInteract: boolean;
}

export interface EnhancedFeedComment extends FeedComment, CommentWithDetails {
  // Additional display fields
  userDisplayName: string;
  userNickname: string;
  userAvatar?: string;
  
  // Interaction states
  isLiked: boolean;
  userReactionType?: ReactionType;
  
  // Threading
  depth: number;
  hasMoreReplies?: boolean;
  replyCount: number;
}

export interface FeedStory extends StoryWithDetails {
  // Additional display fields
  userDisplayName: string;
  userNickname: string;
  userAvatar?: string;
  coreRealm: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE' | null;
  
  // Story specific
  isViewed: boolean;
  isAnnouncement?: boolean;
  timeRemaining?: string;
  thumbnailUrl?: string;
}

export interface FeedTribe extends TribeWithDetails {
  // Display properties
  recentActivity: string;
  isJoined: boolean;
  isTrending?: boolean;
  bannerColor?: string;
  avatarUrl?: string;
  
  // Member interaction
  joinStatus: 'joined' | 'pending' | 'not_joined';
  canJoin: boolean;
  canPost: boolean;
}

// Legacy Story interface for backward compatibility
export interface Story {
  id: string;
  username: string;
  nickname: string;
  coreRealm: string;
  avatar?: string;
  mediaUrl: string;
  type: string;
  timestamp: string;
  viewed: boolean;
  hasPermissionError?: boolean;
  visibility?: 'public' | 'tribe' | 'private';
  tribeId?: string | null;
  tribeName?: string | null;
}

// Filter and view types
export type FeedView = 'general' | 'realm' | 'following' | 'tribe' | 'mirrorcore' | 'embercore' | 'shadowcore';
export type ContentFilter = 'all' | 'thoughts' | 'images' | 'videos' | 'audio';
export type TimeFilter = 'recent' | 'today' | 'week' | 'month' | 'all';

export interface FeedFilters {
  view: FeedView;
  contentType: ContentFilter;
  timeRange: TimeFilter;
  tribeId?: string;
  userId?: string;
  realm?: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE';
}

// Page and navigation types
export type Page = 'feed' | 'profile' | 'settings' | 'comments' | 'create' | 'user-profile' | 'store' | 'tribes' | 'stories' | 'discover';
export type FeedTab = 'feed' | 'profile' | 'settings' | 'comments' | 'create' | 'saved' | 'discover' | 'notifications' | 'edit-profile';

// Alias for backward compatibility
export type SocialFeedPost = FeedPost;

// Search types
export interface SearchResult {
  id: string;
  type: 'user' | 'post' | 'tribe' | 'hashtag';
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  coreRealm?: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE';
  verified?: boolean;
  memberCount?: number;
  postCount?: number;
  isJoined?: boolean;
}

// User profile for display
export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  coreRealm: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE' | null;
  avatarUrl?: string;
  bannerUrl?: string;
  followers: number;
  following: number;
  posts: number;
  bio: string;
  location?: string;
  website?: string;
  joinDate: string;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isOwn: boolean;
  isVerified?: boolean;
  xp: number;
  level: number;
  badges: string[];
  
  // Privacy and interaction
  canFollow: boolean;
  canMessage: boolean;
  canViewPosts: boolean;
}

// Interaction types
export interface InteractionCounts {
  likes: number;
  comments: number;
  shares: number;
  reactions: number;
  views?: number;
}

export interface ReactionSummary {
  total: number;
  breakdown: Record<ReactionType, number>;
  userReaction?: ReactionType;
  topReactions: Array<{
    type: ReactionType;
    count: number;
    users: Array<{
      id: string;
      username: string;
      avatar?: string;
    }>;
  }>;
}

// Story types
export interface StoryRing {
  userId: string;
  username: string;
  nickname: string;
  avatar?: string;
  coreRealm: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE' | null;
  hasUnviewed: boolean;
  isOwn: boolean;
  storyCount: number;
  latestStory?: FeedStory;
}

// Feed state and loading
export interface FeedState {
  posts: FeedPost[];
  stories: StoryRing[];
  tribes: FeedTribe[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error?: string;
  lastUpdated?: Date;
}

// Notification types
export interface FeedNotification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'tribe_invite' | 'story_view';
  fromUser: {
    id: string;
    username: string;
    nickname: string;
    avatar?: string;
  };
  targetPost?: {
    id: string;
    type: PostType;
    content?: string;
    thumbnail?: string;
  };
  targetTribe?: {
    id: string;
    name: string;
    avatar?: string;
  };
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

// Content creation types for quick actions
export interface QuickPostData {
  type: PostType;
  content?: string;
  mediaUrl?: string;
  tribeId?: string;
  visibility: Visibility;
}

// Analytics and insights (for tribe owners/admins)
export interface ContentInsights {
  postId: string;
  views: number;
  engagementRate: number;
  reachMetrics: {
    organic: number;
    tribal: number;
    cross_tribe: number;
  };
  demographicBreakdown: {
    realms: Record<string, number>;
    ageGroups: Record<string, number>;
  };
  timeSeriesData: Array<{
    timestamp: string;
    views: number;
    interactions: number;
  }>;
}

// Moderation types
export interface ModerationAction {
  id: string;
  type: 'hide' | 'remove' | 'warn' | 'ban';
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
  moderatorId: string;
  timestamp: string;
  isActive: boolean;
}

// Export legacy types for backward compatibility
export { PostType, ReactionType, Visibility };

// Constants for feed behavior
export const FEED_CONSTANTS = {
  POSTS_PER_PAGE: 10,
  STORIES_REFRESH_INTERVAL: 30000, // 30 seconds
  AUTO_REFRESH_INTERVAL: 60000, // 1 minute
  MAX_STORY_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  COMMENT_NESTING_LIMIT: 3,
  MAX_HASHTAGS_PER_POST: 10,
  MIN_SEARCH_QUERY_LENGTH: 2
};