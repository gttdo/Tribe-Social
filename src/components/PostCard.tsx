import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { LevelBadge, XPDisplay } from './LevelProgressBar';
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
  Sparkles,
  Trash2,
  Play,
  Video
} from 'lucide-react';
import { FeedPost } from '../utils/social-feed-types';
import { getRealmColors } from '../utils/social-feed-helpers';
import { formatTimeAgo } from '../utils/timestamp-helpers';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { BlurOverlay, ImageBlurOverlay, VideoBlurOverlay, AudioBlurOverlay } from './BlurOverlay';
import { canViewContent } from '../utils/visibility-helpers';
import { canUserDeletePost, deletePost } from '../utils/post-deletion-helpers';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { VideoPlayer } from './VideoPlayer';
import { VideoPlaceholder } from './VideoPlaceholder';
import { WaveformAudioPlayer } from './WaveformAudioPlayer';
import { SafeUsername, SafePostContent, SafeComment, SafeInlineText } from './SafeText';
import { safeFormatCount, safeDate } from '../utils/safe-rendering';
import { useVideoErrorHandler } from '../utils/video-error-suppression';
import { useUserAvatarWithRefresh } from '../utils/avatar-refresh-context';
import { toast } from 'sonner@2.0.3';

interface PostCardProps {
  post: FeedPost;
  currentUserId?: string;
  userTribeMemberships?: string[];
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  expandCaption: (caption: string) => string;
  onOpenComments: (post: FeedPost) => void;
  onUserClick: (authorId: string, username: string) => void;
  onPostAction: (action: string, postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  onJoinTribe?: (tribeId: string) => void;
}

export function PostCard({ 
  post, 
  currentUserId,
  userTribeMemberships,
  onToggleLike, 
  onToggleBookmark, 
  expandCaption, 
  onOpenComments, 
  onUserClick, 
  onPostAction,
  onPostDeleted,
  onJoinTribe
}: PostCardProps) {
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [thumbnailLoadError, setThumbnailLoadError] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // Database-first avatar fetching with refresh capability
  const authorId = post.authorId || post.userId || post.user_id;
  const avatarResult = useUserAvatarWithRefresh(authorId || null);

  // Use centralized video error handling
  const handleVideoError = useVideoErrorHandler({
    postId: post.id,
    videoUrl: post.imageUrl,
    component: 'PostCard-preview'
  });

  const realmColors = getRealmColors(post.coreRealm);

  // Check content visibility based on post visibility and user membership
  const accessInfo = canViewContent(
    {
      ...post,
      visibility: post.visibility || 'public',
      tribe_id: post.tribeId || null,
      tribe: post.tribeId ? {
        id: post.tribeId,
        name: post.tribeName || 'Unknown Tribe',
        is_private: false // This should come from the actual tribe data
      } : undefined
    } as any,
    currentUserId,
    userTribeMemberships
  );

  // Format timestamp to show elapsed time
  const timeAgo = formatTimeAgo(post.timestamp);

  const handleJoinTribe = (tribeId: string) => {
    if (onJoinTribe) {
      onJoinTribe(tribeId);
      
      // After successful join, refresh the specific post
      // This would trigger a re-render with updated visibility
      setTimeout(() => {
        // The parent component should refresh the feed
        // which will show the content without blur overlay
      }, 1000);
    }
  };

  // Handle delete post - now using direct Supabase JS
  const handleDeletePost = async () => {
    if (!post || !currentUserId || isDeleting) return;

    setIsDeleting(true);
    
    try {
      const result = await deletePost(post.id);
      
      if (result.success) {
        toast.success('Post deleted successfully');
        setShowDeleteDialog(false);
        
        // Call the parent handler to remove from state
        if (onPostDeleted) {
          onPostDeleted(post.id);
        }
      } else {
        toast.error(result.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('An error occurred while deleting the post');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card 
      className="bg-transparent border-0 mb-4 sm:mb-6 mobile-safe"
      data-post-id={post.id}  // Embed real UUID from database
    >
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        {/* Post Header - Enhanced mobile responsiveness */}
        <div className="flex items-center justify-between">
          <button
            onClick={async () => {
              const userId = post.authorId || post.userId || post.user_id;
              const username = post.username || 'unknown_user';
              
              // Debug log the click data
              if (process.env.NODE_ENV === 'development') {
                console.log('PostCard user click:', { 
                  userId, 
                  username, 
                  postAuthorId: post.authorId,
                  postUserId: post.userId,
                  postUser_id: post.user_id
                });
              }
              
              // If we have a valid UUID, use it directly
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              if (userId && uuidRegex.test(userId)) {
                onUserClick(userId, username);
                return;
              }
              
              // If userId is null or empty, don't attempt navigation
              if (!userId || userId === 'unknown') {
                console.log('Cannot navigate to profile - no valid user ID available');
                const { toast } = await import('sonner@2.0.3');
                toast.info(`Cannot view profile for ${username}`);
                return;
              }
              
              // Optional fallback: if author_id is unavailable, fetch profiles.id by display_name
              if (!userId || userId === 'unknown') {
                console.warn('Missing or invalid user ID, attempting to fetch by display_name:', username);
                
                try {
                  // Import supabase client
                  const { supabase } = await import('../utils/supabase/client');
                  
                  // Fetch user ID by display_name
                  const { data: profile, error } = await supabase
                    .from('profile')
                    .select('id')
                    .eq('display_name', username)
                    .single();
                  
                  if (!error && profile?.id) {
                    console.log('✅ Found user ID by display_name:', profile.id);
                    onUserClick(profile.id, username);
                    return;
                  } else {
                    console.warn('Could not find user by display_name:', username, error);
                  }
                } catch (error) {
                  console.error('Error fetching user by display_name:', error);
                }
                
                // Show warning toast if we can't navigate
                const { toast } = await import('sonner@2.0.3');
                toast.error(`Profile not available for ${username}`);
                return;
              }
              
              // Use what we have
              onUserClick(userId || 'unknown', username);
            }}
            className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity duration-300 flex-1 min-w-0"
          >
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
              {/* Database-first avatar - only use profileAvatarSrc from Supabase profiles table */}
              {avatarResult.src ? (
                <AvatarImage 
                  src={avatarResult.src} 
                  alt={`${avatarResult.username}'s profile picture`}
                  onLoad={() => console.log('🖼️ Post avatar loaded from database for user:', authorId?.substring(0, 8) + '...')}
                  onError={() => console.log('🖼️ Post avatar failed to load for user:', authorId?.substring(0, 8) + '...')}
                />
              ) : null}
              <AvatarFallback className={`bg-gradient-to-r from-${realmColors.primary} to-${realmColors.secondary} text-white font-headline text-sm sm:text-base`}>
                {(avatarResult.username || post.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <p className="font-body text-pearl-white text-sm truncate">
                  {avatarResult.username || post.username || 'unknown_user'} • {timeAgo}
                </p>
              </div>
              {post.location && (
                <div className="flex items-center text-xs text-muted-lavender font-body mt-0.5 sm:mt-1">
                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{post.location}</span>
                </div>
              )}
            </div>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 sm:p-3 bg-transparent text-muted-lavender hover:text-pearl-white border-0 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center touch-target flex-shrink-0">
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

      <CardContent className="px-3 sm:px-6 pt-0">
        {/* Media Content with Visibility Aware Rendering */}
        {post.imageUrl && post.type !== 'thought' && post.type !== 'video' && post.type !== 'audio' && !imageLoadError && !(() => {
          // Check if this is a video file disguised as an image URL
          const isVideoFile = post.imageUrl && (
            post.imageUrl.includes('.mp4') || 
            post.imageUrl.includes('.webm') || 
            post.imageUrl.includes('.mov')
          );
          // Check if this is an audio file disguised as an image URL  
          const isAudioFile = post.imageUrl && post.imageUrl.match(/\.(mp3|wav|m4a|ogg)$/i);
          return isVideoFile || isAudioFile;
        })() && (() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('PostCard: Rendering image for post', post.id, { 
              imageUrl: post.imageUrl, 
              type: post.type, 
              imageLoadError,
              isBlurred: accessInfo.isBlurred 
            });
          }
          return true;
        })() && (
          <div className="image-post-container mb-4">
            {accessInfo.isBlurred && accessInfo.joinPrompt ? (
              // Show blur overlay for tribe-only content
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
              // Show normal content with proper aspect ratio preservation and responsive sizing
              <ImageWithFallback 
                src={post.imageUrl}
                alt={`Post by ${post.username}`}
                className="w-full h-auto object-contain max-h-[65vh] rounded-2xl"
                onError={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('PostCard: Image failed to load for post', post.id, post.imageUrl);
                  }
                  setImageLoadError(true);
                }}
                fallback={
                  <div className="w-full h-64 rounded-2xl bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Sparkles className="w-12 h-12 text-muted-lavender/40 mx-auto" />
                      <p className="text-sm text-muted-lavender/60 font-body">Image failed to load</p>
                      <p className="text-xs text-muted-lavender/40 font-body">{post.coreRealm} Style</p>
                    </div>
                  </div>
                }
              />
            )}
          </div>
        )}

        {/* Audio Content with Visibility Aware Rendering */}
        {(post.type === 'audio' || (post.imageUrl && post.imageUrl.match(/\.(mp3|wav|m4a|ogg)$/i))) && (() => {
          // Check if this is an audio post - detect by type or file extension
          const isAudioPost = post.type === 'audio' || (post.imageUrl && post.imageUrl.match(/\.(mp3|wav|m4a|ogg)$/i));
          const audioUrl = post.imageUrl; // For audio posts, media_url is stored in imageUrl field
          
          if (process.env.NODE_ENV === 'development') {
            console.log('PostCard: Rendering audio post', post.id, { 
              type: post.type, 
              imageUrl: post.imageUrl,
              isAudioPost,
              isBlurred: accessInfo.isBlurred 
            });
          }
          
          return isAudioPost;
        })() && (
          <div className="w-full rounded-2xl mb-4 overflow-hidden">
            {accessInfo.isBlurred && accessInfo.joinPrompt ? (
              // Show blur overlay for tribe-only audio
              <AudioBlurOverlay
                audioUrl={post.imageUrl || ''} // Audio URL 
                tribeName={accessInfo.joinPrompt.tribeName}
                tribeId={accessInfo.joinPrompt.tribeId}
                isPrivate={accessInfo.joinPrompt.isPrivate}
                caption={post.caption}
                onJoinClick={handleJoinTribe}
              />
            ) : post.imageUrl ? (
              // Show custom waveform audio player
              <WaveformAudioPlayer
                audioUrl={post.imageUrl}
                className="mb-0"
              />
            ) : (
              // No audio URL available - show placeholder
              <div className="w-full h-20 rounded-2xl bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 flex items-center justify-center">
                <div className="text-center space-y-1">
                  <Sparkles className="w-8 h-8 text-muted-lavender/40 mx-auto" />
                  <p className="text-xs text-muted-lavender/60 font-body">Audio not available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Video Content with Thumbnail Fallback System */}
        {(() => {
          const isVideoPost = post.type === 'video' || (post.type === 'media' && post.imageUrl && (post.imageUrl.includes('.mp4') || post.imageUrl.includes('.webm') || post.imageUrl.includes('.mov')));
          // Exclude audio files from being treated as video
          const isAudioFile = post.imageUrl && post.imageUrl.match(/\.(mp3|wav|m4a|ogg)$/i);
          const actualVideoPost = isVideoPost && !isAudioFile;
          
          if (actualVideoPost && process.env.NODE_ENV === 'development') {
            console.log('PostCard: Rendering video post', post.id, {
              type: post.type,
              imageUrl: post.imageUrl,
              mediaThumbnailUrl: post.mediaThumbnailUrl,
              showVideoPlayer
            });
          }
          
          return actualVideoPost;
        })() && (
          <div className="image-post-container mb-4">
            {accessInfo.isBlurred && accessInfo.joinPrompt ? (
              // Show blur overlay for tribe-only video
              <VideoBlurOverlay
                videoUrl={post.imageUrl || ''} // Video URL 
                posterUrl={post.mediaThumbnailUrl || post.imageUrl || ''}
                tribeName={accessInfo.joinPrompt.tribeName}
                tribeId={accessInfo.joinPrompt.tribeId}
                isPrivate={accessInfo.joinPrompt.isPrivate}
                caption={post.caption}
                onJoinClick={handleJoinTribe}
                aspectRatio="16/9"
              />
            ) : post.imageUrl ? (
              // Video content available - use native video element with poster and responsive sizing
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
                          console.log('PostCard: Thumbnail failed to load, falling back to video element');
                        }
                        setThumbnailLoadError(true);
                      }}
                      fallback={
                        // If thumbnail fails, show placeholder
                        <VideoPlaceholder 
                          coreRealm={post.coreRealm} 
                          variant="unavailable" 
                          aspectRatio="16/9"
                          className="w-full h-auto max-h-[65vh]"
                        />
                      }
                    />
                    {/* Enhanced video camera icon - matches ProfileMediaCard design */}
                    <div className="absolute top-4 right-4">
                      <div className="w-8 h-8 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
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
                    onClick={() => {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('PostCard: Opening video player for post', post.id);
                      }
                      setShowVideoPlayer(true);
                    }}
                    onError={(e) => {
                      handleVideoError(e);
                      if (process.env.NODE_ENV === 'development') {
                        console.log('PostCard: Video failed to load, showing placeholder');
                      }
                      setVideoLoadError(true);
                    }}
                    onLoadStart={() => {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('PostCard: Video loading started for post', post.id);
                      }
                    }}
                    onCanPlay={() => {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('PostCard: Video can play for post', post.id);
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
                
                {/* Enhanced play button overlay - matches ProfileMediaCard design */}
                {!showVideoPlayer && (
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('PostCard: Opening video player for post', post.id);
                      }
                      setShowVideoPlayer(true);
                    }}
                  >
                    <div className="w-16 h-16 bg-black/70 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg transition-all duration-200 hover:bg-black/80 hover:scale-105">
                      <div className="w-0 h-0 border-l-[12px] border-l-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1"></div>
                    </div>
                  </div>
                )}
                
                {/* Video player overlay when playing */}
                {showVideoPlayer && (
                  <div className="absolute inset-0">
                    <VideoPlayer
                      src={post.imageUrl}
                      poster={post.mediaThumbnailUrl || ''}
                      className="w-full h-auto object-contain max-h-[65vh]"
                      autoPlay={true}
                    />
                    {/* Close video button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (process.env.NODE_ENV === 'development') {
                          console.log('PostCard: Closing video player for post', post.id);
                        }
                        setShowVideoPlayer(false);
                      }}
                      className="absolute top-4 right-4 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors duration-300 z-10"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // No video URL available - show static placeholder
              <VideoPlaceholder 
                coreRealm={post.coreRealm} 
                variant="unavailable" 
                aspectRatio="16/9"
              />
            )}
          </div>
        )}

        {/* Placeholder for media posts without valid media */}
        {(post.type === 'media' || post.type === 'image') && (!post.imageUrl || imageLoadError) && (
          <div className="w-full h-64 rounded-2xl bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 mb-4 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Sparkles className="w-12 h-12 text-muted-lavender/40 mx-auto" />
              <p className="text-sm text-muted-lavender/60 font-body">
                {imageLoadError ? 'Image failed to load' : 'Media content not available'}
              </p>
              <p className="text-xs text-muted-lavender/40 font-body">{post.coreRealm} Style</p>
              {/* Debug info for development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-lavender/30 font-mono mt-2">
                  <p>URL: {post.imageUrl || 'null'}</p>
                  <p>Error: {imageLoadError ? 'Yes' : 'No'}</p>
                  <p>Type: {post.type}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add spacing for thought posts */}
        {post.type === 'thought' && <div className="mb-2" />}

        {/* Caption - Enhanced error handling and text display */}
        <div className="mb-3">
          {accessInfo.isBlurred && accessInfo.joinPrompt ? (
            // Show truncated caption for blurred content
            <SafeInlineText 
              text={post.type === 'thought' ? (post.content || post.caption) : post.caption}
              maxLength={50}
              className="text-muted-lavender/60 font-body leading-relaxed text-sm"
            />
          ) : (
            // Show full caption interaction for viewable content
            <SafePostContent
              content={post.type === 'thought' ? (post.content || post.caption) : post.caption}
              showFullOnClick={true}
              className="text-pearl-white font-body leading-relaxed"
            />
          )}
        </div>

        {/* Engagement Row - Enhanced mobile responsiveness */}
        {!accessInfo.isBlurred && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1 sm:space-x-4">
              <button
                onClick={() => onToggleLike(post.id)}
                className={`p-2 sm:p-3 bg-transparent border-0 rounded-lg ${post.liked ? 'text-glitch-red' : 'text-muted-lavender hover:text-glitch-red'} transition-all duration-300 cursor-pointer touch-target`}
                aria-label={post.liked ? 'Unlike' : 'Like'}
                aria-pressed={post.liked}
              >
                <Heart className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 ${post.liked ? 'fill-current scale-110' : 'scale-100'} active:scale-125`} />
              </button>
              <button
                onClick={() => onOpenComments(post)}
                data-post-id={post.id}
                className="p-2 sm:p-3 bg-transparent border-0 rounded-lg text-muted-lavender hover:text-electric-blue transition-all duration-300 cursor-pointer touch-target"
                aria-label="Comment"
              >
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                className="p-2 sm:p-3 bg-transparent border-0 rounded-lg text-muted-lavender hover:text-electric-blue transition-all duration-300 cursor-pointer touch-target"
                aria-label="Share"
              >
                <Share className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <button
              onClick={() => onToggleBookmark(post.id)}
              className={`p-2 sm:p-3 bg-transparent border-0 rounded-lg ${post.bookmarked ? 'text-electric-blue' : 'text-muted-lavender hover:text-electric-blue'} transition-all duration-300 cursor-pointer touch-target flex-shrink-0`}
              aria-label={post.bookmarked ? 'Unsave' : 'Save'}
              aria-pressed={post.bookmarked}
            >
              <Bookmark className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 ${post.bookmarked ? 'fill-current scale-110' : 'scale-100'} active:scale-125`} />
            </button>
          </div>
        )}

        {/* Likes Count - Only show for viewable content */}
        {!accessInfo.isBlurred && (
          <p className="font-body font-medium text-pearl-white mb-2">
            {safeFormatCount(post.likes)} {post.likes === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Comments Preview - Only show for viewable content */}
        {!accessInfo.isBlurred && post.comments.length > 0 && (
          <div className="space-y-2">
            {post.comments.slice(0, 2).map((comment) => (
              <div key={comment.id} className="flex items-start space-x-2">
                <p className="text-sm text-muted-lavender font-body">
                  <button
                    onClick={() => onUserClick(comment.userId || 'unknown', comment.username)}
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