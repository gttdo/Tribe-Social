import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { SavedPostsGrid } from './SavedPostsGrid';
import { PostDetailModal } from './PostDetailModal';
import { 
  ArrowLeft, 
  Bookmark, 
  User,
  Lock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import { FeedPost } from '../utils/social-feed-types';
import { UserResult, UserInfo } from '../App';

interface SavedPostsPageProps {
  userId: string;
  currentUserId?: string;
  userResult?: UserResult | null;
  userInfo?: UserInfo | null;
  onBack: () => void;
  // Accept saved posts data from parent
  savedPosts?: any[];
  savedLoading?: boolean;
  savedError?: string;
  onRefreshSaved?: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  nickname?: string;
  profile_image_url?: string;
  profile_privacy?: 'public' | 'private';
}

export function SavedPostsPage({ 
  userId, 
  currentUserId, 
  userResult, 
  userInfo, 
  onBack,
  savedPosts,
  savedLoading,
  savedError,
  onRefreshSaved
}: SavedPostsPageProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canViewSavedPosts, setCanViewSavedPosts] = useState(false);
  
  // Post detail modal state
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Check if the current user can view this user's saved posts
  const checkViewPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('Please sign in to view saved posts');
        setCanViewSavedPosts(false);
        return;
      }

      const authenticatedUserId = session.user.id;

      // Users can only view their own saved posts
      if (userId !== authenticatedUserId) {
        setError('You can only view your own saved posts');
        setCanViewSavedPosts(false);
        return;
      }

      // Get user profile information
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, username, profile_image_url, profile_privacy')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError);
        setError('User not found');
        setCanViewSavedPosts(false);
        return;
      }

      setUserProfile({
        ...profile,
        nickname: profile.username || 'User'
      });
      setCanViewSavedPosts(true);

    } catch (error) {
      console.error('Error checking view permissions:', error);
      setError('Failed to load user information');
      setCanViewSavedPosts(false);
    } finally {
      setLoading(false);
    }
  };

  // Check URL parameters for post deep linking
  useEffect(() => {
    const url = new URL(window.location.href);
    const postId = url.searchParams.get('post');
    
    if (postId && canViewSavedPosts && !loading) {
      // Open the post from URL
      handlePostClick(postId);
    }
  }, [canViewSavedPosts, loading]);

  // Initial permissions check
  useEffect(() => {
    checkViewPermissions();
  }, [userId]);

  // Handle post click to open in detail modal
  const handlePostClick = async (postId: string) => {
    console.log('Opening saved post:', postId);
    
    // Save scroll position
    setScrollPosition(window.scrollY);
    
    try {
      // Fetch post details
      const postDetails = await fetchPostDetails(postId);
      if (postDetails) {
        setSelectedPost(postDetails);
        setIsModalOpen(true);
        
        // Update URL without page reload
        updateURL(postId);
      } else {
        toast.error('Failed to load post details');
      }
    } catch (error) {
      console.error('Error opening post:', error);
      toast.error('Failed to open post');
    }
  };

  // Fetch post details for modal view
  const fetchPostDetails = async (postId: string): Promise<FeedPost | null> => {
    try {
      console.log('Fetching post details for:', postId);
      
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}`);
      
      if (response.post) {
        // Transform backend post to FeedPost format
        const backendPost = response.post;
        const feedPost: FeedPost = {
          id: backendPost.id,
          username: backendPost.username || 'unknown',
          nickname: backendPost.nickname || backendPost.username || 'User',
          coreRealm: 'mirrorcore', // Default realm
          timestamp: formatTimestamp(backendPost.createdAt || new Date().toISOString()),
          caption: backendPost.content || backendPost.caption || '',
          imageUrl: backendPost.contentUrl || null,
          liked: backendPost.isLiked || false,
          bookmarked: backendPost.isBookmarked || false,
          likes: backendPost.likes || 0,
          comments: backendPost.comments ? backendPost.comments.map((comment: any) => ({
            id: comment.id,
            username: comment.username || 'unknown',
            text: comment.content || comment.text || '',
            timestamp: formatTimestamp(comment.createdAt || new Date().toISOString()),
            coreRealm: 'mirrorcore' // Default realm
          })) : [],
          xpEarned: backendPost.xpEarned || 0,
          type: backendPost.type || 'image',
          location: backendPost.location,
          visibility: backendPost.visibility || 'public',
          tribeId: backendPost.tribeId,
          tribeName: backendPost.tribeName
        };

        return feedPost;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching post details:', error);
      return null;
    }
  };

  // Format timestamp for display
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

  // Handle modal close - restore scroll position
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
    
    // Remove URL parameters
    updateURL(null);
    
    // Restore scroll position
    setTimeout(() => {
      window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
    }, 100);
  };

  // URL management for deep linking
  const updateURL = (postId: string | null) => {
    const url = new URL(window.location.href);
    
    if (postId) {
      url.searchParams.set('post', postId);
    } else {
      url.searchParams.delete('post');
    }
    
    // Update URL without page reload
    window.history.replaceState({}, '', url.toString());
  };

  // Handle like toggle in modal
  const handleModalToggleLike = async (postId: string) => {
    if (!selectedPost) return;

    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/like`, {
        method: 'POST'
      });

      // Update the selected post
      setSelectedPost({
        ...selectedPost,
        liked: response.liked,
        likes: response.likes
      });

      if (response.liked) {
        toast.success('Liked! ✨');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  // Handle bookmark toggle in modal
  const handleModalToggleBookmark = async (postId: string) => {
    if (!selectedPost) return;

    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/bookmark`, {
        method: 'POST'
      });

      // Update the selected post
      setSelectedPost({
        ...selectedPost,
        bookmarked: response.bookmarked
      });

      if (response.bookmarked) {
        toast.success('Saved to collection! 🔖');
      } else {
        toast.success('Removed from collection');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    }
  };

  // Handle add comment in modal
  const handleModalAddComment = async (postId: string, comment: string) => {
    if (!comment.trim() || !selectedPost || !userResult || !userInfo) return;
    
    console.log('Adding comment to post in modal:', postId, 'comment:', comment);
    
    // Optimistically update UI
    const newCommentObj = {
      id: Date.now().toString(),
      username: userInfo.username,
      text: comment,
      timestamp: 'now',
      coreRealm: 'mirrorcore' as any // Default realm
    };

    setSelectedPost({
      ...selectedPost,
      comments: [...selectedPost.comments, newCommentObj]
    });

    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: comment.trim()
        })
      });

      if (response.comment) {
        // Update with server response
        setSelectedPost(prev => prev ? {
          ...prev,
          comments: prev.comments.map(c => 
            c.id === newCommentObj.id ? {
              ...response.comment,
              coreRealm: 'mirrorcore' // Default realm
            } : c
          )
        } : null);
        
        toast.success('Comment added ✨');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      
      // Remove optimistic comment on error
      setSelectedPost(prev => prev ? {
        ...prev,
        comments: prev.comments.filter(c => c.id !== newCommentObj.id)
      } : null);
      
      toast.error('Failed to add comment. Please try again.');
    }
  };

  // Handle post actions in modal
  const handleModalPostAction = (action: string, postId: string) => {
    switch (action) {
      case 'report':
        toast.success('Post reported. Thank you for keeping Tribe safe.');
        break;
      case 'hide':
        toast.success('Post hidden from your feed.');
        handleModalClose();
        break;
      case 'copy':
        navigator.clipboard.writeText(`https://tribe.app/post/${postId}`);
        toast.success('Link copied to clipboard!');
        break;
    }
  };

  // Handle post deletion in modal
  const handleModalPostDeleted = (postId: string) => {
    console.log('Post deleted from saved posts modal:', postId);
    
    // Close the modal since the post is deleted
    handleModalClose();
    
    // The SavedPostsGrid should handle refreshing its own data
    toast.success('Post deleted successfully');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-midnight-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-muted-lavender/20 to-electric-blue/20 flex items-center justify-center">
            <Bookmark className="w-8 h-8 text-muted-lavender animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="font-headline text-pearl-white">Loading saved posts...</h2>
            <p className="text-muted-lavender font-body text-sm">
              Gathering your saved collection
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !canViewSavedPosts) {
    return (
      <div className="min-h-screen bg-midnight-black pb-safe">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20 pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={onBack}
              className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="font-headline font-medium text-pearl-white">Saved Posts</h1>
            
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>

        {/* Error Content */}
        <div className="px-4 py-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-glitch-red/20 to-soft-blush/20 flex items-center justify-center">
            {error?.includes('sign in') ? (
              <Lock className="w-8 h-8 text-glitch-red" />
            ) : (
              <AlertCircle className="w-8 h-8 text-glitch-red" />
            )}
          </div>
          
          <div className="space-y-2">
            <h2 className="font-headline text-pearl-white">Access Restricted</h2>
            <p className="text-muted-lavender font-body text-sm max-w-xs mx-auto leading-relaxed">
              {error || 'You cannot view this user\'s saved posts'}
            </p>
          </div>

          <Button
            onClick={onBack}
            className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight-black pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-lilac/20 to-electric-blue/20 flex items-center justify-center">
              {userProfile?.profile_image_url ? (
                <img 
                  src={userProfile.profile_image_url} 
                  alt={userProfile.nickname}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-neon-lilac" />
              )}
            </div>
            <div>
              <h1 className="font-headline font-medium text-pearl-white">
                {userProfile?.nickname || 'User'}'s Saved Posts
              </h1>
            </div>
          </div>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <SavedPostsGrid 
          userId={userId}
          onPostClick={handlePostClick}
          savedPosts={savedPosts}
          loading={savedLoading}
          error={savedError}
          onRefresh={onRefreshSaved}
        />
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          posts={[selectedPost]} // Single post for saved posts modal
          currentIndex={0}
          currentUserId={userId}
          userTribeMemberships={[]}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onNavigate={() => {}} // No navigation in saved posts modal
          onToggleLike={handleModalToggleLike}
          onToggleBookmark={handleModalToggleBookmark}
          onAddComment={handleModalAddComment}
          onUserClick={() => {}} // TODO: Implement user navigation
          onPostAction={handleModalPostAction}
          onPostDeleted={handleModalPostDeleted}
          onJoinTribe={() => {}} // TODO: Implement tribe joining
        />
      )}

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20 md:h-0" />
    </div>
  );
}