import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { PostDetailModal } from './PostDetailModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

// Import custom icons for thoughts and audio posts
import thoughtIcon from 'figma:asset/4aac05ac3aca5a3d72f65b74a9ca03c267132cb2.png';
import audioIcon from 'figma:asset/ded8384e9451f1495c7751d4a09d2e92e05ad940.png';
import { 
  Play, 
  Video,
  Music, 
  Lock, 
  Plus,
  MoreHorizontal,
  Heart,
  Trash2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { FeedPost } from '../utils/social-feed-types';
import { canUserDeletePost, deletePost } from '../utils/post-deletion-helpers';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface PostGridProps {
  userId: string;
  isOwnProfile?: boolean;
  onPostClick?: (postId: string) => void;
  onCreatePost?: () => void;
  onPostDeleted?: (postId: string) => void;
  userResult?: any;
  userInfo?: any;
}

interface GridPost {
  id: string;
  type: 'thought' | 'image' | 'video' | 'audio';
  thumbnail_url?: string;
  media_thumb_url?: string;
  media_urls?: string[];
  content?: string;
  visibility: 'public' | 'tribe' | 'private';
  tribe_id?: string;
  created_at: string;
  user_id: string;
  userId?: string; // For compatibility with deletion helpers
}

const POSTS_PER_PAGE = 30;

export function PostGrid({ 
  userId, 
  isOwnProfile = false, 
  onPostClick, 
  onCreatePost, 
  onPostDeleted,
  userResult,
  userInfo 
}: PostGridProps) {
  const [posts, setPosts] = useState<GridPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  
  // Post detail modal state
  const [allPosts, setAllPosts] = useState<FeedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState<GridPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch posts from database
  const fetchPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      console.log(`Fetching posts for user ${userId}, page ${pageNum}`);

      // Try to use the backend API first, fallback to direct database query
      try {
        const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
        const response = await makeAuthenticatedRequest(`/users/${userId}/posts`);
        
        if (response.posts) {
          console.log(`Fetched ${response.posts.length} posts from API`);
          
          const formattedPosts = response.posts.map((post: any) => ({
            id: post.id,
            type: post.type || 'thought',
            thumbnail_url: post.thumbnail_url,
            media_urls: post.media_urls,
            content: post.content,
            visibility: post.visibility || 'public',
            tribe_id: post.tribe_id,
            created_at: post.created_at || post.createdAt,
            user_id: post.user_id || post.userId
          }));

          if (append) {
            setPosts(prev => [...prev, ...formattedPosts]);
          } else {
            setPosts(formattedPosts);
          }

          setHasMore(formattedPosts.length === POSTS_PER_PAGE);
          setPage(pageNum);
          return;
        }
      } catch (apiError) {
        console.log('API request failed, trying direct database query:', apiError);
      }

      // Fallback to direct database query
      const from = pageNum * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      // Use auth-guarded posts fetch
      console.log('📡 PostGrid: Fetching posts with auth guard');
      
      const { fetchUserPostsSafely } = await import('../utils/auth-guards');
      const posts = await fetchUserPostsSafely(userId);
      
      if (!posts) {
        console.warn('PostGrid: Auth guard returned null for posts fetch');
        const fetchedPosts: any[] = [];
        
        if (append) {
          setPosts(prev => [...prev, ...fetchedPosts]);
        } else {
          setPosts(fetchedPosts);
        }
        
        setHasMore(false);
        setPage(pageNum);
        return;
      }
      
      // Apply pagination to the response
      const from = pageNum * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;
      const fetchedPosts = posts.slice(from, to + 1);
      console.log(`Fetched ${fetchedPosts.length} posts for page ${pageNum} from auth-guarded fetch`);
      console.log('Sample post structure:', fetchedPosts[0]);

      if (append) {
        setPosts(prev => [...prev, ...fetchedPosts]);
      } else {
        setPosts(fetchedPosts);
      }

      // Check if there are more posts to load
      setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
      setPage(pageNum);

    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchPosts(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchPosts, hasMore, loadingMore, page]);

  // Handle post click
  const handlePostClick = async (postId: string) => {
    if (onPostClick) {
      onPostClick(postId);
    } else {
      // Default behavior: navigate to comments using navigation helper with reference resolution
      try {
        const { openComments } = await import('../utils/navigation-helpers');
        const success = await openComments(postId);
        
        if (!success) {
          console.error('Failed to navigate to post comments for:', postId);
          // Could add fallback behavior here if needed
        }
      } catch (error) {
        console.error('Error navigating to post comments:', error);
      }
    }
  };

  // Handle post click from DOM element
  const handlePostClickFromElement = (event: React.MouseEvent<HTMLDivElement>) => {
    const postId = event.currentTarget.dataset.postId;
    if (postId && onPostClick) {
      onPostClick(postId);
    }
  };

  // Handle post deletion
  const handlePostDeleted = useCallback((postId: string) => {
    console.log('Removing deleted post from grid:', postId);
    setPosts(prev => prev.filter(post => post.id !== postId));
    
    // Call the parent callback if provided
    if (onPostDeleted) {
      onPostDeleted(postId);
    }
  }, [onPostDeleted]);

  // Handle delete post dialog
  const handleDeletePost = (post: GridPost, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the post
    console.log('Opening delete dialog for post:', post.id);
    setPostToDelete(post);
    setShowDeleteDialog(true);
  };

  // Confirm post deletion
  const confirmDeletePost = async () => {
    if (!postToDelete) return;

    setIsDeleting(true);
    
    try {
      // Get access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Please sign in to delete posts');
        return;
      }

      const result = await deletePost(postToDelete.id, session.access_token);
      
      if (result.success) {
        toast.success('Post deleted successfully');
        setShowDeleteDialog(false);
        setPostToDelete(null);
        
        // Remove post from local state
        handlePostDeleted(postToDelete.id);
      } else {
        toast.error(result.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('An error occurred while deleting the post');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get current user ID for deletion permissions
  const getCurrentUserId = () => {
    // For now, we'll use the userId prop to determine if this is the user's own profile
    return isOwnProfile ? userId : null;
  };

  // Expose handlePostDeleted for use by parent components
  React.useImperativeHandle(React.useRef(), () => ({
    handlePostDeleted
  }), [handlePostDeleted]);

  // Render thumbnail based on post type with improved logic
  const renderThumbnail = (post: GridPost) => {
    // Use flexible thumbnail URL logic - check multiple fields in order
    const thumbUrl = 
      post.media_thumb_url ||
      post.thumbnail_url ||
      post.media_urls?.[0] ||
      null;

    const hasImageUrl = !!thumbUrl;

    switch (post.type) {
      case 'image':
        return (
          <div className="relative w-full h-full">
            {hasImageUrl ? (
              <img
                src={thumbUrl}
                alt={post.content || 'image'}
                className="responsive-thumbnail"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-muted-lavender/20 to-electric-blue/20 flex items-center justify-center">
                <MoreHorizontal className="w-6 h-6 text-muted-lavender" />
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="relative w-full h-full">
            {(() => {
              // Enhanced video thumbnail logic - try multiple sources
              const videoSrc = post.media_urls?.[0] || post.imageUrl || post.media_url;
              const dedicatedThumb = post.media_thumb_url || post.thumbnail_url;
              
              // If we have a dedicated thumbnail, use it
              if (dedicatedThumb) {
                return (
                  <>
                    <img
                      src={dedicatedThumb}
                      alt="Video thumbnail"
                      className="responsive-thumbnail"
                      loading="lazy"
                      onError={(e) => {
                        console.warn('Dedicated video thumbnail failed, trying video poster:', dedicatedThumb);
                        // If dedicated thumbnail fails, hide the img and show video fallback
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {/* Video label in top-left corner */}
                    <div className="absolute top-2 left-2 z-10">
                      <div className="flex items-center space-x-1 bg-midnight-black/80 backdrop-blur-sm rounded-full px-2 py-1 border border-muted-lavender/20">
                        <Video className="w-3 h-3 text-electric-blue" />
                        <span className="text-xs font-medium text-pearl-white">Video</span>
                      </div>
                    </div>
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-midnight-black/70 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg">
                        <Play className="w-6 h-6 text-pearl-white ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </>
                );
              }
              
              // If we have a video source but no dedicated thumbnail, use video element for thumbnail generation
              if (videoSrc) {
                return (
                  <>
                    <video
                      className="responsive-thumbnail object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      onError={() => {
                        console.warn('Video thumbnail generation failed for:', videoSrc);
                      }}
                    >
                      <source src={videoSrc} type="video/mp4" />
                    </video>
                    {/* Video label in top-left corner */}
                    <div className="absolute top-2 left-2 z-10">
                      <div className="flex items-center space-x-1 bg-midnight-black/80 backdrop-blur-sm rounded-full px-2 py-1 border border-muted-lavender/20">
                        <Video className="w-3 h-3 text-electric-blue" />
                        <span className="text-xs font-medium text-pearl-white">Video</span>
                      </div>
                    </div>
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-midnight-black/70 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg">
                        <Play className="w-6 h-6 text-pearl-white ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </>
                );
              }
              
              // Ultimate fallback - gradient background with play button
              return (
                <>
                  <div className="w-full h-full bg-gradient-to-br from-muted-lavender/20 to-electric-blue/20 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-midnight-black/70 flex items-center justify-center">
                      <Play className="w-6 h-6 text-pearl-white ml-1" fill="currentColor" />
                    </div>
                  </div>
                  {/* Video label for placeholder */}
                  <div className="absolute top-2 left-2 z-10">
                    <div className="flex items-center space-x-1 bg-midnight-black/80 backdrop-blur-sm rounded-full px-2 py-1 border border-muted-lavender/20">
                      <Video className="w-3 h-3 text-electric-blue" />
                      <span className="text-xs font-medium text-pearl-white">Video</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        );

      case 'audio':
        return (
          <div className="relative w-full h-full">
            {hasImageUrl ? (
              <img
                src={thumbUrl}
                alt="Audio cover"
                className="responsive-thumbnail"
                loading="lazy"
              />
            ) : (
              <div className="relative w-full h-full bg-gradient-to-br from-neon-lilac/20 to-soft-blush/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-midnight-black/70 flex items-center justify-center">
                  <img 
                    src={audioIcon} 
                    alt="Audio post" 
                    className="w-10 h-10 object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'thought':
      default:
        if (!post.content) {
          return (
            <div className="relative w-full h-full bg-gradient-to-br from-electric-blue/20 to-neon-lilac/20 p-3 flex items-center justify-center">
              <p className="text-pearl-white font-body text-sm text-center">
                Text post
              </p>
            </div>
          );
        }

        // Split content into lines and extract different parts for the design
        const lines = post.content.split('\n').filter(line => line.trim());
        const firstLine = lines[0] || '';
        const remainingText = lines.slice(1).join(' ') || '';
        
        // Create a shorter title line (first few words or first line if short)
        const titleWords = firstLine.split(' ');
        let titleText = '';
        let mainText = '';
        
        if (firstLine.length <= 25) {
          // If first line is short, use it as title and get main text from remaining
          titleText = firstLine;
          mainText = remainingText || (lines[1] ? lines.slice(1).join(' ') : '');
        } else {
          // If first line is long, split it
          const firstThreeWords = titleWords.slice(0, 3).join(' ');
          titleText = firstThreeWords;
          mainText = titleWords.slice(3).join(' ');
          if (remainingText) {
            mainText = remainingText;
          }
        }
        
        // If we don't have separate title and main text, use the whole content as main text
        if (!titleText && firstLine) {
          mainText = firstLine;
        }
        
        // Limit main text length for better display
        const maxMainTextLength = 45;
        if (mainText.length > maxMainTextLength) {
          mainText = mainText.substring(0, maxMainTextLength).trim();
          // Try to end at a word boundary
          const lastSpaceIndex = mainText.lastIndexOf(' ');
          if (lastSpaceIndex > maxMainTextLength * 0.6) {
            mainText = mainText.substring(0, lastSpaceIndex);
          }
        }

        return (
          <div className="relative w-full h-full bg-gradient-to-br from-pearl-white to-gray-50 p-3 flex flex-col justify-between text-left">
            {/* Custom thought icon in top left */}
            <div className="absolute top-2 left-2 z-10">
              <img 
                src={thoughtIcon} 
                alt="Thought post" 
                className="w-4 h-4 object-contain opacity-60"
              />
            </div>
            
            {/* Title line - only show if we have both title and main text */}
            {titleText && mainText && titleText !== mainText && (
              <div className="flex-none mb-1 pr-6">
                <p className="text-midnight-black/70 font-body text-[10px] leading-tight tracking-wide">
                  {titleText}
                </p>
              </div>
            )}
            
            {/* Main text content */}
            <div className="flex-1 flex items-start pr-6">
              <p className="text-midnight-black font-headline text-xs leading-[1.3] font-medium tracking-tight">
                {mainText || firstLine}
              </p>
            </div>
            
            {/* Heart icon in bottom right */}
            <div className="flex-none flex justify-end items-end pt-2">
              <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-sm border border-gray-200/50">
                <Heart className="w-2.5 h-2.5 text-midnight-black/60" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        );
    }
  };

  // Check if post should be blurred (tribe-only and user not in tribe)
  const shouldBlurPost = (post: GridPost) => {
    // For now, we'll rely on RLS to filter out posts the user can't see
    // If a post is returned but is tribe-only, we can show it with a lock overlay
    return post.visibility === 'tribe' && !isOwnProfile;
  };

  // Render loading skeletons
  const renderSkeletons = (count: number = 9) => {
    return Array.from({ length: count }, (_, i) => (
      <div key={`skeleton-${i}`} className="aspect-square">
        <Skeleton className="w-full h-full rounded-lg bg-muted-lavender/20" />
      </div>
    ));
  };

  // Empty state
  if (!loading && posts.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-muted-lavender/20 to-electric-blue/20 flex items-center justify-center">
          <Plus className="w-8 h-8 text-muted-lavender" />
        </div>
        <div className="space-y-2">
          <h3 className="font-headline text-pearl-white">No posts yet</h3>
          <p className="text-muted-lavender font-body text-sm">
            {isOwnProfile 
              ? "Share your first aesthetic moment with the tribe" 
              : "This user hasn't shared any posts yet"
            }
          </p>
        </div>
        {isOwnProfile && onCreatePost && (
          <Button
            onClick={onCreatePost}
            className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body"
          >
            Create your first post
          </Button>
        )}
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-glitch-red/20 to-soft-blush/20 flex items-center justify-center">
          <MoreHorizontal className="w-8 h-8 text-glitch-red" />
        </div>
        <div className="space-y-2">
          <h3 className="font-headline text-pearl-white">Failed to load posts</h3>
          <p className="text-muted-lavender font-body text-sm">{error}</p>
        </div>
        <Button
          onClick={() => fetchPosts(0)}
          className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Posts Grid */}
      <div className="grid grid-cols-3 responsive-grid-gap">
        {/* Loading skeletons for initial load */}
        {loading && posts.length === 0 && renderSkeletons()}
        
        {/* Posts */}
        {posts.map((post) => {
          const isBlurred = shouldBlurPost(post);
          const currentUserId = getCurrentUserId();
          const canDelete = isOwnProfile && canUserDeletePost({ user_id: post.user_id }, currentUserId);
          
          return (
            <div 
              key={post.id} 
              className="aspect-square-responsive group relative profile-grid-card"
              data-post-id={post.id}  // Embed real UUID from database
            >
              <button
                onClick={() => handlePostClick(post.id)}
                className="w-full h-full focus:outline-none focus:ring-2 focus:ring-neon-lilac focus:ring-offset-2 focus:ring-offset-midnight-black rounded-lg touch-target"
                aria-label={`Open post by user, ${post.type} post`}
                data-post-id={post.id}  // Embed real UUID on click target
              >
                <Card className="w-full h-full overflow-hidden rounded-lg border-muted-lavender/20 hover:border-neon-lilac/40 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-neon-lilac/20">
                  <div className="relative w-full h-full">
                    {renderThumbnail(post)}
                    
                    {/* Blur overlay for tribe-only posts */}
                    {isBlurred && (
                      <div className="absolute inset-0 backdrop-blur-sm bg-midnight-black/30 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <div className="w-8 h-8 mx-auto rounded-full bg-midnight-black/70 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-pearl-white" />
                          </div>
                          <p className="text-xs text-pearl-white font-body">Join tribe</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-midnight-black/0 group-hover:bg-midnight-black/20 transition-all duration-300" />
                  </div>
                </Card>
              </button>
              
              {/* Delete button for own posts */}
              {canDelete && (
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 bg-midnight-black/80 border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-midnight-black/90 rounded-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="bg-midnight-black/95 border-muted-lavender/20 min-w-32"
                    >
                      <DropdownMenuItem 
                        onClick={(e) => handleDeletePost(post, e)}
                        className="text-glitch-red hover:text-glitch-red hover:bg-glitch-red/10 focus:bg-glitch-red/10 focus:text-glitch-red cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading skeletons for pagination */}
        {loadingMore && renderSkeletons(6)}
      </div>

      {/* Load more trigger */}
      {hasMore && !loading && (
        <div ref={loadMoreRef} className="h-4" />
      )}

      {/* No more posts indicator */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-6">
          <p className="text-muted-lavender font-body text-sm">
            That's all the posts!
          </p>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setPostToDelete(null);
        }}
        onConfirm={confirmDeletePost}
        isDeleting={isDeleting}
      />
    </div>
  );
}