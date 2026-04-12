export type StoryMediaType = 'image' | 'video';

export interface Story {
  id: string;
  user_id: string;
  tribe_id?: string | null;
  media_url: string;
  media_type: StoryMediaType;
  caption?: string | null;
  media_width?: number | null;
  media_height?: number | null;
  duration_seconds?: number | null;
  created_at: string;
  expires_at: string;
  // Computed/joined fields
  author?: {
    id: string;
    username?: string;
    nickname?: string;
    avatar_url?: string;
    is_private?: boolean; // Flag to indicate fallback private user data
  };
  tribe?: {
    id: string;
    name: string;
    icon_url?: string;
    avatar_url?: string; // Alternative field name used in some contexts
    is_private?: boolean; // Flag to indicate fallback private tribe data
  };
  view_count?: number;
  has_viewed?: boolean;
  user_reaction?: StoryReaction | null;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  viewed_at: string;
  viewer?: {
    id: string;
    username?: string;
    nickname?: string;
    avatar_url?: string;
  };
}

export interface StoryReaction {
  id: string;
  story_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
  user?: {
    id: string;
    username?: string;
    nickname?: string;
    avatar_url?: string;
  };
}

export interface StoryGroup {
  user_id: string;
  user: {
    id: string;
    username?: string;
    nickname?: string;
    avatar_url?: string;
    is_private?: boolean; // Flag to indicate fallback private user data
  };
  tribe_id?: string | null;
  tribe?: {
    id: string;
    name: string;
    icon_url?: string;
    avatar_url?: string; // Alternative field name used in some contexts
    is_private?: boolean; // Flag to indicate fallback private tribe data
  };
  stories: Story[];
  has_new_stories: boolean;
  latest_story_time: string;
}

export interface CreateStoryRequest {
  media_file: File;
  caption?: string;
  tribe_id?: string | null;
  media_type: StoryMediaType;
}

export interface StoryCreateResponse {
  success: boolean;
  story?: Story;
  error?: string;
}

export interface StoryViewRequest {
  story_id: string;
}

export interface StoryReactionRequest {
  story_id: string;
  reaction: string;
}

// Story privacy settings
export type StoryPrivacyLevel = 'public' | 'tribe' | 'followers';

export interface StoryPrivacySettings {
  default_privacy: StoryPrivacyLevel;
  allow_replies: boolean;
  allow_reactions: boolean;
  auto_archive: boolean;
}

// Story creation constants
export const STORY_CONSTANTS = {
  MAX_DURATION_SECONDS: 60, // 60 seconds max for videos
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB max file size
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  EXPIRY_HOURS: 24,
  MAX_CAPTION_LENGTH: 250
} as const;

// Story viewing state
export interface StoryViewerState {
  currentStoryIndex: number;
  currentGroupIndex: number;
  isPlaying: boolean;
  progress: number;
  showReactions: boolean;
  showInfo: boolean;
}