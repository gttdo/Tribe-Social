import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Skeleton } from './ui/skeleton';
import { FollowButton } from './FollowButton';
import { SafeBio, SafeUsername } from './SafeText';
import { BioEditor } from './BioEditor';
import { LevelProgressBar } from './LevelProgressBar';
import { ProfilePostsSection } from './ProfilePostsSection';
import { SavedPostsGrid } from './SavedPostsGrid';
import { ProfilePostDetailDrawer } from './ProfilePostDetailDrawer';
import { useAvatarRefresh, useUserAvatarWithRefresh } from '../utils/avatar-refresh-context';
import { 
  ArrowLeft, 
  Settings, 
  Trophy,
  Share,
  Edit3,
  Camera
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { UserResult, UserInfo } from '../App';
import { toast } from 'sonner@2.0.3';
import { guardUUID } from '../utils/uuid';
import { AvatarUploadDialog } from './AvatarUploadDialog';
import { STORAGE_BUCKETS } from '../utils/storage-constants';

interface UnifiedProfilePageProps {
  userResult?: UserResult | null;
  userInfo: UserInfo | null;
  userId?: string | null; // For public profiles
  onBack: () => void;
  onNavigateToPage?: (page: string) => void;
  // Bookmark system props
  savedList?: any[];
  savedLoading?: boolean;
  savedError?: string;
  onLoadSavedPosts?: () => Promise<void>;
  savedSet?: string[];
  onToggleBookmark?: (postId: string) => Promise<string>;
  // Follow change callback
  onFollowChange?: (targetUserId: string, isFollowing: boolean) => void;
}

// Profile data structure for database-first approach
interface ProfileData {
  id: string;
  username: string;
  bio: string;
  avatar_url?: string;
  avatar_version?: number;
}

export function UnifiedProfilePage({ 
  userResult, 
  userInfo, 
  userId,
  onBack, 
  onNavigateToPage, 
  // Bookmark system props
  savedList = [],
  savedLoading = false,
  savedError = '',
  onLoadSavedPosts,
  savedSet = [],
  onToggleBookmark,
  // Follow change callback
  onFollowChange
}: UnifiedProfilePageProps) {
  const [activeTab, setActiveTab] = useState('posts');
  
  // New database-first profile state variables as requested
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileAvatarSrc, setProfileAvatarSrc] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string>('');
  
  // Avatar refresh context
  const { triggerAvatarRefresh } = useAvatarRefresh();
  
  // Additional state for posts and counts
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [profileCounts, setProfileCounts] = useState({
    posts_count: 0,
    followers_count: 0,
    following_count: 0
  });
  
  // Session and ownership state
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  
  // Use refreshable avatar for the profile display (pass profileId once it's set)
  const profileAvatarData = useUserAvatarWithRefresh(profileId);
  
  // Avatar upload dialog state
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  
  // Post detail drawer state
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false);

  // Database-first profile loader as suggested
  const loadProfile = useCallback(async () => {
    console.log('🔄 Starting database-first profile load...');
    
    setProfileLoading(true);
    setProfileError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const routeUserId = userId; // Route param for public profile
      const profileId = routeUserId ?? session?.user?.id;

      if (!profileId) {
        setProfile(null);
        setProfileAvatarSrc('');
        setProfileLoading(false);
        setProfileError('No profile ID available');
        return;
      }

      // Set ownership status
      const isOwnerProfile = !!session?.user?.id && profileId === session.user.id;
      setIsOwner(isOwnerProfile);
      setProfileId(profileId);

      console.log('🔄 Loading profile for ID:', profileId.substring(0, 8) + '...', { isOwner: isOwnerProfile });

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, bio, avatar_url, avatar_version')
        .eq('id', profileId)
        .maybeSingle();

      if (error) {
        console.error('❌ Profile load error:', error);
        setProfileError(error.message);
        setProfileLoading(false);
        return;
      }

      if (!data) {
        console.log('ℹ️ No profile data found for ID:', profileId.substring(0, 8) + '...');
        
        // Try to get basic user info from auth.users if this is the current user
        const isOwnerProfile = !!session?.user?.id && profileId === session.user.id;
        if (isOwnerProfile && session?.user) {
          console.log('🔧 Attempting to create missing profile for current user...');
          
          // Create a basic profile entry
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: profileId,
              display_name: session.user.email?.split('@')[0] || 'User',
              bio: null
            })
            .select('id, display_name, bio, avatar_url, avatar_version')
            .single();
          
          if (!createError && newProfile) {
            console.log('✅ Created new profile for user');
            setProfile(newProfile);
            setProfileAvatarSrc(''); // No avatar initially
            setProfileLoading(false);
            return;
          } else {
            console.error('Failed to create profile:', createError);
          }
        }
        
        // If we can't create a profile or this isn't the owner, show error
        setProfileError('Profile not found');
        setProfileLoading(false);
        return;
      }

      console.log('✅ Profile loaded from database:', {
        hasData: !!data,
        hasAvatar: !!data?.avatar_url,
        avatarVersion: data?.avatar_version
      });

      // Transform the data to use consistent field names
      const profileData = {
        id: data.id,
        username: data.display_name || 'Unknown User',
        bio: data.bio || '',
        avatar_url: data.avatar_url,
        avatar_version: data.avatar_version
      };
      
      setProfile(profileData);

      // Build usable image URL with cache-bust as suggested
      let src = data?.avatar_url ?? '';
      if (src) {
        if (src.startsWith('http')) {
          // Absolute URL - add version parameter
          src = `${src}?v=${data.avatar_version ?? 0}`;
        } else {
          // Stored as path in the avatars bucket
          const { data: pub } = supabase.storage
            .from(STORAGE_BUCKETS.AVATARS)
            .getPublicUrl(src, { 
              transform: { width: 256, height: 256, resize: 'cover' } 
            });
          src = `${pub.publicUrl}?v=${data.avatar_version ?? 0}`;
        }
      }
      
      setProfileAvatarSrc(src);
      console.log('🖼️ Profile avatar src set:', src || 'No avatar');

      // Load profile counts with fallback
      await loadProfileCounts(profileId);

      // Load user posts
      await loadUserPosts(profileId);

      setProfileLoading(false);

    } catch (error) {
      console.error('❌ Profile load failed:', error);
      setProfileError('Failed to load profile');
      setProfileLoading(false);
    }
  }, [userId]);

  // Load profile counts using direct counting (skip problematic view)
  const loadProfileCounts = async (targetUserId: string) => {
    console.log('📊 Loading profile counts for user:', targetUserId.substring(0, 8) + '...');
    
    try {
      console.log('🔄 Using direct counting (skipping view)...');

      // Count posts directly
      const { count: postsCount, error: postsCountError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

      // Count followers
      const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      // Count following
      const { count: followingCount, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

      const directCounts = {
        posts_count: postsCountError ? 0 : (postsCount || 0),
        followers_count: followersError ? 0 : (followersCount || 0),
        following_count: followingError ? 0 : (followingCount || 0)
      };

      console.log('📊 Direct counts calculated:', directCounts);
      setProfileCounts(directCounts);

    } catch (error) {
      console.error('❌ Failed to load profile counts:', error);
      // Set safe defaults
      setProfileCounts({
        posts_count: 0,
        followers_count: 0,
        following_count: 0
      });
    }
  };

  // Load user posts
  const loadUserPosts = async (targetUserId: string) => {
    console.log('🔄 Loading posts for user:', targetUserId.substring(0, 8) + '...');
    setPostsLoading(true);
    
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) {
        console.error('Failed to load posts:', postsError);
        setUserPosts([]);
        return;
      }

      // Format posts for ProfilePostsSection with proper video handling
      const formattedPosts = (postsData || []).map((post: any) => {
        // Determine post type based on media_type or file extension
        let postType = post.post_type || 'thought';
        if (post.media_url) {
          if (post.media_type?.includes('video') || 
              post.media_url.match(/\.(mp4|webm|mov)$/i)) {
            postType = 'video';
          } else if (post.media_type?.includes('audio') || 
                     post.media_url.match(/\.(mp3|wav|m4a|ogg)$/i)) {
            postType = 'audio';
          } else if (post.media_type?.includes('image') || 
                     post.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            postType = 'image';
          }
        }
        
        // For video posts, prefer thumbnail_url for display, fallback to media_url
        // For other posts, use media_url directly
        let imageUrl;
        if (postType === 'video') {
          // For video posts, try to use thumbnail first, then fall back to video URL
          imageUrl = post.media_thumb_url || post.thumbnail_url || post.media_url;
        } else {
          // For images and other media, use media_url directly
          imageUrl = post.media_url || post.thumbnail_url;
        }
        
        return {
          id: post.id,
          caption: post.text_body || post.content || post.caption || '',
          timestamp: formatTimestamp(post.created_at),
          likes: post.like_count || 0,
          comments: post.comment_count || 0,
          imageUrl: imageUrl,
          videoUrl: postType === 'video' ? post.media_url : undefined, // Original video URL
          thumbnailUrl: post.media_thumb_url || post.thumbnail_url, // Dedicated thumbnail
          type: postType,
          mediaType: post.media_type,
          // Include all raw post data for the drawer
          user_id: post.user_id,
          text_body: post.text_body,
          content: post.content,
          created_at: post.created_at,
          like_count: post.like_count,
          comment_count: post.comment_count,
          media_url: post.media_url
        };
      });

      setUserPosts(formattedPosts);
      console.log('✅ Posts loaded successfully:', formattedPosts.length);
      
      // Update the posts count to match the actual number of posts loaded
      // This ensures consistency between what we display and what we count
      if (formattedPosts.length > 0) {
        console.log('📊 Updating posts count to match loaded posts...');
        
        // Get total count of all posts (not just the limited 20)
        const { count: totalPostsCount, error: countError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', targetUserId);

        if (!countError && totalPostsCount !== null) {
          setProfileCounts(prev => ({
            ...prev,
            posts_count: totalPostsCount
          }));
          console.log('✅ Posts count updated to:', totalPostsCount);
        }
      }
      
    } catch (error) {
      console.error('Error loading posts:', error);
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  // Format timestamp helper
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

  // Load profile on mount and when route param changes
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  // Handle bio update
  const handleBioUpdate = async (newBio: string) => {
    if (!isOwner || !profile) return;
    
    console.log('🔄 Bio update received:', newBio);
    
    // Optimistic update
    setProfile(prev => prev ? { ...prev, bio: newBio } : null);
    
    console.log('✅ Bio update processed successfully');
  };

  // Handle avatar upload success - reload profile to get latest avatar
  const handleAvatarUploadSuccess = async (newAvatarUrl: string) => {
    console.log('🖼️ Avatar upload successful, reloading profile...');
    
    // Close dialog first
    setIsAvatarDialogOpen(false);
    
    // Trigger global avatar refresh for all components
    if (profileId) {
      triggerAvatarRefresh(profileId);
    }
    
    // Reload the entire profile to get the latest avatar data from database
    await loadProfile();
    
    toast.success('Profile picture updated! 🎉');
  };

  // Handle edit profile
  const handleEditProfile = () => {
    if (isOwner && onNavigateToPage) {
      onNavigateToPage('edit-profile');
    }
  };

  // Handle share profile
  const handleShareProfile = async () => {
    if (!isOwner || !profile) return;
    
    try {
      const profileUrl = `${window.location.origin}/u/${profile.username}`;
      
      if (navigator.share && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({
          title: `${profile.username}'s Profile - Tribe`,
          text: `Check out ${profile.username}'s profile on Tribe!`,
          url: profileUrl
        });
        toast.success('Profile shared! 📤');
      } else {
        await navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied to clipboard! 📋');
      }
    } catch (error) {
      console.error('Share failed:', error);
      try {
        const profileUrl = `${window.location.origin}/u/${profile.username}`;
        await navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied to clipboard! 📋');
      } catch (clipboardError) {
        console.error('Clipboard fallback failed:', clipboardError);
        toast.error('Unable to share profile. Please copy the URL manually.');
      }
    }
  };

  // Handle post click
  const handlePostClick = (post: any) => {
    console.log('Post clicked:', post.id);
    setSelectedPost(post);
    setIsPostDetailOpen(true);
  };

  // Handle create post
  const handleCreatePost = () => {
    if (onNavigateToPage) {
      onNavigateToPage('create');
    }
  };

  // Handle post deletion
  const handleDeletePost = async (postId: string) => {
    console.log('🗑️ Delete post requested:', postId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('Authentication required to delete post');
        return;
      }
      
      const loadingToast = toast.loading('Deleting post...');
      
      try {
        const { deletePost } = await import('../utils/edge');
        await deletePost(postId, session.user.id);
        
        toast.dismiss(loadingToast);
        
        // Update local state
        setUserPosts(prev => prev.filter(post => post.id !== postId));
        
        // Update profile counts
        setProfileCounts(prev => ({
          ...prev,
          posts_count: Math.max(0, prev.posts_count - 1)
        }));
        
        // Close the drawer if this post was open
        if (selectedPost?.id === postId) {
          setIsPostDetailOpen(false);
          setSelectedPost(null);
        }
        
        toast.success('Post deleted successfully');
        
      } catch (edgeError) {
        console.warn('Edge delete failed, trying direct database:', edgeError);
        
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId)
          .eq('user_id', session.user.id);
        
        if (error) {
          toast.dismiss(loadingToast);
          toast.error('Failed to delete post. Please try again.');
          return;
        }
        
        toast.dismiss(loadingToast);
        
        setUserPosts(prev => prev.filter(post => post.id !== postId));
        
        setProfileCounts(prev => ({
          ...prev,
          posts_count: Math.max(0, prev.posts_count - 1)
        }));
        
        // Close the drawer if this post was open
        if (selectedPost?.id === postId) {
          setIsPostDetailOpen(false);
          setSelectedPost(null);
        }
        
        toast.success('Post deleted successfully');
      }
      
    } catch (error) {
      console.error('Failed to delete post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Authentication')) {
        toast.error('Authentication failed. Please try logging in again.');
      } else {
        toast.error('Failed to delete post. Please try again.');
      }
    }
  };

  // Handle post editing
  const handleEditPost = async (postId: string, newCaption: string) => {
    console.log('✏️ Edit post requested:', postId, newCaption);
    
    // Update local state to reflect the change immediately
    setUserPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, caption: newCaption, text_body: newCaption, content: newCaption }
        : post
    ));
    
    // Update selected post if it's currently open
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => prev ? { 
        ...prev, 
        caption: newCaption, 
        text_body: newCaption, 
        content: newCaption 
      } : null);
    }
  };

  // Calculate level and XP from userInfo or defaults
  const level = userInfo?.xpPoints ? Math.floor(userInfo.xpPoints / 100) + 1 : 1;
  const xpPoints = userInfo?.xpPoints || 100;

  // Loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 safe-area-inset">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-midnight-black/80 backdrop-blur-lg border-b border-neon-lilac/20">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-pearl-white hover:text-neon-lilac hover:bg-neon-lilac/10 transition-colors touch-target"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <h1 className="font-headline text-pearl-white">Profile</h1>
            <div className="w-20"></div>
          </div>
        </div>

        {/* Loading content */}
        <div className="p-4 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 safe-area-inset">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-midnight-black/80 backdrop-blur-lg border-b border-neon-lilac/20">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-pearl-white hover:text-neon-lilac hover:bg-neon-lilac/10 transition-colors touch-target"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <h1 className="font-headline text-pearl-white">Profile</h1>
            <div className="w-20"></div>
          </div>
        </div>

        {/* Error content */}
        <div className="p-4 text-center">
          <div className="space-y-4">
            <div className="text-glitch-red">
              <Trophy className="w-12 h-12 mx-auto mb-2" />
              <h2 className="text-xl font-headline">Profile Not Found</h2>
              <p className="text-muted-lavender mt-2">{profileError}</p>
            </div>
            <Button
              onClick={loadProfile}
              className="bg-neon-lilac text-midnight-black hover:bg-neon-lilac/80"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 safe-area-inset">
        <div className="p-4 text-center">
          <p className="text-muted-lavender">No profile data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 safe-area-inset">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-midnight-black/80 backdrop-blur-lg border-b border-neon-lilac/20">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-pearl-white hover:text-neon-lilac hover:bg-neon-lilac/10 transition-colors touch-target"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          
          <SafeUsername 
            username={profile.username} 
            className="font-headline text-pearl-white text-lg" 
          />
          
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditProfile}
                  className="text-pearl-white hover:text-neon-lilac hover:bg-neon-lilac/10 transition-colors touch-target"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="space-y-4">
          {/* Mobile Layout: Avatar and Stats side by side */}
          <div className="flex items-start gap-4 sm:hidden">
            {/* Avatar - Database-first approach */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-20 h-20 ring-2 ring-neon-lilac/30">
                {/* Use refreshable avatar data */}
                {profileAvatarData.src ? (
                  <AvatarImage 
                    src={profileAvatarData.src} 
                    alt={`${profile.username}'s profile picture`}
                    className="object-cover w-full h-full"
                    onLoad={() => console.log('🖼️ Profile avatar loaded from database:', profileAvatarData.src)}
                    onError={() => console.log('🖼️ Profile avatar failed to load:', profileAvatarData.src)}
                  />
                ) : null}
                <AvatarFallback className="bg-neon-lilac/20 border-2 border-neon-lilac/40 text-pearl-white text-xl font-headline">
                  {profile.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              {/* Camera icon for owners */}
              {isOwner && (
                <button
                  onClick={() => setIsAvatarDialogOpen(true)}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-neon-lilac text-midnight-black rounded-full hover:bg-neon-lilac/80 transition-colors touch-target"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Stats next to avatar on mobile */}
            <div className="flex-1 flex justify-around items-center py-2">
              <div className="text-center">
                <div className="font-headline text-pearl-white text-lg">{profileCounts.posts_count}</div>
                <div className="text-muted-lavender text-xs">Posts</div>
              </div>
              <div className="text-center">
                <div className="font-headline text-pearl-white text-lg">{profileCounts.followers_count}</div>
                <div className="text-muted-lavender text-xs">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-headline text-pearl-white text-lg">{profileCounts.following_count}</div>
                <div className="text-muted-lavender text-xs">Following</div>
              </div>
            </div>
          </div>

          {/* Desktop Layout: Traditional side-by-side */}
          <div className="hidden sm:flex items-start gap-4">
            {/* Avatar - Database-first approach */}
            <div className="relative">
              <Avatar className="w-24 h-24 ring-2 ring-neon-lilac/30">
                {/* Use refreshable avatar data */}
                {profileAvatarData.src ? (
                  <AvatarImage 
                    src={profileAvatarData.src} 
                    alt={`${profile.username}'s profile picture`}
                    className="object-cover w-full h-full"
                    onLoad={() => console.log('🖼️ Profile avatar loaded from database:', profileAvatarData.src)}
                    onError={() => console.log('🖼️ Profile avatar failed to load:', profileAvatarData.src)}
                  />
                ) : null}
                <AvatarFallback className="bg-neon-lilac/20 border-2 border-neon-lilac/40 text-pearl-white text-2xl font-headline">
                  {profile.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              {/* Camera icon for owners */}
              {isOwner && (
                <button
                  onClick={() => setIsAvatarDialogOpen(true)}
                  className="absolute -bottom-1 -right-1 p-2 bg-neon-lilac text-midnight-black rounded-full hover:bg-neon-lilac/80 transition-colors touch-target"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Profile Info on Desktop */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-4">
                <SafeUsername 
                  username={profile.username} 
                  className="font-headline text-pearl-white text-2xl" 
                />
                
                {!isOwner && (
                  <FollowButton 
                    targetUserId={profile.id} 
                    onFollowChange={onFollowChange}
                    className="bg-neon-lilac text-midnight-black hover:bg-neon-lilac/80"
                  />
                )}

                {isOwner && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditProfile}
                      className="border-neon-lilac/30 text-pearl-white hover:bg-neon-lilac/10"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShareProfile}
                      className="border-neon-lilac/30 text-pearl-white hover:bg-neon-lilac/10"
                    >
                      <Share className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats row on desktop */}
              <div className="flex gap-8">
                <div className="text-center">
                  <span className="font-headline text-pearl-white text-lg mr-2">{profileCounts.posts_count}</span>
                  <span className="text-muted-lavender">posts</span>
                </div>
                <div className="text-center">
                  <span className="font-headline text-pearl-white text-lg mr-2">{profileCounts.followers_count}</span>
                  <span className="text-muted-lavender">followers</span>
                </div>
                <div className="text-center">
                  <span className="font-headline text-pearl-white text-lg mr-2">{profileCounts.following_count}</span>
                  <span className="text-muted-lavender">following</span>
                </div>
              </div>

              {/* Bio Section */}
              {profile.bio && (
                <SafeBio 
                  bio={profile.bio} 
                  className="text-pearl-white/90 leading-relaxed" 
                />
              )}
            </div>
          </div>

          {/* Mobile Bio Section */}
          <div className="sm:hidden">
            <SafeUsername 
              username={profile.username} 
              className="font-headline text-pearl-white text-xl mb-2" 
            />
            
            {!isOwner && (
              <FollowButton 
                targetUserId={profile.id} 
                onFollowChange={onFollowChange}
                className="w-full bg-neon-lilac text-midnight-black hover:bg-neon-lilac/80 mb-3"
              />
            )}
            
            {isOwner && (
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditProfile}
                  className="flex-1 border-neon-lilac/30 text-pearl-white hover:bg-neon-lilac/10"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareProfile}
                  className="flex-1 border-neon-lilac/30 text-pearl-white hover:bg-neon-lilac/10"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            )}
            
            {profile.bio && (
              <SafeBio 
                bio={profile.bio} 
                className="text-pearl-white/90 leading-relaxed text-sm" 
              />
            )}
          </div>

          {/* Level and XP Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className={`w-5 h-5 text-${themeColors.primary}`} />
                <span className="text-pearl-white font-headline">Level {level}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {xpPoints} XP
              </Badge>
            </div>
            <LevelProgressBar 
              level={level}
              xpPoints={xpPoints}
              maxXP={100}
            />
          </div>
        </div>

        {/* Bio Editor for owners */}
        {isOwner && (
          <div className="px-4">
            <BioEditor 
              currentBio={profile.bio} 
              onBioUpdate={handleBioUpdate}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-midnight-black/50 border border-neon-lilac/20 rounded-xl">
              <TabsTrigger value="posts" className="text-muted-lavender data-[state=active]:text-pearl-white data-[state=active]:bg-neon-lilac/20">
                Posts
              </TabsTrigger>
              <TabsTrigger value="saved" className="text-muted-lavender data-[state=active]:text-pearl-white data-[state=active]:bg-neon-lilac/20">
                Saved
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-6">
              <ProfilePostsSection
                posts={userPosts}
                isLoading={postsLoading}
                onPostClick={handlePostClick}
                onCreatePost={isOwner ? handleCreatePost : undefined}
                isOwner={isOwner}
              />
            </TabsContent>
            
            <TabsContent value="saved" className="mt-6">
              <SavedPostsGrid
                posts={savedList}
                isLoading={savedLoading}
                error={savedError}
                onPostClick={handlePostClick}
                onReload={onLoadSavedPosts}
                isOwner={isOwner}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Avatar Upload Dialog */}
      {isAvatarDialogOpen && (
        <AvatarUploadDialog
          isOpen={isAvatarDialogOpen}
          onClose={() => setIsAvatarDialogOpen(false)}
          onAvatarUploaded={handleAvatarUploadSuccess}
          userId={profileId || ''}
          currentAvatarUrl={profileAvatarData.src || profileAvatarSrc}
        />
      )}

      {/* Post Detail Drawer */}
      <ProfilePostDetailDrawer
        post={selectedPost}
        isOpen={isPostDetailOpen}
        onClose={() => {
          setIsPostDetailOpen(false);
          setSelectedPost(null);
        }}
        isOwner={isOwner}
        onDeletePost={handleDeletePost}
        onEditPost={handleEditPost}
        userInfo={profile}
        savedSet={savedSet}
        onToggleBookmark={onToggleBookmark}
      />
    </div>
  );
}