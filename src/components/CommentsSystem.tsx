import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ArrowLeft, Send, MessageCircle, X, ChevronDown, Loader2, Heart } from 'lucide-react';
import { CommentRow } from './CommentRow';
import { QuickReactions } from './QuickReactions';
import { EmptyState } from './EmptyState';
import { toast } from 'sonner@2.0.3';
import { cn } from './ui/utils';
import { UserResult, UserInfo, CoreRealm } from '../App';

interface Comment {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  likes?: number;
  isLiked?: boolean;
}

interface Post {
  id: string;
  username: string;
  nickname: string;
  coreRealm: CoreRealm;
  timestamp: string;
  caption: string;
  imageUrl?: string;
  mediaThumbnailUrl?: string;
  type: string;
  liked: boolean;
  bookmarked: boolean;
  likes: number;
  comments: Comment[];
}

interface CommentsSystemProps {
  post: Post;
  userResult: UserResult | null;
  userInfo: UserInfo | null;
  // Desktop mode - renders as sidebar
  mode?: 'desktop' | 'mobile';
  // For desktop mode
  onClose?: () => void;
  // For mobile mode
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommentsSystem({ 
  post, 
  userResult, 
  userInfo,
  mode = 'mobile',
  onClose,
  trigger,
  isOpen,
  onOpenChange
}: CommentsSystemProps) {
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load comments when component mounts
  useEffect(() => {
    if (post.id) {
      loadComments();
    }
  }, [post.id]);

  // Auto-focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  const loadComments = async () => {
    if (!post.id) return;
    
    console.log('🔄 Loading comments for post:', post.id);
    setIsLoading(true);
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/comments`);
      
      console.log('📝 Comments API response:', response);
      
      if (response.comments && Array.isArray(response.comments)) {
        const transformedComments = response.comments.map((comment: any) => ({
          id: comment.id || Date.now().toString(),
          username: comment.username || 'Unknown',
          content: comment.body || comment.content || '', // Prioritize 'body' field from backend
          timestamp: formatTimestamp(comment.createdAt || comment.created_at || new Date().toISOString()),
          likes: comment.likes || 0,
          isLiked: comment.isLiked || false
        }));
        console.log('✅ Transformed comments:', transformedComments);
        setComments(transformedComments);
      } else {
        console.log('⚠️ No comments found in response or invalid format');
        setComments([]);
      }
    } catch (error) {
      console.error('❌ Failed to load comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
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
    } catch (error) {
      return 'Unknown time';
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedComment = newComment.trim();
    if (!trimmedComment || !userInfo || !userResult) return;

    setIsSubmitting(true);
    try {
      // Add optimistic comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        username: userInfo.username,
        content: trimmedComment, // Use trimmed content
        timestamp: 'now',
        likes: 0,
        isLiked: false
      };

      setComments(prev => [...prev, optimisticComment]);
      setNewComment('');
      setReplyingTo(null);

      // Scroll to bottom
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }

      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmedComment }) // Send trimmed comment
      });

      if (response.comment) {
        // Replace optimistic comment with real one
        setComments(prev => prev.map(c => 
          c.id === optimisticComment.id ? {
            id: response.comment.id,
            username: response.comment.username || userInfo.username,
            content: response.comment.body || response.comment.content || trimmedComment, // Prioritize 'body' field
            timestamp: formatTimestamp(response.comment.createdAt || response.comment.created_at || new Date().toISOString()),
            likes: 0,
            isLiked: false
          } : c
        ));
        toast.success('Comment posted! ✨');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      toast.error('Failed to post comment. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickReaction = async (emoji: string) => {
    const commentText = emoji;
    setNewComment(commentText);
    
    // Auto-submit emoji reactions
    if (userInfo && userResult) {
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
            likes: comment.isLiked ? (comment.likes || 0) - 1 : (comment.likes || 0) + 1
          }
        : comment
    ));

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
              likes: comment.isLiked ? (comment.likes || 0) + 1 : (comment.likes || 0) - 1
            }
          : comment
      ));
      toast.error('Failed to like comment');
    }
  };

  const handleReplyToComment = (commentId: string, commentAuthor: string) => {
    setReplyingTo(commentId);
    setNewComment(`@${commentAuthor} `);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getRealmColors = (realm: CoreRealm) => {
    const colors = {
      mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
      embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
      shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    return colors[realm] || colors.mirrorcore;
  };

  const CommentsContent = () => (
    <>
      {/* Comments List */}
      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-1 px-4"
      >
        <div className="space-y-2 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-lavender" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted-lavender/10 border border-muted-lavender/20 rounded-2xl flex items-center justify-center">
                <Heart className="w-8 h-8 text-muted-lavender/40" />
              </div>
              <h3 className="font-headline text-pearl-white mb-2">No comments yet</h3>
              <p className="text-muted-lavender font-body text-sm">
                Be the first to reply
              </p>
            </div>
          ) : (
            comments.map(comment => (
              <CommentRow
                key={comment.id}
                id={comment.id}
                name={comment.username}
                body={comment.content}
                time={comment.timestamp}
                likes={comment.likes}
                isLiked={comment.isLiked}
                onLike={handleLikeComment}
                onReply={handleReplyToComment}
                coreRealm="mirrorcore"
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Quick Reactions */}
      <QuickReactions 
        onReaction={handleQuickReaction}
        className="border-t border-muted-lavender/20"
      />

      {/* Comment Input */}
      <div className="border-t border-muted-lavender/20 bg-midnight-black/80 p-4">
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 p-2 bg-muted-lavender/10 rounded-lg">
            <span className="text-electric-blue text-sm font-body">
              Replying to comment...
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReplyingTo(null);
                setNewComment('');
              }}
              className="h-6 w-6 p-1 text-muted-lavender hover:text-pearl-white"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
        
        <form onSubmit={handleSubmitComment} className="flex items-center space-x-3">
          {userResult && userInfo && (
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className={`bg-gradient-to-r from-${getRealmColors(userResult.coreRealm).primary} to-${getRealmColors(userResult.coreRealm).secondary} text-white font-headline text-sm`}>
                {userInfo.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className="flex-1 flex items-center space-x-3">
            <Input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-muted-lavender/10 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/50 rounded-xl"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white rounded-xl p-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );

  if (mode === 'desktop') {
    return (
      <div className="h-full flex flex-col bg-midnight-black/80 border-l border-muted-lavender/20">
        {/* Desktop Header */}
        <div className="flex items-center justify-between p-4 border-b border-muted-lavender/20">
          <h3 className="font-headline text-pearl-white">Comments</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-lavender hover:text-pearl-white h-8 w-8 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <CommentsContent />
      </div>
    );
  }

  // Mobile mode with Sheet
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-1 text-muted-lavender hover:text-pearl-white"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{comments.length}</span>
          </Button>
        )}
      </SheetTrigger>
      
      <SheetContent 
        side="bottom" 
        className="h-[80vh] bg-midnight-black border-t border-muted-lavender/20 rounded-t-2xl"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-1.5 bg-muted-lavender/30 rounded-full" />
          </div>
          <SheetTitle className="font-headline text-pearl-white text-center">
            Comments
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-[calc(100%-80px)]">
          <CommentsContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}