import React, { useState, useEffect, useCallback } from 'react';
import { UserResult, UserInfo } from '../App';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { PostTypeCard } from './PostTypeCard';
import { QuickPostCreator } from './QuickPostCreator';
import { CreateContentPage } from './CreateContentPage';
import { CommentsPage } from './CommentsPage';
import { MobileCommentsDrawer } from './MobileCommentsDrawer';
import { DesktopCommentsModal } from './DesktopCommentsModal';
import { ProfilePage } from './ProfilePage';
import { SavedPostsPage } from './SavedPostsPage';
import { DiscoverTribesPage } from './DiscoverTribesPage';
import { SettingsPage } from './SettingsPage';
import { StoryViewer } from './StoryViewer';
import { NotificationCenter } from './NotificationCenter';
import { MobileBottomNav } from './MobileBottomNav';
import { PostErrorBoundary } from './PostErrorBoundary';
import { Logo } from './Logo';
import { StoryCreator } from './StoryCreator';
import { StoryRing as StoryRow } from './StoryRing';
import { HamburgerMenu } from './HamburgerMenu';
import { TopNavigationBar } from './TopNavigationBar';

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from './ui/drawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from './ui/sheet';
import { useIsMobile } from './ui/use-mobile';
import { useFeedRefresh } from '../utils/feed-refresh-context';
import { toast } from 'sonner@2.0.3';
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share, 
  Sparkles, 
  Plus,
  Loader2,
  Bell,
  Menu,
  Settings,
  LogOut,
  Search,
  Compass,
  X,
  User,
  Wrench
} from 'lucide-react';
import { 
  SocialFeedPost, 
  FeedTab, 
  FeedView, 
  FeedPost,
  Story,
  SearchResult,
  UserProfile
} from '../utils/social-feed-types';

// Define types for the new tribal system
type CoreRealm = 'mirrorcore' | 'embercore' | 'shadowcore';

interface SocialFeedProps {
  userResult?: UserResult | null; // Made optional since we no longer require quiz results
  userInfo: UserInfo | null;
  isAuthenticated?: boolean;
  session?: any;
  onBack: () => void;
  onLogout?: () => void;
  cameraPermission?: boolean;
  micPermission?: boolean;
  onPermissionToggle?: (type: 'camera' | 'mic', enabled: boolean) => void;
}

// Helper function to expand captions for display
const expandCaption = (caption: string, maxLength: number = 120) => {
  if (caption.length <= maxLength) return caption;
  return caption.slice(0, maxLength) + '...';
};

export function SocialFeed({ userResult, userInfo, isAuthenticated, session, onBack, onLogout, cameraPermission, micPermission, onPermissionToggle }: SocialFeedProps) {
  const [currentPage, setCurrentPage] = useState<FeedTab>('feed');
  const isMobile = useIsMobile();
  const [currentFeed, setCurrentFeed] = useState<FeedView>('general');
  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  
  // Story-related state
  const [storyGroups, setStoryGroups] = useState<import('../utils/story-types').StoryGroup[]>([]);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [selectedStoryGroupIndex, setSelectedStoryGroupIndex] = useState(0);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedPost, setSelectedPost] = useState<SocialFeedPost | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [schemaInitializing, setSchemaInitializing] = useState(false);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [lockedRealm, setLockedRealm] = useState<CoreRealm | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [showDevUtilities, setShowDevUtilities] = useState(false);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [commentsDrawerPost, setCommentsDrawerPost] = useState<SocialFeedPost | null>(null);
  const [desktopCommentsModalOpen, setDesktopCommentsModalOpen] = useState(false);
  const [desktopCommentsModalPost, setDesktopCommentsModalPost] = useState<SocialFeedPost | null>(null);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);

  // Get feed refresh context
  const { consumeFeedRefresh, triggerFeedRefresh } = useFeedRefresh();

  // Load posts from backend
  const loadPosts = async (realm?: string) => {
    if (isLoading) {
      console.log('Already loading posts, skipping duplicate request');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('=== LOADING POSTS WITH ENHANCED ERROR HANDLING ===');
      console.log('Realm filter:', realm);
      
      /* Guard the post loading with session check */
      const { validateSession } = await import('../utils/session-guards');
      const sessionValidation = await validateSession();
      
      if (!sessionValidation.isValid) {
        console.log('❌ Cannot load posts without valid session, clearing posts:', sessionValidation.error);
        setPosts([]);
        return;
      }
      
      console.log('✅ Valid session found, attempting to load real posts from server API');
      
      /* Try the server API first (this is the primary method now) */
      try {
        const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
        const queryParam = realm ? `?realm=${realm}` : '';
        
        console.log('Making request to posts API:', `/make-server-70df0d6e/posts${queryParam}`);
        const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts${queryParam}`);
        
        console.log('Posts API response:', {
          hasData: !!response,
          hasPosts: !!response?.posts,
          postCount: response?.posts?.length || 0,
          schemaStatus: response?.schemaStatus,
          message: response?.message
        });
        
        /* Handle schema initialization */
        if (response?.message === 'Database schema initializing' || response?.schemaStatus === 'initializing') {
          console.log('🔧 Database schema is initializing, retrying in 3 seconds...');
          setPosts([]);
          setSchemaInitializing(true);
          
          /* Retry after schema initialization */
          setTimeout(() => {
            console.log('Retrying posts load after schema initialization...');
            setSchemaInitializing(false);
            loadPosts(realm);
          }, 3000);
          
          return;
        }
        
        /* Clear schema initializing flag on successful load */
        setSchemaInitializing(false);
        
        if (response && response.posts && Array.isArray(response.posts)) {
          console.log(`✅ Successfully loaded ${response.posts.length} posts from server API`);
          setPosts(response.posts);
          return;
        } else {
          console.warn('Invalid posts response format:', response);
          throw new Error('Invalid server response format');
        }
        
      } catch (serverError) {
        console.error('Server API failed:', serverError);
        const errorMessage = serverError instanceof Error ? serverError.message : String(serverError);
        
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          console.log('Posts endpoint not available, trying database fallback...');
        } else {
          console.log('Server error, trying database fallback:', errorMessage);
        }
      }
      
      /* Clear posts on any error to avoid showing mock data */
      console.log('Clearing posts due to error');
      setPosts([]);
      
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch real notification count from Supabase
  const fetchNotificationCount = async () => {
    try {
      setNotificationLoading(true);
      
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('No authenticated user, setting notification count to 0');
        setUnreadNotificationCount(0);
        return;
      }

      console.log('Fetching notification count for user:', session.user.id);

      // Use the new notification API endpoint
      try {
        const { getUnreadNotificationCount } = await import('../utils/supabase/notification-helpers');
        const unreadCount = await getUnreadNotificationCount();
        console.log('Fetched notification count:', unreadCount);
        setUnreadNotificationCount(unreadCount);
      } catch (apiError) {
        console.log('Notifications API not available yet, setting count to 0');
        setUnreadNotificationCount(0);
      }
      
    } catch (error) {
      console.error('Error in fetchNotificationCount:', error);
      setUnreadNotificationCount(0);
    } finally {
      setNotificationLoading(false);
    }
  };

  // Set up realtime subscription for notifications
  const setupNotificationSubscription = async () => {
    try {
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('No session for notification subscription');
        return null;
      }

      console.log('Setting up enhanced notification polling for user:', session.user.id);

      // Start with immediate fetch
      fetchNotificationCount();
      
      /* Set up intelligent polling - more frequent than before */
      const pollInterval = setInterval(() => {
        fetchNotificationCount();
      }, 10000); /* Every 10 seconds instead of 30 */

      /* Show confirmation that enhanced notifications are active */
      toast.success('Enhanced notifications active! 🔔', {
        duration: 2000
      });

      return { 
        unsubscribe: () => {
          clearInterval(pollInterval);
          console.log('Enhanced notification polling stopped');
        }
      };
    } catch (error) {
      console.error('Error setting up enhanced notification polling:', error);
      
      /* Fallback to less frequent polling */
      console.log('Falling back to standard polling for notifications...');
      const pollInterval = setInterval(() => {
        fetchNotificationCount();
      }, 30000);

      return { 
        unsubscribe: () => clearInterval(pollInterval)
      };
    }
  };

  // Helper function to refresh notifications after user actions
  const refreshNotificationsAfterAction = useCallback(() => {
    /* Debounce multiple rapid calls */
    setTimeout(() => {
      fetchNotificationCount();
    }, 1000);
  }, []);

  // Handle search functionality
  const handleSearch = () => {
    toast.success('Search feature coming soon! 🔍', {
      description: 'Discover posts, users, and tribes'
    });
  };

  // Handle discover tribes
  const handleDiscover = () => {
    setCurrentPage('discover');
  };

  // Hamburger menu handlers
  const handleHamburgerCreatePost = () => {
    setCurrentPage('create');
  };

  const handleHamburgerProfile = () => {
    setCurrentPage('profile');
  };

  const handleHamburgerLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  // Handle notifications click
  const handleNotifications = () => {
    setNotificationCenterOpen(true);
  };

  // Handle hamburger menu click
  const handleHamburgerMenu = () => {
    setHamburgerMenuOpen(true);
  };

  // Enhanced render function with proper props - MOVED ABOVE WHERE IT'S USED
  const renderPosts = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-neon-lilac" />
          <span className="ml-2 text-muted-lavender">Loading posts...</span>
        </div>
      );
    }

    if (schemaInitializing) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-electric-blue mx-auto" />
            <div>
              <p className="text-pearl-white">Database is initializing...</p>
              <p className="text-muted-lavender">This may take a few moments</p>
            </div>
          </div>
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="text-center py-12 space-y-4">
          <Sparkles className="w-16 h-16 mx-auto" style={{ color: 'rgba(221, 214, 254, 0.4)' }} />
          <div>
            <h3 className="text-pearl-white font-headline mb-2">No posts yet</h3>
            <p className="text-muted-lavender">Be the first to share something amazing!</p>
          </div>
          <Button
            onClick={() => setCurrentPage('create')}
            className="bg-neon-lilac text-midnight-black"
            style={{ backgroundColor: '#C084FC' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <QuickPostCreator
          userInfo={userInfo}
          isAuthenticated={!!isAuthenticated}
          onPostCreated={handlePostCreated}
          onOpenFullCreator={() => setCurrentPage('create')}
        />
        {posts.map((post) => (
          <PostErrorBoundary key={post.id} postId={post.id}>
            <PostTypeCard
              post={post}
              currentUserId={userInfo?.id}
              userTribeMemberships={[]}
              onToggleLike={toggleLike}
              onToggleBookmark={toggleBookmark}
              onOpenComments={openCommentsForPost}
              onUserClick={handleUserClick}
              onPostAction={handlePostAction}
              onPostDeleted={handlePostDeleted}
              onJoinTribe={handleJoinTribe}
            />
          </PostErrorBoundary>
        ))}
      </div>
    );
  };

  // Render feed page with TopNavigationBar
  const renderFeedPage = () => {
    return (
      <div className="min-h-screen bg-midnight-black">
        <TopNavigationBar
          unreadNotificationCount={unreadNotificationCount}
          onSearchClick={handleSearch}
          onDiscoverClick={handleDiscover}
          onNotificationsClick={handleNotifications}
          onMenuClick={handleHamburgerMenu}
        />
        
        {/* Stories Row */}
        {storyGroups.length > 0 && (
          <div className="border-b border-muted-lavender/10 pb-4">
            <StoryRow
              storyGroups={storyGroups}
              userInfo={userInfo}
              onStoryClick={handleStoryClick}
              onCreateStory={() => setStoryCreatorOpen(true)}
              isLoading={isLoadingStories}
            />
          </div>
        )}

        {/* Feed Content */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          {renderPosts()}
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <MobileBottomNav
            currentPage={currentPage}
            onNavigate={setCurrentPage}
          />
        )}
      </div>
    );
  };

  // Enhanced toggleBookmark function with better error handling and optimistic updates
  const toggleBookmark = async (postId: string) => {
    if (!isAuthenticated) {
      return;
    }

    /* Optimistic update */
    const originalPosts = [...posts];
    const postToUpdate = posts.find(p => p.id === postId);
    if (!postToUpdate) {
      toast.error('Post not found');
      return;
    }

    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, bookmarked: !post.bookmarked }
        : post
    ));

    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/bookmark`, {
        method: 'POST'
      });

      /* Update with server response */
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, bookmarked: response.bookmarked }
          : post
      ));

      if (response.bookmarked) {
        toast.success('Saved to collection! 🔖', {
          description: 'View your saved posts in your profile'
        });
      } else {
        toast.success('Removed from collection', {
          description: 'Post unsaved successfully'
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      
      /* Revert optimistic update on error */
      setPosts(originalPosts);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('404')) {
        toast.error('Post not found');
      } else if (errorMessage.includes('401')) {
        toast.error('Please sign in to save posts');
      } else {
        toast.error('Failed to update bookmark', {
          description: 'Please try again'
        });
      }
    }
  };

  const toggleLike = async (postId: string) => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/like`, {
        method: 'POST'
      });

      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, liked: response.liked, likes: response.likes }
          : post
      ));

      if (response.liked) {
        toast.success('Liked! ✨');
        
        // Create notification for the post owner (if not liking own post)
        try {
          const post = posts.find(p => p.id === postId);
          if (post && post.userId !== userInfo?.id) {
            const { createLikeNotification } = await import('../utils/supabase/notification-helpers');
            await createLikeNotification(
              post.userId,
              userInfo?.username || 'Someone',
              postId,
              post.caption || post.content
            );
          }
        } catch (notificationError) {
          console.warn('Failed to create like notification:', notificationError);
          // Don't show error to user - notification creation is secondary
        }
        
        refreshNotificationsAfterAction();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('404')) {
        toast.error('Post not found');
      } else if (errorMessage.includes('401')) {
        toast.error('Please sign in to like posts');
      } else {
        toast.error('Failed to toggle like', {
          description: 'Please try again'
        });
      }
    }
  };

  // Handle post actions (copy link, hide, report)
  const handlePostAction = (action: string, postId: string) => {
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
        toast.success('Link copied to clipboard!');
        break;
      case 'hide':
        toast.success('Post hidden from your feed');
        break;
      case 'report':
        toast.success('Post reported. Thank you for helping keep our community safe.');
        break;
      default:
        console.log('Unknown post action:', action);
    }
  };

  // Handle user click
  const handleUserClick = (username: string) => {
    console.log('Navigating to user profile:', username);
  };

  // Handle tribe join
  const handleJoinTribe = (tribeId: string) => {
    console.log('Joining tribe:', tribeId);
    toast.success('Tribe join request sent!', {
      description: 'You will be notified when approved'
    });
  };

  // Handle post deletion
  const handlePostDeleted = (postId: string) => {
    console.log('🗑️ Post deleted, updating local state and triggering refresh');
    setPosts(posts.filter(post => post.id !== postId));
    // Trigger a feed refresh to ensure consistency when user returns from other pages
    triggerFeedRefresh();
  };

  // Handle successful post creation
  const handlePostCreated = () => {
    console.log('✅ Post created successfully, refreshing feed');
    // Trigger immediate feed refresh when a new post is created
    triggerFeedRefresh();
    // Also refresh posts immediately
    loadPosts();
  };

  // Enhanced comment opening that works with real UUIDs and supports both mobile/desktop
  const openCommentsForPost = async (postOrEvent: FeedPost | string | Event) => {
    let postId: string | null = null;
    let post: FeedPost | null = null;

    /* Handle different input types */
    if (typeof postOrEvent === 'string') {
      postId = postOrEvent;
      post = posts.find(p => p.id === postId) || null;
    } else if (postOrEvent && typeof postOrEvent === 'object' && 'id' in postOrEvent) {
      post = postOrEvent as FeedPost;
      postId = post.id;
    }

    if (!postId) {
      console.error('Could not determine valid post ID for comments');
      return;
    }

    console.log('Opening comments for post:', postId);
    
    if (isMobile && post) {
      // Use mobile drawer for mobile devices
      setCommentsDrawerPost(post);
      setCommentsDrawerOpen(true);
    } else if (post) {
      // Use desktop modal for desktop devices
      setDesktopCommentsModalPost(post);
      setDesktopCommentsModalOpen(true);
    } else {
      // Fallback to traditional navigation
      try {
        const { openComments: navigateToComments } = await import('../utils/navigation-helpers');
        const success = navigateToComments(postId);
        
        if (success) {
          /* URL routing handled by App component */
        } else {
          setSelectedPost(post);
          setCurrentPage('comments');
        }
      } catch (error) {
        console.error('Error navigating to comments:', error);
        setSelectedPost(post);
        setCurrentPage('comments');
      }
    }
  };

  // Load story groups from backend
  const loadStoryGroups = async () => {
    if (isLoadingStories) return;
    
    setIsLoadingStories(true);
    try {
      const { getActiveStoryGroups } = await import('../utils/story-helpers');
      const groups = await getActiveStoryGroups();
      setStoryGroups(groups);
      console.log(`Loaded ${groups.length} story groups`);
    } catch (error) {
      console.error('Error loading story groups:', error);
      /* Fallback to empty array on error */
      setStoryGroups([]);
    } finally {
      setIsLoadingStories(false);
    }
  };

  // Handle story creation success
  const handleStoryCreated = () => {
    console.log('Story created successfully, refreshing story groups...');
    loadStoryGroups();
    setStoryCreatorOpen(false);
  };

  // Handle story click to open viewer
  const handleStoryClick = (groupIndex: number) => {
    setSelectedStoryGroupIndex(groupIndex);
    setStoryViewerOpen(true);
  };

  // Load initial notification count
  useEffect(() => {
    fetchNotificationCount();
  }, [userInfo]);

  // Load story groups when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadStoryGroups();
    }
  }, [isAuthenticated]);

  // Set up realtime subscription when user is authenticated
  useEffect(() => {
    let notificationChannel: any = null;

    const setupSubscription = async () => {
      if (isAuthenticated) {
        notificationChannel = await setupNotificationSubscription();
      }
    };

    setupSubscription();

    /* Cleanup subscription on unmount or auth change */
    return () => {
      if (notificationChannel) {
        console.log('Cleaning up real-time notification subscription');
        if (notificationChannel.unsubscribe) {
          notificationChannel.unsubscribe();
        } else {
          const setupCleanup = async () => {
            try {
              const { supabase } = await import('../utils/supabase/client');
              supabase.removeChannel(notificationChannel);
            } catch (error) {
              console.error('Error cleaning up notification channel:', error);
            }
          };
          setupCleanup();
        }
      }
    };
  }, [isAuthenticated]);

  // Close menus when clicking outside or pressing escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setNotificationCenterOpen(false);
        setDesktopCommentsModalOpen(false);
        setHamburgerMenuOpen(false);
      }
    };

    if (menuOpen || notificationCenterOpen || desktopCommentsModalOpen || hamburgerMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [menuOpen, notificationCenterOpen, desktopCommentsModalOpen, hamburgerMenuOpen]);

  // Enhanced authentication check with session-first approach
  useEffect(() => {
    /* Wait until session is resolved (not undefined) */
    if (session === undefined) {
      console.log('Session still loading, waiting...');
      return;
    }
    
    console.log('Session resolved:', session ? 'authenticated' : 'not authenticated');
    
    if (session) {
      console.log('User is authenticated, loading posts...');
      loadPosts();
      fetchNotificationCount();
    } else {
      console.log('User is not authenticated, clearing posts');
      setPosts([]);
      setUnreadNotificationCount(0);
    }
  }, [session]);

  // Check for feed refresh when returning to feed page
  useEffect(() => {
    if (currentPage === 'feed' && isAuthenticated) {
      const shouldRefresh = consumeFeedRefresh();
      if (shouldRefresh) {
        console.log('Feed refresh flag detected, re-fetching posts...');
        loadPosts();
      }
    }
  }, [currentPage, isAuthenticated, consumeFeedRefresh]);

  // Enhanced feed refresh checking - runs whenever the component is rendered
  // This ensures we catch refresh requests even if currentPage doesn't change
  useEffect(() => {
    if (isAuthenticated) {
      const shouldRefresh = consumeFeedRefresh();
      if (shouldRefresh) {
        console.log('Feed refresh detected on component render, re-fetching posts...');
        loadPosts();
      }
    }
  }, [isAuthenticated]); // No dependency on currentPage

  // Also check for feed refresh when the component becomes visible again
  // This handles cases where users navigate back using browser controls
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentPage === 'feed' && isAuthenticated) {
        const shouldRefresh = consumeFeedRefresh();
        if (shouldRefresh) {
          console.log('Feed refresh on visibility change, re-fetching posts...');
          loadPosts();
        }
      }
    };

    const handleFocus = () => {
      if (currentPage === 'feed' && isAuthenticated) {
        const shouldRefresh = consumeFeedRefresh();
        if (shouldRefresh) {
          console.log('Feed refresh on window focus, re-fetching posts...');
          loadPosts();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentPage, isAuthenticated, consumeFeedRefresh]);

  // Render different pages based on currentPage state
  if (currentPage === 'create') {
    return (
      <CreateContentPage
        userInfo={userInfo}
        onBack={() => setCurrentPage('feed')}
        onPostCreated={handlePostCreated}
        cameraPermission={cameraPermission}
        micPermission={micPermission}
        onPermissionToggle={onPermissionToggle}
      />
    );
  }

  if (currentPage === 'profile') {
    return (
      <ProfilePage
        userInfo={userInfo}
        onBack={() => setCurrentPage('feed')}
        onLogout={onLogout}
      />
    );
  }

  if (currentPage === 'saved') {
    return (
      <SavedPostsPage
        userInfo={userInfo}
        onBack={() => setCurrentPage('feed')}
      />
    );
  }

  if (currentPage === 'discover') {
    return (
      <DiscoverTribesPage
        userInfo={userInfo}
        onBack={() => setCurrentPage('feed')}
      />
    );
  }

  if (currentPage === 'settings') {
    return (
      <SettingsPage
        userInfo={userInfo}
        onBack={() => setCurrentPage('feed')}
        onLogout={onLogout}
      />
    );
  }

  if (currentPage === 'comments' && selectedPost) {
    return (
      <CommentsPage
        post={selectedPost}
        onBack={() => setCurrentPage('feed')}
        userInfo={userInfo}
        onCommentAdded={refreshNotificationsAfterAction}
      />
    );
  }

  // Default to feed page
  return (
    <>
      {renderFeedPage()}
      
      {/* Modals and Overlays */}
      {notificationCenterOpen && (
        <NotificationCenter
          isOpen={notificationCenterOpen}
          onClose={() => setNotificationCenterOpen(false)}
          userInfo={userInfo}
          onNotificationRead={refreshNotificationsAfterAction}
        />
      )}

      {hamburgerMenuOpen && (
        <HamburgerMenu
          isOpen={hamburgerMenuOpen}
          onClose={() => setHamburgerMenuOpen(false)}
          userInfo={userInfo}
          onCreatePost={handleHamburgerCreatePost}
          onViewProfile={handleHamburgerProfile}
          onLogout={handleHamburgerLogout}
        />
      )}

      {/* Story Creator Modal */}
      {storyCreatorOpen && (
        <StoryCreator
          userInfo={userInfo}
          isOpen={storyCreatorOpen}
          onClose={() => setStoryCreatorOpen(false)}
          onStoryCreated={handleStoryCreated}
          cameraPermission={cameraPermission}
          micPermission={micPermission}
          onPermissionToggle={onPermissionToggle}
        />
      )}

      {/* Story Viewer Modal */}
      {storyViewerOpen && (
        <StoryViewer
          storyGroups={storyGroups}
          selectedGroupIndex={selectedStoryGroupIndex}
          isOpen={storyViewerOpen}
          onClose={() => setStoryViewerOpen(false)}
          userInfo={userInfo}
        />
      )}

      {/* Comments Drawer (Mobile) */}
      {isMobile && commentsDrawerOpen && commentsDrawerPost && (
        <MobileCommentsDrawer
          post={commentsDrawerPost}
          isOpen={commentsDrawerOpen}
          onClose={() => setCommentsDrawerOpen(false)}
          userInfo={userInfo}
          onCommentAdded={refreshNotificationsAfterAction}
        />
      )}

      {/* Comments Modal (Desktop) */}
      {!isMobile && desktopCommentsModalOpen && desktopCommentsModalPost && (
        <DesktopCommentsModal
          post={desktopCommentsModalPost}
          isOpen={desktopCommentsModalOpen}
          onClose={() => setDesktopCommentsModalOpen(false)}
          userInfo={userInfo}
          onCommentAdded={refreshNotificationsAfterAction}
        />
      )}
    </>
  );
}