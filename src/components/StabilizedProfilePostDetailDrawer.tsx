import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Textarea } from './ui/textarea';
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import * as SheetPrimitive from '@radix-ui/react-dialog@1.1.6';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { WaveformAudioPlayer } from './WaveformAudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { ThreadedCommentRow } from './ThreadedCommentRow';
import { EmojiQuickBar } from './EmojiQuickBar';
import { useFeedRefresh } from '../utils/feed-refresh-context';
import { useIsMobile } from './ui/use-mobile';
import { 
  X, 
  Heart, 
  MessageCircle, 
  Share, 
  Bookmark, 
  MoreHorizontal,
  Music,
  Sparkles,
  Copy,
  Flag,
  Trash2,
  Edit3,
  Save,
  Loader2,
  Send
} from 'lucide-react';
import { getRealmColors } from '../utils/social-feed-helpers';
import { formatPostTimestamp, formatTimeAgo } from '../utils/timestamp-helpers';
import { canUserDeletePost, deletePost } from '../utils/post-deletion-helpers';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { cn } from './ui/utils';
import { UserInfo } from '../App';

interface Comment {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  avatar?: string;
  replies?: Reply[];
  replyCount?: number;
}

interface Reply {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  avatar?: string;
}

interface PostDetails {
  id: string;
  type: 'thought' | 'image' | 'video' | 'audio';
  content?: string;
  caption?: string;
  text_body?: string;
  thumbnail_url?: string;
  media_urls?: string[];
  media_url?: string;
  contentUrl?: string;
  visibility: 'public' | 'tribe' | 'private';
  tribe_id?: string;
  tribeName?: string;
  created_at: string;
  user_id: string;
  username?: string;
  nickname?: string;
  likes?: number;
  like_count?: number;
  comments?: number;
  comment_count?: number;
  liked?: boolean;
  bookmarked?: boolean;
  location?: string;
}

interface LoadingState {
  post: boolean;
  comments: boolean;
  actions: boolean;
}

interface StabilizedProfilePostDetailDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (postId: string) => void;
  isOwnProfile?: boolean;
  userId?: string;
  userInfo?: UserInfo | null;
  onToggleLike?: (postId: string) => void;
  onToggleBookmark?: (postId: string) => void;
}

export function StabilizedProfilePostDetailDrawer({ 
  postId, 
  isOpen, 
  onClose, 
  onPostDeleted,
  onPostUpdated,
  isOwnProfile = false,
  userId,
  userInfo,
  onToggleLike,
  onToggleBookmark
}: StabilizedProfilePostDetailDrawerProps) {
  // Stabilized state management
  const [stableOpen, setStableOpen] = useState(false);
  const [drawerReady, setDrawerReady] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  
  // Core state
  const [post, setPost] = useState<PostDetails | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    post: false,
    comments: false,
    actions: false
  });
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Comments state
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [userIsTyping, setUserIsTyping] = useState(false);
  
  // Drag state for mobile
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { triggerFeedRefresh } = useFeedRefresh();
  
  // Use the shadcn mobile detection hook
  const isMobile = useIsMobile();

  // Stabilized open/close state management
  const stableCloseRef = useRef<NodeJS.Timeout>();
  const lastPropsRef = useRef({ isOpen, postId });
  const stabilizationInProgressRef = useRef(false);
  
  useEffect(() => {
    // Prevent rapid state changes during stabilization or while user is typing
    if (stabilizationInProgressRef.current || userIsTyping) {
      if (userIsTyping) {
        console.log('🔄 User is typing, deferring stabilization');
      } else {
        console.log('🔄 Stabilization in progress, ignoring state change');
      }
      return;
    }
    
    // Only react to meaningful prop changes
    const propsChanged = lastPropsRef.current.isOpen !== isOpen || lastPropsRef.current.postId !== postId;
    
    if (!propsChanged && stableOpen) {
      // Props haven't changed and drawer is already open, no action needed
      return;
    }
    
    if (isOpen && postId && !stableOpen) {
      console.log('🔄 Opening drawer with stabilization for postId:', postId);
      
      stabilizationInProgressRef.current = true;
      
      // Clear any pending close operations
      if (stableCloseRef.current) {
        clearTimeout(stableCloseRef.current);
        stableCloseRef.current = undefined;
      }
      
      setStableOpen(true);
      setDrawerReady(false);
      
      // Start loading immediately
      loadAllContent().finally(() => {
        stabilizationInProgressRef.current = false;
      });
      
    } else if (!isOpen && stableOpen) {
      console.log('🔄 Closing drawer with stabilization');
      
      stabilizationInProgressRef.current = true;
      
      // Delay the actual close to prevent flashing
      stableCloseRef.current = setTimeout(() => {
        setStableOpen(false);
        setDrawerReady(false);
        
        // Clear all state after close
        setTimeout(() => {
          setPost(null);
          setComments([]);
          setError(null);
          setIsEditing(false);
          setNewComment('');
          setReplyingTo(null);
          setContentHeight(null);
          setLoading({ post: false, comments: false, actions: false });
          setUserIsTyping(false);
          stabilizationInProgressRef.current = false;
        }, 100);
      }, 150); // Small delay to prevent glitching
    }
    
    // Update the last props reference
    lastPropsRef.current = { isOpen, postId };
    
    return () => {
      if (stableCloseRef.current) {
        clearTimeout(stableCloseRef.current);
      }
    };
  }, [isOpen, postId, stableOpen, userIsTyping]);

  // Load all content simultaneously with proper error handling
  const loadAllContent = useCallback(async () => {
    if (!postId) return;
    
    console.log('📦 Loading all content for post:', postId);
    
    // Set loading states
    setLoading({ post: true, comments: true, actions: true });
    setError(null);
    
    try {
      // Load post and comments in parallel
      const [postResult, commentsResult] = await Promise.allSettled([
        loadPostDetails(),
        loadComments()
      ]);
      
      // Handle post result
      if (postResult.status === 'fulfilled') {
        console.log('✅ Post loaded successfully');
      } else {
        console.error('❌ Post loading failed:', postResult.reason);
        setError('Failed to load post details');
      }
      
      // Handle comments result (don't show error for comments)
      if (commentsResult.status === 'fulfilled') {
        console.log('✅ Comments loaded successfully');
      } else {
        console.warn('⚠️ Comments loading failed:', commentsResult.reason);
      }
      
      // Mark drawer as ready
      setTimeout(() => {
        setDrawerReady(true);
        setLoading({ post: false, comments: false, actions: false });
      }, 100);
      
    } catch (err) {
      console.error('💥 Critical error loading content:', err);
      setError('Failed to load content');
      setLoading({ post: false, comments: false, actions: false });
    }
  }, [postId]);

  // Load post details
  const loadPostDetails = async (): Promise<void> => {
    try {
      setImageLoadError(false);

      console.log('📄 Fetching post details for:', postId);

      // Direct database query with user information
      const { data, error: queryError } = await supabase
        .from('posts')
        .select(`
          *,
          users!inner(username, profile_image_url)
        `)
        .eq('id', postId)
        .single();

      if (queryError) {
        throw new Error(`Failed to fetch post: ${queryError.message}`);
      }

      if (!data) {
        throw new Error('Post not found');
      }

      console.log('📄 Fetched post from database:', data);

      // Get current user's interaction status
      const { data: { user } } = await supabase.auth.getUser();
      
      let liked = false;
      let bookmarked = false;
      
      if (user) {
        // Check interactions in parallel
        const [likeResponse, bookmarkResponse] = await Promise.allSettled([
          supabase
            .from('post_reactions')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .eq('reaction', 'like')
            .maybeSingle(),
          supabase
            .from('post_bookmarks')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .maybeSingle()
        ]);
        
        if (likeResponse.status === 'fulfilled') {
          liked = !!likeResponse.value.data;
        }
        
        if (bookmarkResponse.status === 'fulfilled') {
          bookmarked = !!bookmarkResponse.value.data;
        }
      }

      const postData = {
        id: data.id,
        type: data.post_type || data.type || 'thought',
        content: data.content,
        caption: data.caption,
        text_body: data.text_body,
        thumbnail_url: data.thumbnail_url,
        media_urls: data.media_urls,
        media_url: data.media_url,
        contentUrl: data.content_url || data.media_url,
        visibility: data.visibility || 'public',
        tribe_id: data.tribe_id,
        tribeName: data.tribe_name,
        created_at: data.created_at,
        user_id: data.user_id,
        username: String(data.users?.username || 'Unknown User'),
        nickname: String(data.users?.username || 'Unknown User'),
        likes: data.like_count || 0,
        like_count: data.like_count || 0,
        comments: data.comment_count || 0,
        comment_count: data.comment_count || 0,
        liked,
        bookmarked,
        location: data.location
      };

      setPost(postData);
      setEditedContent(getPostContent(postData));

    } catch (err) {
      console.error('💥 Error fetching post details:', err);
      throw err; // Re-throw to be handled by loadAllContent
    }
  };

  // Load comments
  const loadComments = async (): Promise<void> => {
    if (!postId) return;
    
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/comments`);
      
      if (response.comments && Array.isArray(response.comments)) {
        const transformedComments = response.comments.map((comment: any) => ({
          id: String(comment.id || Date.now()),
          username: String(comment.username || 'Unknown'),
          content: String(comment.body || comment.content || ''),
          timestamp: String(formatTimeAgo(comment.createdAt || comment.created_at || new Date().toISOString()) || 'now'),
          likes: Number(comment.likes || 0),
          isLiked: Boolean(comment.isLiked || false),
          replies: [],
          replyCount: 0
        }));
        setComments(transformedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('💥 Failed to load comments:', error);
      setComments([]); // Set empty array on error
      throw error; // Re-throw to be handled by loadAllContent
    }
  };

  // Touch drag handlers for swipe to dismiss (mobile only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable drag on mobile and if drawer is ready
    if (!isMobile || isDragging || !drawerReady) return;
    
    // Only allow drag from the top portion of the drawer
    const rect = e.currentTarget.getBoundingClientRect();
    const touchY = e.touches[0].clientY;
    const isInDragArea = touchY < rect.top + 100; // Only top 100px is draggable
    
    if (isInDragArea) {
      const touch = e.touches[0];
      startY.current = touch.clientY;
      setIsDragging(true);
      setDragY(0);
      
      // Light haptic feedback on touch start
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  }, [isMobile, isDragging, drawerReady]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !isMobile) return;
    
    // Prevent default scrolling when dragging
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    
    // Only allow downward dragging and apply resistance
    if (deltaY > 0) {
      const resistedDragY = deltaY * 0.7; // Add resistance
      setDragY(resistedDragY);
    }
  }, [isDragging, isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !isDragging) return;
    
    const shouldClose = dragY > 80; // Lower threshold for better UX
    
    if (shouldClose) {
      // Haptic feedback for dismissal
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
      onClose();
    }
    
    // Reset drag state with animation
    setIsDragging(false);
    setDragY(0);
  }, [dragY, onClose, isMobile, isDragging]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stableOpen) {
        onClose();
      }
    };

    if (stableOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [stableOpen, onClose]);

  // Auto-focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current && drawerReady) {
      inputRef.current.focus();
    }
  }, [replyingTo, drawerReady]);

  // Reset edit state when post changes
  useEffect(() => {
    setIsEditing(false);
    if (post) {
      setEditedContent(getPostContent(post));
    }
  }, [post?.id]);

  // Get the content to display/edit
  const getPostContent = (post: PostDetails) => {
    const content = post.text_body || post.content || post.caption || '';
    // Ensure we always return a string, not an object
    return typeof content === 'string' ? content : String(content || '');
  };

  // Check if user can edit this post
  const canUserEditPost = (post: PostDetails) => {
    return isOwnProfile && userId && post.user_id === userId;
  };

  // Save edited content
  const saveEdit = async () => {
    if (!post || !canUserEditPost(post)) return;

    setIsSaving(true);
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_body: editedContent.trim(),
          content: editedContent.trim(),
          caption: editedContent.trim()
        })
      });

      if (response.success) {
        // Update local state
        setPost(prev => prev ? { 
          ...prev, 
          text_body: editedContent.trim(),
          content: editedContent.trim(),
          caption: editedContent.trim()
        } : null);
        
        setIsEditing(false);
        toast.success('Post updated successfully!');
        
        // Trigger feed refresh and notify parent
        triggerFeedRefresh();
        if (onPostUpdated) {
          onPostUpdated(post.id);
        }
      } else {
        throw new Error(response.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    if (post) {
      setEditedContent(getPostContent(post));
    }
    setIsEditing(false);
  };

  // Handle delete post
  const handleDeletePost = () => {
    setShowDeleteDialog(true);
  };

  // Confirm post deletion
  const confirmDeletePost = async () => {
    if (!post) return;

    setIsDeleting(true);
    
    try {
      console.log('🗑️  Starting post deletion process for:', post.id);
      const result = await deletePost(post.id, triggerFeedRefresh);
      
      if (result.success) {
        console.log('✅ Post deleted successfully, triggering feed refresh');
        toast.success('Post deleted successfully');
        setShowDeleteDialog(false);
        onClose(); // Close the drawer
        
        if (onPostDeleted) {
          onPostDeleted(post.id);
        }
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
  const toggleLike = async () => {
    if (!post || loading.actions) return;

    // Optimistic update
    const wasLiked = post.liked;
    const newLikeCount = wasLiked ? (post.likes || 0) - 1 : (post.likes || 0) + 1;
    
    setPost(prev => prev ? { 
      ...prev, 
      liked: !wasLiked, 
      likes: newLikeCount,
      like_count: newLikeCount
    } : null);

    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/like`, {
        method: 'POST'
      });

      // Update with server response
      setPost(prev => prev ? { 
        ...prev, 
        liked: response.liked, 
        likes: response.likes,
        like_count: response.likes
      } : null);

      if (response.liked) {
        toast.success('Liked! ✨');
      }
      
      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
      
      if (onToggleLike) {
        onToggleLike(post.id);
      }
    } catch (error) {
      // Revert optimistic update
      setPost(prev => prev ? { 
        ...prev, 
        liked: wasLiked, 
        likes: wasLiked ? newLikeCount + 1 : newLikeCount - 1,
        like_count: wasLiked ? newLikeCount + 1 : newLikeCount - 1
      } : null);
      
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  // Handle bookmark toggle
  const toggleBookmark = async () => {
    if (!post || loading.actions) return;

    // Optimistic update
    const wasBookmarked = post.bookmarked;
    setPost(prev => prev ? { ...prev, bookmarked: !wasBookmarked } : null);

    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/bookmark`, {
        method: 'POST'
      });

      setPost(prev => prev ? { ...prev, bookmarked: response.bookmarked } : null);

      if (response.bookmarked) {
        toast.success('Saved to collection! 🔖');
      } else {
        toast.success('Removed from collection');
      }
      
      if (onToggleBookmark) {
        onToggleBookmark(post.id);
      }
    } catch (error) {
      // Revert optimistic update
      setPost(prev => prev ? { ...prev, bookmarked: wasBookmarked } : null);
      
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    }
  };

  // Handle post actions
  const handlePostAction = (action: string) => {
    if (!post) return;

    switch (action) {
      case 'report':
        toast.success('Post reported. Thank you for keeping Tribe safe.');
        break;
      case 'copy':
        navigator.clipboard.writeText(`https://tribe.app/post/${post.id}`);
        toast.success('Link copied to clipboard!');
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: 'Check out this post on Tribe',
            text: getPostContent(post) || 'Check out this post',
            url: `https://tribe.app/post/${post.id}`
          });
        } else {
          navigator.clipboard.writeText(`https://tribe.app/post/${post.id}`);
          toast.success('Link copied to clipboard!');
        }
        break;
    }
  };

  // Submit comment with stabilization protection
  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userInfo || !post || isSubmitting) return;

    // Prevent comment submission from interfering with drawer state
    const currentStabilizationState = stabilizationInProgressRef.current;
    
    setIsSubmitting(true);
    try {
      const commentContent = replyingTo 
        ? `@${replyingTo.username} ${newComment.trim()}`
        : newComment.trim();

      // Add optimistic comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        username: String(userInfo.username),
        content: String(commentContent),
        timestamp: 'now',
        likes: 0,
        isLiked: false,
        replies: [],
        replyCount: 0
      };

      setComments(prev => [...prev, optimisticComment]);
      setNewComment('');
      setReplyingTo(null);

      // Scroll to bottom
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 100);

      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentContent })
      });

      if (response.comment) {
        // Replace optimistic comment with real one
        setComments(prev => prev.map(c => 
          c.id === optimisticComment.id ? {
            ...c,
            id: String(response.comment.id),
            timestamp: String(formatTimeAgo(response.comment.createdAt || response.comment.created_at) || 'now')
          } : c
        ));
        
        // Add haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        toast.success('Comment posted! ✨');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== `temp-${Date.now()}`));
      toast.error('Failed to post comment. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, userInfo, post, isSubmitting, replyingTo]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewComment(emoji);
    
    // Auto-submit emoji reactions if not replying
    if (!replyingTo && userInfo) {
      setTimeout(() => {
        handleSubmitComment(new Event('submit') as any);
      }, 100);
    }
  }, [replyingTo, userInfo, handleSubmitComment]);

  // Debounced comment input handler to prevent rapid state changes
  const handleCommentChange = useCallback((value: string) => {
    setNewComment(value);
    
    // Set typing indicator
    setUserIsTyping(true);
    
    // Clear typing indicator after user stops typing
    const typingTimeout = setTimeout(() => {
      setUserIsTyping(false);
    }, 1000);
    
    return () => clearTimeout(typingTimeout);
  }, []);

  const handleLikeComment = useCallback(async (commentId: string) => {
    // Optimistic update
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { 
            ...comment, 
            isLiked: !comment.isLiked,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
          }
        : comment
    ));

    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    try {
      // TODO: Implement comment like API call
      console.log('Like comment:', commentId);
    } catch (error) {
      console.error('Failed to like comment:', error);
      // Revert optimistic update on error
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes + 1 : comment.likes - 1
            }
          : comment
      ));
      toast.error('Failed to like comment');
    }
  }, []);

  const handleReplyToComment = useCallback((commentId: string, username: string) => {
    setReplyingTo({ id: commentId, username });
    setNewComment('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Render media content based on post type
  const renderMediaContent = () => {
    if (!post || imageLoadError) return null;

    // Show skeleton while loading
    if (loading.post) {
      return <Skeleton className="w-full h-64 rounded-2xl" />;
    }

    switch (post.type) {
      case 'image':
        if (!post.media_url && !post.contentUrl) return null;
        
        return (
          <div className="relative">
            <ImageWithFallback
              src={post.media_url || post.contentUrl || ''}
              alt="Post image"
              className="w-full h-auto rounded-2xl border border-muted-lavender/20"
              onError={() => setImageLoadError(true)}
            />
          </div>
        );

      case 'video':
        if (!post.media_url && !post.contentUrl) return null;
        
        return (
          <div className="relative">
            <VideoPlayer
              src={post.media_url || post.contentUrl || ''}
              poster={post.thumbnail_url}
              className="w-full rounded-2xl border border-muted-lavender/20"
            />
          </div>
        );

      case 'audio':
        if (!post.media_url && !post.contentUrl) return null;
        
        return (
          <div className="bg-mirrorcore-purple/20 p-6 rounded-2xl border border-muted-lavender/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-neon-lilac/20 rounded-full flex items-center justify-center">
                <Music className="w-6 h-6 text-neon-lilac" />
              </div>
              <div>
                <h3 className="font-medium text-snow-white">Audio Post</h3>
                <p className="text-muted-lavender text-sm">Tap to play</p>
              </div>
            </div>
            <WaveformAudioPlayer 
              src={post.media_url || post.contentUrl || ''} 
              className="w-full"
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Render loading skeleton for comments
  const renderCommentsLoadingSkeleton = () => (
    <div className="space-y-4 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-24 h-3" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-1/2 h-4" />
          </div>
        </div>
      ))}
    </div>
  );

  // Only render when stable state is open
  if (!stableOpen) return null;

  const realmColors = getRealmColors('mirrorcore');
  const canEdit = post ? canUserEditPost(post) : false;
  const canDelete = post ? canUserDeletePost(post, userId) : false;

  // Custom SheetContent with proper accessibility
  const CustomSheetContent = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
      side?: "top" | "right" | "bottom" | "left";
    }
  >(({ className, children, side = "right", ...props }, ref) => {
    return (
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <SheetPrimitive.Content
          ref={ref}
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
            side === "right" &&
              "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
            side === "left" &&
              "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
            side === "top" &&
              "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
            side === "bottom" &&
              "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
            className,
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
          {...props}
        >
          {/* Required accessibility title */}
          <SheetHeader className="sr-only">
            <SheetTitle>Post Details</SheetTitle>
          </SheetHeader>
          {children}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    );
  });
  CustomSheetContent.displayName = "CustomSheetContent";

  return (
    <>
      <Sheet open={stableOpen} onOpenChange={onClose}>
        <CustomSheetContent 
          side={isMobile ? "bottom" : "right"}
          className={cn(
            // Base styles with stabilized layout
            "bg-midnight-black/98 backdrop-blur-xl shadow-2xl border-muted-lavender/20",
            
            // Mobile styles
            isMobile && [
              "max-h-[85vh] min-h-[50vh]",
              "rounded-t-3xl border-t border-l-0 border-r-0",
              "w-full",
              isDragging && "duration-0", // Disable transition during drag
            ],
            
            // Desktop styles  
            !isMobile && [
              "max-h-[90vh] min-h-[60vh]",
              "w-[480px] max-w-[480px]",
              "rounded-l-3xl border-l border-t-0 border-b-0"
            ]
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={isMobile && isDragging ? { transform: `translateY(${dragY}px)` } : undefined}
        >
          <div className="flex flex-col h-full max-h-full overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-muted-lavender/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-snow-white">Post Details</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-muted-lavender hover:text-snow-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-auto" ref={scrollContainerRef}>
              {error ? (
                <div className="p-6 text-center">
                  <p className="text-red-400 mb-4">{String(error)}</p>
                  <Button onClick={() => loadAllContent()} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Post Content */}
                  <div className="p-4 space-y-4">
                    {loading.post ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="w-32 h-4" />
                            <Skeleton className="w-24 h-3" />
                          </div>
                        </div>
                        <Skeleton className="w-full h-24" />
                        <Skeleton className="w-full h-64 rounded-2xl" />
                      </div>
                    ) : post ? (
                      <>
                        {/* User info and post meta */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src="/api/placeholder/40/40" />
                              <AvatarFallback className="bg-mirrorcore-purple text-snow-white">
                                {post.username?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-snow-white font-medium">{post.username || 'Unknown User'}</p>
                              <p className="text-muted-lavender text-sm">
                                {typeof formatPostTimestamp(post.created_at) === 'string' 
                                  ? formatPostTimestamp(post.created_at) 
                                  : formatTimeAgo(post.created_at) || 'Unknown time'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-lavender hover:text-snow-white hover:bg-white/10"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {canEdit && (
                                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Edit Post
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem 
                                  onClick={handleDeletePost}
                                  className="text-red-400 focus:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Post
                                </DropdownMenuItem>
                              )}
                              {(canEdit || canDelete) && <DropdownMenuSeparator />}
                              <DropdownMenuItem onClick={() => handlePostAction('copy')}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePostAction('share')}>
                                <Share className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handlePostAction('report')}
                                className="text-red-400 focus:text-red-400"
                              >
                                <Flag className="h-4 w-4 mr-2" />
                                Report Post
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Post content - editable or display mode */}
                        {isEditing ? (
                          <div className="space-y-4">
                            <Textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              placeholder="What's on your mind?"
                              className="min-h-[100px] bg-white/5 border-muted-lavender/20 text-snow-white placeholder:text-muted-lavender"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={saveEdit}
                                disabled={isSaving}
                                size="sm"
                                className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={cancelEdit}
                                variant="outline"
                                size="sm"
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Text content */}
                            {getPostContent(post) && (
                              <div className="text-snow-white whitespace-pre-wrap">
                                {String(getPostContent(post))}
                              </div>
                            )}

                            {/* Media content */}
                            {renderMediaContent()}

                            {/* Post stats and actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-muted-lavender/20">
                              <div className="flex items-center gap-6">
                                <button
                                  onClick={toggleLike}
                                  disabled={loading.actions}
                                  className={cn(
                                    "flex items-center gap-2 transition-colors",
                                    post.liked 
                                      ? "text-rose-400 hover:text-rose-300" 
                                      : "text-muted-lavender hover:text-snow-white"
                                  )}
                                >
                                  <Heart className={cn("w-5 h-5", post.liked && "fill-current")} />
                                  <span className="text-sm">{String(post.likes || 0)}</span>
                                </button>

                                <div className="flex items-center gap-2 text-muted-lavender">
                                  <MessageCircle className="w-5 h-5" />
                                  <span className="text-sm">{String(post.comments || 0)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={toggleBookmark}
                                  disabled={loading.actions}
                                  className={cn(
                                    "h-8 w-8",
                                    post.bookmarked 
                                      ? "text-neon-lilac" 
                                      : "text-muted-lavender hover:text-snow-white"
                                  )}
                                >
                                  <Bookmark className={cn("h-4 w-4", post.bookmarked && "fill-current")} />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePostAction('share')}
                                  className="h-8 w-8 text-muted-lavender hover:text-snow-white"
                                >
                                  <Share className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    ) : null}
                  </div>

                  {/* Comments Section */}
                  <div className="border-t border-muted-lavender/20">
                    <div className="p-4">
                      <h3 className="font-medium text-snow-white mb-4">
                        Comments {post?.comments ? `(${String(post.comments)})` : ''}
                      </h3>
                      
                      {loading.comments ? (
                        renderCommentsLoadingSkeleton()
                      ) : (
                        <>
                          {comments.length > 0 ? (
                            <div className="space-y-4 mb-6">
                              {comments.map((comment) => (
                                <ThreadedCommentRow
                                  key={comment.id}
                                  comment={comment}
                                  onLike={handleLikeComment}
                                  onReply={handleReplyToComment}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <MessageCircle className="w-12 h-12 mx-auto text-muted-lavender/50 mb-3" />
                              <p className="text-muted-lavender">No comments yet</p>
                              <p className="text-sm text-muted-lavender/70">Be the first to share your thoughts!</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Comment Input - Fixed at bottom */}
            <div className="flex-shrink-0 p-4 border-t border-muted-lavender/20 bg-midnight-black/95">
              {replyingTo && (
                <div className="mb-3 p-2 bg-white/5 rounded-lg border border-muted-lavender/20">
                  <p className="text-sm text-muted-lavender">
                    Replying to <span className="text-neon-lilac">@{String(replyingTo.username)}</span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(null)}
                    className="h-6 px-2 text-xs text-muted-lavender hover:text-snow-white"
                  >
                    Cancel
                  </Button>
                </div>
              )}
              
              <form onSubmit={handleSubmitComment} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={newComment}
                    onChange={(e) => handleCommentChange(e.target.value)}
                    placeholder={replyingTo ? `Reply to @${String(replyingTo.username)}...` : "Write a comment..."}
                    className="flex-1 bg-white/5 border-muted-lavender/20 text-snow-white placeholder:text-muted-lavender"
                    disabled={isSubmitting || !userInfo}
                  />
                  <Button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting || !userInfo}
                    size="icon"
                    className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                {/* Emoji quick bar */}
                <EmojiQuickBar onEmojiSelect={handleEmojiSelect} />
              </form>
            </div>
          </div>
        </CustomSheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeletePost}
        isDeleting={isDeleting}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
      />
    </>
  );
}