import React, { useState, useEffect } from 'react';
import { SavedPostsPage } from './SavedPostsPage';
import { UserResult, UserInfo } from '../utils/app-constants';
import { resolvePostId } from '../utils/post-id-helpers';

interface URLRouterProps {
  userResult?: UserResult | null; // Made optional since we no longer require quiz results
  userInfo: UserInfo | null;
  onBack: () => void;
}

interface RouteParams {
  type: 'saved-posts' | 'post-comments' | 'user-profile' | 'unknown';
  userId?: string;
  postId?: string;
}

export function URLRouter({ userResult, userInfo, onBack }: URLRouterProps) {
  const [routeParams, setRouteParams] = useState<RouteParams>({ type: 'unknown' });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Local comment state management for URLRouter
  const [routerNewComment, setRouterNewComment] = useState('');

  // Parse URL and extract route parameters
  const parseURL = async () => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    console.log('Parsing URL:', { path, search: window.location.search });
    
    // Match /post/:postId/comments route
    const postCommentsMatch = path.match(/^\/post\/([^\/]+)\/comments\/?$/);
    
    if (postCommentsMatch) {
      const rawPostId = postCommentsMatch[1];
      // Clean the post ID (remove any prefixes)
      const cleanedPostId = rawPostId.replace(/^post[:_]/, '');
      
      console.log('Matched post comments route:', { rawPostId, cleanedPostId });
      
      try {
        // Resolve to proper UUID
        const resolvedPostId = await resolvePostId(cleanedPostId);
        console.log('Resolved post ID:', { cleanedPostId, resolvedPostId });
        
        setRouteParams({
          type: 'post-comments',
          postId: resolvedPostId
        });
      } catch (error) {
        console.error('Failed to resolve post ID:', error);
        setRouteParams({ type: 'unknown' });
      }
      return;
    }
    
    // Match /u/:userId route (user profile)
    const userProfileMatch = path.match(/^\/u\/([^\/]+)\/?$/);
    
    if (userProfileMatch) {
      const userId = userProfileMatch[1];
      
      console.log('Matched user profile route:', { userId });
      
      setRouteParams({
        type: 'user-profile',
        userId
      });
      return;
    }
    
    // Match /users/:userId/saved route
    const savedPostsMatch = path.match(/^\/users\/([^\/]+)\/saved\/?$/);
    
    if (savedPostsMatch) {
      const userId = savedPostsMatch[1];
      const postId = searchParams.get('post');
      
      console.log('Matched saved posts route:', { userId, postId });
      
      setRouteParams({
        type: 'saved-posts',
        userId,
        postId: postId || undefined
      });
      return;
    }
    
    // No recognized route
    console.log('No matching route found for path:', path);
    setRouteParams({ type: 'unknown' });
  };

  // Get current authenticated user ID
  const getCurrentUserId = async () => {
    try {
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setCurrentUserId(session.user.id);
        console.log('Current user ID:', session.user.id);
      } else {
        setCurrentUserId(null);
        console.log('No authenticated user');
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      setCurrentUserId(null);
    }
  };

  // Initialize router
  useEffect(() => {
    parseURL();
    getCurrentUserId();
    
    // Listen for URL changes (back/forward navigation)
    const handlePopState = () => {
      parseURL();
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Handle back navigation
  const handleBack = () => {
    // Clear URL parameters and go back to main app
    window.history.pushState({}, '', '/');
    onBack();
  };

  // Render appropriate component based on route
  switch (routeParams.type) {
    case 'post-comments':
      if (!routeParams.postId) {
        return (
          <div className="min-h-screen bg-midnight-black flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="font-headline text-pearl-white">Invalid URL</h2>
              <p className="text-muted-lavender font-body text-sm">
                Post ID is required for comments
              </p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body rounded-lg transition-all duration-300"
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }
      
      // Import and render CommentsPage with the post ID
      const { CommentsPage } = require('./CommentsPage');
      
      return (
        <CommentsPage
          postId={routeParams.postId}
          onBack={handleBack}
          onAddComment={async (postId: string, comment: string) => {
            // Handle comment addition through API
            try {
              const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
              const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: comment.trim() })
              });
              return response;
            } catch (error) {
              console.error('Error adding comment:', error);
              throw error;
            }
          }}
          newComment={routerNewComment}
          setNewComment={setRouterNewComment}
          userResult={userResult}
          userInfo={userInfo}
        />
      );
    
    case 'user-profile':
      if (!routeParams.userId) {
        return (
          <div className="min-h-screen bg-midnight-black flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="font-headline text-pearl-white">Invalid URL</h2>
              <p className="text-muted-lavender font-body text-sm">
                User ID is required for profile
              </p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body rounded-lg transition-all duration-300"
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }
      
      // Import and render UserProfile with the user ID
      const { UserProfile } = require('./UserProfile');
      
      return (
        <UserProfile
          userId={routeParams.userId}
          onBack={handleBack}
        />
      );
    
    case 'saved-posts':
      if (!routeParams.userId) {
        return (
          <div className="min-h-screen bg-midnight-black flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="font-headline text-pearl-white">Invalid URL</h2>
              <p className="text-muted-lavender font-body text-sm">
                User ID is required for saved posts
              </p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body rounded-lg transition-all duration-300"
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }
      
      return (
        <SavedPostsPage
          userId={routeParams.userId}
          currentUserId={currentUserId || undefined}
          userResult={userResult}
          userInfo={userInfo}
          onBack={handleBack}
        />
      );
    
    case 'unknown':
    default:
      return (
        <div className="min-h-screen bg-midnight-black flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="font-headline text-pearl-white">Page Not Found</h2>
            <p className="text-muted-lavender font-body text-sm">
              The page you're looking for doesn't exist
            </p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body rounded-lg transition-all duration-300"
            >
              Go Home
            </button>
          </div>
        </div>
      );
  }
}