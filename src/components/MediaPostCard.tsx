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
  Play,
  Video,
  Camera,
  Sparkles,
  UserPlus
} from 'lucide-react';
import { FeedPost } from '../utils/social-feed-types';
import { getRealmColors } from '../utils/social-feed-helpers';
import { formatPostTimestamp } from '../utils/timestamp-helpers';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { debugMediaUrl, validatePostMediaUrl } from '../utils/media-url-helpers';
import { ImageBlurOverlay, VideoBlurOverlay } from './BlurOverlay';
import { canViewContent } from '../utils/visibility-helpers';
import { canUserDeletePost, deletePost } from '../utils/post-deletion-helpers';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { VideoPlayer } from './VideoPlayer';
import { VideoPlaceholder } from './VideoPlaceholder';
import { SafeUsername, SafePostContent, SafeComment, SafeInlineText } from './SafeText';
import { safeFormatCount } from '../utils/safe-rendering';
import { useVideoErrorHandler } from '../utils/video-error-suppression';
import { FollowButton } from './FollowButton';
import { useUserAvatar } from '../utils/supabase/profile-avatar-helpers';
import { toast } from 'sonner@2.0.3';

interface MediaPostCardProps {
  post: FeedPost;
  currentUserId?: string;
  userTribeMemberships?: string[];
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onUserClick: (authorIdOrUsername: string) => void;
  onPostAction: (action: string, postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  onJoinTribe?: (tribeId: string) => void;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export function MediaPostCard({ 
  post, 
  currentUserId,
  userTribeMemberships,
  onToggleLike, 
  onToggleBookmark, 
  onOpenComments, 
  onUserClick, 
  onPostAction,
  onPostDeleted,
  onJoinTribe,
  onFollowChange
}: MediaPostCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [thumbnailLoadError, setThumbnailLoadError] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // Database-first avatar fetching
  const authorId = post.authorId || post.userId || post.user_id;
  const avatarResult = useUserAvatar(authorId || null);

  // Use centralized video error handling
  const handleVideoError = useVideoErrorHandler({
    postId: post.id,
    videoUrl: post.imageUrl,
    component: 'MediaPostCard-preview'
  });

  const realmColors = getRealmColors(post.coreRealm);
  
  // Debug media URL in development - only for non-test posts
  if (process.env.NODE_ENV === 'development' && !post.id.startsWith('test-')) {
    debugMediaUrl(post.imageUrl, `MediaPostCard-${post.id}`);
    const validation = validatePostMediaUrl(post);
    if (!validation.isValid || validation.issues.length > 0) {
      console.log(`📱 MediaPostCard ${post.id} validation:`, validation);
    }
  }

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

  // Determine media type
  const isVideoPost = post.type === 'video' || (post.type === 'media' && post.imageUrl && (
    post.imageUrl.includes('.mp4') || 
    post.imageUrl.includes('.webm') || 
    post.imageUrl.includes('.mov')
  ));

  const handleJoinTribe = (tribeId: string) => {
    if (onJoinTribe) {
      onJoinTribe(tribeId);
      setTimeout(() => {
        // Refresh handled by parent
      }, 1000);
    }
  };

  // Handle delete post
  const handleDeletePost = async () => {
    if (!post || !currentUserId || isDeleting) return;

    setIsDeleting(true);
    
    try {
      const result = await deletePost(post.id);
      
      if (result.success) {
        toast.success('Media post deleted successfully');
        setShowDeleteDialog(false);
        
        if (onPostDeleted) {
          onPostDeleted(post.id);
        }
      } else {
        toast.error(result.error || 'Failed to delete media post');
      }
    } catch (error) {
      console.error('Error deleting media post:', error);
      toast.error('An error occurred while deleting the post');
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
                  onLoad={() => console.log('🖼️ Media post avatar loaded from database for user:', authorId?.substring(0, 8) + '...')}
                  onError={() => console.log('🖼️ Media post avatar failed to load for user:', authorId?.substring(0, 8) + '...')}
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
                {isVideoPost ? (
                  <Video className="w-4 h-4 text-neon-lilac flex-shrink-0" />
                ) : (
                  <Camera className="w-4 h-4 text-soft-blush flex-shrink-0" />
                )}
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
                  Delete Post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="px-6 pt-0">
        {/* Media Content */}
        {post.imageUrl && !imageLoadError && (
          <div className="image-post-container mb-4">
            {isVideoPost ? (
              // Video Content
              accessInfo.isBlurred && accessInfo.joinPrompt ? (
                <VideoBlurOverlay
                  videoUrl={post.imageUrl}
                  posterUrl={post.mediaThumbnailUrl || post.imageUrl}
                  tribeName={accessInfo.joinPrompt.tribeName}
                  tribeId={accessInfo.joinPrompt.tribeId}
                  isPrivate={accessInfo.joinPrompt.isPrivate}
                  caption={post.caption}
                  onJoinClick={handleJoinTribe}
                  aspectRatio="16/9"
                />
              ) : (
                <div className="relative w-full rounded-2xl overflow-hidden">
                  {/* Smart video thumbnail handling with multiple fallbacks */}
                  {post.mediaThumbnailUrl && !thumbnailLoadError ? (
                    // First try: Show thumbnail image if available and not errored
                    <div className="relative w-full">
                      <ImageWithFallback
                        src={post.mediaThumbnailUrl}
                        alt={`Video by ${post.username}`}
                        className="w-full h-auto object-contain max-h-[65vh] rounded-xl"
                        onError={() => {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('MediaPostCard: Thumbnail failed to load, falling back to video element');
                          }
                          setThumbnailLoadError(true);
                        }}
                        fallback={
                          <VideoPlaceholder 
                            coreRealm={post.coreRealm} 
                            variant="unavailable" 
                            aspectRatio="16/9"
                            className="w-full h-auto max-h-[65vh]"
                          />
                        }
                      />
                      {/* Video icon overlay */}
                      <div className="absolute top-4 right-4">
                        <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                          <Video className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  ) : !videoLoadError ? (
                    // Second try: Use video element with poster (fallback when thumbnail fails or doesn't exist)
                    <video
                      className="w-full h-auto object-contain max-h-[65vh] rounded-xl bg-muted"
                      controls={false}
                      playsInline
                      preload="metadata"
                      poster={post.mediaThumbnailUrl || undefined}
                      src={post.imageUrl}
                      onClick={() => setShowVideoPlayer(true)}
                      onError={(e) => {
                        handleVideoError(e);
                        setVideoLoadError(true);
                      }}
                      onLoadStart={() => {
                        if (process.env.NODE_ENV === 'development') {
                          console.log('Video preview loading started for post', post.id);
                        }
                      }}
                      onCanPlay={() => {
                        if (process.env.NODE_ENV === 'development') {
                          console.log('Video preview can play for post', post.id);
                        }
                      }}
                    />
                  ) : (
                    // Last resort: Show placeholder
                    <VideoPlaceholder 
                      coreRealm={post.coreRealm} 
                      variant="unavailable" 
                      aspectRatio="16/9"
                      className="w-full h-auto max-h-[65vh]"
                    />
                  )}
                  
                  {/* Play button overlay */}
                  {!showVideoPlayer && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors duration-300 cursor-pointer"
                      onClick={() => setShowVideoPlayer(true)}
                    >
                      <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors duration-300">
                        <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                      </div>
                    </div>
                  )}
                  
                  {/* Video player overlay */}
                  {showVideoPlayer && (
                    <div className="absolute inset-0">
                      <VideoPlayer
                        src={post.imageUrl}
                        poster={post.mediaThumbnailUrl || ''}
                        className="w-full h-auto object-contain max-h-[65vh]"
                        autoPlay={true}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowVideoPlayer(false);
                        }}
                        className="absolute top-4 right-4 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors duration-300 z-10"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              // Image Content
              accessInfo.isBlurred && accessInfo.joinPrompt ? (
                <ImageBlurOverlay
                  imageUrl={post.imageUrl}
                  alt={`Post by ${post.username}`}
                  tribeName={accessInfo.joinPrompt.tribeName}
                  tribeId={accessInfo.joinPrompt.tribeId}
                  isPrivate={accessInfo.joinPrompt.isPrivate}
                  caption={post.caption}
                  onJoinClick={handleJoinTribe}
                  aspectRatio="auto"
                  maintainAspectRatio={false}
                />
              ) : (
                <ImageWithFallback 
                  src={post.imageUrl}
                  alt={`Post by ${post.username}`}
                  className="w-full h-auto object-contain max-h-[65vh] rounded-2xl"
                  onError={() => {
                    console.log('Image failed to load for post', post.id);
                    setImageLoadError(true);
                  }}
                  fallback={
                    <div className="w-full h-64 rounded-2xl bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Sparkles className="w-12 h-12 text-muted-lavender/40 mx-auto" />
                        <p className="text-sm text-muted-lavender/60 font-body">Media failed to load</p>
                        <p className="text-xs text-muted-lavender/40 font-body">{post.coreRealm} Style</p>
                      </div>
                    </div>
                  }
                />
              )
            )}
          </div>
        )}

        {/* Media placeholder if no URL or load error */}
        {(!post.imageUrl || imageLoadError) && (
          <div className="w-full h-64 rounded-2xl bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 mb-4 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Sparkles className="w-12 h-12 text-muted-lavender/40 mx-auto" />
              <p className="text-sm text-muted-lavender/60 font-body">
                {imageLoadError ? 'Media failed to load' : 'Media content not available'}
              </p>
              <p className="text-xs text-muted-lavender/40 font-body">{post.coreRealm} Style</p>
            </div>
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="mb-3">
            {accessInfo.isBlurred && accessInfo.joinPrompt ? (
              <SafeInlineText 
                text={post.caption}
                maxLength={50}
                className="text-muted-lavender/60 font-body leading-relaxed text-sm"
              />
            ) : (
              <SafePostContent
                content={post.caption}
                showFullOnClick={true}
                className="text-pearl-white font-body leading-relaxed"
              />
            )}
          </div>
        )}

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