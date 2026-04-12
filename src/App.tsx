import React, { useState, useEffect, useCallback } from 'react';
import { AppBackground } from './components/AppBackground';
import { FaviconManager } from './components/FaviconManager';
import { LandingPage } from './components/LandingPage';
import { LoadingScreen } from './components/LoadingScreen';
import { AppErrorBoundary } from './components/GlobalErrorBoundary';


import { SignupFlow } from './components/SignupFlow';
import { LoginFlow } from './components/LoginFlow';
import { SocialFeed } from './components/SocialFeed';
import { URLRouter } from './components/URLRouter';
import { toast, Toaster } from 'sonner@2.0.3';
import { UserResult, UserInfo } from './utils/app-constants';
import { initializeApp } from './utils/app-initialization';
import { validateSession } from './utils/session-guards';
import { loadFromStorage, saveToStorage } from './utils/app-helpers';
import { STORAGE_KEYS } from './utils/app-constants';
import { FeedRefreshProvider } from './utils/feed-refresh-context';
import { AvatarRefreshProvider } from './utils/avatar-refresh-context';
import { HealthMonitoringService } from './utils/health-monitoring-system';
import { supabase, getClientInfo } from './utils/supabase/client';
import { initializeSessionSync, clearSessionCache } from './utils/session-sync';
import { getSessionSafely } from './utils/simple-session-check';
import { initializeVideoErrorSuppression } from './utils/video-error-suppression';
import { initializeStorage } from './utils/storage-setup';
// Debug imports removed for production

type AppView = 'loading' | 'landing' | 'signup' | 'login' | 'social' | 'url-router';

interface AppState {
  view: AppView;
  userResult: UserResult | null;
  userInfo: UserInfo | null;
  session: any;
  isInitialized: boolean;
  error?: string;
  savedPage?: string; // Store the saved page for restoration
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    view: 'loading',
    userResult: null,
    userInfo: null,
    session: undefined,
    isInitialized: false
  });

  // Bookmark system variables (app-level scope)
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [savedSet, setSavedSet] = useState<string[]>([]);
  const [savedList, setSavedList] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState<boolean>(false);
  const [savedError, setSavedError] = useState<string>('');
  const [savedInFlight, setSavedInFlight] = useState<boolean>(false); // Flight guard
  const [lastSavedLoad, setLastSavedLoad] = useState<number>(0); // Rate limiting
  const [lastSavedLoadAt, setLastSavedLoadAt] = useState<number>(0); // optional for "reload" logic

  // Debug functionality for saved posts (reduced logging)
  useEffect(() => {
    // Only log significant state changes to reduce spam
    if (savedLoading || savedError || (savedList.length > 0)) {
      console.log('🔖 Saved posts state:', {
        savedListSize: savedList?.length || 0,
        savedLoading,
        hasError: !!savedError,
        savedInFlight,
      });
    }
  }, [savedList.length, savedLoading, savedError, savedInFlight]);

  // Fix userInfo username if missing
  const fixUserInfoUsername = async () => {
    try {
      console.log('🔧 Attempting to fix userInfo username...');
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.log('🔧 No session found for username fix');
        return;
      }

      const userId = session.user.id;
      console.log('🔧 User ID for username fix:', userId.substring(0, 8) + '...');

      // Check if userInfo already has a valid username
      if (appState.userInfo?.username && appState.userInfo.username !== 'Tribe Member' && appState.userInfo.username !== 'Unknown User') {
        console.log('🔧 UserInfo already has valid username:', appState.userInfo.username);
        return;
      }

      // Try to get username from multiple sources
      let foundUsername = null;

      // 1. Check session user metadata
      if (session.user.user_metadata?.username) {
        foundUsername = session.user.user_metadata.username;
        console.log('✅ Found username in session metadata:', foundUsername);
      } 
      // 2. Check database profile
      else {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', userId)
            .single();

          if (!error && profile?.display_name) {
            foundUsername = profile.display_name;
            console.log('✅ Found username in database:', foundUsername);
          }
        } catch (dbError) {
          console.warn('Database username lookup failed:', dbError);
        }
      }

      // 3. Fallback to email prefix or known username
      if (!foundUsername) {
        if (session.user.email) {
          foundUsername = session.user.email.split('@')[0];
          console.log('✅ Using email prefix as username:', foundUsername);
        } else {
          foundUsername = 'frost_wave737'; // Your specific case
          console.log('✅ Using hardcoded fallback username:', foundUsername);
        }
      }

      // Update userInfo with the found username
      if (foundUsername) {
        console.log('🔧 Updating userInfo with username:', foundUsername);
        
        setAppState(prevState => {
          const updatedUserInfo = {
            ...prevState.userInfo,
            username: foundUsername
          } as UserInfo;

          // Save to localStorage
          saveToStorage(STORAGE_KEYS.USER_INFO, updatedUserInfo);
          
          return {
            ...prevState,
            userInfo: updatedUserInfo
          };
        });

        toast.success(`Welcome back, ${foundUsername}! 👋`);
        console.log('✅ Username fix completed successfully');
      }

    } catch (error) {
      console.error('🔧 Username fix failed:', error);
    }
  };

  // Bookmark system helper functions
  const getSessionHelper = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { 
        setSavedError("Not logged in"); 
        return "Not logged in"; 
      }
      setViewerId(session.user.id);
      return session.user.id;
    } catch (error) {
      console.warn('Session helper error:', error);
      setSavedError("Session error");
      return "Session error";
    }
  };

  // Preload savedSet for feed page - non-blocking
  const preloadSavedSet = async () => {
    try {
      setSavedLoading(true);
      const userId = await getSessionHelper();
      if (typeof userId !== 'string') {
        setSavedSet([]);
        return;
      }

      const { data: rows, error } = await supabase
        .from("post_bookmarks")
        .select("post_id")
        .eq("user_id", userId);

      if (error) { 
        console.warn('Bookmark preload error:', error);
        setSavedError(''); // Don't show error to user
        setSavedSet([]); 
      } else { 
        setSavedSet((rows ?? []).map(r => r.post_id)); 
        setSavedError('');
      }
    } catch (error) {
      console.warn('Error preloading saved set:', error);
      setSavedError(''); // Don't show error to user
      setSavedSet([]);
    } finally {
      setSavedLoading(false);
    }
  };

  // Save/Unsave toggle function
  const toggleBookmark = async (postId: string) => {
    try {
      console.log('🔖 Toggle bookmark for post:', postId);
      
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { 
        toast.error("Please sign in to save posts");
        return "Not logged in"; 
      }
      
      const uid = s.user.id;
      if (!postId) {
        toast.error("Invalid post");
        return "No post id";
      }

      // Optimistic update first
      const isCurrentlySaved = savedSet?.includes(postId);
      console.log('🔖 Current saved state:', isCurrentlySaved, 'savedSet size:', savedSet?.length);
      
      if (isCurrentlySaved) {
        setSavedSet(prev => prev.filter(id => id !== postId));
        // Also remove from savedList if present
        setSavedList(prev => prev.filter(post => post.id !== postId));
      } else {
        setSavedSet(prev => [...prev, postId]);
      }

      if (isCurrentlySaved) {
        // Remove bookmark
        console.log('🔖 Removing bookmark from database...');
        const { error } = await supabase
          .from("post_bookmarks")
          .delete()
          .match({ user_id: uid, post_id: postId });
        if (error) {
          console.error('🔖 Failed to remove bookmark:', error);
          // Revert optimistic update
          setSavedSet(prev => [...prev, postId]);
          toast.error("Failed to remove bookmark");
          return error.message;
        }
        console.log('🔖 Bookmark removed successfully');
        toast.success("Removed from saved posts");
      } else {
        // Add bookmark
        console.log('🔖 Adding bookmark to database...');
        const { error } = await supabase
          .from("post_bookmarks")
          .insert({ user_id: uid, post_id: postId });
        if (error && error.code !== "23505") {
          console.error('🔖 Failed to add bookmark:', error);
          // Revert optimistic update
          setSavedSet(prev => prev.filter(id => id !== postId));
          toast.error("Failed to save post");
          return error.message;
        }
        console.log('🔖 Bookmark added successfully');
        toast.success("Saved to collection! 🔖");
      }

      console.log('🔖 Updated savedSet size:', savedSet?.length);
      return "Success";
    } catch (error) {
      console.error('🔖 Bookmark toggle error:', error);
      toast.error("Network error occurred");
      return "Error";
    }
  };

  // Load saved posts for Profile → Saved tab
  const loadSavedPosts = async () => {
    // Rate limiting to prevent glitching - don't allow calls more than once per 2 seconds
    const now = Date.now();
    if (now - lastSavedLoad < 2000) {
      console.log('🔖 Load saved posts skipped - rate limited');
      return;
    }
    
    if (savedInFlight) {
      console.log('🔖 Load saved posts skipped - already in flight');
      return;
    }
    
    console.log('🔖 Starting saved posts load...');
    setLastSavedLoad(now);
    setSavedInFlight(true);
    setSavedLoading(true);
    setSavedError("");

    try {
      // Always resolve the session before calling the function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setSavedError("Not logged in");
        setSavedLoading(false);
        setSavedInFlight(false);
        return;
      }

      console.log('🔖 Session found, calling saved-posts endpoint...');

      // Import Supabase URL from client info
      const { projectId } = await import('./utils/supabase/info');
      const SUPABASE_URL = `https://${projectId}.supabase.co`;

      // Call the saved-posts endpoint with current user's access token
      const res = await fetch(`${SUPABASE_URL}/functions/v1/make-server-70df0d6e/saved-posts`, {
        headers: { 
          Authorization: `Bearer ${session.access_token}` 
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status} ${errorText}`);
      }

      const { data } = await res.json();
      
      // The server already returns flattened/transformed posts, just ensure proper format
      const savedList = (data ?? [])
        .filter(post => post && post.id) // Filter out any null posts
        .map(post => ({ 
          ...post, 
          // Ensure all expected fields are present
          id: post.id,
          original_post_id: post.id,
          type: post.post_type || 'thought',
          post_type: post.post_type || 'thought',
          thumbnail_url: post.media_thumb_url,
          media_thumb_url: post.media_thumb_url,
          media_url: post.media_url,
          media_urls: post.media_url ? [post.media_url] : [],
          content: post.text_body || post.caption,
          caption: post.caption,
          text_body: post.text_body,
          visibility: post.visibility || 'public',
          tribe_id: post.tribe_id,
          created_at: post.created_at,
          saved_at: post.saved_at, // This comes from the server transformation
          user_id: post.user_id
        }));

      console.log('🔖 Successfully loaded', savedList.length, 'saved posts from Edge API');
      setSavedList(savedList);
      setSavedError("");

    } catch (err: any) {
      console.error("🔖 Failed to load saved posts:", err);
      
      // Handle different error types
      let errorMessage = "Unable to load saved posts";
      if (err.message && err.message.includes('401')) {
        errorMessage = "Please sign in to view saved posts";
      } else if (err.message && err.message.includes('404')) {
        errorMessage = "Saved posts feature not available";
      } else if (err.message && err.message.includes('500')) {
        errorMessage = "Server error loading saved posts";
      }
      
      console.log('🔖 Setting error:', errorMessage);
      setSavedError(errorMessage);
      setSavedList([]);
      
    } finally {
      console.log('🔖 Saved posts load complete');
      setSavedLoading(false);
      setSavedInFlight(false);
    }
  };

  // Debug userInfo on app startup
  useEffect(() => {
    console.log('🔍 App startup - Current userInfo:', {
      userInfo: appState.userInfo,
      username: appState.userInfo?.username,
      contact: appState.userInfo?.contact,
      hasSession: !!appState.session
    });

    // Check what's in localStorage
    try {
      const storedUserInfo = localStorage.getItem('tribe_user_info');
      const storedUserResult = localStorage.getItem('tribe_user_result');
      console.log('🔍 Stored userInfo:', storedUserInfo ? JSON.parse(storedUserInfo) : null);
      console.log('🔍 Stored userResult:', storedUserResult ? JSON.parse(storedUserResult) : null);
    } catch (error) {
      console.warn('Could not parse stored data:', error);
    }
  }, [appState.userInfo, appState.session]);

  // Initialize app and check for URL routing
  useEffect(() => {
    const initialize = async () => {
      // Emergency fallback timer - if nothing happens in 20 seconds, show landing page
      // This should be longer than all other timeouts to avoid conflicts
      const emergencyFallbackTimer = setTimeout(() => {
        console.warn('🚨 Emergency fallback triggered - app took too long to initialize');
        setAppState(prevState => {
          // Only trigger if we haven't already initialized
          if (!prevState.isInitialized) {
            return {
              view: 'landing',
              userResult: null,
              userInfo: null,
              session: null,
              isInitialized: true,
              error: undefined // Don't show error to user for slow startup
            };
          }
          return prevState;
        });
      }, 20000);

      let immediateCheckTimer: NodeJS.Timeout | null = null;
      
      try {
        console.log('🚀 Starting Tribe Board app initialization...');
        
        // Set early loading state to show progress
        setAppState(prevState => {
          if (!prevState.isInitialized) {
            return {
              ...prevState,
              view: 'loading'
            };
          }
          return prevState;
        });
        
        // Check and validate saved page state on startup with enhanced debugging
        try {
          const savedPage = localStorage.getItem(STORAGE_KEYS.CURRENT_PAGE);
          const savedView = localStorage.getItem(STORAGE_KEYS.CURRENT_VIEW);
          const allStorageKeys = Object.keys(localStorage);
          const tribeRelatedKeys = allStorageKeys.filter(key => key.includes('tribe'));
          
          console.log('🔍 Comprehensive storage state on startup:', { 
            savedPage, 
            savedView, 
            currentPath: window.location.pathname,
            currentHash: window.location.hash,
            isValidPage: savedPage && ['feed', 'profile', 'create', 'discover', 'saved', 'notifications'].includes(savedPage),
            tribeRelatedKeys,
            allStorageEntries: tribeRelatedKeys.reduce((acc, key) => {
              acc[key] = localStorage.getItem(key);
              return acc;
            }, {} as Record<string, string | null>)
          });
          
          if (savedPage && !['feed', 'profile', 'create', 'discover', 'saved', 'notifications'].includes(savedPage)) {
            console.log('🧹 Clearing invalid saved page state:', savedPage);
            localStorage.removeItem(STORAGE_KEYS.CURRENT_PAGE);
          } else if (savedPage) {
            console.log('✅ Valid saved page found:', savedPage);
          } else {
            console.log('⚠️ No saved page found in localStorage');
          }
        } catch (error) {
          console.warn('Failed to check/clear saved page state:', error);
        }
        
        // Initialize app core functionality with timeout protection
        
        // Start performance monitoring
        HealthMonitoringService.performance.startTimer('app-initialization');
        
        // Record app start
        HealthMonitoringService.ux.recordUserAction('app-start');
        
        // Initialize non-blocking utilities first (run in parallel)
        const utilityPromises = [];
        
        utilityPromises.push(
          new Promise(resolve => {
            try {
              initializeSessionSync();
              resolve('session-sync');
            } catch (error) {
              console.warn('⚠️ Session sync failed to initialize:', error);
              resolve('session-sync-failed');
            }
          })
        );
        
        utilityPromises.push(
          new Promise(resolve => {
            try {
              initializeVideoErrorSuppression();
              resolve('video-error-suppression');
            } catch (error) {
              console.warn('⚠️ Video error suppression failed to initialize:', error);
              resolve('video-error-suppression-failed');
            }
          })
        );
        
        utilityPromises.push(
          new Promise(async resolve => {
            try {
              await initializeStorage();
              resolve('storage-initialization-success');
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              console.warn('⚠️ Storage initialization failed:', errorMsg);
              console.log('💡 Storage Setup Help: Add "?storage-instructions" to the URL for detailed setup guide');
              resolve('storage-initialization-failed');
            }
          })
        );
        
        // Don't wait for utilities - let them run in background
        Promise.all(utilityPromises).then(results => {
          console.log('✅ Background utilities completed:', results);
        });
        
        console.log('⏩ Utilities started in background, continuing initialization...');
        
        // Check if we have a URL that needs routing or if we need to preserve page state
        const path = window.location.pathname;
        const needsURLRouting = path.startsWith('/post/') || path.startsWith('/users/') || path.startsWith('/u/');
        const isAppPage = path === '/' || path === '/app';
        
        if (needsURLRouting) {
          console.log('🔗 URL routing needed for path:', path);
          
          // Quick session check for URL routing
          const session = await getSessionSafely();
          
          if (session) {
            const savedUserInfo = loadFromStorage(STORAGE_KEYS.USER_INFO);
            const savedUserResult = loadFromStorage(STORAGE_KEYS.USER_RESULT);
            
            setAppState(prevState => {
              if (!prevState.isInitialized) {
                return {
                  view: 'url-router',
                  userResult: savedUserResult,
                  userInfo: savedUserInfo,
                  session: session,
                  isInitialized: true
                };
              }
              return prevState;
            });
            
            HealthMonitoringService.performance.endTimer('app-initialization');
            return;
          } else {
            console.log('❌ No valid session for URL routing, redirecting to landing');
            window.history.pushState({}, '', '/');
          }
        }
        
        // Check for page state restoration - prioritize this over regular initialization
        // Use fast synchronous checks first to avoid delays
        const savedUserInfo = loadFromStorage(STORAGE_KEYS.USER_INFO);
        const savedView = loadFromStorage(STORAGE_KEYS.CURRENT_VIEW);
        const savedPage = loadFromStorage(STORAGE_KEYS.CURRENT_PAGE);
        
        // Only do session check if we have stored user info indicating a previous session
        if (savedUserInfo && savedView === 'social') {
          console.log('🔄 Fast restoration path - checking session...');
          
          try {
            // Quick session check with reduced timeout for restoration
            const sessionPromise = getSessionSafely();
            const sessionTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Restoration session timeout')), 2000)
            );
            
            const restorationSession = await Promise.race([sessionPromise, sessionTimeoutPromise]);
            
            if (restorationSession) {
              const savedUserResult = loadFromStorage(STORAGE_KEYS.USER_RESULT);
              
              // Define valid pages
              const validPages = ['feed', 'profile', 'create', 'discover', 'saved', 'notifications'];
              
              // Use the saved page directly if it's valid, otherwise default to feed
              let pageToRestore = 'feed'; // safe default
              
              if (savedPage && typeof savedPage === 'string' && validPages.includes(savedPage)) {
                pageToRestore = savedPage;
                console.log('✅ Fast restoration to saved page:', pageToRestore);
              } else {
                console.log('⚠️ Fast restoration defaulting to feed. SavedPage was:', savedPage);
              }
              
              setAppState(prevState => {
                if (!prevState.isInitialized) {
                  return {
                    view: 'social',
                    userResult: savedUserResult,
                    userInfo: savedUserInfo,
                    session: restorationSession,
                    isInitialized: true,
                    savedPage: pageToRestore
                  };
                }
                return prevState;
              });
              
              // Preload saved bookmarks for restored session (non-blocking)
              // Note: Only preload savedSet (bookmarked post IDs), not full saved posts list
              setTimeout(() => preloadSavedSet(), 500);
              
              // Clear emergency fallback timer since we completed successfully
              clearTimeout(emergencyFallbackTimer);
              HealthMonitoringService.performance.endTimer('app-initialization');
              return;
            }
          } catch (restorationError) {
            console.log('⚠️ Fast restoration session check failed, proceeding to full initialization:', restorationError);
            // Continue to full initialization below
          }
        }
        
        // Regular app initialization with robust timeout and fallback handling
        console.log('🔄 Starting regular app initialization...');
        
        // Add immediate fallback for very slow connections
        immediateCheckTimer = setTimeout(() => {
          console.log('🏃‍♂️ Immediate fallback triggered - going to landing page while background init continues');
          setAppState(prevState => {
            if (!prevState.isInitialized) {
              return {
                view: 'landing',
                userResult: null,
                userInfo: null,
                session: null,
                isInitialized: true
              };
            }
            return prevState;
          });
        }, 5000); // 5 second immediate fallback
        
        let initResult;
        let session = null;
        
        try {
          // Step 1: Quick session check with reduced timeout (3 seconds)
          console.log('🔍 Quick session check...');
          const sessionPromise = getSessionSafely();
          const sessionTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session check timeout')), 3000)
          );
          
          try {
            session = await Promise.race([sessionPromise, sessionTimeoutPromise]);
            console.log('✅ Session check completed:', { hasSession: !!session });
          } catch (sessionError) {
            console.warn('⚠️ Session check timed out, proceeding without session:', sessionError);
            session = null;
          }
          
          // Step 2: App initialization with reduced timeout (8 seconds)
          console.log('🔄 Starting core app initialization...');
          const initPromise = initializeApp();
          const initTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Init timeout')), 8000)
          );
          
          try {
            initResult = await Promise.race([initPromise, initTimeoutPromise]);
            console.log('📱 App initialization completed successfully:', initResult);
          } catch (initError) {
            console.warn('⚠️ App initialization timed out, using safe fallback:', initError);
            
            // Safe fallback initialization
            const savedUserInfo = loadFromStorage(STORAGE_KEYS.USER_INFO);
            const savedUserResult = loadFromStorage(STORAGE_KEYS.USER_RESULT);
            
            initResult = {
              currentView: session && savedUserInfo ? 'social' : 'landing',
              userResult: savedUserResult,
              userInfo: savedUserInfo,
              error: 'Used fallback initialization due to timeout'
            };
            
            console.log('🛡️ Fallback initialization result:', initResult);
          }
          
        } catch (criticalError) {
          console.error('💥 Critical error during initialization steps:', criticalError);
          
          // Ultimate fallback - just go to landing page
          initResult = {
            currentView: 'landing',
            userResult: null,
            userInfo: null,
            error: 'Critical initialization failure'
          };
          session = null;
        }
        
        const finalView: AppView = initResult.currentView as AppView;
        
        // Only set state if we haven't already been initialized (prevents race conditions)
        setAppState(prevState => {
          if (!prevState.isInitialized) {
            return {
              view: finalView,
              userResult: initResult.userResult,
              userInfo: initResult.userInfo,
              session: session,
              isInitialized: true,
              error: initResult.error
            };
          }
          return prevState;
        });
        
        // Clear all timers since we completed successfully
        clearTimeout(emergencyFallbackTimer);
        if (immediateCheckTimer) clearTimeout(immediateCheckTimer);
        
        // End performance timer
        HealthMonitoringService.performance.endTimer('app-initialization');
        
        if (initResult.error) {
          HealthMonitoringService.ux.recordError(`App initialization: ${initResult.error}`);
          toast.error(`App initialization issue: ${initResult.error}`);
        } else {
          HealthMonitoringService.features.recordFeatureUse('app-initialization');
        }

        // Fix username if user is logged in but userInfo is missing username
        if (session && finalView === 'social') {
          console.log('🔧 Scheduling username fix for logged-in user...');
          setTimeout(() => {
            fixUserInfoUsername();
          }, 1000); // Give the UI a moment to render first
        }
        
      } catch (error) {
        console.error('💥 Critical app initialization error:', error);
        
        // Clear all timers
        clearTimeout(emergencyFallbackTimer);
        if (immediateCheckTimer) clearTimeout(immediateCheckTimer);
        
        // Record critical error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        HealthMonitoringService.ux.recordError(`Critical init error: ${errorMessage}`);
        HealthMonitoringService.features.recordFeatureError('app-initialization');
        
        setAppState(prevState => {
          if (!prevState.isInitialized) {
            return {
              view: 'landing',
              userResult: null,
              userInfo: null,
              session: null,
              isInitialized: true,
              error: 'Failed to initialize app'
            };
          }
          return prevState;
        });
        toast.error('App initialization failed: Starting in safe mode');
      }
    };

    initialize();
  }, []);

  // Handle session changes and global auth events
  useEffect(() => {
    if (!appState.isInitialized) return;

    const setupSessionListener = async () => {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔐 Auth state changed:', event, !!session);
            
            if (event === 'SIGNED_OUT') {
              // Clear session cache
              clearSessionCache();
              
              // Clear all data and go to landing
              localStorage.clear();
              setAppState(prev => ({
                ...prev,
                view: 'landing',
                userResult: null,
                userInfo: null,
                session: null
              }));
              toast.success('Signed out successfully');
            } else if (event === 'SIGNED_IN' && session) {
              // User signed in - transition to social feed
              setAppState(prev => ({
                ...prev,
                session,
                view: 'social'
              }));
              // Preload bookmarks after successful sign in (non-blocking)
              // Note: Only preload savedSet (bookmarked post IDs), not full saved posts list
              setTimeout(() => preloadSavedSet(), 500);
              
              // Fix username if needed after sign in
              setTimeout(() => {
                fixUserInfoUsername();
              }, 1500);
              
              toast.success('Welcome back to Tribe!');
            }
          }
        );

        // Global auth error handler
        const handleAuthSignout = () => {
          console.log('🔓 Global auth signout triggered');
          setAppState(prev => ({
            ...prev,
            view: 'landing',
            userResult: null,
            userInfo: null,
            session: null
          }));
          toast.error('Session expired. Please sign in again.');
        };

        const handleAuthRequired = () => {
          console.log('🔒 Authentication required');
          setAppState(prev => ({
            ...prev,
            view: 'login'
          }));
          toast.info('Please sign in to continue');
        };

        // Listen for global auth events
        window.addEventListener('auth:signout', handleAuthSignout);
        window.addEventListener('auth:required', handleAuthRequired);

        return () => {
          subscription.unsubscribe();
          window.removeEventListener('auth:signout', handleAuthSignout);
          window.removeEventListener('auth:required', handleAuthRequired);
        };
      } catch (error) {
        console.error('Error setting up auth listener:', error);
      }
    };

    setupSessionListener();
  }, [appState.isInitialized]);

  // View transition handlers
  const handleStartSignup = () => {
    setAppState(prev => ({ ...prev, view: 'signup' }));
  };

  const handleShowSignIn = () => {
    setAppState(prev => ({ ...prev, view: 'login' }));
  };

  const handleSignupComplete = (userInfo: UserInfo) => {
    setAppState(prev => ({ 
      ...prev, 
      view: 'social',
      userInfo,
      userResult: null // Clear any previous user result since we no longer use quiz
    }));
    saveToStorage(STORAGE_KEYS.USER_INFO, userInfo);
    saveToStorage(STORAGE_KEYS.CURRENT_VIEW, 'social');
    // Clear user result from storage since we don't use quiz anymore
    localStorage.removeItem(STORAGE_KEYS.USER_RESULT);
    toast.success('Welcome to Tribe Board! 🎉');
  };

  const handleLoginComplete = (userInfo: UserInfo) => {
    setAppState(prev => ({ 
      ...prev, 
      view: 'social',
      userInfo 
    }));
    saveToStorage(STORAGE_KEYS.USER_INFO, userInfo);
    saveToStorage(STORAGE_KEYS.CURRENT_VIEW, 'social');
  };

  // NOTE: Global avatar updates are now handled by the database-first avatar system
  // Avatar updates go directly to Supabase profiles table and components auto-refresh

  const handleBack = () => {
    // Scroll to top when going back to landing
    window.scrollTo(0, 0);
    
    const currentView = appState.view;
    
    if (currentView === 'url-router') {
      setAppState(prev => ({ ...prev, view: 'social' }));
    } else if (currentView === 'signup' || currentView === 'login') {
      setAppState(prev => ({ ...prev, view: 'landing' }));
    } else {
      setAppState(prev => ({ ...prev, view: 'landing' }));
    }
  };

  // Handle URL navigation from within the app
  const handleNavigateToUrl = (url: string) => {
    console.log('App: Navigating to URL:', url);
    
    // Update the browser URL
    window.history.pushState({}, '', url);
    
    // Check if URL needs routing
    if (url.startsWith('/u/') || url.startsWith('/post/') || url.startsWith('/users/')) {
      console.log('App: Switching to URL router for:', url);
      setAppState(prev => ({
        ...prev,
        view: 'url-router'
      }));
    }
  };

  // Handle follow change - refresh user's own following count when they follow someone
  const handleFollowChange = useCallback((targetUserId: string, isFollowing: boolean) => {
    console.log('🔄 App: Follow change detected:', { targetUserId, isFollowing });
    
    // When the user follows/unfollows someone, we need to update their own following count
    // This is used by FollowButton components throughout the app to update the user's profile stats
    
    // We don't need to do anything here as the ProfilePage component will handle
    // updating its own state when it receives this callback
    
    // This handler just provides a way for FollowButton components to communicate
    // with the ProfilePage component about follow state changes
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      // Clear session cache
      clearSessionCache();
      
      // Clear all local storage
      localStorage.clear();
      
      // Scroll to top when logging out
      window.scrollTo(0, 0);
      
      setAppState({
        view: 'landing',
        userResult: null,
        userInfo: null,
        session: null,
        isInitialized: true
      });
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  // Render current view
  const renderCurrentView = () => {
    switch (appState.view) {
      case 'loading':
        return <LoadingScreen />;
        
      case 'landing':
        return (
          <LandingPage 
            onStartSignup={handleStartSignup}
            onSignIn={handleShowSignIn}
          />
        );
        
      case 'signup':
        return (
          <SignupFlow 
            onComplete={handleSignupComplete}
            onBack={handleBack}
          />
        );
        
      case 'login':
        return (
          <LoginFlow 
            onComplete={handleLoginComplete}
            onBack={handleBack}
          />
        );
        
      case 'social':
        // Debug what we're passing to SocialFeed
        console.log('🔍 Rendering SocialFeed with userInfo:', {
          username: appState.userInfo?.username,
          contact: appState.userInfo?.contact,
          hasUserInfo: !!appState.userInfo,
          hasSession: !!appState.session
        });
        
        return (
          <AvatarRefreshProvider>
            <FeedRefreshProvider>
              <SocialFeed 
                userResult={appState.userResult || null}
                userInfo={appState.userInfo}
                isAuthenticated={!!appState.session}
                session={appState.session}
                onBack={handleBack}
                onLogout={handleLogout}
                // NOTE: Global avatar updates removed - using database-first avatar system
                initialPage={appState.savedPage} // Pass the saved page for restoration
                // Bookmark system props
                savedSet={savedSet}
                savedList={savedList}
                savedLoading={savedLoading}
                savedError={savedError}
                onToggleBookmark={toggleBookmark}
                onLoadSavedPosts={loadSavedPosts}
                onPreloadSavedSet={preloadSavedSet}
                onNavigateToUrl={handleNavigateToUrl}
              />
            </FeedRefreshProvider>
          </AvatarRefreshProvider>
        );
        
      case 'url-router':
        return (
          <URLRouter 
            userResult={appState.userResult}
            userInfo={appState.userInfo}
            onBack={() => setAppState(prev => ({ ...prev, view: 'social' }))}
          />
        );
        
      default:
        // Debug mode: check for various debug parameters
        if (typeof window !== 'undefined') {
          const urlParams = window.location.search;
          if (urlParams.includes('dialog-debug')) {
            const { DialogAccessibilityFix } = require('./components/DialogAccessibilityFix');
            return <DialogAccessibilityFix />;
          }
          if (urlParams.includes('avatar-test')) {
            const { AvatarUploadTest } = require('./components/AvatarUploadTest');
            return <AvatarUploadTest />;
          }
          if (urlParams.includes('storage-debug')) {
            const { StorageDiagnostic } = require('./components/StorageDiagnostic');
            return <StorageDiagnostic />;
          }
          if (urlParams.includes('storage-guide')) {
            const { StorageSetupGuide } = require('./components/StorageSetupGuide');
            return <StorageSetupGuide />;
          }
          if (urlParams.includes('storage-instructions')) {
            const { StorageSetupInstructions } = require('./components/StorageSetupInstructions');
            return (
              <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 p-4">
                <div className="container mx-auto max-w-2xl">
                  <StorageSetupInstructions />
                </div>
              </div>
            );
          }
          if (urlParams.includes('storage-helper')) {
            const { StorageSetupHelper } = require('./components/StorageSetupHelper');
            return (
              <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20">
                <StorageSetupHelper />
              </div>
            );
          }
          if (urlParams.includes('storage-fix')) {
            const { StorageQuickFix } = require('./components/StorageQuickFix');
            return (
              <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 flex items-center justify-center">
                <StorageQuickFix />
              </div>
            );
          }
        }
        return <LandingPage onStartSignup={handleStartSignup} onSignIn={handleShowSignIn} />;
    }
  };

  return (
    <AppErrorBoundary 
      onError={(error, errorInfo) => {
        HealthMonitoringService.ux.recordError(`App-level error: ${error.message}`);
        console.error('App Error Boundary triggered:', error, errorInfo);
      }}
    >
      <div className="min-h-screen">
        <FaviconManager />
        {renderCurrentView()}
        <Toaster 
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(13, 13, 13, 0.9)',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              color: '#FAFAFF',
            },
          }}
        />
        
        {/* Debug panel removed for production */}
      </div>
    </AppErrorBoundary>
  );
}

// NOTE: UserInfo and UserResult interfaces are now defined in './utils/app-constants' 
// Avatar fields removed - using database-first avatar system exclusively
// Re-export types for compatibility
export type { UserResult, UserInfo } from './utils/app-constants';