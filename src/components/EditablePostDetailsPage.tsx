import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { WaveformAudioPlayer } from './WaveformAudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { useFeedRefresh } from '../utils/feed-refresh-context';
import { 
  ArrowLeft, 
  Loader2, 
  AlertTriangle, 
  RefreshCw,
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  MoreHorizontal,
  MapPin,
  Play,
  Music,
  Sparkles,
  ExternalLink,
  Copy,
  Flag,
  Trash2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { canUserDeletePost, deletePost } from '../utils/post-deletion-helpers';
import { getRealmColors } from '../utils/social-feed-helpers';
import { formatPostTimestamp } from '../utils/timestamp-helpers';
import { UserResult, UserInfo, CoreRealm } from '../App';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface EditablePostDetailsPageProps {
  postId: string;
  userResult?: UserResult | null;
  userInfo?: UserInfo | null;
  onBack: () => void;
  isOwnProfile?: boolean;
  userId?: string;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (postId: string) => void;
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

export function EditablePostDetailsPage({
  postId,
  userResult,
  userInfo,
  onBack,
  isOwnProfile = false,
  userId,
  onPostDeleted,
  onPostUpdated
}: EditablePostDetailsPageProps) {
  const [post, setPost] = useState<PostDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  // Get the content to display/edit
  const getPostContent = (post: PostDetails) => {
    return post.text_body || post.content || post.caption || '';
  };

  // Check if user can edit this post
  const canUserEditPost = (post: PostDetails) => {
    return isOwnProfile && userId && post.user_id === userId;
  };

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

  // Fetch post details
  const fetchPostDetails = async () => {
    setIsLoading(true);
    setError(null);
    setImageLoadError(false);

    try {
      console.log('Fetching post details for:', postId);
      
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}`);
      
      console.log('Post details API response:', response);
      
      if (response.post) {
        const backendPost = response.post;
        const postData = {
          id: backendPost.id || postId,
          type: (backendPost.type || backendPost.post_type || 'thought') as 'thought' | 'image' | 'video' | 'audio',
          content: backendPost.content,
          caption: backendPost.caption,
          text_body: backendPost.text_body,
          thumbnail_url: backendPost.thumbnail_url,
          media_urls: backendPost.media_urls,
          media_url: backendPost.media_url,
          contentUrl: backendPost.contentUrl || backendPost.media_url,
          visibility: backendPost.visibility || 'public' as 'public' | 'tribe' | 'private',
          tribe_id: backendPost.tribe_id,
          tribeName: backendPost.tribeName,
          created_at: backendPost.createdAt || backendPost.created_at || new Date().toISOString(),
          user_id: backendPost.user_id || backendPost.userId,
          username: backendPost.username || backendPost.author?.username || 'Unknown User',
          nickname: backendPost.nickname || backendPost.username || backendPost.author?.username || 'Tribe Member',
          likes: backendPost.likes || backendPost.like_count || 0,
          like_count: backendPost.like_count || backendPost.likes || 0,
          comments: backendPost.comments?.length || backendPost.comment_count || 0,
          comment_count: backendPost.comment_count || backendPost.comments?.length || 0,
          liked: backendPost.isLiked || backendPost.liked || false,
          bookmarked: backendPost.isBookmarked || backendPost.bookmarked || false,
          location: backendPost.location
        };

        setPost(postData);
        setEditedContent(getPostContent(postData));
      } else {
        setError('Post not found');
      }
    } catch (error) {
      console.error('Failed to fetch post details:', error);
      setError('Failed to load post details');
    } finally {
      setIsLoading(false);
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
        onBack(); // Go back to profile
        
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
            <div className="w-full flex items-center justify-center bg-midnight-black rounded-xl overflow-hidden">
              <ImageWithFallback 
                src={post.contentUrl}
                alt={`Post by ${post.username}`}
                className="max-w-full max-h-[60vh] object-contain rounded-xl"
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
            <div className="w-full aspect-[9/16] max-h-[60vh] bg-midnight-black rounded-xl overflow-hidden">
              <VideoPlayer
                src={post.contentUrl}
                thumbnail={post.thumbnail_url}
                className="w-full h-full object-contain"
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

  useEffect(() => {
    if (postId) {
      fetchPostDetails();
    }
  }, [postId]);

  // Reset edit state when post changes
  useEffect(() => {
    setIsEditing(false);
    if (post) {
      setEditedContent(getPostContent(post));
    }
  }, [post?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-midnight-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-neon-lilac mx-auto mb-4" />
          <p className="text-muted-lavender">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-midnight-black">
        <div className="sticky top-0 z-50 bg-midnight-black/80 backdrop-blur-md border-b border-muted-lavender/20 pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-muted-lavender hover:text-pearl-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <h1 className="font-headline text-pearl-white">Post Details</h1>
            <div className="w-20" />
          </div>
        </div>
        
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-glitch-red/20 to-soft-blush/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-glitch-red" />
          </div>
          <div className="space-y-2">
            <h3 className="font-headline text-pearl-white">{error || 'Post not found'}</h3>
            <p className="text-muted-lavender font-body text-sm">The post you're looking for doesn't exist or couldn't be loaded.</p>
          </div>
          <Button
            onClick={fetchPostDetails}
            className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const realmColors = getRealmColors('mirrorcore');
  const canEdit = canUserEditPost(post);
  const canDelete = canUserDeletePost(post, userId);

  return (
    <>
      <div className="min-h-screen bg-midnight-black pb-safe mobile-safe">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-midnight-black/90 soft-blur border-b border-muted-lavender/20 pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              onClick={isEditing ? cancelEdit : onBack}
              variant="ghost"
              className="text-muted-lavender hover:text-pearl-white"
            >
              {isEditing ? (
                <X className="w-5 h-5 mr-2" />
              ) : (
                <ArrowLeft className="w-5 h-5 mr-2" />
              )}
              {isEditing ? 'Cancel' : 'Back'}
            </Button>
            
            <h1 className="font-headline text-pearl-white">
              {isEditing ? 'Edit Post' : 'Post Details'}
            </h1>
            
            {isEditing ? (
              <Button
                onClick={saveEdit}
                disabled={isSaving || !editedContent.trim() || editedContent === getPostContent(post)}
                className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body text-sm px-4 py-2"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            ) : canEdit && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="ghost"
                className="text-muted-lavender hover:text-pearl-white"
              >
                <Edit3 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Post Author Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-neon-lilac to-electric-blue flex items-center justify-center">
                <span className="text-white font-headline text-lg">
                  {(post.username || post.nickname || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
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

            {!isEditing && (
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
            )}
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
                  className="min-h-[120px] bg-midnight-black/50 border-muted-lavender/30 text-pearl-white font-body resize-none"
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-lavender">
                    {editedContent.length}/500 characters
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-pearl-white font-body leading-relaxed">
                  {getPostContent(post) || (
                    <span className="text-muted-lavender/60 italic">No caption provided</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Engagement Actions */}
          {!isEditing && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleLike}
                  className={`p-2 bg-transparent border-0 rounded-lg ${post.liked ? 'text-glitch-red' : 'text-muted-lavender hover:text-glitch-red'} transition-all duration-300 cursor-pointer touch-target`}
                >
                  <Heart className={`w-6 h-6 ${post.liked ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => {/* TODO: Navigate to comments */}}
                  className="p-2 bg-transparent border-0 rounded-lg text-muted-lavender hover:text-electric-blue transition-all duration-300 cursor-pointer touch-target"
                >
                  <MessageCircle className="w-6 h-6" />
                </button>
                <button
                  onClick={() => handlePostAction('share')}
                  className="p-2 bg-transparent border-0 rounded-lg text-muted-lavender hover:text-electric-blue transition-all duration-300 cursor-pointer touch-target"
                >
                  <Share className="w-6 h-6" />
                </button>
              </div>
              <button
                onClick={toggleBookmark}
                className={`p-2 bg-transparent border-0 rounded-lg ${post.bookmarked ? 'text-electric-blue' : 'text-muted-lavender hover:text-electric-blue'} transition-all duration-300 cursor-pointer touch-target`}
              >
                <Bookmark className={`w-6 h-6 ${post.bookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>
          )}

          {/* Likes Count */}
          {!isEditing && (
            <p className="font-body font-medium text-pearl-white">
              {post.likes || post.like_count || 0} {((post.likes || post.like_count || 0) === 1) ? 'like' : 'likes'}
            </p>
          )}
        </div>
      </div>

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