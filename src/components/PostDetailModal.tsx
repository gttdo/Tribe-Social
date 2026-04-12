import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  MoreHorizontal, 
  X,
  ExternalLink
} from 'lucide-react';
import { CommentsSystem } from './CommentsSystem';
import { VideoPlayer } from './VideoPlayer';
import { cn } from './ui/utils';
import { UserResult, UserInfo, CoreRealm } from '../App';

interface PostDetailModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
  userResult: UserResult | null;
  userInfo: UserInfo | null;
  onLike?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onOpenDesktop?: () => void;
}

export function PostDetailModal({
  post,
  isOpen,
  onClose,
  userResult,
  userInfo,
  onLike,
  onBookmark,
  onOpenDesktop
}: PostDetailModalProps) {
  const [isLiked, setIsLiked] = useState(post.liked || false);
  const [isBookmarked, setIsBookmarked] = useState(post.bookmarked || false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);

  // Reset state when post changes
  useEffect(() => {
    setIsLiked(post.liked || false);
    setIsBookmarked(post.bookmarked || false);
    setLikesCount(post.likes || 0);
  }, [post.id, post.liked, post.bookmarked, post.likes]);

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
        <div className="w-full aspect-[9/16] max-h-[60vh] bg-midnight-black rounded-xl overflow-hidden">
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
            className="max-w-full max-h-[60vh] object-contain rounded-xl"
            loading="lazy"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto bg-midnight-black border-muted-lavender/20 max-h-[90vh] overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex flex-col space-y-1">
              <DialogTitle className="font-headline text-pearl-white">
                Post Details
              </DialogTitle>
              <DialogDescription className="text-muted-lavender font-body text-sm">
                View and interact with this post
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              {onOpenDesktop && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenDesktop}
                  className="text-muted-lavender hover:text-pearl-white h-8 w-8 p-1 hidden md:flex"
                  title="Open in desktop view"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-lavender hover:text-pearl-white h-8 w-8 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto flex-1">
            {/* Post Author Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className={`bg-gradient-to-r from-${getRealmColors(post.coreRealm).primary} to-${getRealmColors(post.coreRealm).secondary} text-white font-headline text-sm`}>
                    {post.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-body font-medium text-pearl-white">{post.username}</p>
                  <p className={`text-xs text-${getRealmColors(post.coreRealm).primary} font-body`}>
                    {post.nickname}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-lavender hover:text-pearl-white"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Media Content */}
            {renderMediaContent()}

            {/* Post Caption */}
            {post.caption && (
              <div>
                <p className="text-pearl-white font-body text-sm leading-relaxed">
                  {post.caption}
                </p>
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-muted-lavender/20">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={cn(
                    "flex items-center space-x-1 transition-all duration-200",
                    isLiked 
                      ? "text-neon-lilac hover:text-neon-lilac/80" 
                      : "text-muted-lavender hover:text-pearl-white"
                  )}
                >
                  <Heart 
                    className={cn(
                      "w-4 h-4 transition-all duration-200",
                      isLiked && "fill-current scale-110"
                    )} 
                  />
                  <span className="text-xs font-medium">{likesCount}</span>
                </Button>

                <CommentsSystem
                  post={post}
                  userResult={userResult}
                  userInfo={userInfo}
                  mode="mobile"
                  isOpen={showComments}
                  onOpenChange={setShowComments}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-1 text-muted-lavender hover:text-pearl-white"
                      title="View comments"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Comments</span>
                    </Button>
                  }
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmark}
                  className={cn(
                    "flex items-center space-x-1 transition-all duration-200",
                    isBookmarked 
                      ? "text-electric-blue hover:text-electric-blue/80" 
                      : "text-muted-lavender hover:text-pearl-white"
                  )}
                >
                  <Bookmark 
                    className={cn(
                      "w-4 h-4 transition-all duration-200",
                      isBookmarked && "fill-current"
                    )} 
                  />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-lavender hover:text-pearl-white"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              <span className="text-muted-lavender text-xs font-body">
                {post.timestamp}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}