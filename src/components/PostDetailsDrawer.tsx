import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader } from './ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { ImageWithFallback } from './figma/ImageWithFallback';
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
  Flag
} from 'lucide-react';
import { getRealmColors } from '../utils/social-feed-helpers';
import { formatPostTimestamp } from '../utils/timestamp-helpers';
import { supabase } from '../utils/supabase/client';
import { useUserAvatar } from '../utils/supabase/profile-avatar-helpers';
import { toast } from 'sonner@2.0.3';

interface PostDetailsDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onPostDeleted?: (postId: string) => void;
  isOwnProfile?: boolean;
  userId?: string;
}

interface PostDetails {
  id: string;
  type: 'thought' | 'image' | 'video' | 'audio';
  content?: string;
  caption?: string;
  thumbnail_url?: string;
  media_urls?: string[];
  contentUrl?: string;
  visibility: 'public' | 'tribe' | 'private';
  tribe_id?: string;
  tribeName?: string;
  created_at: string;
  user_id: string;
  username?: string;
  nickname?: string;
  likes?: number;
  comments?: number;
  liked?: boolean;
  bookmarked?: boolean;
  location?: string;
}

export function PostDetailsDrawer({ 
  postId, 
  isOpen, 
  onClose, 
  onPostDeleted,
  isOwnProfile = false,
  userId 
}: PostDetailsDrawerProps) {
  const [post, setPost] = useState<PostDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Database-first avatar fetching
  const avatarResult = useUserAvatar(post?.user_id || null);

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
    try {
      setLoading(true);
      setError(null);
      setImageLoadError(false);

      console.log('Fetching post details for:', postId);

      // Try API first
      try {
        const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
        console.log('Fetching post via API:', `/make-server-70df0d6e/posts/${postId}`);
        const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}`);
        
        if (response.post) {
          const fetchedPost = response.post;
          console.log('Fetched post from API:', fetchedPost);
          
          setPost({
            id: fetchedPost.id,
            type: fetchedPost.type || 'thought',
            content: fetchedPost.content,
            caption: fetchedPost.caption || fetchedPost.content,
            thumbnail_url: fetchedPost.thumbnail_url,
            media_urls: fetchedPost.media_urls,
            contentUrl: fetchedPost.contentUrl,
            visibility: fetchedPost.visibility || 'public',
            tribe_id: fetchedPost.tribe_id,
            tribeName: fetchedPost.tribeName,
            created_at: fetchedPost.created_at || fetchedPost.createdAt,
            user_id: fetchedPost.user_id || fetchedPost.userId,
            username: fetchedPost.username,
            nickname: fetchedPost.nickname || fetchedPost.username,
            likes: fetchedPost.likes || 0,
            comments: fetchedPost.comment_count || 0,
            liked: fetchedPost.liked || false,
            bookmarked: fetchedPost.bookmarked || false,
            location: fetchedPost.location
          });
          return;
        }
      } catch (apiError) {
        console.log('API request failed, trying direct database query:', apiError);
      }

      // Fallback to direct database query
      const { data, error: queryError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (queryError) {
        throw new Error(`Failed to fetch post: ${queryError.message}`);
      }

      if (!data) {
        throw new Error('Post not found');
      }

      console.log('Fetched post from database:', data);

      setPost({
        id: data.id,
        type: data.type || 'thought',
        content: data.content,
        caption: data.caption || data.content,
        thumbnail_url: data.thumbnail_url,
        media_urls: data.media_urls,
        contentUrl: data.content_url,
        visibility: data.visibility || 'public',
        tribe_id: data.tribe_id,
        tribeName: data.tribe_name,
        created_at: data.created_at,
        user_id: data.user_id,
        username: 'Unknown User', // Will be filled by profile fetch
        nickname: 'Unknown User',
        likes: 0,
        comments: 0,
        liked: false,
        bookmarked: false,
        location: data.location
      });

    } catch (err) {
      console.error('Error fetching post details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  // Fetch post details when drawer opens
  useEffect(() => {
    if (isOpen && postId) {
      fetchPostDetails();
    }
  }, [isOpen, postId]);

  // Handle like toggle
  const toggleLike = async () => {
    if (!post) return;

    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/like`, {
        method: 'POST'
      });

      setPost(prev => prev ? { ...prev, liked: response.liked, likes: response.likes } : null);

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
            text: post.caption || post.content || 'Check out this post',
            url: `https://tribe.app/post/${post.id}`
          });
        } else {
          navigator.clipboard.writeText(`https://tribe.app/post/${post.id}`);
          toast.success('Link copied to clipboard!');
        }
        break;
    }
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

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              {/* Database-first avatar - only use profileAvatarSrc from Supabase profiles table */}
              {avatarResult.src ? (
                <AvatarImage 
                  src={avatarResult.src} 
                  alt={`${avatarResult.username}'s profile picture`}
                  onLoad={() => console.log('🖼️ Post details avatar loaded from database for user:', post?.user_id?.substring(0, 8) + '...')}
                  onError={() => console.log('🖼️ Post details avatar failed to load for user:', post?.user_id?.substring(0, 8) + '...')}
                />
              ) : null}
              <AvatarFallback className={`bg-gradient-to-r from-${realmColors.primary} to-${realmColors.secondary} text-white font-headline`}>
                {(avatarResult.username || post.username || post.nickname || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-body font-medium text-pearl-white">@{avatarResult.username || post.username || post.nickname || 'unknown'}</p>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Media Content */}
        {post.contentUrl && post.type !== 'thought' && !imageLoadError && (
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
        )}

        {/* Audio Content */}
        {post.type === 'audio' && (
          <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Music className="w-12 h-12 text-muted-lavender/40 mx-auto" />
              <p className="text-sm text-muted-lavender/60 font-body">Audio Content</p>
            </div>
          </div>
        )}

        {/* Video Content */}
        {post.type === 'video' && (
          <div className="image-post-container">
            <video
              src={post.contentUrl}
              poster={post.thumbnail_url}
              className="video-responsive"
              controls
            />
          </div>
        )}

        {/* Caption */}
        <div>
          <p className="text-pearl-white font-body leading-relaxed">
            {post.content || post.caption || (
              <span className="text-muted-lavender/60 italic">No caption provided</span>
            )}
          </p>
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
          {post.likes || 0} {(post.likes || 0) === 1 ? 'like' : 'likes'}
        </p>
      </div>
    );
  };

  return (
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
          >
            {/* Close button */}
            <div className="sticky top-0 bg-midnight-black/90 backdrop-blur-md border-b border-muted-lavender/20 p-4 z-10">
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
  );
}