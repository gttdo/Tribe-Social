import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { X, Send, Loader2, Heart } from 'lucide-react';
import { ThreadedCommentRow } from './ThreadedCommentRow';
import { EmojiQuickBar } from './EmojiQuickBar';
import { toast } from 'sonner@2.0.3';
import { cn } from './ui/utils';
import { UserResult, UserInfo, CoreRealm } from '../App';
import { formatTimeAgo } from '../utils/timestamp-helpers';

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

interface Post {
  id: string;
  username: string;
  nickname?: string;
  coreRealm: CoreRealm;
  timestamp: string;
  caption?: string;
  content?: string;
  imageUrl?: string;
  mediaThumbnailUrl?: string;
  type: string;
  liked: boolean;
  bookmarked: boolean;
  likes: number;
  comments?: Comment[];
  userId?: string;
}

interface MobileCommentsDrawerProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  userInfo: UserInfo | null;
  onToggleLike?: (postId: string) => void;
  onToggleBookmark?: (postId: string) => void;
}

export function MobileCommentsDrawer({
  post,
  isOpen,
  onClose,
  userInfo,
  onToggleLike,
  onToggleBookmark
}: MobileCommentsDrawerProps) {
  // ALL HOOKS MUST BE DECLARED FIRST - NO EARLY RETURNS BEFORE HOOKS
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  // Initialize comments from post data
  useEffect(() => {
    if (post && post.comments) {
      setComments(post.comments);
    } else {
      setComments([]);
    }
  }, [post]);

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

  // Touch drag handlers for swipe to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startY.current = touch.clientY;
    setIsDragging(true);
    
    // Light haptic feedback on touch start
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
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
  }, [dragY, onClose]);

  // NOW WE CAN DO EARLY RETURNS AFTER ALL HOOKS ARE DECLARED
  if (!post) {
    return null;
  }

  const loadComments = async () => {
    if (!post?.id) return;
    
    setIsLoading(true);
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/comments`);
      
      if (response.comments && Array.isArray(response.comments)) {
        const transformedComments = response.comments.map((comment: any) => ({
          id: comment.id || Date.now().toString(),
          username: comment.username || 'Unknown',
          content: comment.body || comment.content || '', // Prioritize 'body' field from backend
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
      toast.error('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };



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
      
      // Send "body" field to match backend expectation
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentContent }) // Changed from "content" to "body"
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
        
        // Create notification for post owner (if not commenting on own post)
        try {
          if (post.userId !== userInfo.id) {
            const { createCommentNotification } = await import('../utils/supabase/notification-helpers');
            await createCommentNotification(
              post.userId || post.username, // fallback to username if no userId
              userInfo.username,
              post.id,
              commentContent,
              post.caption || post.content
            );
          }
        } catch (notificationError) {
          console.warn('Failed to create comment notification:', notificationError);
          // Don't show error to user - notification creation is secondary
        }
        
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

  const getRealmColors = (realm?: CoreRealm) => {
    const colors = {
      mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
      embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
      shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    return colors[realm || 'mirrorcore'] || colors.mirrorcore;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className={cn(
          "h-[90vh] max-h-[90vh] bg-midnight-black/98 backdrop-blur-xl",
          "border-t border-muted-lavender/10 rounded-t-[20px]",
          "transform transition-all duration-300 ease-out",
          "shadow-2xl shadow-black/50 instagram-drawer mobile-comments-scroll",
          isDragging && dragY > 0 && `translate-y-[${Math.min(dragY, 200)}px]`
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isDragging && dragY > 0 ? `translateY(${Math.min(dragY, 200)}px)` : undefined
        }}
      >
        {/* Hidden accessibility header */}
        <SheetHeader className="sr-only">
          <SheetTitle>Comments</SheetTitle>
          <SheetDescription>
            View and interact with comments on this post. You can like comments, reply to them, or add your own comment.
          </SheetDescription>
        </SheetHeader>

        {/* Instagram-style Drag Handle */}
        <div className="flex justify-center pt-2 pb-3">
          <div className="w-10 h-1 bg-muted-lavender/30 rounded-full" />
        </div>

        {/* Instagram-style Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-muted-lavender/10">
          <div className="flex items-center space-x-2">
            <h2 className="font-headline text-pearl-white text-base font-medium">
              Comments
            </h2>
            {comments.length > 0 && (
              <span className="text-muted-lavender text-sm font-body">
                {comments.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-lavender hover:text-pearl-white transition-colors touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Main Content Area */}
        <div className="flex flex-col h-[calc(100%-80px)]">
          {/* Comments List with Instagram-style spacing */}
          <ScrollArea 
            ref={scrollAreaRef}
            className="flex-1 px-4"
          >
            <div className="py-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-neon-lilac" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-6 bg-muted-lavender/5 border border-muted-lavender/10 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-muted-lavender/30" />
                  </div>
                  <h3 className="font-headline text-pearl-white text-lg mb-2">No comments yet</h3>
                  <p className="text-muted-lavender font-body text-sm px-8">
                    Start the conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map(comment => (
                    <ThreadedCommentRow
                      key={comment.id}
                      id={comment.id}
                      username={comment.username}
                      content={comment.content}
                      timestamp={comment.timestamp}
                      likes={comment.likes}
                      isLiked={comment.isLiked}
                      avatar={comment.avatar}
                      replies={comment.replies}
                      replyCount={comment.replyCount}
                      onLike={handleLikeComment}
                      onReply={handleReplyToComment}
                      onLoadReplies={handleLoadReplies}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Emoji Quick Bar - Instagram style */}
          <div className="border-t border-muted-lavender/5 px-4 py-2">
            <EmojiQuickBar onEmojiSelect={handleEmojiSelect} />
          </div>

          {/* Instagram-style Comment Input */}
          <div className="border-t border-muted-lavender/10 bg-midnight-black/95 backdrop-blur-sm px-4 py-3 pb-safe">
            {replyingTo && (
              <div className="flex items-center justify-between mb-3 p-3 bg-electric-blue/8 rounded-2xl">
                <span className="text-electric-blue text-sm font-body">
                  Replying to <span className="font-medium">@{replyingTo.username}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setNewComment('');
                  }}
                  className="h-6 w-6 p-1 text-electric-blue hover:text-pearl-white"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            <form onSubmit={handleSubmitComment} className="flex items-center space-x-3">
              {userInfo && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={`bg-gradient-to-r from-${getRealmColors(post.coreRealm).primary} to-${getRealmColors(post.coreRealm).secondary} text-white font-headline text-sm`}>
                    {userInfo.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className="flex-1 flex items-center space-x-2">
                <Input
                  ref={inputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent border-0 text-pearl-white placeholder:text-muted-lavender/60 rounded-none h-10 px-3 focus:ring-0 focus:outline-none"
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  variant="ghost"
                  className={cn(
                    "text-electric-blue hover:text-electric-blue/80 font-medium text-sm",
                    "p-2 h-auto rounded-lg",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    "transition-all duration-200 active:scale-95"
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}