import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { 
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
  Lightbulb,
  Sparkles,
  UserPlus
} from 'lucide-react';
import { FeedPost } from '../utils/social-feed-types';
import { getRealmColors } from '../utils/social-feed-helpers';
import { formatPostTimestamp } from '../utils/timestamp-helpers';
import { canViewContent } from '../utils/visibility-helpers';
import { canUserDeletePost, deletePost } from '../utils/post-deletion-helpers';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { SafeUsername, SafePostContent, SafeComment, SafeInlineText } from './SafeText';
import { safeFormatCount } from '../utils/safe-rendering';
import { FollowButton } from './FollowButton';
import { useUserAvatar } from '../utils/supabase/profile-avatar-helpers';
import { toast } from 'sonner@2.0.3';

interface ThoughtPostCardProps {
  post: FeedPost;
  currentUserId?: string;
  userTribeMemberships?: string[];
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onUserClick: (authorIdOrUsername: string) => void;
  onPostAction: (action: string, postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export function ThoughtPostCard({ 
  post, 
  currentUserId,
  userTribeMemberships,
  onToggleLike, 
  onToggleBookmark, 
  onOpenComments, 
  onUserClick, 
  onPostAction,
  onPostDeleted,
  onFollowChange
}: ThoughtPostCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Database-first avatar fetching
  const authorId = post.authorId || post.userId || post.user_id;
  const avatarResult = useUserAvatar(authorId || null);

  const realmColors = getRealmColors(post.coreRealm);

  // Debug follow button visibility
  React.useEffect(() => {
    const shouldShowFollow = currentUserId && (post.userId !== currentUserId && post.user_id !== currentUserId);
    console.log('🔍 ThoughtPostCard Follow Button Debug:', {
      postId: post.id,
      currentUserId,
      postUserId: post.userId,
      postUser_id: post.user_id,
      shouldShowFollow,
      isFollowing: post.isFollowing,
      hasOnFollowChange: !!onFollowChange
    });
  }, [currentUserId, post.userId, post.user_id, post.isFollowing, onFollowChange]);

  // Check content visibility
  const accessInfo = canViewContent(
    {
      ...post,
      visibility: post.visibility || 'public',
      tribe_id: post.tribeId || null,
      tribe: post.tribeId ? {
        id: post.tribeId,
        name: post.tribeName || 'Unknown Tribe',
        is_private: false
      } : undefined
    } as any,
    currentUserId,
    userTribeMemberships
  );

  // Format timestamp
  const timestampFormat = formatPostTimestamp(
    post.username || 'unknown_user',
    post.timestamp,
    post.location
  );

  // Handle delete post
  const handleDeletePost = async () => {
    if (!post || !currentUserId || isDeleting) return;

    setIsDeleting(true);
    
    try {
      const result = await deletePost(post.id);
      
      if (result.success) {
        toast.success('Thought deleted successfully');
        setShowDeleteDialog(false);
        
        if (onPostDeleted) {
          onPostDeleted(post.id);
        }
      } else {
        toast.error(result.error || 'Failed to delete thought');
      }
    } catch (error) {
      console.error('Error deleting thought:', error);
      toast.error('An error occurred while deleting the thought');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="bg-transparent border-0 mb-6" data-post-id={post.id}>
      <CardHeader className="pb-3">
        {/* Post Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              // Try to use authorId first, fallback to username for the bridge function
              const userIdentifier = post.authorId || post.userId || post.user_id || post.username || 'unknown_user';
              onUserClick(userIdentifier);
            }}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-300 flex-1 min-w-0"
          >
            <Avatar className="w-10 h-10">
              {/* Database-first avatar - only use profileAvatarSrc from Supabase profiles table */}
              {avatarResult.src ? (
                <AvatarImage 
                  src={avatarResult.src} 
                  alt={`${avatarResult.username}'s profile picture`}
                  onLoad={() => console.log('🖼️ Thought post avatar loaded from database for user:', authorId?.substring(0, 8) + '...')}
                  onError={() => console.log('🖼️ Thought post avatar failed to load for user:', authorId?.substring(0, 8) + '...')}
                />
              ) : null}
              <AvatarFallback className={`bg-gradient-to-r from-${realmColors.primary} to-${realmColors.secondary} text-white font-headline`}>
                {(avatarResult.username || post.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <p className="font-body text-pearl-white text-sm truncate">
                  {timestampFormat.primaryLine}
                </p>
                <Lightbulb className="w-4 h-4 text-electric-blue flex-shrink-0" />
              </div>
              {timestampFormat.secondaryLine && (
                <div className="flex items-center text-xs text-muted-lavender font-body mt-1">
                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{timestampFormat.secondaryLine}</span>
                </div>
              )}
            </div>
          </button>
          
          {/* Follow Button - Only show if not current user's post */}
          {currentUserId && (post.userId !== currentUserId && post.user_id !== currentUserId) && (
            <div className="mr-2 flex-shrink-0">
              <FollowButton
                targetUserId={post.userId || post.user_id || ''}
                size="sm"
                variant="outline"
                showText={true}
                className="touch-target min-w-fit"
                onFollowChange={(targetUserId, isFollowing, followerCountDelta) => {
                  if (onFollowChange) {
                    onFollowChange(targetUserId, isFollowing);
                  }
                }}
              />
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 bg-transparent text-muted-lavender hover:text-pearl-white border-0 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-midnight-black border-muted-lavender/30 soft-blur">
              <DropdownMenuItem className="text-pearl-white hover:bg-muted-lavender/10">
                <ExternalLink className="w-4 h-4 mr-2" />
                Share to Story
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onPostAction('copy', post.id)}
                className="text-pearl-white hover:bg-muted-lavender/10"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onPostAction('hide', post.id)}
                className="text-pearl-white hover:bg-muted-lavender/10"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Post
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-muted-lavender/20" />
              <DropdownMenuItem 
                onClick={() => onPostAction('report', post.id)}
                className="text-glitch-red hover:bg-glitch-red/10"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report Post
              </DropdownMenuItem>
              {canUserDeletePost(post, currentUserId) && (
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-glitch-red hover:bg-glitch-red/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Thought
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="px-6 pt-0">
        {/* Thought Content */}
        <div className="relative">
          {/* Decorative thought bubble background */}
          <div className="absolute -left-2 -top-2 -right-2 -bottom-2 rounded-2xl bg-gradient-to-br from-electric-blue/5 to-neon-lilac/5 border border-electric-blue/10"></div>
          
          <div className="relative bg-gradient-to-br from-midnight-black/60 to-midnight-black/40 backdrop-blur-sm rounded-xl p-6 mb-4">
            {/* Quote icon */}
            <div className="absolute -top-2 -left-2 w-8 h-8 bg-electric-blue rounded-full flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-midnight-black" />
            </div>
            
            {/* Thought text */}
            <div className="mt-2">
              {accessInfo.isBlurred && accessInfo.joinPrompt ? (
                <SafeInlineText 
                  text={post.content || post.caption}
                  maxLength={50}
                  className="text-muted-lavender/60 font-body leading-relaxed text-lg italic"
                />
              ) : (
                <SafePostContent
                  content={post.content || post.caption}
                  showFullOnClick={true}
                  className="text-pearl-white font-body leading-relaxed text-lg"
                />
              )}
            </div>
            
            {/* Thought category badge */}
            <div className="mt-4 flex items-center">
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${realmColors.primary}/20 text-${realmColors.primary} border border-${realmColors.primary}/30`}>
                {post.coreRealm} Thought
              </span>
            </div>
          </div>
        </div>

        {/* Engagement Row */}
        {!accessInfo.isBlurred && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onToggleLike(post.id)}
                className={`p-2 bg-transparent border-0 rounded-lg ${post.liked ? 'text-glitch-red' : 'text-muted-lavender hover:text-glitch-red'} transition-all duration-300 cursor-pointer`}
              >
                <Heart className={`w-6 h-6 ${post.liked ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => onOpenComments(post)}
                data-post-id={post.id}
                className="p-2 bg-transparent border-0 rounded-lg text-muted-lavender hover:text-electric-blue transition-all duration-300 cursor-pointer"
              >
                <MessageCircle className="w-6 h-6" />
              </button>
              <button className="p-2 bg-transparent border-0 rounded-lg text-muted-lavender hover:text-electric-blue transition-all duration-300 cursor-pointer">
                <Share className="w-6 h-6" />
              </button>
            </div>
            <button
              onClick={() => onToggleBookmark(post.id)}
              className={`p-2 bg-transparent border-0 rounded-lg ${post.bookmarked ? 'text-electric-blue' : 'text-muted-lavender hover:text-electric-blue'} transition-all duration-300 cursor-pointer`}
            >
              <Bookmark className={`w-6 h-6 ${post.bookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        )}

        {/* Likes Count */}
        {!accessInfo.isBlurred && (
          <p className="font-body font-medium text-pearl-white mb-2">
            {safeFormatCount(post.likes)} {post.likes === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Comments Preview */}
        {!accessInfo.isBlurred && post.comments.length > 0 && (
          <div className="space-y-2">
            {post.comments.slice(0, 2).map((comment) => (
              <div key={comment.id} className="flex items-start space-x-2">
                <p className="text-sm text-muted-lavender font-body">
                  <button
                    onClick={() => onUserClick(comment.username)}
                    className="font-medium text-pearl-white hover:text-electric-blue transition-colors duration-300"
                  >
                    <SafeUsername username={comment.username} className="inline" />
                  </button>{' '}
                  <SafeComment content={comment.text} className="inline" />
                </p>
              </div>
            ))}
            {post.comments.length > 2 && (
              <button
                onClick={() => onOpenComments(post)}
                className="text-sm text-muted-lavender hover:text-pearl-white font-body"
              >
                View all {safeFormatCount(post.comments.length)} comments
              </button>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeletePost}
        isDeleting={isDeleting}
      />
    </Card>
  );
}