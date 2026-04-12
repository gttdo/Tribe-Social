import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Card, CardContent } from './ui/card';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2
} from 'lucide-react';
import { CommentsSystem } from './CommentsSystem';
import { VideoPlayer } from './VideoPlayer';
import { cn } from './ui/utils';
import { UserResult, UserInfo, CoreRealm } from '../App';

interface PostDetailDesktopProps {
  post: any;
  userResult: UserResult | null;
  userInfo: UserInfo | null;
  onBack: () => void;
  onLike?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
}

export function PostDetailDesktop({
  post,
  userResult,
  userInfo,
  onBack,
  onLike,
  onBookmark
}: PostDetailDesktopProps) {
  const [isLiked, setIsLiked] = useState(post.liked || false);
  const [isBookmarked, setIsBookmarked] = useState(post.bookmarked || false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(true);

  const getRealmColors = (realm: CoreRealm) => {
    const colors = {
      mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
      embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
      shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    return colors[realm] || colors.mirrorcore;
  };

  const handleLike = async () => {
    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      if (onLike) {
        await onLike(post.id);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      console.error('Failed to like post:', error);
    }
  };

  const handleBookmark = async () => {
    const previousBookmarked = isBookmarked;
    setIsBookmarked(!isBookmarked);

    try {
      if (onBookmark) {
        await onBookmark(post.id);
      }
    } catch (error) {
      setIsBookmarked(previousBookmarked);
      console.error('Failed to bookmark post:', error);
    }
  };

  const renderMediaContent = () => {
    if (post.type === 'video' && post.imageUrl) {
      return (
        <div className="w-full aspect-[9/16] max-h-[70vh] bg-midnight-black rounded-xl overflow-hidden">
          <VideoPlayer
            src={post.imageUrl}
            thumbnail={post.mediaThumbnailUrl}
            className="w-full h-full object-contain"
            autoPlay={false}
            controls={true}
          />
        </div>
      );
    }

    if ((post.type === 'media' || post.type === 'image') && post.imageUrl) {
      return (
        <div className="w-full flex items-center justify-center bg-midnight-black rounded-xl overflow-hidden">
          <img
            src={post.imageUrl}
            alt="Post content"
            className="max-w-full max-h-[70vh] object-contain rounded-xl"
            loading="lazy"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-midnight-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/80 backdrop-blur-md border-b border-muted-lavender/20">
        <div className="flex items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-muted-lavender hover:text-pearl-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          
          <h1 className="font-headline text-pearl-white">Post Details</h1>
          
          <Button
            variant="ghost"
            className="text-muted-lavender hover:text-pearl-white"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Side - Post Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-midnight-black">
          <div className="w-full max-w-2xl">
            {/* Post Author Info */}
            <div className="flex items-center space-x-3 mb-6">
              <Avatar className="w-12 h-12">
                <AvatarFallback className={`bg-gradient-to-r from-${getRealmColors(post.coreRealm).primary} to-${getRealmColors(post.coreRealm).secondary} text-white font-headline`}>
                  {post.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-body font-medium text-pearl-white">{post.username}</p>
                <p className={`text-sm text-${getRealmColors(post.coreRealm).primary} font-body`}>
                  {post.nickname}
                </p>
              </div>
            </div>

            {/* Media Content */}
            {renderMediaContent()}

            {/* Post Caption */}
            {post.caption && (
              <div className="mt-6">
                <p className="text-pearl-white font-body leading-relaxed">
                  {post.caption}
                </p>
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-muted-lavender/20">
              <div className="flex items-center space-x-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={cn(
                    "flex items-center space-x-2 transition-all duration-200",
                    isLiked 
                      ? "text-neon-lilac hover:text-neon-lilac/80" 
                      : "text-muted-lavender hover:text-pearl-white"
                  )}
                >
                  <Heart 
                    className={cn(
                      "w-5 h-5 transition-all duration-200",
                      isLiked && "fill-current scale-110"
                    )} 
                  />
                  <span className="font-medium">{likesCount}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="flex items-center space-x-2 text-muted-lavender hover:text-pearl-white"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">{post.comments?.length || 0}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmark}
                  className={cn(
                    "flex items-center space-x-2 transition-all duration-200",
                    isBookmarked 
                      ? "text-electric-blue hover:text-electric-blue/80" 
                      : "text-muted-lavender hover:text-pearl-white"
                  )}
                >
                  <Bookmark 
                    className={cn(
                      "w-5 h-5 transition-all duration-200",
                      isBookmarked && "fill-current"
                    )} 
                  />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-lavender hover:text-pearl-white"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              <span className="text-muted-lavender text-sm font-body">
                {post.timestamp}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Comments */}
        {showComments && (
          <div className="w-96 border-l border-muted-lavender/20">
            <CommentsSystem
              post={post}
              userResult={userResult}
              userInfo={userInfo}
              mode="desktop"
              onClose={() => setShowComments(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}