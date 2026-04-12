import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { PostDetailsDrawer } from './PostDetailsDrawer';
import { EditablePostDetailsDrawer } from './EditablePostDetailsDrawer';
import { PostDetailsPage } from './PostDetailsPage';
import { useIsMobile } from './ui/use-mobile';
import { useFeedRefresh } from '../utils/feed-refresh-context';

// Import custom icons for thoughts and audio posts
import thoughtIcon from 'figma:asset/4aac05ac3aca5a3d72f65b74a9ca03c267132cb2.png';
import audioIcon from 'figma:asset/ded8384e9451f1495c7751d4a09d2e92e05ad940.png';
import { 
  Play, 
  Music, 
  Lock, 
  Plus,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  MapPin,
  ExternalLink,
  Copy,
  EyeOff,
  Flag,
  Trash2,
  Sparkles
} from 'lucide-react';
import { FeedPost } from '../utils/social-feed-types';
import { getRealmColors } from '../utils/social-feed-helpers';
import { canUserDeletePost, deletePost } from '../utils/post-deletion-helpers';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface ProfilePostsListProps {
  userId: string;
  username?: string;
  isOwnProfile?: boolean;
  onPostClick?: (postId: string) => void;
  onCreatePost?: () => void;
  onPostDeleted?: (postId: string) => void;
  userResult?: any;
  userInfo?: any;
}

interface ProfilePost {
  id: string;
  type: 'thought' | 'image' | 'video' | 'audio';
  content?: string;
  caption?: string;
  thumbnail_url?: string;
  media_urls?: string[];
  contentUrl?: string;
  visibility: 'public' | 'tribe' | 'private';
  tribe_id?: string;
  tribeName?: string;
  created_at: string;
  createdAt?: string;
  user_id: string;
  username?: string;
  nickname?: string;
  likes?: number;
  comments?: number;
  liked?: boolean;
  bookmarked?: boolean;
  location?: string;
}

const POSTS_PER_PAGE = 10;

export function ProfilePostsList({ 
  userId, 
  username,
  isOwnProfile = false, 
  onPostClick, 
  onCreatePost, 
  onPostDeleted,
  userResult,
  userInfo 
}: ProfilePostsListProps) {
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState<ProfilePost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Track expanded captions and image load errors per post
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  
  // Post details modal state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showPostDetails, setShowPostDetails] = useState(false);
  const [showPostDetailsPage, setShowPostDetailsPage] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Check if we're on mobile
  const isMobile = useIsMobile();

  // Get feed refresh context
  const { triggerFeedRefresh } = useFeedRefresh();

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

  // Fetch posts from database
  const fetchPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      console.log(`Fetching profile posts for user ${userId}, page ${pageNum}`);

      // Try to use the backend API first
      try {
        const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
        const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/users/${userId}/posts`);
        
        if (response.posts) {
          console.log(`Fetched ${response.posts.length} posts from API`);
          
          const formattedPosts = response.posts.map((post: any) => ({
              id: post.id,
              type: post.post_type || post.type || 'thought',
              content: post.text_body || post.content,
              caption: post.caption || post.text_body || post.content,
              thumbnail_url: post.thumbnail_url,
              media_urls: post.media_urls,
              contentUrl: post.contentUrl,
              visibility: post.visibility || 'public',
              tribe_id: post.tribe_id,
              tribeName: post.tribeName,
              created_at: post.created_at || post.createdAt,
              createdAt: post.createdAt || post.created_at,
              user_id: post.user_id || post.userId,
              username: post.username || username,
              nickname: post.nickname || post.username || username,
              likes: post.likes || 0,
              comments: post.comments || 0,
              liked: post.liked || false,
              bookmarked: post.bookmarked || false,
              location: post.location
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
        console.log('API request failed, showing empty state:', apiError);
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        
        // For "Failed to fetch" specifically, show user-friendly message  
        if (errorMessage.includes('Failed to fetch')) {
          console.log('Network connectivity issue detected');
          // Still set empty posts but with different handling
          setPosts([]);
          setHasMore(false);
          setPage(pageNum);
          setError('Unable to connect to server. Please check your connection and try again.');
          return;
        }
        
        // For other API errors, fall back to empty state
        setPosts([]);
        setHasMore(false);
        setPage(pageNum);
        return;
      }

      // Fallback to direct database query
      const from = pageNum * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      const { data, error: queryError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (queryError) {
        throw new Error(`Failed to fetch posts: ${queryError.message}`);
      }

      const fetchedPosts = (data || []).map((post: any) => ({
          id: post.id,
          type: post.post_type || post.type || 'thought',
          content: post.text_body || post.content,
          caption: post.caption || post.text_body || post.content,
          thumbnail_url: post.thumbnail_url,
          media_urls: post.media_urls,
          contentUrl: post.content_url,
          visibility: post.visibility || 'public',
          tribe_id: post.tribe_id,
          tribeName: post.tribe_name,
          created_at: post.created_at,
          createdAt: post.created_at,
          user_id: post.user_id,
          username: username,
          nickname: username,
          likes: 0,
          comments: 0,
          liked: false,
          bookmarked: false,
          location: post.location
        }));

      console.log(`Fetched ${fetchedPosts.length} posts for page ${pageNum} from database`);

      if (append) {
        setPosts(prev => [...prev, ...fetchedPosts]);
      } else {
        setPosts(fetchedPosts);
      }

      setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
      setPage(pageNum);

    } catch (err) {
      console.error('Error fetching profile posts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load posts';
      
      // Provide user-friendly error messages for common issues
      if (errorMessage.includes('Failed to fetch')) {
        setError('Unable to connect to server. Please check your internet connection and try again.');
      } else if (errorMessage.includes('Session missing') || errorMessage.includes('Authentication required')) {
        setError('Please sign in again to view posts.');
      } else if (errorMessage.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else {
        setError('Failed to load posts. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, username]);

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

  // Handle post click - UPDATED to use modal system with edit capabilities for own posts
  const handlePostClick = async (postId: string) => {
    console.log('Post clicked:', postId, 'isMobile:', isMobile, 'isOwnProfile:', isOwnProfile);
    
    if (onPostClick) {
      onPostClick(postId);
      return;
    }

    setSelectedPostId(postId);
    
    if (isMobile) {
      // On mobile, show dedicated page
      setShowPostDetailsPage(true);
    } else {
      // On desktop, show drawer (editable if own profile)
      setShowPostDetails(true);
    }
  };

  // Handle closing post details
  const handleClosePostDetails = () => {
    setShowPostDetails(false);
    setShowPostDetailsPage(false);
    setSelectedPostId(null);
  };

  // Handle post deletion from modal
  const handlePostDeletedFromModal = (postId: string) => {
    console.log('Post deleted from modal:', postId);
    handlePostDeleted(postId);
    handleClosePostDetails();
  };

  // Handle post deletion
  const handlePostDeleted = useCallback((postId: string) => {
    console.log('Removing deleted post from profile list:', postId);
    setPosts(prev => prev.filter(post => post.id !== postId));
    
    if (onPostDeleted) {
      onPostDeleted(postId);
    }
  }, [onPostDeleted]);

  // Handle post updated
  const handlePostUpdated = useCallback((postId: string) => {
    console.log('Post updated, refreshing posts list:', postId);
    // Refresh the posts list to show updated content
    fetchPosts(0);
  }, [fetchPosts]);

  // Handle delete post dialog
  const handleDeletePost = (post: ProfilePost, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('Opening delete dialog for post:', post.id);
    setPostToDelete(post);
    setShowDeleteDialog(true);
  };

  // Confirm post deletion
  const confirmDeletePost = async () => {
    if (!postToDelete) return;

    setIsDeleting(true);
    
    try {
      console.log('🗑️  Starting post deletion process for:', postToDelete.id);
      const result = await deletePost(postToDelete.id, triggerFeedRefresh);
      
      if (result.success) {
        console.log('✅ Post deleted successfully, triggering feed refresh');
        toast.success('Post deleted successfully');
        setShowDeleteDialog(false);
        setPostToDelete(null);
        handlePostDeleted(postToDelete.id);
      } else {
        console.error('❌ Post deletion failed:', result.error);
        toast.error(result.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('💥 Error deleting post:', error);
      toast.error('An error occurred while deleting the post');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle like toggle
  const toggleLike = async (postId: string) => {
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/like`, {
        method: 'POST'
      });

      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, liked: response.liked, likes: response.likes }
          : post
      ));

      if (response.liked) {
        toast.success('Liked! ✨');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  // Handle bookmark toggle
  const toggleBookmark = async (postId: string) => {
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/bookmark`, {
        method: 'POST'
      });

      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, bookmarked: response.bookmarked }
          : post
      ));

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

  // Handle post actions
  const handlePostAction = (action: string, postId: string) => {
    switch (action) {
      case 'report':
        toast.success('Post reported. Thank you for keeping Tribe safe.');
        break;
      case 'hide':
        toast.success('Post hidden from your feed.');
        setPosts(prev => prev.filter(post => post.id !== postId));
        break;
      case 'copy':
        navigator.clipboard.writeText(`https://tribe.app/post/${postId}`);
        toast.success('Link copied to clipboard!');
        break;
    }
  };

  // Render loading skeletons
  const renderSkeletons = (count: number = 3) => {
    return Array.from({ length: count }, (_, i) => (
      <div key={`skeleton-${i}`} className="p-4 border border-muted-lavender/10 rounded-xl bg-gradient-to-br from-midnight-black/50 to-muted-lavender/5 mb-3">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-16 h-16 rounded-lg bg-muted-lavender/20 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-muted-lavender/20" />
            <Skeleton className="h-3 w-1/2 bg-muted-lavender/20" />
            <Skeleton className="h-3 w-1/3 bg-muted-lavender/20" />
          </div>
        </div>
      </div>
    ));
  };

  // Truncate text helper for compact list items
  const truncateText = (text: string, maxLines: number = 2) => {
    if (!text) return '';
    // Approximate character count for 2-3 lines (about 80-120 characters)
    const maxChars = maxLines === 2 ? 80 : 120;
    return text.length > maxChars ? `${text.substring(0, maxChars)}...` : text;
  };

  // Render post list item based on type
  const renderPostListItem = (post: ProfilePost) => {
    const canDelete = isOwnProfile && canUserDeletePost({ user_id: post.user_id }, userId);
    
    return (
      <div
        key={post.id}
        className="group p-4 border border-muted-lavender/10 rounded-xl bg-gradient-to-br from-midnight-black/50 to-muted-lavender/5 hover:border-muted-lavender/20 hover:shadow-lg hover:shadow-neon-lilac/10 transition-all duration-300 cursor-pointer mb-3 touch-target text-left"
        data-post-id={post.id}
        onClick={() => handlePostClick(post.id)}
      >
        <div className="flex items-start space-x-4 text-left">
          {/* Left side - Thumbnail for images/videos, icon for audio/thoughts */}
          <div className="flex-shrink-0">
            {/* Handle video posts with thumbnails */}
            {post.type === 'video' && post.thumbnail_url && !imageLoadErrors.has(post.id) ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 relative">
                <img
                  src={post.thumbnail_url}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                  onError={() => setImageLoadErrors(prev => new Set([...prev, post.id]))}
                />
                {/* Small play icon overlay for video thumbnails */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-4 h-4 text-white" fill="currentColor" />
                </div>
              </div>
            ) : (post.type === 'image' || post.type === 'video') && post.contentUrl && !imageLoadErrors.has(post.id) ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20">
                <ImageWithFallback
                  src={post.contentUrl}
                  alt={`${post.type} by ${post.username}`}
                  className="w-full h-full object-cover"
                  onError={() => setImageLoadErrors(prev => new Set([...prev, post.id]))}
                  fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-muted-lavender/40" />
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 flex items-center justify-center overflow-hidden">
                {post.type === 'audio' ? (
                  <img 
                    src={audioIcon} 
                    alt="Audio post" 
                    className="w-10 h-10 object-contain"
                  />
                ) : post.type === 'video' ? (
                  <Play className="w-8 h-8 text-electric-blue" />
                ) : post.type === 'thought' ? (
                  <img 
                    src={thoughtIcon} 
                    alt="Thought post" 
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <Sparkles className="w-8 h-8 text-muted-lavender/40" />
                )}
              </div>
            )}
          </div>

          {/* Right side - Content */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-start justify-between mb-2 text-left">
              <div className="flex-1 min-w-0 text-left">
                {/* Post type and timestamp */}
                <div className="flex items-center space-x-2 mb-1 text-left">
                  <span className="text-xs text-electric-blue font-body font-medium capitalize">
                    {post.type === 'thought' ? 'Thought' : post.type}
                  </span>
                  <span className="text-xs text-muted-lavender font-body">•</span>
                  <span className="text-xs text-muted-lavender font-body">
                    {formatTimestamp(post.created_at || post.createdAt || new Date().toISOString())}
                  </span>
                  {post.visibility === 'private' && (
                    <>
                      <span className="text-xs text-muted-lavender font-body">•</span>
                      <Lock className="w-3 h-3 text-muted-lavender" />
                    </>
                  )}
                </div>

                {/* Content based on post type */}
                <div className="mb-2 text-left">
                  {post.type === 'thought' ? (
                    <p className="text-pearl-white font-body text-sm leading-relaxed line-clamp-2 text-left">
                      {post.content || post.caption || (
                        <span className="text-muted-lavender/60 italic">No content</span>
                      )}
                    </p>
                  ) : post.type === 'audio' ? (
                    <div className="space-y-1 text-left">
                      <p className="text-pearl-white font-body font-medium text-sm text-left">
                        Audio Post
                      </p>
                      {(post.caption || post.content) && (
                        <p className="text-muted-lavender font-body text-xs line-clamp-1 text-left">
                          {truncateText(post.caption || post.content || '', 1)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 text-left">
                      <p className="text-pearl-white font-body font-medium text-sm text-left">
                        {post.type === 'image' ? 'Image Post' : 'Video Post'}
                      </p>
                      {(post.caption || post.content) && (
                        <p className="text-muted-lavender font-body text-xs line-clamp-2 text-left">
                          {truncateText(post.caption || post.content || '', 2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Engagement stats */}
                <div className="flex items-center space-x-4 text-xs text-muted-lavender font-body text-left">
                  <span className="flex items-center space-x-1">
                    <Heart className={`w-3 h-3 ${post.liked ? 'text-glitch-red fill-current' : ''}`} />
                    <span>{post.likes || 0}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{post.comments || 0}</span>
                  </span>
                  {post.bookmarked && (
                    <span className="flex items-center space-x-1">
                      <Bookmark className="w-3 h-3 text-electric-blue fill-current" />
                    </span>
                  )}
                </div>
              </div>

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger 
                  className="p-1 bg-transparent text-muted-lavender hover:text-pearl-white border-0 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 touch-target"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-midnight-black border-muted-lavender/30 soft-blur">
                  <DropdownMenuItem className="text-pearl-white hover:bg-muted-lavender/10">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Share to Story
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePostAction('copy', post.id);
                    }}
                    className="text-pearl-white hover:bg-muted-lavender/10"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePostAction('hide', post.id);
                    }}
                    className="text-pearl-white hover:bg-muted-lavender/10"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Post
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-muted-lavender/20" />
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePostAction('report', post.id);
                    }}
                    className="text-glitch-red hover:bg-glitch-red/10"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Report Post
                  </DropdownMenuItem>
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={(e) => handleDeletePost(post, e)}
                      className="text-glitch-red hover:bg-glitch-red/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    );
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
            {error ? error : (isOwnProfile 
              ? "Share your first aesthetic moment with the tribe" 
              : "This user hasn't shared any posts yet"
            )}
          </p>
        </div>
        {error && (
          <Button
            onClick={() => fetchPosts(0)}
            className="bg-electric-blue hover:bg-electric-blue/80 text-midnight-black font-body"
          >
            Try Again
          </Button>
        )}
        {!error && isOwnProfile && onCreatePost && (
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
          <ExternalLink className="w-8 h-8 text-glitch-red" />
        </div>
        <div className="space-y-2">
          <h3 className="font-headline text-pearl-white">Connection Error</h3>
          <p className="text-muted-lavender font-body text-sm">{error}</p>
        </div>
        <Button
          onClick={() => fetchPosts(0)}
          className="bg-electric-blue hover:bg-electric-blue/80 text-midnight-black font-body"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className="space-y-3">
          {renderSkeletons(3)}
        </div>
      )}

      {!loading && (
        <>
          {/* Posts List */}
          <div className="space-y-3">
            {posts.map((post) => renderPostListItem(post))}
          </div>

          {/* Load more posts */}
          {hasMore && (
            <div 
              ref={loadMoreRef}
              className="py-6 flex justify-center"
            >
              {loadingMore ? (
                <div className="space-y-3 w-full">
                  {renderSkeletons(2)}
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted-lavender font-body text-sm">Scroll down to load more posts</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Post Detail Modals */}
      {/* Use EditablePostDetailsDrawer for own profile, regular PostDetailsDrawer for others */}
      {!isMobile && selectedPostId && showPostDetails && (
        isOwnProfile ? (
          <EditablePostDetailsDrawer
            postId={selectedPostId}
            isOpen={showPostDetails}
            onClose={handleClosePostDetails}
            onPostDeleted={handlePostDeletedFromModal}
            onPostUpdated={handlePostUpdated}
            isOwnProfile={isOwnProfile}
            userId={userId}
          />
        ) : (
          <PostDetailsDrawer
            postId={selectedPostId}
            isOpen={showPostDetails}
            onClose={handleClosePostDetails}
            onPostDeleted={handlePostDeletedFromModal}
            isOwnProfile={isOwnProfile}
            userId={userId}
          />
        )
      )}

      {/* Mobile Post Details Page */}
      {isMobile && selectedPostId && showPostDetailsPage && (
        <PostDetailsPage
          postId={selectedPostId}
          onBack={handleClosePostDetails}
          isOwnProfile={isOwnProfile}
          userId={userId}
          onPostDeleted={handlePostDeletedFromModal}
          onPostUpdated={handlePostUpdated}
          userResult={userResult}
          userInfo={userInfo}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeletePost}
        isDeleting={isDeleting}
        itemType="post"
        itemTitle={postToDelete ? (postToDelete.caption || postToDelete.content || 'this post').substring(0, 50) + ((postToDelete.caption || postToDelete.content || '').length > 50 ? '...' : '') : 'this post'}
      />
    </>
  );
}