import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { PostDetailDesktop } from './PostDetailDesktop';
import { PostDetailModal } from './PostDetailModal';
import { ErrorState } from './ErrorState';
import { UserResult, UserInfo, CoreRealm } from '../App';
import { useMobile } from './ui/use-mobile';
import { formatTimeAgo } from '../utils/timestamp-helpers';

interface PostDetailsPageProps {
  postId: string;
  userResult: UserResult | null;
  userInfo: UserInfo | null;
  onBack: () => void;
}

export function PostDetailsPage({
  postId,
  userResult,
  userInfo,
  onBack
}: PostDetailsPageProps) {
  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceDesktop, setForceDesktop] = useState(false);
  const isMobile = useMobile();

  // Determine which layout to use
  const useDesktopLayout = !isMobile || forceDesktop;

  useEffect(() => {
    if (postId) {
      fetchPostDetails();
    }
  }, [postId]);

  const fetchPostDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching post details for:', postId);
      
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}`);
      
      console.log('Post details API response:', response);
      
      if (response.post) {
        const backendPost = response.post;
        const formattedPost = {
          id: backendPost.id || postId,
          username: backendPost.username || backendPost.author?.username || 'Unknown User',
          nickname: backendPost.nickname || backendPost.username || backendPost.author?.username || 'Tribe Member',
          coreRealm: 'mirrorcore' as CoreRealm,
          timestamp: backendPost.createdAt || backendPost.created_at || new Date().toISOString(),
          caption: backendPost.content || backendPost.caption || '',
          imageUrl: backendPost.contentUrl || backendPost.media_url || null,
          mediaThumbnailUrl: backendPost.media_thumb_url || null,
          type: backendPost.type || backendPost.post_type || 'thought',
          liked: backendPost.isLiked || backendPost.liked || false,
          bookmarked: backendPost.isBookmarked || backendPost.bookmarked || false,
          likes: backendPost.likes || backendPost.like_count || 0,
          comments: backendPost.comments || [] // Use comments from backend if available
        };

        setPost(formattedPost);
      } else {
        setError('Post not found');
      }
    } catch (error) {
      console.error('Failed to fetch post details:', error);
      setError('Failed to load post details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      // TODO: Implement like API call
      console.log('Like post:', postId);
    } catch (error) {
      console.error('Failed to like post:', error);
      throw error;
    }
  };

  const handleBookmark = async (postId: string) => {
    try {
      // TODO: Implement bookmark API call
      console.log('Bookmark post:', postId);
    } catch (error) {
      console.error('Failed to bookmark post:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-midnight-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-neon-lilac mx-auto mb-4" />
          <p className="text-muted-lavender">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-midnight-black">
        <div className="sticky top-0 z-50 bg-midnight-black/80 backdrop-blur-md border-b border-muted-lavender/20 pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-muted-lavender hover:text-pearl-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <h1 className="font-headline text-pearl-white">Post Details</h1>
            <div className="w-20" />
          </div>
        </div>
        
        <ErrorState 
          title={error || 'Post not found'} 
          description="The post you're looking for doesn't exist or couldn't be loaded."
          onRetry={fetchPostDetails}
        />
      </div>
    );
  }

  // Desktop layout
  if (useDesktopLayout) {
    return (
      <PostDetailDesktop
        post={post}
        userResult={userResult}
        userInfo={userInfo}
        onBack={onBack}
        onLike={handleLike}
        onBookmark={handleBookmark}
      />
    );
  }

  // Mobile layout with modal
  return (
    <div className="min-h-screen bg-midnight-black">
      <div className="sticky top-0 z-50 bg-midnight-black/80 backdrop-blur-md border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-muted-lavender hover:text-pearl-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          
          <h1 className="font-headline text-pearl-white">Post Details</h1>
          
          <Button
            onClick={() => setForceDesktop(true)}
            variant="ghost"
            size="sm"
            className="text-muted-lavender hover:text-pearl-white text-xs"
          >
            Desktop
          </Button>
        </div>
      </div>

      <PostDetailModal
        post={post}
        isOpen={true}
        onClose={onBack}
        userResult={userResult}
        userInfo={userInfo}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onOpenDesktop={() => setForceDesktop(true)}
      />
    </div>
  );
}