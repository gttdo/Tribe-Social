import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner@2.0.3';
import {
  X,
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  Send,
  Loader2,
  MoreHorizontal,
  Volume2
} from 'lucide-react';
import { UserInfo } from '../App';
import { VideoPlayer } from './VideoPlayer';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatTimeAgo } from '../utils/timestamp-helpers';

interface Comment {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  createdAt: string;
  likes?: number;
  isLiked?: boolean;
  avatar?: string;
}

interface Post {
  id: string;
  username: string;
  nickname?: string;
  coreRealm?: string;
  timestamp: string;
  createdAt: string;
  caption?: string;
  content?: string;
  imageUrl?: string;
  contentUrl?: string;
  mediaThumbnailUrl?: string;
  type: string;
  liked: boolean;
  bookmarked: boolean;
  likes: number;
  comments: Comment[];
  userId?: string;
  visibility?: string;
}

interface DesktopCommentsModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  userInfo: UserInfo | null;
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
}

// Forward ref wrapper for Input
const ForwardedInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>((props, ref) => (
  <Input {...props} ref={ref} />
));
ForwardedInput.displayName = 'ForwardedInput';

export function DesktopCommentsModal({
  post,
  isOpen,
  onClose,
  userInfo,
  onToggleLike,
  onToggleBookmark
}: DesktopCommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && post?.id) {
      loadComments();
    }
  }, [isOpen, post?.id]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const loadComments = async () => {
    if (!post?.id) return;
    
    console.log('🔄 [DesktopCommentsModal] Loading comments for post:', post.id);
    setIsLoadingComments(true);
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/comments`);
      
      console.log('📝 [DesktopCommentsModal] Comments API response:', response);
      
      if (response.comments && Array.isArray(response.comments)) {
        const transformedComments = response.comments.map((comment: any) => ({
          id: comment.id || Date.now().toString(),
          username: comment.username || 'Unknown',
          content: comment.body || comment.content || '', // Prioritize 'body' field from backend
          timestamp: formatTimeAgo(comment.createdAt || comment.created_at || new Date().toISOString()),
          createdAt: comment.createdAt || comment.created_at || new Date().toISOString(),
          likes: comment.likes || 0,
          isLiked: comment.isLiked || false
        }));
        console.log('✅ [DesktopCommentsModal] Transformed comments:', transformedComments);
        setComments(transformedComments);
      } else {
        console.log('⚠️ [DesktopCommentsModal] No comments found in response or invalid format');
        setComments([]);
      }
    } catch (error) {
      console.error('❌ [DesktopCommentsModal] Failed to load comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setIsLoadingComments(false);
    }
  };



  const scrollToBottom = () => {
    if (commentsContainerRef.current) {
      const scrollElement = commentsContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userInfo || !post) return;

    setIsSubmitting(true);
    try {
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        username: userInfo.username,
        content: newComment.trim(),
        timestamp: 'now',
        createdAt: new Date().toISOString(),
        likes: 0,
        isLiked: false
      };

      setComments(prev => [...prev, optimisticComment]);
      setNewComment('');

      setTimeout(scrollToBottom, 100);

      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newComment.trim() })
      });

      if (response.comment) {
        setComments(prev => prev.map(c => 
          c.id === optimisticComment.id ? {
            ...c,
            id: response.comment.id,
            timestamp: formatTimeAgo(response.comment.createdAt || response.comment.created_at),
            createdAt: response.comment.createdAt || response.comment.created_at
          } : c
        ));
        
        toast.success('Comment posted! ✨');

        try {
          if (post.userId !== userInfo.id) {
            const { createCommentNotification } = await import('../utils/supabase/notification-helpers');
            await createCommentNotification(
              post.userId || post.username,
              userInfo.username,
              post.id,
              newComment.trim(),
              post.caption || post.content
            );
          }
        } catch (notificationError) {
          console.warn('Failed to create comment notification:', notificationError);
        }
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      setComments(prev => prev.filter(c => c.id !== `temp-${Date.now()}`));
      toast.error('Failed to post comment. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    if (post) {
      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      toast.success('Link copied to clipboard!');
    }
  };

  const getRealmColors = (realm: string = 'mirrorcore') => {
    const colors = {
      mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
      embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
      shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    return colors[realm as keyof typeof colors] || colors.mirrorcore;
  };

  const renderMedia = () => {
    if (!post) return null;

    const mediaUrl = post.imageUrl || post.contentUrl;
    const isVideo = post.type === 'video' || mediaUrl?.includes('.mp4') || mediaUrl?.includes('.webm');
    const isAudio = post.type === 'audio' || mediaUrl?.includes('.mp3') || mediaUrl?.includes('.wav');

    if (isVideo && mediaUrl) {
      return (
        <div className="w-full h-full relative">
          <VideoPlayer
            src={mediaUrl}
            thumbnail={post.mediaThumbnailUrl}
            className="absolute inset-0 w-full h-full"
          />
        </div>
      );
    }

    if (isAudio && mediaUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neon-lilac/10 to-electric-blue/10">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-neon-lilac to-electric-blue rounded-full flex items-center justify-center">
              <Volume2 className="w-12 h-12 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-headline text-pearl-white mb-2">Audio Post</h3>
              <p className="text-muted-lavender text-sm">{post.caption}</p>
            </div>
            <audio 
              controls 
              className="w-full max-w-sm mx-auto"
              style={{
                backgroundColor: 'rgba(13, 13, 13, 0.5)',
                borderRadius: '8px'
              }}
            >
              <source src={mediaUrl} />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      );
    }

    if (mediaUrl) {
      return (
        <ImageWithFallback
          src={mediaUrl}
          alt={post.caption || 'Post image'}
          className="w-full h-full object-contain"
        />
      );
    }

    // Text post
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-midnight-black via-midnight-black/95 to-muted-lavender/5 p-8">
        <div className="max-w-lg text-center">
          <p className="text-pearl-white font-body text-xl leading-relaxed">
            {post.content || post.caption}
          </p>
        </div>
      </div>
    );
  };

  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[85vh] bg-midnight-black/95 border border-muted-lavender/20 p-0 overflow-hidden rounded-lg shadow-2xl [&>button]:hidden"
        style={{
          maxWidth: 'none',
          width: '800px'
        }}
      >
        <DialogTitle className="sr-only">
          Post by {post.username} - Comments
        </DialogTitle>
        <DialogDescription className="sr-only">
          View and interact with comments on this post
        </DialogDescription>

        {/* Custom Close Button - Top Left */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 z-50 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white border-none"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Main Container - Exactly 800px wide with two 400px panels */}
        <div className="flex h-full" style={{ width: '800px' }}>
          {/* Left Side - Media Panel (Exactly 400px) */}
          <div 
            className="bg-black flex items-center justify-center overflow-hidden"
            style={{ width: '400px', minWidth: '400px', maxWidth: '400px' }}
          >
            {renderMedia()}
          </div>

          {/* Right Side - Comments Panel (Exactly 400px) */}
          <div 
            className="bg-midnight-black/95 border-l border-muted-lavender/10 flex flex-col overflow-hidden"
            style={{ width: '400px', minWidth: '400px', maxWidth: '400px' }}
          >
            {/* Header */}
            <div className="p-4 border-b border-muted-lavender/10 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback 
                    className={`bg-gradient-to-r from-${getRealmColors(post.coreRealm).primary} to-${getRealmColors(post.coreRealm).secondary} text-white text-sm font-headline`}
                  >
                    {post.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-headline text-pearl-white font-medium text-sm truncate">
                      {post.username}
                    </span>
                    <span className="text-xs text-muted-lavender/60 flex-shrink-0">
                      {formatTimeAgo(post.timestamp || post.createdAt)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-1 text-muted-lavender/60 hover:text-pearl-white flex-shrink-0"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Caption */}
              {(post.caption || post.content) && (
                <div className="mt-3">
                  <p className="text-pearl-white text-sm leading-relaxed break-words">
                    <span className="font-medium">{post.username}</span>{' '}
                    {post.caption || post.content}
                  </p>
                </div>
              )}
            </div>

            {/* Comments List */}
            <div className="flex-1 min-h-0" ref={commentsContainerRef}>
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {isLoadingComments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-neon-lilac" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-3 bg-muted-lavender/10 border border-muted-lavender/20 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-muted-lavender/40" />
                      </div>
                      <p className="text-muted-lavender/60 text-sm mb-1">
                        No comments yet
                      </p>
                      <p className="text-muted-lavender/40 text-xs">
                        Be the first to comment on this post!
                      </p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="group">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarFallback className="bg-gradient-to-r from-electric-blue to-neon-lilac text-white text-xs font-headline">
                              {comment.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-pearl-white leading-relaxed break-words">
                              <span className="font-medium">{comment.username}</span>{' '}
                              {comment.content}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-muted-lavender/60 flex-shrink-0">
                                {comment.timestamp}
                              </span>
                              <button className="text-xs text-muted-lavender/60 hover:text-muted-lavender font-medium">
                                Reply
                              </button>
                              <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Heart className="w-3 h-3 text-muted-lavender/60 hover:text-glitch-red" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Action Bar */}
            <div className="border-t border-muted-lavender/10 flex-shrink-0">
              {/* Like/Share/Save buttons */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => onToggleLike(post.id)}
                    className={`${post.liked ? 'text-glitch-red' : 'text-pearl-white'} hover:text-muted-lavender/60 transition-colors`}
                  >
                    <Heart className={`w-6 h-6 ${post.liked ? 'fill-current' : ''}`} />
                  </button>
                  
                  <button className="text-pearl-white hover:text-muted-lavender/60 transition-colors">
                    <MessageCircle className="w-6 h-6" />
                  </button>
                  
                  <button
                    onClick={handleShare}
                    className="text-pearl-white hover:text-muted-lavender/60 transition-colors"
                  >
                    <Share className="w-6 h-6" />
                  </button>
                </div>
                
                <button
                  onClick={() => onToggleBookmark(post.id)}
                  className={`${post.bookmarked ? 'text-soft-blush' : 'text-pearl-white'} hover:text-muted-lavender/60 transition-colors`}
                >
                  <Bookmark className={`w-6 h-6 ${post.bookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Likes count */}
              <div className="px-4 pb-2">
                <p className="text-sm font-medium text-pearl-white">
                  {post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}
                </p>
              </div>

              {/* Comment Input */}
              <div className="p-4 pt-2">
                <form onSubmit={handleSubmitComment} className="flex items-center space-x-3">
                  <div className="flex-1 flex items-center min-w-0">
                    <ForwardedInput
                      ref={inputRef}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-transparent border-none text-pearl-white placeholder:text-muted-lavender/60 text-sm px-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-w-0"
                      disabled={isSubmitting}
                    />
                    <Button
                      type="submit"
                      disabled={!newComment.trim() || isSubmitting}
                      variant="ghost"
                      size="sm"
                      className="text-electric-blue hover:text-electric-blue/80 disabled:opacity-50 font-medium text-sm p-0 h-auto flex-shrink-0"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Post'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}