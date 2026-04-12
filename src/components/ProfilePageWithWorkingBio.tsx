import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Skeleton } from './ui/skeleton';
import { ProfilePostsSection } from './ProfilePostsSection';
import { SavedPostsGrid } from './SavedPostsGrid';
import { SimplePostDetailsDrawer } from './SimplePostDetailsDrawer';

import { AvatarUploadDialog } from './AvatarUploadDialog';
import { BioEditor } from './BioEditor';
import { SafeUsername } from './SafeText';
import { LevelProgressBar, UserLevelInfo } from './LevelProgressBar';
import { getLevelInfo } from '../utils/level';
import { safeFormatCount } from '../utils/safe-rendering';
import { 
  ArrowLeft, 
  Settings, 
  Star,
  Sparkles,
  Award,
  List,
  Heart,
  MessageCircle,
  Bookmark,
  TrendingUp,
  Users,
  Calendar,
  RefreshCw,
  AlertCircle,
  Trophy,
  Crown,
  Zap,
  Target,
  Plus,
  Camera,
  Share,
  Edit3,
  UserPlus
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { UserResult, UserInfo } from '../App';
import { FeedPost, FeedComment } from '../utils/social-feed-types';
import { toast } from 'sonner@2.0.3';
import { guardUUID } from '../utils/uuid';

interface ProfilePageWithWorkingBioProps {
  userResult?: UserResult | null;
  userInfo: UserInfo | null;
  onBack: () => void;
  onLogout?: () => void;
  onNavigateToPage?: (page: string) => void;
  isOwnProfile?: boolean;
  // Bookmark system props
  savedList?: any[];
  savedLoading?: boolean;
  savedError?: string;
  onLoadSavedPosts?: () => Promise<void>;
  // Follow change callback
  onFollowChange?: (targetUserId: string, isFollowing: boolean) => void;
}

interface UserProfileData {
  username: string;
  profile_image_url?: string;
  level: number;
  xp_points: number;
  post_count: number;
  follower_count: number;
  following_count: number;
  description?: string;
}

interface UserPost {
  id: string;
  caption: string;
  timestamp: string;
  likes: number;
  comments: number;
  imageUrl?: string;
  type?: 'image' | 'video' | 'audio' | 'thought';
  mediaType?: string;
}

export function ProfilePageWithWorkingBio({ 
  userResult, 
  userInfo, 
  onBack, 
  onLogout, 
  onNavigateToPage, 
  isOwnProfile = true,
  // Bookmark system props
  savedList = [],
  savedLoading = false,
  savedError = '',
  onLoadSavedPosts,
  // Follow change callback
  onFollowChange
}: ProfilePageWithWorkingBioProps) {
  const [activeTab, setActiveTab] = useState('posts');
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Add debouncing for modal state changes
  const [isModalChanging, setIsModalChanging] = useState(false);
  
  // Avatar upload state
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  // Post count variables as specified
  const [postCount, setPostCount] = useState<number>(0);
  const [postCountLoading, setPostCountLoading] = useState<boolean>(false);
  const [postCountError, setPostCountError] = useState<string>('');
  const [profileId, setProfileId] = useState<string | null>(null);

  // Get theme colors
  const getThemeColors = () => {
    const selectedTheme = userInfo?.selectedTheme || userResult?.profile?.theme;
    const themeColors = {
      'crystal-pink': { primary: 'glitch-red', secondary: 'soft-blush' },
      'crystal-cyan': { primary: 'electric-blue', secondary: 'neon-lilac' },
      'soft-lavender': { primary: 'neon-lilac', secondary: 'electric-blue' },
      default: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    return themeColors[selectedTheme as keyof typeof themeColors] || themeColors.default;
  };

  const themeColors = getThemeColors();

  // Create fallback profile data
  const createFallbackProfileData = (): UserProfileData => {
    const xp = userResult?.xp ?? userInfo?.xpPoints ?? 100;
    const levelInfo = getLevelInfo(xp);
    
    return {
      username: userResult?.nickname || userInfo?.username || 'Tribe Member',
      profile_image_url: undefined,
      level: levelInfo.level,
      xp_points: xp,
      post_count: 0,
      follower_count: userResult?.followerCount || 0,
      following_count: userResult?.followingCount || 0
    };
  };

  // Check authentication
  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setProfileData(createFallbackProfileData());
        return null;
      }
      
      const validUserId = guardUUID(session.user.id, 'ProfilePage checkAuth');
      if (!validUserId) {
        setProfileData(createFallbackProfileData());
        return null;
      }
      
      setUid(validUserId);
      setProfileId(validUserId); // Set profileId for post count
      return validUserId;
    } catch (error) {
      console.error('Auth check failed:', error);
      setProfileData(createFallbackProfileData());
      return null;
    }
  };

  // Fetch profile data including bio from the profiles table
  const fetchProfileData = async (userId: string) => {
    try {
      // First try to get profile data via edge function
      try {
        const { edgeGet } = await import('../utils/edge');
        const profileResponse = await edgeGet('/users/profile');
        
        if (profileResponse && profileResponse.profile) {
          const profile = profileResponse.profile;
          setProfileData({
            username: profile.username || 'Unknown User',
            profile_image_url: profile.profileImageUrl,
            level: profile.level || 1,
            xp_points: profile.xp || 100,
            post_count: 0, // Will be updated when posts load
            follower_count: profile.followerCount || 0,
            following_count: profile.followingCount || 0,
            description: profile.bio || profile.description || ''
          });
          return;
        }
      } catch (edgeError) {
        console.log('Edge function profile fetch failed, trying direct database query:', edgeError);
      }

      // Fallback to direct database queries
      const [usersResult, profilesResult] = await Promise.allSettled([
        supabase
          .from('users')
          .select('id, username, profile_image_url, xp, level, follower_count, following_count')
          .eq('id', userId)
          .single(),
        supabase
          .from('profiles')
          .select('bio')
          .eq('id', userId)
          .single()
      ]);

      let userData = null;
      let profileData = null;

      if (usersResult.status === 'fulfilled' && !usersResult.value.error) {
        userData = usersResult.value.data;
      }

      if (profilesResult.status === 'fulfilled' && !profilesResult.value.error) {
        profileData = profilesResult.value.data;
      }

      if (userData) {
        setProfileData({
          username: userData.username || 'Unknown User',
          profile_image_url: userData.profile_image_url,
          level: userData.level || 1,
          xp_points: userData.xp || 100,
          post_count: 0, // Will be updated when posts load
          follower_count: userData.follower_count || 0,
          following_count: userData.following_count || 0,
          description: profileData?.bio || ''
        });
      } else {
        // Use fallback data if database queries fail
        setProfileData(createFallbackProfileData());
      }

    } catch (error) {
      console.error('Error fetching profile data:', error);
      setProfileData(createFallbackProfileData());
    }
  };

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const userId = await checkAuth();
      if (userId) {
        await fetchProfileData(userId);
      } else {
        setProfileData(createFallbackProfileData());
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      setProfileData(createFallbackProfileData());
    } finally {
      setLoading(false);
    }
  };

  // Enhanced bio update handler with persistence verification
  const handleBioUpdate = async (newBio: string) => {
    if (!profileData) return;
    
    console.log('🔄 ProfilePageWithWorkingBio: Bio update requested:', { newBio });
    
    // Optimistic update
    const previousBio = profileData.description;
    setProfileData(prev => prev ? { ...prev, description: newBio } : null);
    
    try {
      // Verify the update persisted after a short delay
      setTimeout(async () => {
        try {
          // Check if the bio is actually saved by refreshing data
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: updatedProfile, error } = await supabase
              .from('profiles')
              .select('bio')
              .eq('id', user.id)
              .single();
              
            if (error) {
              console.warn('Could not verify bio persistence:', error);
              return;
            }
            
            const savedBio = updatedProfile.bio || '';
            
            // If the saved bio doesn't match what we expect, revert
            if (savedBio !== newBio) {
              console.warn('Bio persistence verification failed, reverting...');
              setProfileData(prev => prev ? { ...prev, description: previousBio } : null);
              toast.error('Bio update may not have saved properly. Please try again.');
            } else {
              console.log('✅ Bio persistence verified successfully');
              toast.success('Bio updated successfully! 🎉');
            }
          }
        } catch (verifyError) {
          console.warn('Bio persistence verification error:', verifyError);
        }
      }, 2000); // Check after 2 seconds
      
    } catch (error) {
      console.error('Bio update verification setup failed:', error);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-midnight-black pb-safe mobile-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/90 soft-blur border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
          <button
            onClick={onBack}
            className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300 touch-target"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <h1 className="font-headline text-pearl-white text-lg sm:text-xl">Profile with Working Bio</h1>
          
          <button
            onClick={() => window.location.reload()}
            className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300 touch-target"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Profile Header */}
        <div className="space-y-4">
          {/* Avatar and Username Section */}
          <div className="flex items-start space-x-4 sm:space-x-6">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                <AvatarImage src={profileData?.profile_image_url} />
                <AvatarFallback className={`bg-gradient-to-r from-${themeColors.primary} to-${themeColors.secondary} text-midnight-black text-lg sm:text-xl`}>
                  {profileData?.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Username and Stats */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Username and Level */}
              <div className="space-y-1">
                <SafeUsername 
                  username={profileData?.username || 'Loading...'}
                  className="text-xl sm:text-2xl font-medium text-pearl-white"
                />
                
                {profileData && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={`border-${themeColors.primary} text-${themeColors.primary} bg-${themeColors.primary}/10`}>
                      Level {profileData.level}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-pearl-white">{safeFormatCount(postCount)}</div>
                  <div className="text-xs text-muted-lavender">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-pearl-white">{safeFormatCount(profileData?.follower_count || 0)}</div>
                  <div className="text-xs text-muted-lavender">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-pearl-white">{safeFormatCount(profileData?.following_count || 0)}</div>
                  <div className="text-xs text-muted-lavender">Following</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Editor Section - THIS IS THE KEY CHANGE */}
          {uid && profileData && (
            <BioEditor
              userId={uid}
              currentBio={profileData.description || ''}
              onBioUpdate={handleBioUpdate}
              className="mb-4"
              username={profileData.username}
            />
          )}
        </div>

        {/* Demo Information */}
        <Card className="bg-midnight-black/50 border-electric-blue/30">
          <CardContent className="p-4">
            <div className="space-y-3">
              <h3 className="text-electric-blue font-medium">✅ Working Bio Editor</h3>
              <p className="text-muted-lavender text-sm">
                This is a demonstration of the ProfilePage with the BioEditor properly integrated. 
                The bio editor above should be fully functional with:
              </p>
              <ul className="text-muted-lavender text-sm space-y-1 list-disc list-inside">
                <li>Edit Bio button that opens the editor</li>
                <li>Save Bio button that actually saves changes</li>
                <li>Real-time character counter</li>
                <li>Validation and error handling</li>
                <li>Auto-close after successful save</li>
              </ul>
              
              <div className="mt-4 p-3 bg-midnight-black/30 rounded border border-muted-lavender/20">
                <h4 className="text-neon-lilac font-medium mb-2">To fix your main ProfilePage:</h4>
                <ol className="text-sm text-muted-lavender space-y-1">
                  <li>1. Find the SafeBio component in ProfilePage.tsx</li>
                  <li>2. Replace it with the BioEditor component (like above)</li>
                  <li>3. Make sure handleBioUpdate is properly connected</li>
                  <li>4. Ensure uid and profileData are passed correctly</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}