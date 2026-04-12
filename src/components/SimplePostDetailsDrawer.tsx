import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { WaveformAudioPlayer } from './WaveformAudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { useIsMobile } from './ui/use-mobile';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Bookmark, 
  MoreHorizontal,
  Send,
  Loader2,
  Edit3,
  Trash2
} from 'lucide-react';
import { formatTimeAgo } from '../utils/timestamp-helpers';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { UserInfo } from '../App';

interface Comment {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  avatar?: string;
}

interface PostDetails {
  id: string;
  type: 'thought' | 'image' | 'video' | 'audio';
  content?: string;
  caption?: string;
  text_body?: string;
  media_url?: string;
  created_at: string;
  user_id: string;
  username: string;
  likes: number;
  comments: number;
  liked: boolean;
  bookmarked: boolean;
}

interface SimplePostDetailsDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  userInfo?: UserInfo | null;
  onPostDeleted?: (postId: string) => void;
  onEditPost?: (postId: string) => void;
}

export function SimplePostDetailsDrawer({ 
  postId, 
  isOpen, 
  onClose,
  userInfo,
  onPostDeleted,
  onEditPost
}: SimplePostDetailsDrawerProps) {
  const [post, setPost] = useState<PostDetails | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Load post details
  const loadPostDetails = async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users!inner(username, profile_image_url)
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;

      // Check user interactions
      const { data: { user } } = await supabase.auth.getUser();
      let liked = false;
      let bookmarked = false;
      
      if (user) {
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

      const postData: PostDetails = {
        id: data.id,
        type: data.post_type || 'thought',
        content: data.content,
        caption: data.caption,
        text_body: data.text_body,
        media_url: data.media_url,
        created_at: data.created_at,
        user_id: data.user_id,
        username: data.users?.username || 'Unknown User',
        likes: data.like_count || 0,
        comments: data.comment_count || 0,
        liked,
        bookmarked
      };

      setPost(postData);
    } catch (error) {
      console.error('Error loading post:', error);
      toast.error('Failed to load post details');
    } finally {
      setLoading(false);
    }
  };

  // Load comments
  const loadComments = async () => {
    if (!postId) return;
    
    setCommentsLoading(true);
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/comments`);
      
      if (response.comments && Array.isArray(response.comments)) {
        const transformedComments = response.comments.map((comment: any) => ({
          id: String(comment.id || Date.now()),
          username: String(comment.username || 'Unknown'),
          content: String(comment.body || comment.content || ''),
          timestamp: String(comment.createdAt || comment.created_at || new Date().toISOString()),
          avatar: comment.avatar
        }));
        setComments(transformedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Load content when drawer opens
  useEffect(() => {
    if (isOpen && postId) {
      loadPostDetails();
      loadComments();
    }
  }, [isOpen, postId]);

  // Handle like toggle
  const toggleLike = async () => {
    if (!post) return;

    const wasLiked = post.liked;
    const newLikeCount = wasLiked ? post.likes - 1 : post.likes + 1;
    
    // Optimistic update
    setPost(prev => prev ? { 
      ...prev, 
      liked: !wasLiked, 
      likes: newLikeCount 
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
        likes: response.likes
      } : null);

      if (response.liked) {
        toast.success('Liked! ✨');
      }
    } catch (error) {
      // Revert optimistic update
      setPost(prev => prev ? { 
        ...prev, 
        liked: wasLiked, 
        likes: wasLiked ? newLikeCount + 1 : newLikeCount - 1
      } : null);
      
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  // Handle bookmark toggle
  const toggleBookmark = async () => {
    if (!post) return;

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
    } catch (error) {
      // Revert optimistic update
      setPost(prev => prev ? { ...prev, bookmarked: wasBookmarked } : null);
      
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    }
  };

  // Handle share
  const handleShare = () => {
    if (!post) return;

    const shareUrl = `https://tribe.app/post/${post.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post on Tribe',
        text: getPostContent(post) || 'Check out this post',
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  // Submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userInfo || !post || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Add optimistic comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        username: String(userInfo.username || 'User'),
        content: String(newComment.trim()),
        timestamp: new Date().toISOString()
      };

      setComments(prev => [...prev, optimisticComment]);
      setNewComment('');

      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newComment.trim() })
      });

      if (response.comment) {
        // Replace optimistic comment with real one
        setComments(prev => prev.map(c => 
          c.id === optimisticComment.id ? {
            ...c,
            id: String(response.comment.id || Date.now()),
            timestamp: String(response.comment.createdAt || response.comment.created_at || new Date().toISOString())
          } : c
        ));
        
        toast.success('Comment posted! ✨');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => !c.id.startsWith('temp-')));
      toast.error('Failed to post comment. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current user owns the post
  const isPostOwner = () => {
    if (!post || !userInfo?.id) return false;
    return post.user_id === userInfo.id;
  };

  // Handle post deletion
  const handleDeletePost = async () => {
    if (!post || !isPostOwner() || isDeleting) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete this post? This action cannot be undone.');
    if (!confirmDelete) return;
    
    setIsDeleting(true);
    try {
      const { deletePost } = await import('../utils/post-deletion-helpers');
      const result = await deletePost(post.id);
      
      if (result.success) {
        toast.success('Post deleted successfully! 🗑️');
        onPostDeleted?.(post.id);
        onClose();
      } else {
        throw new Error(result.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete post';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle post editing
  const handleEditPost = () => {
    if (!post || !isPostOwner()) return;
    
    onEditPost?.(post.id);
    onClose();
  };

  // Get post content
  const getPostContent = (post: PostDetails) => {
    const content = post.text_body || post.content || post.caption || '';
    return String(content);
  };

  // Render media content
  const renderMediaContent = () => {
    if (!post) return null;

    const maxHeight = isMobile ? "max-h-[35vh]" : "max-h-96";

    switch (post.type) {
      case 'image':
        return post.media_url ? (
          <div className="rounded-lg overflow-hidden bg-black/20">
            <ImageWithFallback
              src={post.media_url}
              alt="Post image"
              className={`w-full h-auto object-contain ${maxHeight}`}
            />
          </div>
        ) : null;
        
      case 'video':
        return post.media_url ? (
          <div className="rounded-lg overflow-hidden bg-black/20">
            <VideoPlayer
              src={post.media_url}
              className={`w-full h-auto ${maxHeight}`}
            />
          </div>
        ) : null;
        
      case 'audio':
        return post.media_url ? (
          <div className={`rounded-lg bg-black/20 ${isMobile ? "p-3" : "p-4"}`}>
            <WaveformAudioPlayer
              src={post.media_url}
              title="Audio Post"
            />
          </div>
        ) : null;
        
      default:
        return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"}
        className={`p-0 flex flex-col ${
          isMobile 
            ? "h-[85vh] w-full rounded-t-3xl" 
            : "w-full sm:w-[500px] h-full"
        }`}
        onInteractOutside={(e) => {
          // Allow click-outside to close the drawer for better UX
          // This gives users the intuitive ability to close by clicking outside
          console.log('🖱️ Click outside post details drawer, closing...');
          onClose();
        }}
      >
        {/* Header */}
        <SheetHeader className={`flex-shrink-0 border-b border-border ${
          isMobile ? "px-4 py-3" : "px-6 py-4"
        }`}>
          {/* Mobile Handle */}
          {isMobile && (
            <div className="flex justify-center mb-2">
              <div className="w-10 h-1 bg-muted-lavender/30 rounded-full" />
            </div>
          )}
          
          <SheetTitle className={`font-semibold ${
            isMobile ? "text-base text-center" : "text-lg"
          }`}>
            Post Details
          </SheetTitle>
          {/* Hidden description for accessibility */}
          <SheetDescription className="sr-only">
            View and interact with post details including content, likes, comments, and actions
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className={`flex-1 ${isMobile ? "p-4" : "p-6"}`}>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
              <div className="flex space-x-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        ) : post ? (
          <>
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto mobile-comments-scroll">
              <div className={`space-y-4 ${isMobile ? "p-4" : "p-6"}`}>
                {/* Post Owner Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={post.avatar || ""} alt={String(post.username || 'User')} />
                      <AvatarFallback className="bg-neon-lilac/20 text-neon-lilac">
                        {String(post.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{String(post.username || 'Unknown User')}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTimeAgo(post.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Three dot menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Show edit/delete options for post owner */}
                      {isPostOwner() && (
                        <>
                          <DropdownMenuItem 
                            onClick={handleEditPost}
                            className="flex items-center gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit Post
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={handleDeletePost}
                            disabled={isDeleting}
                            className="flex items-center gap-2 text-destructive focus:text-destructive"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            {isDeleting ? 'Deleting...' : 'Delete Post'}
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {/* Common options */}
                      <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`https://tribe.app/post/${post.id}`)}>
                        Copy Link
                      </DropdownMenuItem>
                      
                      {/* Show report option only for posts not owned by user */}
                      {!isPostOwner() && (
                        <DropdownMenuItem>
                          Report Post
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Post Content */}
                {getPostContent(post) && (
                  <div className="prose prose-invert max-w-none">
                    <p className="text-foreground leading-relaxed">
                      {getPostContent(post)}
                    </p>
                  </div>
                )}

                {/* Media Content */}
                <div className={isMobile ? "max-h-[40vh] overflow-hidden" : ""}>
                  {renderMediaContent()}
                </div>

                {/* Action Buttons */}
                <div className={`flex items-center justify-between border-t border-border ${
                  isMobile ? "pt-3" : "pt-4"
                }`}>
                  <div className={`flex items-center ${isMobile ? "space-x-2" : "space-x-4"}`}>
                    <Button
                      variant="ghost"
                      size={isMobile ? "sm" : "sm"}
                      onClick={toggleLike}
                      className={`flex items-center space-x-2 ${
                        post.liked ? 'text-red-500' : 'text-muted-foreground'
                      } ${isMobile ? "touch-target px-2" : ""}`}
                    >
                      <Heart className={`w-4 h-4 ${post.liked ? 'fill-current' : ''}`} />
                      <span className={isMobile ? "text-xs" : "text-sm"}>{String(post.likes || 0)}</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size={isMobile ? "sm" : "sm"}
                      className={`flex items-center space-x-2 text-muted-foreground ${
                        isMobile ? "touch-target px-2" : ""
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className={isMobile ? "text-xs" : "text-sm"}>{String(comments.length || 0)}</span>
                    </Button>
                  </div>

                  <div className={`flex items-center ${isMobile ? "space-x-1" : "space-x-2"}`}>
                    <Button
                      variant="ghost"
                      size={isMobile ? "sm" : "sm"}
                      onClick={toggleBookmark}
                      className={`${
                        post.bookmarked ? 'text-neon-lilac' : 'text-muted-foreground'
                      } ${isMobile ? "touch-target px-2" : ""}`}
                    >
                      <Bookmark className={`w-4 h-4 ${post.bookmarked ? 'fill-current' : ''}`} />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size={isMobile ? "sm" : "sm"}
                      onClick={handleShare}
                      className={`text-muted-foreground ${isMobile ? "touch-target px-2" : ""}`}
                    >
                      <Share className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="font-semibold">Comments</h4>
                  
                  {commentsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex space-x-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : comments.length > 0 ? (
                    <div className={`space-y-4 ${isMobile ? "space-y-3" : ""}`}>
                      {comments.map((comment) => (
                        <div 
                          key={String(comment.id)} 
                          className={`flex space-x-3 ${isMobile ? "comment-row-mobile" : ""}`}
                        >
                          <Avatar className={`${isMobile ? "w-7 h-7" : "w-8 h-8"} flex-shrink-0`}>
                            <AvatarImage src={comment.avatar} alt={String(comment.username || 'User')} />
                            <AvatarFallback className="bg-electric-blue/20 text-electric-blue text-xs">
                              {String(comment.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`font-semibold ${isMobile ? "text-xs" : "text-sm"}`}>
                                {String(comment.username || 'Unknown')}
                              </span>
                              <span className={`text-muted-foreground ${isMobile ? "text-xs" : "text-xs"}`}>
                                {formatTimeAgo(comment.timestamp)}
                              </span>
                            </div>
                            <p className={`text-foreground mt-1 ${isMobile ? "text-xs leading-relaxed" : "text-sm"}`}>
                              {String(comment.content || '')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No comments yet. Be the first to comment!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Comment Input - Fixed at bottom */}
            <div className={`flex-shrink-0 border-t border-border bg-card/50 ${
              isMobile ? "p-4 pb-safe" : "p-6"
            }`}>
              <form onSubmit={handleSubmitComment} className="flex space-x-3">
                <div className="flex-1">
                  <Input
                    ref={inputRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className={`bg-transparent border-border ${
                      isMobile ? "mobile-comments-input" : ""
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!newComment.trim() || isSubmitting}
                  className={`${isMobile ? "px-4 touch-target" : "px-3"}`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center ${
            isMobile ? "p-4" : "p-6"
          }`}>
            <p className="text-muted-foreground">Failed to load post details</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}