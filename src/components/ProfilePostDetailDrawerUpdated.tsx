import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Textarea } from './ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
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

interface ProfilePostDetailDrawerProps {
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

export function ProfilePostDetailDrawer({ 
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
}: ProfilePostDetailDrawerProps) {
  // ALL HOOKS MUST BE DECLARED FIRST
  const [post, setPost] = useState<PostDetails | null>(null);
  const [loading, setLoading] = useState(false);
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  
  // Drag state for mobile
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { triggerFeedRefresh } = useFeedRefresh();
  
  // Use the shadcn mobile detection hook
  const isMobile = useIsMobile();

  // Touch drag handlers for swipe to dismiss (mobile only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable drag on mobile
    if (!isMobile) return;
    
    const touch = e.touches[0];
    startY.current = touch.clientY;
    setIsDragging(true);
    
    // Light haptic feedback on touch start
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !isMobile) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  }, [isDragging, isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    
    setIsDragging(false);
    
    // Close if dragged down more than 100px (Instagram-style threshold)
    if (dragY > 100) {
      // Haptic feedback for dismissal
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
      onClose();
    }
    
    setDragY(0);
  }, [dragY, onClose, isMobile]);

  // Load comments when drawer opens
  useEffect(() => {
    if (isOpen && post?.id) {
      loadComments();
      
      // Light haptic feedback when opening
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    }
  }, [isOpen, post?.id]);

  // Auto-focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current && isOpen) {
      inputRef.current.focus();
    }
  }, [replyingTo, isOpen]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Get the content to display/edit
  const getPostContent = (post: PostDetails) => {
    return post.text_body || post.content || post.caption || '';
  };

  // Check if user can edit this post
  const canUserEditPost = (post: PostDetails) => {
    return isOwnProfile && userId && post.user_id === userId;
  };

  // Fetch post details
  const fetchPostDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setImageLoadError(false);

      console.log('Fetching post details for:', postId);

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

      console.log('Fetched post from database:', data);

      // Get current user's interaction status
      const { data: { user } } = await supabase.auth.getUser();
      
      let liked = false;
      let bookmarked = false;
      
      if (user) {
        // Check like status
        const { data: likeData } = await supabase
          .from('post_reactions')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('reaction', 'like')
          .maybeSingle();
        
        liked = !!likeData;
        
        // Check bookmark status
        const { data: bookmarkData } = await supabase
          .from('post_bookmarks')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        bookmarked = !!bookmarkData;
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
        username: data.users?.username || 'Unknown User',
        nickname: data.users?.username || 'Unknown User',
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
      console.error('Error fetching post details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  // Load comments
  const loadComments = async () => {
    if (!postId) return;
    
    setIsLoadingComments(true);
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/comments`);
      
      if (response.comments && Array.isArray(response.comments)) {
        const transformedComments = response.comments.map((comment: any) => ({
          id: comment.id || Date.now().toString(),
          username: comment.username || 'Unknown',
          content: comment.body || comment.content || '',
          timestamp: formatTimeAgo(comment.createdAt || comment.created_at || new Date().toISOString()),
          likes: comment.likes || 0,
          isLiked: comment.isLiked || false,
          replies: [],
          replyCount: 0
        }));
        setComments(transformedComments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
      // Don't show error to user for comments - just show empty state
    } finally {
      setIsLoadingComments(false);
    }
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
    if (!post) return;

    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/like`, {
        method: 'POST'
      });

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
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  // Handle bookmark toggle
  const toggleBookmark = async () => {
    if (!post) return;

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

  // Submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userInfo || !post) return;

    setIsSubmitting(true);
    try {
      const commentContent = replyingTo 
        ? `@${replyingTo.username} ${newComment.trim()}`
        : newComment.trim();

      // Add optimistic comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        username: userInfo.username,
        content: commentContent,
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
        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          }
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
            id: response.comment.id,
            timestamp: formatTimeAgo(response.comment.createdAt || response.comment.created_at)
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
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewComment(emoji);
    
    // Auto-submit emoji reactions if not replying
    if (!replyingTo && userInfo) {
      setTimeout(() => {
        handleSubmitComment(new Event('submit') as any);
      }, 100);
    }
  };

  const handleLikeComment = async (commentId: string) => {
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
  };

  const handleReplyToComment = (commentId: string, username: string) => {
    setReplyingTo({ id: commentId, username });
    setNewComment('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleLoadReplies = async (commentId: string) => {
    // TODO: Implement load replies API call
    console.log('Load replies for:', commentId);
  };

  // Fetch post details when drawer opens
  useEffect(() => {
    if (isOpen && postId) {
      fetchPostDetails();
    }
  }, [isOpen, postId]);

  // Reset edit state when post changes
  useEffect(() => {
    setIsEditing(false);
    if (post) {
      setEditedContent(getPostContent(post));
    }
  }, [post?.id]);

  // Render media content based on post type
  const renderMediaContent = () => {
    if (!post || imageLoadError) return null;

    switch (post.type) {
      case 'image':
        if (post.contentUrl) {
          return (
            <div className="image-post-container">
              <ImageWithFallback 
                src={post.contentUrl}
                alt={`Post by ${post.username}`}
                className="image-post-full"
                onError={() => setImageLoadError(true)}
                fallback={
                  <div className="w-full h-64 rounded-2xl bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Sparkles className="w-12 h-12 text-muted-lavender/40 mx-auto" />
                      <p className="text-sm text-muted-lavender/60 font-body">Image failed to load</p>
                    </div>
                  </div>
                }
              />
            </div>
          );
        }
        break;

      case 'video':
        if (post.contentUrl) {
          return (
            <div className="image-post-container">
              <VideoPlayer
                src={post.contentUrl}
                thumbnail={post.thumbnail_url}
                className="video-responsive"
                autoPlay={false}
                controls={true}
              />
            </div>
          );
        }
        break;

      case 'audio':
        if (post.contentUrl) {
          return (
            <div className="w-full">
              <WaveformAudioPlayer 
                src={post.contentUrl}
                className="w-full"
              />
            </div>
          );
        } else {
          return (
            <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Music className="w-12 h-12 text-muted-lavender/40 mx-auto" />
                <p className="text-sm text-muted-lavender/60 font-body">Audio Content</p>
              </div>
            </div>
          );
        }
        break;

      default:
        return null;
    }

    return null;
  };

  if (!isOpen) return null;

  const realmColors = getRealmColors('mirrorcore');
  const canEdit = post ? canUserEditPost(post) : false;
  const canDelete = post ? canUserDeletePost(post, userId) : false;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side={isMobile ? "bottom" : "right"}
          className={cn(
            // Base styles
            "bg-midnight-black/98 backdrop-blur-xl shadow-2xl shadow-black/50",
            "border-muted-lavender/10 transform transition-all duration-300 ease-out",
            // Mobile styles
            isMobile && [
              "h-[95vh] max-h-[95vh] border-t rounded-t-[20px]",
              "instagram-drawer mobile-comments-scroll",
              isDragging && dragY > 0 && `translate-y-[${Math.min(dragY, 200)}px]`
            ],
            // Desktop styles  
            !isMobile && [
              "h-screen max-h-screen w-[500px] max-w-[500px]",
              "border-l rounded-l-[20px] rounded-r-none"
            ]
          )}
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchMove={isMobile ? handleTouchMove : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
          style={{
            transform: isDragging && dragY > 0 && isMobile ? `translateY(${Math.min(dragY, 200)}px)` : undefined
          }}
        >
          {/* Hidden accessibility header */}
          <SheetHeader className="sr-only">
            <SheetTitle>Post Details</SheetTitle>
            <SheetDescription>
              View post details, edit or delete the post, and interact with comments.
            </SheetDescription>
          </SheetHeader>

          {/* Instagram-style Drag Handle - Mobile Only */}
          {isMobile && (
            <div className="flex justify-center pt-2 pb-3">
              <div className="w-10 h-1 bg-muted-lavender/30 rounded-full" />
            </div>
          )}

          {/* Content */}
          <div className={cn(
            "flex flex-col",
            // Mobile: account for drag handle
            isMobile && "h-[calc(100%-20px)]",
            // Desktop: use full height
            !isMobile && "h-full"
          )}>
            {/* Post Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-neon-lilac" />
                </div>
              ) : error ? (
                <div className="text-center py-12 space-y-4 px-4">
                  <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-glitch-red/20 to-soft-blush/20 flex items-center justify-center">
                    <X className="w-8 h-8 text-glitch-red" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-headline text-pearl-white">Failed to load post</h3>
                    <p className="text-muted-lavender font-body text-sm">{error}</p>
                  </div>
                  <Button
                    onClick={fetchPostDetails}
                    className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body"
                  >
                    Try again
                  </Button>
                </div>
              ) : post ? (
                <div className="flex flex-col h-full">
                  {/* Post Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-muted-lavender/10">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.avatar || ""} />
                        <AvatarFallback className={`bg-gradient-to-r from-${realmColors.primary} to-${realmColors.secondary} text-white font-headline text-sm`}>
                          {(post.username || post.nickname || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-body font-medium text-pearl-white text-sm">
                          {post.username || post.nickname || 'unknown'}
                        </p>
                        <p className="text-xs text-muted-lavender/70">
                          {formatPostTimestamp(
                            post.username || post.nickname || 'unknown',
                            post.created_at
                          ).primaryLine}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-2 text-muted-lavender hover:text-pearl-white transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-midnight-black border-muted-lavender/30 soft-blur">
                        {canEdit && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => setIsEditing(true)}
                              className="text-pearl-white hover:bg-muted-lavender/10 cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit post
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-muted-lavender/20" />
                          </>
                        )}
                        
                        <DropdownMenuItem 
                          onClick={() => handlePostAction('copy')}
                          className="text-pearl-white hover:bg-muted-lavender/10 cursor-pointer"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy link
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => handlePostAction('share')}
                          className="text-pearl-white hover:bg-muted-lavender/10 cursor-pointer"
                        >
                          <Share className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => handlePostAction('report')}
                          className="text-pearl-white hover:bg-muted-lavender/10 cursor-pointer"
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Report
                        </DropdownMenuItem>
                        
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator className="bg-muted-lavender/20" />
                            <DropdownMenuItem 
                              onClick={handleDeletePost}
                              className="text-glitch-red hover:bg-glitch-red/10 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete post
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Post Content - Scrollable */}
                  <ScrollArea className="flex-1" ref={scrollAreaRef}>
                    <div className="p-4 space-y-4">
                      {/* Media Content */}
                      {renderMediaContent()}

                      {/* Text Content */}
                      {isEditing ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full bg-transparent border-muted-lavender/20 text-pearl-white placeholder-muted-lavender/50 resize-none min-h-[100px]"
                            placeholder="Share your thoughts..."
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              onClick={cancelEdit}
                              variant="ghost"
                              size="sm"
                              className="text-muted-lavender hover:text-pearl-white"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={saveEdit}
                              disabled={isSaving}
                              size="sm"
                              className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
                            >
                              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              <Save className="w-4 h-4 mr-2" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        getPostContent(post) && (
                          <div className="text-pearl-white font-body whitespace-pre-wrap break-words">
                            {getPostContent(post)}
                          </div>
                        )
                      )}

                      {/* Post Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-muted-lavender/10">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={toggleLike}
                            className={cn(
                              "flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-200",
                              post.liked 
                                ? "text-glitch-red bg-glitch-red/10 hover:bg-glitch-red/20" 
                                : "text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
                            )}
                          >
                            <Heart className={cn("w-5 h-5", post.liked && "fill-current")} />
                            <span className="font-body text-sm">{post.likes || 0}</span>
                          </button>
                          
                          <div className="flex items-center space-x-2 text-muted-lavender">
                            <MessageCircle className="w-5 h-5" />
                            <span className="font-body text-sm">{comments.length}</span>
                          </div>
                        </div>

                        <button
                          onClick={toggleBookmark}
                          className={cn(
                            "p-2 rounded-xl transition-all duration-200",
                            post.bookmarked 
                              ? "text-electric-blue bg-electric-blue/10 hover:bg-electric-blue/20" 
                              : "text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
                          )}
                        >
                          <Bookmark className={cn("w-5 h-5", post.bookmarked && "fill-current")} />
                        </button>
                      </div>

                      {/* Comments Section */}
                      <div className="pt-4 border-t border-muted-lavender/10">
                        <h3 className="font-headline text-pearl-white text-sm mb-4">
                          Comments ({comments.length})
                        </h3>
                        
                        {isLoadingComments ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-neon-lilac" />
                          </div>
                        ) : comments.length > 0 ? (
                          <div className="space-y-4">
                            {comments.map((comment) => (
                              <ThreadedCommentRow
                                key={comment.id}
                                comment={comment}
                                onLike={handleLikeComment}
                                onReply={handleReplyToComment}
                                onLoadReplies={handleLoadReplies}
                                showReplies={false}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <MessageCircle className="w-12 h-12 text-muted-lavender/40 mx-auto mb-3" />
                            <p className="text-muted-lavender font-body">No comments yet</p>
                            <p className="text-muted-lavender/70 font-body text-sm">Be the first to share your thoughts!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>

                  {/* Comment Input - Fixed at bottom */}
                  <div className="border-t border-muted-lavender/10 p-4">
                    {replyingTo && (
                      <div className="flex items-center justify-between mb-3 px-3 py-2 bg-muted-lavender/5 rounded-lg">
                        <span className="text-sm text-muted-lavender">
                          Replying to <span className="text-electric-blue">@{replyingTo.username}</span>
                        </span>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="text-muted-lavender hover:text-pearl-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <EmojiQuickBar onEmojiSelect={handleEmojiSelect} />
                    
                    <form onSubmit={handleSubmitComment} className="flex items-end space-x-3 mt-3">
                      <Input
                        ref={inputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                        className="flex-1 bg-transparent border-muted-lavender/20 text-pearl-white placeholder-muted-lavender/50"
                        disabled={isSubmitting}
                      />
                      <Button
                        type="submit"
                        disabled={!newComment.trim() || isSubmitting}
                        size="sm"
                        className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black shrink-0"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={confirmDeletePost}
          isDeleting={isDeleting}
          title="Delete Post"
          description="Are you sure you want to delete this post? This action cannot be undone."
        />
      )}
    </>
  );
}