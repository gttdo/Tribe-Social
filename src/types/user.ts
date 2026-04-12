// User types for the Tribe Board application

export type PublicProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  xp: number;
  created_at: string;
};

export type UserStats = {
  posts: number;
  followers: number;
  following: number;
};

export type UserProfileData = PublicProfile & {
  stats: UserStats;
  isFollowing?: boolean;
  isCurrentUser?: boolean;
};

// For backward compatibility with existing components
export interface UserInfo {
  method: 'email' | 'phone';
  contact: string;
  username: string;
  verified: boolean;
  joinDate: Date;
  xpPoints: number;
  notificationsEnabled: boolean;
  privacyMode: 'high' | 'medium' | 'low';
  selectedTheme?: string;
}

export interface UserResult {
  display_name: string;
  bio: string;
  xp: number;
  badges: string[];
  coreRealm?: 'mirrorcore' | 'embercore' | 'shadowcore';
  followerCount?: number;
  followingCount?: number;
  profile?: {
    selectedPortrait: number;
    frameId: string;
    glowColor: string;
    username: string;
    theme?: string;
  };
}