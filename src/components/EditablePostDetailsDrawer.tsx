import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader } from './ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Textarea } from './ui/textarea';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { WaveformAudioPlayer } from './WaveformAudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { useFeedRefresh } from '../utils/feed-refresh-context';
import { 
  X, 
  Heart, 
  MessageCircle, 
  Share, 
  Bookmark, 
  MapPin, 
  MoreHorizontal,
  Music,
  Play,
  Sparkles,
  ExternalLink,
  Copy,
  Flag,
  Trash2,
  Edit3,
  Save
} from 'lucide-react';
import { getRealmColors } from '../utils/social-feed-helpers';
import { formatPostTimestamp } from '../utils/timestamp-helpers';
import { canUserDeletePost, deletePost } from '../utils/post-deletion-helpers';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface EditablePostDetailsDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (postId: string) => void;
  isOwnProfile?: boolean;
  userId?: string;
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

export function EditablePostDetailsDrawer({ 
  postId, 
  isOpen, 
  onClose, 
  onPostDeleted,
  onPostUpdated,
  isOwnProfile = false,
  userId 
}: EditablePostDetailsDrawerProps) {
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

      // Skip API for now and go directly to database query due to missing route
      console.log('Using direct database query for post details');

      // Direct database query with user information
      const { data, error: queryError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profile!user_id(username, avatar_url)
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
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    }
  };

  // Handle comments navigation
  const handleCommentsClick = async () => {
    if (!post) return;

    try {
      const { openComments } = await import('../utils/navigation-helpers');
      const success = await openComments(post.id);
      
      if (success) {
        onClose(); // Close drawer when navigating to comments
      } else {
        console.error('Failed to navigate to post comments for:', post.id);
      }
    } catch (error) {
      console.error('Error navigating to post comments:', error);
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

  // Render content based on state
  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center space-x-3">
            <Skeleton className="w-12 h-12 rounded-full bg-muted-lavender/20" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-muted-lavender/20" />
              <Skeleton className="h-3 w-20 bg-muted-lavender/20" />
            </div>
          </div>

          {/* Media skeleton */}
          <Skeleton className="h-80 w-full rounded-2xl bg-muted-lavender/20" />

          {/* Content skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-muted-lavender/20" />
            <Skeleton className="h-4 w-3/4 bg-muted-lavender/20" />
            <Skeleton className="h-4 w-1/2 bg-muted-lavender/20" />
          </div>

          {/* Actions skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="w-10 h-10 rounded-lg bg-muted-lavender/20" />
              ))}
            </div>
            <Skeleton className="w-10 h-10 rounded-lg bg-muted-lavender/20" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12 space-y-4">
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
      );
    }

    if (!post) return null;

    const realmColors = getRealmColors('mirrorcore');
    const canEdit = canUserEditPost(post);
    const canDelete = canUserDeletePost(post, userId);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={post.avatar || ""} />
              <AvatarFallback className={`bg-gradient-to-r from-${realmColors.primary} to-${realmColors.secondary} text-white font-headline`}>
                {(post.username || post.nickname || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-body font-medium text-pearl-white">@{post.username || post.nickname || 'unknown'}</p>
              </div>
              <div className="flex flex-col text-xs text-muted-lavender font-body">
                <span className="text-pearl-white text-sm">
                  {formatPostTimestamp(
                    post.username || post.nickname || 'unknown',
                    post.created_at
                  ).primaryLine}
                </span>
                {post.location && (
                  <div className="flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span>{post.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 bg-transparent text-muted-lavender hover:text-pearl-white border-0 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-midnight-black border-muted-lavender/30 soft-blur">
              {canEdit && (
                <>
                  <DropdownMenuItem 
                    onClick={() => setIsEditing(true)}
                    className="text-pearl-white hover:bg-muted-lavender/10"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Post
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-muted-lavender/20" />
                </>
              )}
              <DropdownMenuItem className="text-pearl-white hover:bg-muted-lavender/10">
                <ExternalLink className="w-4 h-4 mr-2" />
                Share to Story
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handlePostAction('copy')}
                className="text-pearl-white hover:bg-muted-lavender/10"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handlePostAction('report')}
                className="text-glitch-red hover:bg-glitch-red/10"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report Post
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator className="bg-muted-lavender/20" />
                  <DropdownMenuItem 
                    onClick={handleDeletePost}
                    className="text-glitch-red hover:bg-glitch-red/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Media Content */}
        {renderMediaContent()}

        {/* Caption/Content - Editable for own posts */}
        <div>
          {isEditing && canEdit ? (
            <div className="space-y-3">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Edit your post content..."
                className="min-h-[100px] bg-midnight-black/50 border-muted-lavender/30 text-pearl-white font-body resize-none"
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-lavender">
                  {editedContent.length}/500 characters
                </span>
                <div className="flex space-x-2">
                  <Button
                    onClick={cancelEdit}
                    variant="outline"
                    size="sm"
                    className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEdit}
                    disabled={isSaving || !editedContent.trim() || editedContent === getPostContent(post)}
                    size="sm"
                    className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <p className="text-pearl-white font-body leading-relaxed">
                {getPostContent(post) || (
                  <span className="text-muted-lavender/60 italic">No caption provided</span>
                )}
              </p>
              {canEdit && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-lavender hover:text-pearl-white"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Engagement Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleLike}
              className={`p-2 bg-transparent border-0 rounded-lg ${post.liked ? 'text-glitch-red' : 'text-muted-lavender hover:text-glitch-red'} transition-all duration-300 cursor-pointer`}
            >
              <Heart className={`w-6 h-6 ${post.liked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleCommentsClick}
              className="p-2 bg-transparent border-0 rounded-lg text-muted-lavender hover:text-electric-blue transition-all duration-300 cursor-pointer"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
            <button
              onClick={() => handlePostAction('share')}
              className="p-2 bg-transparent border-0 rounded-lg text-muted-lavender hover:text-electric-blue transition-all duration-300 cursor-pointer"
            >
              <Share className="w-6 h-6" />
            </button>
          </div>
          <button
            onClick={toggleBookmark}
            className={`p-2 bg-transparent border-0 rounded-lg ${post.bookmarked ? 'text-electric-blue' : 'text-muted-lavender hover:text-electric-blue'} transition-all duration-300 cursor-pointer`}
          >
            <Bookmark className={`w-6 h-6 ${post.bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Likes Count */}
        <p className="font-body font-medium text-pearl-white">
          {post.likes || post.like_count || 0} {((post.likes || post.like_count || 0) === 1) ? 'like' : 'likes'}
        </p>
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-[40%] min-w-[400px] max-w-[600px] bg-midnight-black border-l border-muted-lavender/20 z-50 overflow-y-auto scrollbar-hide"
              role="dialog"
              aria-modal="true"
              aria-labelledby="post-details-title"
              aria-describedby="post-details-description"
            >
              {/* Close button */}
              <div className="sticky top-0 bg-midnight-black/90 backdrop-blur-md border-b border-muted-lavender/20 p-4 z-10">
                <div className="sr-only">
                  <h2 id="post-details-title">Post Details and Options</h2>
                  <p id="post-details-description">View, edit, or delete this post. Use the options menu to perform actions.</p>
                </div>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 p-0 bg-transparent hover:bg-muted-lavender/10 text-muted-lavender hover:text-pearl-white border-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6">
                {renderContent()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeletePost}
        isDeleting={isDeleting}
        itemType="post"
        itemTitle={post ? (getPostContent(post).substring(0, 50) + (getPostContent(post).length > 50 ? '...' : '')) : 'this post'}
      />
    </>
  );
}