export interface UserResult {
  nickname: string;
  description: string;
  xp: number;
  badges: string[];
  coreRealm?: CoreRealm; // Make coreRealm optional since not all users may have it set
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

export interface UserInfo {
  id?: string;
  method: 'email' | 'phone';
  contact: string;
  username: string;
  verified: boolean;
  joinDate: Date;
  xpPoints: number;
  notificationsEnabled: boolean;
  privacyMode: 'high' | 'medium' | 'low';
  selectedTheme?: string;
  description?: string;
  updatedAt?: string | null;
  // NOTE: Avatar is now handled exclusively by Supabase profiles.avatar_url + avatar_version
  // Removed: profileImageUrl - use database-first avatar system instead
}

export type CoreRealm = 'mirrorcore' | 'embercore' | 'shadowcore';

export type AppView = 'landing' | 'signup' | 'login' | 'debug-login' | 'theme-selection' | 'tribe-discovery' | 'profile' | 'social' | 'url-route' | 'backend-test';

export const STORAGE_KEYS = {
  USER_INFO: 'tribe_user_info',
  USER_RESULT: 'tribe_user_result',
  CURRENT_VIEW: 'tribe_current_view',
  CURRENT_PAGE: 'tribe_current_page'
} as const;

export const createFallbackUserInfo = (savedUserInfo?: UserInfo | null): UserInfo => ({
  method: 'email',
  contact: 'unknown@example.com',
  username: 'Tribe Member',
  verified: false,
  joinDate: new Date(),
  xpPoints: 100,
  notificationsEnabled: true,
  privacyMode: 'medium',
  ...savedUserInfo
});

export const createFallbackUserResult = (savedUserResult?: UserResult | null, fallbackUserInfo?: UserInfo): UserResult => ({
  nickname: 'New Tribe Member',
  description: 'Welcome to the Tribe community!',
  xp: 100,
  badges: ['New Member'],
  profile: {
    selectedPortrait: 1,
    frameId: 'default',
    glowColor: '#C084FC',
    username: fallbackUserInfo?.username || 'Tribe Member',
    theme: 'soft-lavender'
  },
  ...savedUserResult
});

export const createEmergencyUserInfo = (): UserInfo => ({
  method: 'email',
  contact: 'offline@tribe.local',
  username: 'Offline User',
  verified: false,
  joinDate: new Date(),
  xpPoints: 0,
  notificationsEnabled: false,
  privacyMode: 'high'
});

export const createEmergencyUserResult = (): UserResult => ({
  nickname: 'Offline Tribe Member',
  description: 'Using Tribe in offline mode.',
  xp: 0,
  badges: ['Offline Mode'],
  profile: {
    selectedPortrait: 1,
    frameId: 'default',
    glowColor: '#C084FC',
    username: 'Offline User',
    theme: 'soft-lavender'
  }
});