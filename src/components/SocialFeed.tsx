import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserResult, UserInfo } from '../App';
import { saveToStorage, loadFromStorage } from '../utils/app-helpers';
import { STORAGE_KEYS } from '../utils/app-constants';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { PostTypeCard } from './PostTypeCard';
import { QuickPostCreator } from './QuickPostCreator';
import { PostComposer } from './post/PostComposer';
import { CommentsPage } from './CommentsPage';
import { SimplePostDetailsDrawer } from './SimplePostDetailsDrawer';
import { UnifiedProfilePage } from './UnifiedProfilePage';
import { SavedPostsPage } from './SavedPostsPage';
import { DiscoverTribesPage } from './DiscoverTribesPage';
import { SettingsPage } from './SettingsPage';
import { EditProfilePage } from './EditProfilePage';
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
  onGlobalAvatarUpdate?: (newAvatarUrl: string) => Promise<void>; // Global avatar update handler
  cameraPermission?: boolean;
  micPermission?: boolean;
  onPermissionToggle?: (type: 'camera' | 'mic', enabled: boolean) => void;
  initialPage?: string; // For restoring page state on refresh
  // Bookmark system props
  savedSet?: string[];
  savedList?: any[];
  savedLoading?: boolean;
  savedError?: string;
  onToggleBookmark?: (postId: string) => Promise<string>;
  onLoadSavedPosts?: () => Promise<void>;
  onPreloadSavedSet?: () => Promise<void>;
  onNavigateToUrl?: (url: string) => void; // Handler for URL navigation
}

// Helper function to expand captions for display
const expandCaption = (caption: string, maxLength: number = 120) => {
  if (caption.length <= maxLength) return caption;
  return caption.slice(0, maxLength) + '...';
};

export function SocialFeed({ 
  userResult, 
  userInfo, 
  isAuthenticated, 
  session, 
  onBack, 
  onLogout, 
  onGlobalAvatarUpdate,
  cameraPermission, 
  micPermission, 
  onPermissionToggle, 
  initialPage,
  // Bookmark system props
  savedSet = [],
  savedList = [],
  savedLoading = false,
  savedError = '',
  onToggleBookmark,
  onLoadSavedPosts,
  onPreloadSavedSet,
  onNavigateToUrl
}: SocialFeedProps) {
  // Debug render state
  console.log('🎯 SocialFeed rendering:', {
    hasUserInfo: !!userInfo,
    isAuthenticated,
    hasSession: !!session,
    sessionUndefined: session === undefined,
    initialPage,
    timestamp: new Date().toISOString()
  });
  
  // Emergency timeout to prevent complete hang - shortened timeout and better handling
  useEffect(() => {
    // Clear any existing timeout
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
    }
    
    // Set shorter emergency timeout with better recovery
    emergencyTimeoutRef.current = setTimeout(() => {
      console.warn('🚨 Emergency timeout triggered - forcing initialization complete after 10s');
      setIsLoading(false);
      setSchemaInitializing(false);
      // Clear the emergency timeout flag to allow normal operation
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
        emergencyTimeoutRef.current = null;
      }
    }, 10000); // Reduced to 10 second emergency timeout
    
    return () => {
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
        emergencyTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Initialize currentPage with saved state or default to 'feed'
  const [currentPage, setCurrentPage] = useState<FeedTab>(() => {
    if (initialPage && typeof initialPage === 'string') {
      console.log('🎯 Restoring page state from refresh:', initialPage);
      return initialPage as FeedTab;
    }
    return 'feed';
  });
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
  const [postDetailDrawerOpen, setPostDetailDrawerOpen] = useState(false);
  const [postDetailDrawerPostId, setPostDetailDrawerPostId] = useState<string | null>(null);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);

  // Refs to prevent infinite loading
  const initialLoadAttempted = useRef(false);
  const lastLoadAttempt = useRef(0);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get feed refresh context
  const { consumeFeedRefresh, triggerFeedRefresh } = useFeedRefresh();
  
  // Save current page to localStorage whenever it changes (but not on initial render)
  const isInitialRender = useRef(true);
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      // Don't clear the saved page state - we want it to persist for future refreshes
      console.log('🎯 SocialFeed initialized with page:', currentPage);
      
      // Verify the initial page was saved correctly
      if (currentPage) {
        console.log('🔍 Verifying initial page save...');
        try {
          saveToStorage(STORAGE_KEYS.CURRENT_PAGE, currentPage);
          saveToStorage(STORAGE_KEYS.CURRENT_VIEW, 'social');
          const verifyPage = loadFromStorage(STORAGE_KEYS.CURRENT_PAGE);
          console.log('✅ Initial page save verification:', { saved: currentPage, loaded: verifyPage });
        } catch (error) {
          console.error('❌ Initial page save verification failed:', error);
        }
      }
      return;
    }
    
    if (currentPage) {
      console.log('💾 Page changed - saving current page state:', currentPage);
      try {
        saveToStorage(STORAGE_KEYS.CURRENT_PAGE, currentPage);
        saveToStorage(STORAGE_KEYS.CURRENT_VIEW, 'social');
        
        // Verify save was successful
        const verifyPage = loadFromStorage(STORAGE_KEYS.CURRENT_PAGE);
        const verifyView = loadFromStorage(STORAGE_KEYS.CURRENT_VIEW);
        console.log('✅ Page save verification:', { 
          savedPage: currentPage, 
          loadedPage: verifyPage, 
          savedView: 'social', 
          loadedView: verifyView,
          rawLocalStorage: localStorage.getItem(STORAGE_KEYS.CURRENT_PAGE)
        });
        
        if (verifyPage !== currentPage) {
          console.error('❌ Page save verification failed - stored page does not match!');
        }
      } catch (error) {
        console.error('❌ Failed to save page state:', error);
      }
    }
  }, [currentPage, initialPage]);

  // Load posts from backend - OPTIMIZED with faster timeouts and better error handling
  const loadPosts = async (realm?: string) => {
    const now = Date.now();
    
    // Prevent rapid repeated calls
    if (isLoading || (now - lastLoadAttempt.current < 1000)) {
      console.log('⏳ Load posts throttled - either already loading or called too recently');
      return;
    }
    
    lastLoadAttempt.current = now;
    
    console.log('📊 STARTING POST LOAD:', { 
      isLoading, 
      realm, 
      hasSession: !!session,
      isAuthenticated,
      timestamp: new Date().toISOString()
    });
    
    setIsLoading(true);
    try {
      // Quick auth check - proceed if we have session OR isAuthenticated
      if (!session && !isAuthenticated) {
        console.log('❌ No session or auth, clearing posts');
        setPosts([]);
        return;
      }
      
      console.log('✅ Auth confirmed, loading posts...');
      
      // Try Edge Function first with fast timeout
      try {
        console.log('🔄 Trying Edge Function...');
        const edgeModule = await import('../utils/edge');
        
        if (!edgeModule.getFeed || typeof edgeModule.getFeed !== 'function') {
          throw new Error('getFeed function not available');
        }
        
        // Add timeout wrapper for edge function call
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Edge function timeout')), 8000)
        );
        
        const response = await Promise.race([
          edgeModule.getFeed(),
          timeoutPromise
        ]);
        
        // Handle schema initialization
        if (response?.message === 'Database schema initializing' || response?.schemaStatus === 'initializing') {
          console.log('🔧 Schema initializing, showing empty state');
          setPosts([]);
          setSchemaInitializing(true);
          return;
        }
        
        setSchemaInitializing(false);
        
        if (response && response.posts && Array.isArray(response.posts)) {
          console.log(`✅ Loaded ${response.posts.length} posts from Edge Function`);
          
          const { transformBackendPost } = await import('../utils/social-feed-helpers');
          const transformedPosts = response.posts.map(post => {
            const transformedPost = transformBackendPost(post);
            transformedPost.bookmarked = savedSet?.includes(transformedPost.id) || false;
            return transformedPost;
          });
          
          setPosts(transformedPosts);
          return;
        } else {
          throw new Error('Invalid Edge Function response');
        }
        
      } catch (serverError) {
        const errorMessage = serverError instanceof Error ? serverError.message : String(serverError);
        console.log('⚠️ Edge Function failed, trying database fallback:', errorMessage);
        
        // Quick database fallback with timeout
        try {
          console.log('📡 Database fallback...');
          const { supabase } = await import('../utils/supabase/client');
          
          // LEFT JOIN posts.user_id = profiles.id and expose profiles.id as author_id and profiles.display_name as username
          const queryPromise = supabase
            .from('posts')
            .select(`
              id,
              user_id,
              post_type,
              text_body,
              caption,
              media_url,
              media_thumb_url,
              visibility,
              tribe_id,
              like_count,
              comment_count,
              created_at,
              profile (
                id,
                display_name,
                avatar_url,
                
              )
            `)
            .order('created_at', { ascending: false })
            .limit(20); // Reduced limit for faster loading
            
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), 6000)
          );
          
          const { data: postsData, error: postsError } = await Promise.race([
            queryPromise,
            timeoutPromise
          ]);

          if (postsError) {
            throw new Error(`Database query failed: ${postsError.message}`);
          }

          if (!postsData || postsData.length === 0) {
            console.log('📡 No posts found');
            setPosts([]);
            return;
          }

          // Get user data with timeout
          // Note: We now have profile data from the join, but keep fallback for users table
          const userIds = [...new Set(postsData.map(post => post.user_id).filter(Boolean))];
          const userQueryPromise = supabase
            .from('profile')
            .select('id, display_name, avatar_url')
            .in('id', userIds);
            
          const userTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('User query timeout')), 4000)
          );
          
          let userData = [];
          try {
            const userResult = await Promise.race([userQueryPromise, userTimeoutPromise]);
            userData = userResult.data || [];
          } catch (userError) {
            console.warn('User data failed, continuing with post data only');
          }

          // Create user lookup map
          const userMap = new Map();
          userData.forEach(user => {
            userMap.set(user.id, user);
          });

          // Transform posts using helper function that includes avatar fix
          const { transformDatabaseFallbackPost } = await import('../utils/social-feed-helpers');
          const transformedPosts = postsData.map((post) => {
            // Use profile data from join first, fallback to users table data, then to safe defaults
            let profileData = null;
            
            if (post.profile) {
              profileData = {
                ...post.profile,
                // Map display_name to username for compatibility
                username: post.profile.display_name || 'Unknown User'
              };
            } else {
              // Fallback to users table data
              profileData = userMap.get(post.user_id);
            }
            
            // If still no profile data, create safe defaults to prevent errors
            if (!profileData) {
              console.log('ℹ️ No profile data found for post:', post.id, 'user_id:', post.user_id?.substring(0, 8) + '...');
              profileData = {
                id: post.user_id,
                username: 'Unknown User',
                display_name: 'Unknown User',
                avatar_url: null
              };
            }
            
            return transformDatabaseFallbackPost(post, profileData, savedSet);
          });

          console.log(`✅ Loaded ${transformedPosts.length} posts via database fallback`);
          setPosts(transformedPosts);
          return;
          
        } catch (fallbackError) {
          console.error('❌ Database fallback failed:', fallbackError);
          // Even if database fails, don't break the app - show empty state gracefully
          setPosts([]);
        }
      }
      
      // If everything fails, show empty state
      console.log('Showing empty state - all loading methods failed');
      setPosts([]);
      
    } catch (error) {
      console.error('Error in loadPosts:', error);
      setPosts([]);
    } finally {
      setIsLoading(false);
      setSchemaInitializing(false);
    }
  };

  // Force initial load exactly once with timeout safety - improved
  useEffect(() => {
    console.log('🔄 Initial post load effect triggered')
    if (initialLoadAttempted.current) return;
    initialLoadAttempted.current = true;
    
    // Set a reasonable timeout to prevent hanging
    const loadTimeout = setTimeout(() => {
      console.warn('⚠️ Post loading timed out after 12s, setting loading to false');
      setIsLoading(false);
      setSchemaInitializing(false);
    }, 12000); // Increased to 12 second timeout to allow for slower connections
    
    // Start post loading immediately with promise handling
    const initializeData = async () => {
      try {
        // Clear emergency timeout since we're starting normal initialization
        if (emergencyTimeoutRef.current) {
          clearTimeout(emergencyTimeoutRef.current);
          emergencyTimeoutRef.current = null;
        }
        
        await loadPosts();
        
        // Preload saved set if function is available (non-blocking, after posts load)
        if (onPreloadSavedSet && isAuthenticated) {
          setTimeout(() => {
            onPreloadSavedSet().catch(error => {
              console.warn('Bookmark preload failed:', error);
            });
          }, 1000); // Reduced wait time
        }
      } catch (error) {
        console.error('Error during initial data load:', error);
        setIsLoading(false);
        setSchemaInitializing(false);
      } finally {
        clearTimeout(loadTimeout);
      }
    };
    
    initializeData();
    
    return () => {
      clearTimeout(loadTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load when auth flips ready - with timeout protection
  useEffect(() => {
    if (session || isAuthenticated) {
      // Add timeout protection for auth-triggered loads
      const authLoadTimeout = setTimeout(() => {
        console.warn('Auth-triggered load timed out');
        setIsLoading(false);
      }, 5000);
      
      loadPosts().finally(() => {
        clearTimeout(authLoadTimeout);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isAuthenticated]);

  // Update posts bookmark state when savedSet changes
  useEffect(() => {
    setPosts(prevPosts => {
      return prevPosts.map(post => ({
        ...post,
        bookmarked: savedSet?.includes(post.id) || false
      }));
    });
  }, [savedSet]);

  // Update current user's avatar in all their posts when userInfo changes
  useEffect(() => {
    if (!userInfo || !session?.user?.id) return;
    
    console.log('🖼️ User info changed - updating avatar in posts:', {
      userId: session.user.id,
      newAvatar: userInfo.profileImageUrl,
      postsCount: posts.length
    });
    
    setPosts(prevPosts => {
      return prevPosts.map(post => {
        // NOTE: Avatars are now handled by database-first system in PostCard component
        // No need to update post.avatar field - PostCard uses useUserAvatar hook
        return post;
      });
    });
  }, [userInfo?.profileImageUrl, userInfo?.updatedAt, session?.user?.id, posts.length]);

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

      // Use the new edge helper for notifications - but fail gracefully
      try {
        const { getUnreadCount } = await import('../utils/edge');
        const response = await getUnreadCount();
        const unreadCount = response.count || 0;
        console.log('Fetched notification count:', unreadCount);
        setUnreadNotificationCount(unreadCount);
      } catch (apiError) {
        console.log('📝 Notifications API not available, setting count to 0');
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

  // Enhanced page navigation that saves state
  const navigateToPage = useCallback((page: FeedTab) => {
    console.log('🧭 Navigating to page:', page, '(current page was:', currentPage, ')');
    setCurrentPage(page);
    
    // Add immediate save for critical navigation (like profile)
    if (page === 'profile' || page === 'create' || page === 'discover' || page === 'saved' || page === 'notifications') {
      console.log('🔒 Critical page navigation - saving immediately:', page);
      try {
        saveToStorage(STORAGE_KEYS.CURRENT_PAGE, page);
        saveToStorage(STORAGE_KEYS.CURRENT_VIEW, 'social');
        console.log('✅ Immediate save successful for:', page);
      } catch (error) {
        console.error('❌ Immediate save failed:', error);
      }
    }
    // Note: localStorage save is also handled by useEffect for redundancy
  }, [currentPage]);

  // Handle discover tribes
  const handleDiscover = () => {
    navigateToPage('discover');
  };

  // Hamburger menu handlers
  const handleHamburgerCreatePost = () => {
    navigateToPage('create');
  };

  const handleHamburgerProfile = () => {
    navigateToPage('profile');
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

  // Handle successful post creation
  const handlePostCreated = () => {
    console.log('✅ SocialFeed: Post created successfully, refreshing feed');
    // Navigate back to feed and refresh
    navigateToPage('feed');
    // Trigger immediate feed refresh when a new post is created
    triggerFeedRefresh();
    // Add a small delay to ensure database transaction is committed
    console.log('🔄 SocialFeed: Loading posts after creation (with delay)...');
    setTimeout(() => {
      loadPosts();
    }, 500); // 500ms delay to ensure database consistency
  };

  // Handle post deletion from SimplePostDetailsDrawer
  const handlePostDeleted = (postId: string) => {
    console.log('🗑️ SocialFeed: Post deleted:', postId);
    
    // Remove post from local state immediately
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    
    // Close the drawer
    setPostDetailDrawerOpen(false);
    setPostDetailDrawerPostId(null);
    
    // Trigger feed refresh to ensure consistency
    triggerFeedRefresh();
    
    // Reload posts after a short delay to ensure database consistency
    setTimeout(() => {
      loadPosts();
    }, 500);
  };

  // Handle post editing - placeholder for future implementation
  const handleEditPost = (postId: string) => {
    console.log('✏️ SocialFeed: Edit post requested:', postId);
    
    // Close the drawer
    setPostDetailDrawerOpen(false);
    setPostDetailDrawerPostId(null);
    
    // Navigate to create page with edit mode (future implementation)
    toast.info('Post editing coming soon! ✏️');
    // TODO: Implement edit functionality
    // navigateToPage('create');
    // setEditingPostId(postId);
  };

  // Enhanced toggleBookmark function with better error handling and optimistic updates
  const toggleBookmark = async (postId: string) => {
    try {
      console.log('🔖 SocialFeed: Toggling bookmark for post:', postId);
      
      if (!onToggleBookmark) {
        console.warn('No onToggleBookmark handler provided');
        return;
      }
      
      // Optimistically update the post state in the feed
      setPosts(prevPosts => {
        return prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              bookmarked: !post.bookmarked
            };
          }
          return post;
        });
      });
      
      // Call the parent toggle function
      const result = await onToggleBookmark(postId);
      console.log('🔖 SocialFeed: Bookmark toggle result:', result);
      
      // If the toggle failed, revert the optimistic update
      if (result !== 'Success') {
        console.warn('Bookmark toggle failed, reverting optimistic update');
        setPosts(prevPosts => {
          return prevPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                bookmarked: !post.bookmarked // Revert the change
              };
            }
            return post;
          });
        });
      }
    } catch (error) {
      console.error('Error in SocialFeed toggleBookmark:', error);
      
      // Revert the optimistic update on error
      setPosts(prevPosts => {
        return prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              bookmarked: !post.bookmarked // Revert the change
            };
          }
          return post;
        });
      });
    }
  };

  // Handle follow/unfollow with optimistic updates
  const handleFollowChange = async (userId: string, isFollowing: boolean) => {
    try {
      console.log('👥 SocialFeed: Follow status changed for user:', userId, 'isFollowing:', isFollowing);
      
      // Optimistically update follow status in all posts by this user
      setPosts(prevPosts => {
        return prevPosts.map(post => {
          if ((post.userId === userId || post.user_id === userId) && (post.userId !== session?.user?.id && post.user_id !== session?.user?.id)) {
            return {
              ...post,
              isFollowing: isFollowing
            };
          }
          return post;
        });
      });
      
      // Show user feedback
      if (isFollowing) {
        toast.success('Following user! 👥');
      } else {
        toast.success('Unfollowed user');
      }
      
    } catch (error) {
      console.error('Error in SocialFeed handleFollowChange:', error);
      
      // Revert optimistic update on error
      setPosts(prevPosts => {
        return prevPosts.map(post => {
          if ((post.userId === userId || post.user_id === userId) && (post.userId !== session?.user?.id && post.user_id !== session?.user?.id)) {
            return {
              ...post,
              isFollowing: !isFollowing // Revert the change
            };
          }
          return post;
        });
      });
      
      toast.error('Failed to update follow status');
    }
  };

  // Enhanced toggleBookmark function with better error handling and optimistic updates - continued
  const toggleBookmark_Old = async (postId: string) => {
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
      const { togglePostBookmark } = await import('../utils/edge');
      const response = await togglePostBookmark(postId);

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
      /* Revert optimistic update on error */
      setPosts(originalPosts);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (!errorMessage.includes('Feature requires server deployment') &&
          !errorMessage.includes('Network unavailable') &&
          !errorMessage.includes('Edge function not deployed') &&
          !errorMessage.includes('Request timeout')) {
        console.log('📝 Bookmark toggle info:', errorMessage);
      }
      
      if (errorMessage.includes('Feature requires server deployment') || 
          errorMessage.includes('Network unavailable') ||
          errorMessage.includes('Edge function not deployed') || 
          errorMessage.includes('Request timeout') ||
          errorMessage.includes('timeout')) {
        toast.error('Feature not available', {
          description: 'Bookmarks require server deployment'
        });
      } else if (errorMessage.includes('404')) {
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
      const { togglePostLike } = await import('../utils/edge');
      const response = await togglePostLike(postId);

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (!errorMessage.includes('Feature requires server deployment') &&
          !errorMessage.includes('Network unavailable') &&
          !errorMessage.includes('Edge function not deployed') &&
          !errorMessage.includes('Request timeout')) {
        console.log('📝 Like toggle info:', errorMessage);
      }
      
      if (errorMessage.includes('Feature requires server deployment') || 
          errorMessage.includes('Network unavailable') ||
          errorMessage.includes('Edge function not deployed') || 
          errorMessage.includes('Request timeout') ||
          errorMessage.includes('timeout')) {
        toast.error('Feature not available', {
          description: 'Likes require server deployment'
        });
      } else if (errorMessage.includes('404')) {
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

  // Bridge function for PostTypeCard components - converts username back to user click
  const handleUserClickFromPostType = async (userIdentifier: string) => {
    console.log('PostTypeCard user click with identifier:', userIdentifier);
    
    // First check if the identifier is already a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(userIdentifier)) {
      console.log('Identifier is already a UUID, using directly:', userIdentifier);
      handleUserClick(userIdentifier, 'User');
      return;
    }
    
    // Otherwise, treat it as a username and find the post author's ID from the loaded posts
    const matchingPost = posts.find(p => 
      (p.username === userIdentifier) || 
      (p.nickname === userIdentifier) || 
      (p.authorName === userIdentifier)
    );
    
    if (matchingPost) {
      const authorId = matchingPost.authorId || matchingPost.userId || matchingPost.user_id;
      if (authorId && uuidRegex.test(authorId)) {
        console.log('Found matching post with valid authorId:', authorId);
        handleUserClick(authorId, userIdentifier);
        return;
      }
    }
    
    // Fallback: fetch user ID by display_name
    console.warn('Could not find post author ID in loaded posts, fetching by display_name:', userIdentifier);
    
    try {
      const { supabase } = await import('../utils/supabase/client');
      
      const { data: profile, error } = await supabase
        .from('profile')
        .select('id')
        .eq('display_name', userIdentifier)
        .single();
      
      if (!error && profile?.id && uuidRegex.test(profile.id)) {
        console.log('✅ Found user ID by display_name:', profile.id);
        handleUserClick(profile.id, userIdentifier);
        return;
      } else {
        console.warn('Could not find user by display_name or invalid ID:', userIdentifier, error);
      }
    } catch (error) {
      console.error('Error fetching user by display_name:', error);
    }
    
    // Show warning if all attempts fail
    console.error('All attempts to resolve user identifier failed:', userIdentifier);
    toast.error(`Profile not available for ${userIdentifier}`);
  };

  // Handle user click
  const handleUserClick = (authorId: string, username: string) => {
    console.log('Navigating to user profile:', { authorId, username });
    
    // Validate that we have a proper user ID (should be UUID format)
    if (!authorId || authorId === 'unknown' || authorId.length < 10) {
      console.warn('Invalid or missing user ID:', authorId);
      toast.error(`Profile not available for ${username || 'this user'}`);
      return;
    }
    
    // Additional UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(authorId)) {
      console.warn('User ID is not a valid UUID format:', authorId);
      toast.error(`Profile not available for ${username || 'this user'}`);
      return;
    }
    
    // Check if it's the current user - if so, navigate to MyProfile (profile tab)
    if (session?.user?.id === authorId) {
      navigateToPage('profile');
      return;
    }
    
    // Navigate to UserProfile component via URL router
    console.log('Setting URL to:', `/u/${authorId}`);
    
    if (onNavigateToUrl) {
      // Use the navigation handler if available
      onNavigateToUrl(`/u/${authorId}`);
    } else {
      // Fallback to direct URL change with page reload
      window.location.href = `/u/${authorId}`;
    }
    
    // Trigger URL routing instead of full page reload
    window.dispatchEvent(new Event('popstate'));
  };

  // Handle tribe join
  const handleJoinTribe = (tribeId: string) => {
    console.log('Joining tribe:', tribeId);
    toast.success('Tribe join request sent!', {
      description: 'You will be notified when approved'
    });
  };



  // Enhanced post detail drawer opening that works with real UUIDs - unified for consistency
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
      console.error('Could not determine valid post ID for post details');
      return;
    }

    console.log('Opening post details for post:', postId);
    
    // Use unified drawer for all devices and consistent UI
    setPostDetailDrawerPostId(postId);
    setPostDetailDrawerOpen(true);
  };

  // Enhanced render function with proper props
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

    // Show loading state when initially loading posts
    if (isLoading && posts.length === 0) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-neon-lilac mx-auto" />
            <div>
              <p className="text-pearl-white">Loading posts...</p>
              <p className="text-muted-lavender">Getting the latest content</p>
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
        {posts.map((post) => (
          <PostErrorBoundary key={post.id} postId={post.id}>
            <PostTypeCard
              post={post}
              currentUserId={session?.user?.id || userInfo?.id}
              userTribeMemberships={[]}
              onToggleLike={toggleLike}
              onToggleBookmark={onToggleBookmark ? (postId) => onToggleBookmark(postId) : undefined}
              onFollowChange={handleFollowChange}
              onOpenComments={openCommentsForPost}
              onUserClick={handleUserClickFromPostType}
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
            onNavigate={navigateToPage}
            userResult={userResult}
          />
        )}

        {/* Hamburger Menu */}
        <HamburgerMenu
          open={hamburgerMenuOpen}
          onOpenChange={setHamburgerMenuOpen}
          userInfo={userInfo}
          onCreatePost={handleHamburgerCreatePost}
          onProfile={handleHamburgerProfile}
          onDiscoverTribes={handleDiscover}
          onSettings={() => setCurrentPage('settings')}
          onLogout={handleHamburgerLogout}
        />
      </div>
    );
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
        setPostDetailDrawerOpen(false);
        setHamburgerMenuOpen(false);
      }
    };

    if (menuOpen || notificationCenterOpen || postDetailDrawerOpen || hamburgerMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [menuOpen, notificationCenterOpen, postDetailDrawerOpen, hamburgerMenuOpen]);

  // Enhanced authentication check with multiple fallbacks
  useEffect(() => {
    // Skip if initial load is still pending
    if (!initialLoadAttempted.current) {
      console.log('🔍 Skipping auth check - initial load not yet attempted');
      return;
    }
    
    const checkAuthAndLoadPosts = async () => {
      console.log('🔍 Auth check triggered:', { 
        hasSession: !!session, 
        sessionUndefined: session === undefined,
        isAuthenticated,
        initialLoadAttempted: initialLoadAttempted.current,
        timestamp: new Date().toISOString()
      });
      
      // First, check if we have a session prop
      if (session === undefined) {
        console.log('⏳ Session prop still loading, waiting...');
        return;
      }
      
      // Check session prop first
      if (session) {
        console.log('✅ User is authenticated via session prop, loading posts...');
        await loadPosts();
        await fetchNotificationCount();
        return;
      }
      
      // If no session prop, check isAuthenticated prop
      if (isAuthenticated) {
        console.log('✅ User is authenticated via isAuthenticated prop, loading posts...');
        await loadPosts();
        await fetchNotificationCount();
        return;
      }
      
      // If neither prop indicates auth, try direct session check as final fallback
      try {
        console.log('🔍 Attempting direct session check as fallback...');
        const { getSessionSafely } = await import('../utils/simple-session-check');
        const directSession = await getSessionSafely();
        
        if (directSession) {
          console.log('✅ User is authenticated via direct session check, loading posts...');
          await loadPosts();
          await fetchNotificationCount();
          return;
        }
      } catch (error) {
        console.log('❌ Direct session check failed:', error);
      }
      
      // No authentication found - clear posts
      console.log('❌ User is not authenticated, clearing posts');
      setPosts([]);
      setUnreadNotificationCount(0);
    };
    
    checkAuthAndLoadPosts();
  }, [session, isAuthenticated]);

  // Initial load effect - run once on mount if already authenticated
  useEffect(() => {
    // Only run on initial mount and prevent repeated attempts
    if (initialLoadAttempted.current) {
      console.log('🚀 Initial load already attempted, skipping');
      return;
    }
    
    initialLoadAttempted.current = true;
    
    const initialLoad = async () => {
      console.log('🚀 SocialFeed: Initial mount, checking authentication...', {
        hasSession: !!session,
        sessionUndefined: session === undefined,
        isAuthenticated,
        postsLength: posts.length,
        timestamp: new Date().toISOString()
      });
      
      // Check if we have immediate authentication
      if (session || isAuthenticated) {
        console.log('🚀 Already authenticated on mount, loading posts immediately');
        await loadPosts();
        return;
      }
      
      // If session is undefined, wait a bit for it to be set, but also try direct check
      if (session === undefined) {
        console.log('🚀 Session prop is undefined, trying direct session check...');
        
        // Try direct session check immediately
        try {
          const { getSessionSafely } = await import('../utils/simple-session-check');
          const directSession = await getSessionSafely();
          
          if (directSession) {
            console.log('🚀 Found session on immediate direct check, loading posts');
            await loadPosts();
            return;
          }
        } catch (error) {
          console.log('🚀 Immediate direct session check failed:', error);
        }
        
        // If that fails, wait and try again
        console.log('🚀 No immediate session, waiting 1 second then retrying...');
        setTimeout(async () => {
          if (session || isAuthenticated) {
            console.log('🚀 Authentication detected after wait, loading posts');
            await loadPosts();
          } else {
            // Try direct session check again
            try {
              const { getSessionSafely } = await import('../utils/simple-session-check');
              const directSession = await getSessionSafely();
              
              if (directSession) {
                console.log('🚀 Found session on delayed direct check, loading posts');
                await loadPosts();
              } else {
                console.log('🚀 No session found after all checks');
              }
            } catch (error) {
              console.log('🚀 Delayed direct session check failed:', error);
            }
          }
        }, 1000); // Reduced from 1.5 seconds to 1 second
        return;
      }
      
      // If no immediate auth, try direct session check
      try {
        const { getSessionSafely } = await import('../utils/simple-session-check');
        const directSession = await getSessionSafely();
        
        if (directSession) {
          console.log('🚀 Found session on direct check, loading posts');
          await loadPosts();
        } else {
          console.log('🚀 No session found on direct check');
        }
      } catch (error) {
        console.log('🚀 No session found on initial load');
      }
    };
    
    initialLoad();
  }, []); // Empty dependency array - only run once on mount

  // Set up notification polling
  useEffect(() => {
    if (!isAuthenticated) return;

    let timer: NodeJS.Timeout;
    const pollNotifications = async () => {
      try {
        const { getUnreadCount } = await import('../utils/edge');
        const response = await getUnreadCount();
        const count = response.count || 0;
        setUnreadNotificationCount(count);
      } catch (e) {
        // Silently fail for notification polling - don't spam the console
        // This is expected when edge functions aren't deployed
        setUnreadNotificationCount(0);
      }
    };

    // Initial fetch
    pollNotifications();
    
    // Poll every 30 seconds
    timer = setInterval(pollNotifications, 30_000);
    
    return () => clearInterval(timer);
  }, [isAuthenticated]);

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
  }, [isAuthenticated]); // Removed posts.length dependency to prevent infinite loops

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
      <PostComposer
        onBack={() => setCurrentPage('feed')}
        onPostCreated={handlePostCreated}
      />
    );
  }

  if (currentPage === 'profile') {
    return (
      <UnifiedProfilePage
        userInfo={userInfo}
        onBack={() => setCurrentPage('feed')}
        onLogout={onLogout}
        onNavigateToPage={navigateToPage}
        // Pass bookmark system props
        savedList={savedList}
        savedLoading={savedLoading}
        savedError={savedError}
        onLoadSavedPosts={onLoadSavedPosts}
        savedSet={savedSet}
        onToggleBookmark={onToggleBookmark}
      />
    );
  }

  if (currentPage === 'edit-profile') {
    return (
      <EditProfilePage
        currentUser={userInfo ? {
          id: userInfo.id || session?.user?.id || '',
          username: userInfo.username,
          bio: userInfo.bio,
          avatar_url: userInfo.profileImageUrl
        } : null}
        onBack={() => setCurrentPage('profile')}
        onProfileUpdate={(updatedUser) => {
          // Update userInfo in localStorage and state if needed
          console.log('Profile updated:', updatedUser);
          // Refresh the feed to get updated profile data
          loadPosts();
        }}
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

      {/* Post Detail Drawer (Unified for Mobile & Desktop) */}
      {postDetailDrawerOpen && postDetailDrawerPostId && (
        <SimplePostDetailsDrawer
          postId={postDetailDrawerPostId}
          isOpen={postDetailDrawerOpen}
          onClose={() => setPostDetailDrawerOpen(false)}
          userInfo={userInfo}
          onPostDeleted={handlePostDeleted}
          onEditPost={handleEditPost}
        />
      )}
    </>
  );
}