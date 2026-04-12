import React, { useMemo, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ArrowLeft, Send, Heart, MoreHorizontal, Loader2, AlertTriangle, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { UserResult, UserInfo } from '../App';
import { FeedPost, FeedComment } from '../utils/social-feed-types';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { CommentRow } from './CommentRow';
import { toast } from 'sonner@2.0.3';

// Updated interface for backend comments
interface BackendComment {
  id: string;
  content: string;
  text?: string;
  createdAt: string;
  created_at?: string;
  username?: string;
  user?: {
    username?: string;
  };
}

interface CommentsPageProps {
  post?: FeedPost;
  postId?: string; // Add support for postId
  onBack: () => void;
  onAddComment: (postId: string, comment: string) => void;
  onToggleLike?: (postId: string) => void;
  onToggleBookmark?: (postId: string) => void;
  onUserClick?: (username: string) => void;
  onPostAction?: (action: 'edit' | 'delete', postId: string) => void; // New callback for post actions
  newComment: string;
  setNewComment: (comment: string) => void;
  userResult?: UserResult | null; // Made optional since we no longer require quiz results
  userInfo: UserInfo | null;
  theme?: { colors?: { primary?: string; text?: string; muted?: string; bg?: string; card?: string } };
}

const defaultTheme = {
  colors: {
    primary: '#C084FC', // neon-lilac
    text: '#FAFAFF', // pearl-white
    muted: '#DDD6FE', // muted-lavender
    bg: '#0D0D0D', // midnight-black
    card: '#15151b',
  }
};

export function CommentsPage({ 
  post, 
  postId,
  onBack, 
  onAddComment, 
  onToggleLike,
  onToggleBookmark,
  onUserClick,
  onPostAction,
  newComment, 
  setNewComment, 
  userResult, 
  userInfo,
  theme: themeProps
}: CommentsPageProps) {
  const theme = useMemo(
    () => ({ ...defaultTheme, ...themeProps, colors: { ...defaultTheme.colors, ...(themeProps?.colors ?? {}) } }),
    [themeProps]
  );

  // State for post details and comments
  const [currentPost, setCurrentPost] = useState<FeedPost | null>(post || null);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Handle post ID extraction safely
  const rawPostId = postId?.replace(/^post[:_]/, '') || post?.id;
  
  // UUID validation with proper error handling
  const postIdToUse = rawPostId?.trim();
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // Enhanced validation with better error messaging
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!postIdToUse || !uuidRe.test(postIdToUse)) {
      setError('Invalid post ID');
      return;
    }
    
    // Clear any previous errors if validation passes
    setError(null);
  }, [postIdToUse]);
  
  // If validation fails, show error state
  if (!postIdToUse || !uuidRe.test(postIdToUse)) {
    return (
      <div className="min-h-screen bg-midnight-black pb-safe">
        <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20 pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={onBack}
              className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="font-headline font-medium text-pearl-white">Comments</h1>
            
            <div className="w-10 h-10" /> {/* Spacer */}
          </div>
        </div>
        
        <ErrorState 
          title="Invalid post ID" 
          description="The post ID format is invalid. Please check the URL and try again."
          onRetry={onBack}
        />
      </div>
    );
  }

  // Format timestamp for display
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
      console.error('Failed to format date:', timestamp, error);
      return 'Unknown time';
    }
  };

  // Fetch post details from backend API
  const fetchPostDetails = async () => {
    if (!postIdToUse || currentPost) return;

    setIsLoadingPost(true);
    setPostError(null);

    try {
      console.log('Fetching post details for:', postIdToUse);
      
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postIdToUse}`);
      
      console.log('Post details API response:', response);
      
      if (response.post) {
        const backendPost = response.post;
        const feedPost: FeedPost = {
          id: backendPost.id || postIdToUse,
          username: backendPost.username || backendPost.author?.username || 'Unknown User',
          nickname: backendPost.nickname || backendPost.username || backendPost.author?.username || 'Tribe Member',
          coreRealm: 'mirrorcore', // Default realm
          timestamp: formatTimestamp(backendPost.createdAt || backendPost.created_at || new Date().toISOString()),
          caption: backendPost.content || backendPost.caption || 'Loading post details...',
          content: backendPost.content || backendPost.textBody || backendPost.caption || 'Loading post details...',
          imageUrl: backendPost.contentUrl || backendPost.media_url || null,
          mediaThumbnailUrl: backendPost.media_thumb_url || null,
          liked: backendPost.isLiked || backendPost.liked || false,
          bookmarked: backendPost.isBookmarked || backendPost.bookmarked || false,
          likes: backendPost.likes || backendPost.like_count || 0,
          comments: [], // Start with empty comments - will be loaded separately
          xpEarned: backendPost.xpEarned || 0,
          type: backendPost.mediaType || backendPost.type || 'thought',
          visibility: backendPost.visibility || 'public',
          tribeId: backendPost.tribe_id || null,
          tribeName: backendPost.tribe_name || null
        };

        setCurrentPost(feedPost);
        console.log('Post details loaded successfully:', feedPost);

        // Now fetch comments separately
        try {
          console.log('Fetching comments for post:', postIdToUse);
          const commentsResponse = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postIdToUse}/comments`);
          console.log('Comments API response:', commentsResponse);
          
          if (commentsResponse.comments && Array.isArray(commentsResponse.comments)) {
            const transformedComments = commentsResponse.comments.map((comment: any) => ({
              id: comment.id || Date.now().toString(),
              username: comment.username || 'Unknown',
              text: comment.text || comment.content || '',
              timestamp: formatTimestamp(comment.createdAt || comment.created_at || new Date().toISOString()),
              coreRealm: 'mirrorcore'
            }));

            setCurrentPost(prev => prev ? { ...prev, comments: transformedComments } : null);
            console.log('Comments loaded successfully:', transformedComments);
          }
        } catch (commentsError) {
          console.log('Failed to load comments (this is normal if none exist):', commentsError);
        }

        // Post details loaded, comments will be loaded above
      } else {
        setPostError('Post not found');
      }
    } catch (error) {
      console.error('Failed to fetch post details:', error);
      setPostError('Failed to load post details');
    } finally {
      setIsLoadingPost(false);
    }
  };

  // Load post details when component mounts or postId changes
  useEffect(() => {
    if (!currentPost && postIdToUse && !error) {
      fetchPostDetails();
    }
  }, [postIdToUse, error, currentPost]);

  const getRealmColors = (realm: CoreRealm) => {
    const colors = {
      mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
      embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
      shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    return colors[realm] || colors.mirrorcore;
  };

  // Safe realm color getter with fallback
  const getSafeRealmColors = (realm?: CoreRealm) => {
    const colors = {
      mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
      embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
      shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    // Default to 'mirrorcore' if realm is undefined
    return colors[realm || 'mirrorcore'];
  };

  // Enhanced comment submission using backend API
  const onSubmit = async () => {
    if (!postIdToUse || !newComment.trim() || !userInfo) return;

    setIsSubmittingComment(true);

    try {
      console.log('Adding comment to post:', postIdToUse, 'comment:', newComment);
      
      // Optimistically update UI
      const newCommentObj: FeedComment = {
        id: Date.now().toString(),
        username: userInfo.username,
        text: newComment.trim(),
        timestamp: 'now',
        coreRealm: 'mirrorcore'
      };

      setCurrentPost(prev => prev ? {
        ...prev,
        comments: [...prev.comments, newCommentObj]
      } : null);
      
      setNewComment('');

      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postIdToUse}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: newComment.trim()
        })
      });

      console.log('Comment API response:', response);

      if (response.comment) {
        // Update with server response
        setCurrentPost(prev => prev ? {
          ...prev,
          comments: prev.comments.map(c => 
            c.id === newCommentObj.id ? {
              id: response.comment.id,
              username: response.comment.username || userInfo.username,
              text: response.comment.content || response.comment.text || newComment.trim(),
              timestamp: formatTimestamp(response.comment.createdAt || response.comment.created_at || new Date().toISOString()),
              coreRealm: 'mirrorcore'
            } : c
          )
        } : null);
        
        toast.success('Comment posted! ✨');
      }
    } catch (error) {
      console.error('Comment failed:', error);
      
      // Remove optimistic comment on error
      setCurrentPost(prev => prev ? {
        ...prev,
        comments: prev.comments.filter(c => c.timestamp !== 'now')
      } : null);
      
      toast.error('Could not post comment. Try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const retryLoadPost = () => {
    setPostError(null);
    setCurrentPost(null);
    fetchPostDetails();
  };

  // Check if current user is the post author to show edit/delete options
  const isOwnPost = currentPost && userInfo && currentPost.username === userInfo.username;

  // Use currentPost or create safe fallback
  const safePost = currentPost || {
    id: postIdToUse || '',
    username: 'Unknown User',
    nickname: 'Loading...',
    coreRealm: 'mirrorcore',
    timestamp: 'Loading...',
    caption: 'Loading post details...',
    content: 'Loading post details...',
    imageUrl: null,
    mediaThumbnailUrl: null,
    liked: false,
    bookmarked: false,
    likes: 0,
    comments: [],
    xpEarned: 0,
    type: 'thought',
    visibility: 'public' as const,
    tribeId: null,
    tribeName: null
  };

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
          
          <h1 className="font-headline font-medium text-pearl-white">Comments</h1>
          
          <div className="w-10 h-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Post Preview */}
        <Card className="mx-4 mt-4 bg-midnight-black/50 border-muted-lavender/30">
          <CardContent className="p-4">
            {postError ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto mb-3 bg-glitch-red/10 border border-glitch-red/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-glitch-red/60" />
                </div>
                <h3 className="font-headline text-pearl-white mb-1">Failed to load post</h3>
                <p className="text-muted-lavender font-body text-sm mb-3">{postError}</p>
                <Button
                  onClick={retryLoadPost}
                  variant="outline"
                  size="sm"
                  className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : isLoadingPost ? (
              <div className="flex items-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-lavender mr-3" />
                <span className="text-muted-lavender font-body text-sm">Loading post details...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className={`bg-gradient-to-r from-${getRealmColors(safePost.coreRealm).primary} to-${getRealmColors(safePost.coreRealm).secondary} text-white font-headline text-sm`}>
                        {safePost.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-body font-medium text-pearl-white">{safePost.username}</p>
                      <p className={`text-xs text-${getRealmColors(safePost.coreRealm).primary} font-body`}>
                        {safePost.nickname}
                      </p>
                    </div>
                  </div>
                  {/* Show edit/delete options for own posts */}
                  {isOwnPost && onPostAction && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPostAction('edit', safePost.id)}
                        className="text-muted-lavender hover:text-electric-blue hover:bg-electric-blue/10 p-2"
                        title="Edit post"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this post?')) {
                            onPostAction('delete', safePost.id);
                          }
                        }}
                        className="text-muted-lavender hover:text-glitch-red hover:bg-glitch-red/10 p-2"
                        title="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-pearl-white font-body text-sm mb-3">{safePost.content || safePost.caption}</p>
                
                {/* Show image if present */}
                {safePost.imageUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img 
                      src={safePost.imageUrl} 
                      alt="Post content"
                      className="w-full h-auto object-cover max-h-64"
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-3 text-muted-lavender text-sm">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => onToggleLike?.(safePost.id)}
                      className={`flex items-center space-x-1 transition-colors ${
                        safePost.liked ? 'text-glitch-red' : 'text-muted-lavender hover:text-glitch-red'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${safePost.liked ? 'fill-current' : ''}`} />
                      <span>{safePost.likes}</span>
                    </button>
                    <span>{safePost.timestamp}</span>
                  </div>
                  <button
                    onClick={() => onToggleBookmark?.(safePost.id)}
                    className={`transition-colors ${
                      safePost.bookmarked ? 'text-electric-blue' : 'text-muted-lavender hover:text-electric-blue'
                    }`}
                    title={safePost.bookmarked ? 'Remove bookmark' : 'Bookmark post'}
                  >
                    <svg className={`w-4 h-4 ${safePost.bookmarked ? 'fill-current' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Comments List */}
        <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
          {safePost.comments.length === 0 ? (
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
            safePost.comments.map(c => (
              <CommentRow
                key={c.id || Math.random().toString()}
                avatar={undefined} // No avatar URLs available from API yet
                name={c.username}
                body={c.text}
                time={c.timestamp}
                coreRealm="mirrorcore"
              />
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="border-t border-muted-lavender/20 bg-midnight-black/80 soft-blur p-4">
          <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            {userInfo && (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-r from-neon-lilac to-electric-blue text-white font-headline text-sm">
                  {userInfo.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 flex items-center space-x-3">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-muted-lavender/10 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/50 rounded-xl"
              />
              <Button
                type="submit"
                disabled={!newComment.trim() || isSubmittingComment}
                className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white rounded-xl p-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Bottom spacing for mobile navigation */}
        <div className="h-20 md:h-0" />
      </div>
    </div>
  );
}