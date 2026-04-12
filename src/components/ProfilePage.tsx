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
import { SafeBio, SafeUsername, SafePostContent } from './SafeText';
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

interface ProfilePageProps {
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

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  earned: boolean;
  earnedDate?: string;
  xpReward?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
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

const getAchievements = (userStats?: UserProfileData): Achievement[] => [
  {
    id: '1',
    name: 'Welcome Warrior',
    description: 'Joined the Tribe community',
    icon: Sparkles,
    color: 'neon-lilac',
    earned: true,
    earnedDate: '2 days ago',
    xpReward: 50,
    rarity: 'common'
  },
  {
    id: '2',
    name: 'First Post',
    description: 'Shared your first post',
    icon: Star,
    color: 'electric-blue',
    earned: (userStats?.post_count || 0) > 0,
    earnedDate: (userStats?.post_count || 0) > 0 ? '1 day ago' : undefined,
    xpReward: 100,
    rarity: 'common'
  },
  {
    id: '3',
    name: 'Social Butterfly',
    description: 'Created 10 posts in the feed',
    icon: Users,
    color: 'soft-blush',
    earned: (userStats?.post_count || 0) >= 10,
    earnedDate: (userStats?.post_count || 0) >= 10 ? '3 hours ago' : undefined,
    xpReward: 250,
    rarity: 'rare'
  },
  {
    id: '4',
    name: 'Level Up Legend',
    description: 'Reached level 5 in your journey',
    icon: Trophy,
    color: 'electric-blue',
    earned: (userStats?.level || 0) >= 5,
    earnedDate: (userStats?.level || 0) >= 5 ? '6 hours ago' : undefined,
    xpReward: 500,
    rarity: 'epic'
  }
];

export function ProfilePage({ 
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
}: ProfilePageProps) {
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

  // Handle post deletion
  const handlePostDeleted = (deletedPostId: string) => {
    setUserPosts(prev => prev.filter(post => post.id !== deletedPostId));
    
    // Update profileData post count
    if (profileData) {
      setProfileData(prev => prev ? { 
        ...prev, 
        post_count: Math.max(0, prev.post_count - 1) 
      } : null);
    }
    
    // Update the dedicated post count state
    setPostCount(prev => Math.max(0, prev - 1));
    
    toast.success('Post deleted successfully');
  };

  // Handle post editing from card menu
  const handleEditPost = (postId: string) => {
    console.log('✏️ ProfilePage: Edit post requested from card menu:', postId);
    
    // Navigate to create page with edit mode (future implementation)
    if (onNavigateToPage) {
      onNavigateToPage('create');
      // TODO: Pass postId to create page for editing
      toast.info('Post editing coming soon! ✏️');
    } else {
      toast.info('Post editing coming soon! ✏️');
    }
  };

  // Handle post deletion from card menu
  const handleDeletePost = async (postId: string) => {
    console.log('🗑️ ProfilePage: Delete post requested from card menu:', postId);
    
    try {
      // Get current user session for userId
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('Authentication required to delete post');
        return;
      }
      
      // Import the edge helper for deleting posts
      const { deletePost } = await import('../utils/edge');
      
      // Confirm deletion
      if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
      }
      
      // Show loading toast
      const loadingToast = toast.loading('Deleting post...');
      
      // Delete the post via API
      await deletePost(postId, session.user.id);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      
      // Update local state
      handlePostDeleted(postId);
      
    } catch (error) {
      console.error('Failed to delete post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Feature requires server deployment')) {
        toast.error('Delete feature requires server deployment. Contact support.');
      } else if (errorMessage.includes('Authentication')) {
        toast.error('Authentication failed. Please try logging in again.');
      } else {
        toast.error('Failed to delete post. Please try again.');
      }
    }
  };

  // Handle modal close with improved debouncing
  const handleModalClose = React.useCallback(() => {
    // Prevent multiple rapid close events
    if (isModalChanging) {
      console.log('Modal already changing, ignoring close');
      return;
    }

    console.log('Closing modal');
    setIsModalChanging(true);
    
    // Close the modal immediately
    setIsModalOpen(false);
    
    // Clear selected post and reset state after animation
    setTimeout(() => {
      setSelectedPost(null);
      setIsModalChanging(false);
    }, 250); // Slightly shorter delay for better responsiveness
  }, [isModalChanging]);

  // Handle post click - with improved debouncing and state management
  const handlePostClick = React.useCallback(async (post: UserPost) => {
    // Prevent multiple rapid clicks or if modal is changing
    if (isModalOpen || isModalChanging) {
      console.log('Modal already open/changing, ignoring click');
      return;
    }

    console.log('Opening post:', post.id);
    
    try {
      // Set changing state immediately to block additional clicks
      setIsModalChanging(true);
      
      // Set the selected post with proper structure
      setSelectedPost({ id: post.id } as any);
      
      // Use requestAnimationFrame for smoother handling
      requestAnimationFrame(() => {
        setIsModalOpen(true);
        
        // Reset changing state after modal is fully opened
        setTimeout(() => {
          setIsModalChanging(false);
        }, 200);
      });
      
    } catch (error) {
      console.error('Error opening post for editing:', error);
      setIsModalChanging(false);
      toast.error('Could not open post');
    }
  }, [isModalOpen, isModalChanging]);

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

  // Fetch post count as specified in requirements
  const fetchPostCount = async () => {
    try {
      // 1) Ensure auth session exists
      const { data: { session } } = await supabase.auth.getSession();
      let currentProfileId = profileId;
      
      if (!currentProfileId) {
        currentProfileId = session?.user?.id ?? null;
      }
      
      if (!currentProfileId) {
        setPostCountError('No profile id');
        return;
      }

      // 2) Fetch count only (no rows)
      setPostCountLoading(true);
      setPostCountError(''); // Clear any previous errors
      
      const { count, error } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentProfileId);

      // 3) Handle result
      if (error) {
        setPostCountError(error.message);
        setPostCount(0);
      } else {
        setPostCount(count ?? 0);
        setPostCountError('');
      }
    } catch (error) {
      console.error('Error fetching post count:', error);
      setPostCountError(error instanceof Error ? error.message : 'Unknown error');
      setPostCount(0);
    } finally {
      setPostCountLoading(false);
    }
  };

  // Fetch user posts with fallback
  const fetchUserPosts = async (userId: string) => {
    try {
      // First try edge function
      try {
        const { edgeGet } = await import('../utils/edge');
        const data = await edgeGet<{ posts: any[] }>(`/users/${userId}/posts`);
        
        if (data && data.posts && Array.isArray(data.posts)) {
          const formattedPosts = data.posts.map((post: any) => ({
            id: post.id,
            caption: post.text_body || post.content || post.caption || '',
            timestamp: formatTimestamp(post.created_at || post.createdAt),
            likes: post.like_count || post.likes || 0,
            comments: post.comment_count || post.comments || 0,
            imageUrl: post.media_thumb_url || post.media_url || post.thumbnail_url || post.contentUrl,
            type: post.type || (post.media_url ? 'image' : 'thought'),
            mediaType: post.media_type
          }));

          setUserPosts(formattedPosts);
          
          if (profileData) {
            setProfileData(prev => prev ? { ...prev, post_count: formattedPosts.length } : null);
          }
          return;
        }
      } catch (edgeError) {
        console.log('Edge function not available, trying direct database query:', edgeError);
      }

      // Fallback to direct database query
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) {
        throw postsError;
      }

      const formattedPosts = (postsData || []).map((post: any) => ({
        id: post.id,
        caption: post.text_body || post.content || post.caption || '',
        timestamp: formatTimestamp(post.created_at),
        likes: post.like_count || 0,
        comments: post.comment_count || 0,
        imageUrl: post.media_url || post.thumbnail_url,
        type: post.post_type || (post.media_url ? 'image' : 'thought'),
        mediaType: post.media_type
      }));

      setUserPosts(formattedPosts);
      
      if (profileData) {
        setProfileData(prev => prev ? { ...prev, post_count: formattedPosts.length } : null);
      }

    } catch (error) {
      console.error('Error fetching posts:', error);
      setUserPosts([]);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
        await Promise.all([
          fetchProfileData(userId),
          fetchUserPosts(userId)
        ]);
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
              console.log('Bio persistence verified successfully');
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

  // Handle avatar update
  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    // Optimistically update the profile data
    setProfileData(prev => prev ? { 
      ...prev, 
      profile_image_url: newAvatarUrl 
    } : null);
    
    toast.success('Profile picture updated successfully! 🎉');
    
    // Refresh profile data to ensure we have the latest
    if (uid) {
      try {
        await fetchProfileData(uid);
      } catch (error) {
        console.warn('Failed to refresh profile data after avatar update:', error);
      }
    }
  };

  // Handle opening avatar dialog
  const handleAvatarClick = () => {
    if (uid && isOwnProfile) {
      setIsAvatarDialogOpen(true);
    }
  };

  // Handle edit profile
  const handleEditProfile = () => {
    if (onNavigateToPage) {
      onNavigateToPage('edit-profile');
    }
  };

  // Handle share profile
  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/users/${profileData?.username || uid}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profileData?.username}'s Tribe Profile`,
          text: profileData?.description || `Check out ${profileData?.username}'s profile on Tribe Board!`,
          url: profileUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied to clipboard! 📋');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        toast.error('Failed to copy link');
      }
    }
  };

  // Handle follow change - refresh profile data when user follows someone
  const handleFollowChange = useCallback((targetUserId: string, isFollowing: boolean) => {
    // When this user follows someone else, their following count should increase
    if (profileData) {
      setProfileData(prev => prev ? {
        ...prev,
        following_count: isFollowing 
          ? prev.following_count + 1 
          : Math.max(0, prev.following_count - 1)
      } : null);
    }
    
    // Also call the parent callback if provided
    if (onFollowChange) {
      onFollowChange(targetUserId, isFollowing);
    }
  }, [profileData, onFollowChange]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Fetch post count when profileId changes
  useEffect(() => {
    if (profileId) {
      fetchPostCount();
    }
  }, [profileId]);

  // Load saved posts when saved tab becomes active (with debouncing)
  useEffect(() => {
    console.log('🔖 ProfilePage: Tab changed to:', activeTab);
    console.log('🔖 ProfilePage: onLoadSavedPosts available:', !!onLoadSavedPosts);
    
    if (activeTab === 'saved' && onLoadSavedPosts) {
      console.log('🔖 ProfilePage: Triggering saved posts load...');
      
      // Add a small delay to prevent rapid re-triggering
      const loadTimer = setTimeout(() => {
        onLoadSavedPosts().catch(error => {
          console.error('🔖 ProfilePage: Load saved posts failed:', error);
        });
      }, 100);
      
      return () => clearTimeout(loadTimer);
    } else if (activeTab === 'saved') {
      console.log('🔖 ProfilePage: Saved tab active but no onLoadSavedPosts function');
    }
  }, [activeTab]); // Removed onLoadSavedPosts from deps to prevent re-triggering

  // Create achievements based on current post count
  const achievementsData = profileData ? { ...profileData, post_count: postCount } : undefined;
  const achievements = getAchievements(achievementsData);
  const earnedAchievements = achievements.filter(a => a.earned);

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
          
          <h1 className="font-headline text-pearl-white text-lg sm:text-xl">My Profile</h1>
          
          {onNavigateToPage && (
            <button
              onClick={() => onNavigateToPage('settings')}
              className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300 touch-target"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
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
              <div className="flex items-center space-x-6 sm:space-x-8">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-medium text-pearl-white">
                    {postCountLoading ? '…' : safeFormatCount(postCount)}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-lavender">
                    posts
                  </div>
                  {/* Optional error display */}
                  {postCountError && !postCountLoading && (
                    <div className="text-xs text-glitch-red mt-1" title={postCountError}>
                      Error
                    </div>
                  )}
                </div>
                <button className="text-center hover:opacity-80 transition-opacity">
                  <div className="text-lg sm:text-xl font-medium text-pearl-white">
                    {safeFormatCount(profileData?.follower_count || 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-lavender">
                    followers
                  </div>
                </button>
                <button className="text-center hover:opacity-80 transition-opacity">
                  <div className="text-lg sm:text-xl font-medium text-pearl-white">
                    {safeFormatCount(profileData?.following_count || 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-lavender">
                    following
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="space-y-2">
            <div className="text-sm text-pearl-white">
              {profileData?.description || ''}
            </div>
          </div>

          {/* XP Progress Bar */}
          {profileData && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-lavender">XP Progress</span>
                <span className="text-xs text-muted-lavender">
                  {profileData.xp_points} XP
                </span>
              </div>
              <LevelProgressBar 
                xp={profileData.xp_points}
                variant="full"
                hideLevelBadge={true}
              />
            </div>
          )}

          {/* Action Buttons */}
          {uid && isOwnProfile && (
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleEditProfile}
                variant="secondary"
                className="flex-1 bg-muted-lavender/10 border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/20"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit profile
              </Button>
              <Button
                onClick={handleShareProfile}
                variant="secondary"
                className="flex-1 bg-muted-lavender/10 border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/20"
              >
                <Share className="w-4 h-4 mr-2" />
                Share profile
              </Button>
            </div>
          )}
          
          {/* Follow Button for Other Profiles */}
          {uid && !isOwnProfile && (
            <div className="flex items-center space-x-3">
              <Button
                className="flex-1 bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Follow
              </Button>
              <Button
                onClick={handleShareProfile}
                variant="secondary"
                className="bg-muted-lavender/10 border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/20"
              >
                <Share className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-midnight-black/50 border border-muted-lavender/20 p-1 h-auto">
            <TabsTrigger 
              value="posts" 
              className="flex flex-col sm:flex-row items-center justify-center py-2 px-2 data-[state=active]:bg-neon-lilac/20 data-[state=active]:text-neon-lilac text-xs sm:text-sm min-h-[2.5rem] sm:min-h-[3rem] gap-1 sm:gap-2"
            >
              <List className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Posts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="achievements" 
              className="flex flex-col sm:flex-row items-center justify-center py-2 px-2 data-[state=active]:bg-electric-blue/20 data-[state=active]:text-electric-blue text-xs sm:text-sm min-h-[2.5rem] sm:min-h-[3rem] gap-1 sm:gap-2"
            >
              <Trophy className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm hidden xs:block">Achievements</span>
              <span className="text-xs sm:text-sm xs:hidden">Awards</span>
            </TabsTrigger>
            <TabsTrigger 
              value="saved" 
              className="flex flex-col sm:flex-row items-center justify-center py-2 px-2 data-[state=active]:bg-soft-blush/20 data-[state=active]:text-soft-blush text-xs sm:text-sm min-h-[2.5rem] sm:min-h-[3rem] gap-1 sm:gap-2"
            >
              <Bookmark className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Saved</span>
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab Content */}
          <TabsContent value="posts" className="space-y-4 mt-6">
            <ProfilePostsSection
              posts={userPosts}
              loading={loading}
              onPostClick={handlePostClick}
              onCreatePost={onNavigateToPage ? () => onNavigateToPage('create') : undefined}
              isOwnProfile={isOwnProfile}
              onEditPost={handleEditPost}
              onDeletePost={handleDeletePost}
            />
          </TabsContent>

          {/* Achievements Tab Content */}
          <TabsContent value="achievements" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {earnedAchievements.map((achievement) => (
                <Card key={achievement.id} className="bg-gradient-to-br from-midnight-black/80 to-midnight-black/60 border-muted-lavender/30">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg bg-${achievement.color}/20`}>
                        <achievement.icon className={`w-5 h-5 text-${achievement.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-pearl-white">{achievement.name}</h3>
                        <p className="text-sm text-muted-lavender mt-1">{achievement.description}</p>
                        {achievement.earnedDate && (
                          <p className="text-xs text-muted-lavender/70 mt-2">
                            Earned {achievement.earnedDate}
                          </p>
                        )}
                        {achievement.xpReward && (
                          <div className="flex items-center space-x-1 mt-2">
                            <Zap className="w-3 h-3 text-electric-blue" />
                            <span className="text-xs text-electric-blue">+{achievement.xpReward} XP</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {earnedAchievements.length === 0 && (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-muted-lavender/50 mx-auto mb-3" />
                <h3 className="text-pearl-white font-medium mb-2">No achievements yet</h3>
                <p className="text-muted-lavender/70 text-sm">
                  Start posting and engaging with the community to earn your first achievements!
                </p>
              </div>
            )}
          </TabsContent>

          {/* Saved Tab Content */}
          <TabsContent value="saved" className="space-y-4 mt-6">
            <SavedPostsGrid
              savedList={savedList}
              savedLoading={savedLoading}
              savedError={savedError}
              onPostClick={handlePostClick}
              onLoadSavedPosts={onLoadSavedPosts}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Post Detail Drawer */}
      {selectedPost && (
        <SimplePostDetailsDrawer
          postId={selectedPost.id}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          userInfo={userInfo}
          onPostDeleted={handlePostDeleted}
          onEditPost={(postId) => {
            console.log('✏️ ProfilePage: Edit post requested:', postId);
            // Close the drawer
            handleModalClose();
            // Navigate to create page with edit mode (future implementation)
            toast.info('Post editing coming soon! ✏️');
          }}
        />
      )}

      {/* Avatar Upload Dialog */}
      {uid && (
        <AvatarUploadDialog
          isOpen={isAvatarDialogOpen}
          onClose={() => setIsAvatarDialogOpen(false)}
          onAvatarUpdate={handleAvatarUpdate}
          userId={uid}
          currentAvatarUrl={profileData?.profile_image_url}
        />
      )}
    </div>
  );
}