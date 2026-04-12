import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from './ui/sheet';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { QuickReactions } from './QuickReactions';
import { SafeBio, SafeUsername } from './SafeText';
import { useIsMobile } from './ui/use-mobile';
import { useUserAvatarWithRefresh } from '../utils/avatar-refresh-context';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { 
  X, 
  Heart, 
  MessageCircle, 
  Share, 
  Edit3, 
  Trash2, 
  Save,
  Bookmark
} from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { WaveformAudioPlayer } from './WaveformAudioPlayer';

interface PostData {
  id: string;
  caption: string;
  timestamp: string;
  likes: number;
  comments: number;
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  type: string;
  mediaType?: string;
  user_id?: string;
  text_body?: string;
  content?: string;
  created_at?: string;
  like_count?: number;
  comment_count?: number;
  media_url?: string;
}

interface ProfilePostDetailDrawerProps {
  post: PostData | null;
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  onDeletePost?: (postId: string) => void;
  onEditPost?: (postId: string, newCaption: string) => void;
  userInfo?: any;
  savedSet?: string[];
  onToggleBookmark?: (postId: string) => Promise<string>;
}

export function ProfilePostDetailDrawer({
  post,
  isOpen,
  onClose,
  isOwner,
  onDeletePost,
  onEditPost,
  userInfo,
  savedSet,
  onToggleBookmark
}: ProfilePostDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // Mobile detection hook
  const isMobile = useIsMobile();

  // Check if post is bookmarked
  const isBookmarked = post?.id ? savedSet?.includes(post.id) || false : false;

  // Get user avatar for post header
  const postUserId = post?.user_id;
  const avatarData = useUserAvatarWithRefresh(postUserId || null);

  // Reset state when post changes
  useEffect(() => {
    if (post) {
      setEditedCaption(post.caption || post.text_body || post.content || '');
      setCurrentLikes(post.likes || post.like_count || 0);
      setIsEditing(false);
    }
  }, [post]);

  // Check if user has liked this post
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!post?.id) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        const { data, error } = await supabase
          .from('post_reactions')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', session.user.id)
          .eq('reaction_type', 'like')
          .maybeSingle();

        if (!error) {
          setIsLiked(!!data);
        }
      } catch (error) {
        console.warn('Failed to check like status:', error);
      }
    };

    checkLikeStatus();
  }, [post?.id]);

  if (!post) return null;

  const handleSaveEdit = async () => {
    if (!post.id || !editedCaption.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          text_body: editedCaption.trim(),
          caption: editedCaption.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      if (error) throw error;

      // Call the parent's edit handler if provided
      if (onEditPost) {
        onEditPost(post.id, editedCaption.trim());
      }

      setIsEditing(false);
      toast.success('Post updated successfully! ✨');
    } catch (error) {
      console.error('Failed to update post:', error);
      toast.error('Failed to update post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!post.id) return;

    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      if (onDeletePost) {
        onDeletePost(post.id);
      }
      onClose();
    }
  };

  const handleLike = async () => {
    if (!post.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('Please sign in to like posts');
        return;
      }

      if (isLiked) {
        // Unlike the post
        const { error } = await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', session.user.id)
          .eq('reaction_type', 'like');

        if (!error) {
          setIsLiked(false);
          setCurrentLikes(prev => Math.max(0, prev - 1));
        }
      } else {
        // Like the post
        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: post.id,
            user_id: session.user.id,
            reaction_type: 'like'
          });

        if (!error) {
          setIsLiked(true);
          setCurrentLikes(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      toast.error('Failed to update like. Please try again.');
    }
  };

  const handleBookmark = async () => {
    if (!post?.id || !onToggleBookmark) {
      console.warn('Cannot bookmark: missing post ID or toggle function');
      return;
    }

    try {
      console.log('🔖 ProfilePostDetailDrawer: Toggling bookmark for post:', post.id);
      const result = await onToggleBookmark(post.id);
      console.log('🔖 ProfilePostDetailDrawer: Bookmark toggle result:', result);
    } catch (error) {
      console.error('🔖 ProfilePostDetailDrawer: Bookmark toggle failed:', error);
    }
  };

  const renderPostMedia = () => {
    // Check if this is a video post
    if (post.type === 'video' || (post.imageUrl && post.imageUrl.match(/\.(mp4|webm|mov)$/i))) {
      const videoSrc = post.videoUrl || post.media_url || post.imageUrl;
      const posterSrc = post.thumbnailUrl || post.imageUrl;

      if (!videoSrc) return null;

      console.log('🎬 ProfilePostDetailDrawer: Rendering video with VideoPlayer component', {
        videoSrc,
        posterSrc,
        postType: post.type
      });

      return (
        <div className="w-full rounded-lg overflow-hidden">
          <VideoPlayer
            src={videoSrc}
            poster={posterSrc}
            className={`w-full h-auto ${isMobile ? 'max-h-[35vh]' : 'max-h-[60vh]'}`}
            autoPlay={false}
            muted={false}
            loop={false}
          />
        </div>
      );
    }

    // Check if this is an audio post
    if (post.type === 'audio' || (post.imageUrl && post.imageUrl.match(/\.(mp3|wav|m4a|ogg)$/i))) {
      const audioSrc = post.imageUrl || post.media_url;

      if (!audioSrc) return null;

      console.log('🎵 ProfilePostDetailDrawer: Rendering audio with WaveformAudioPlayer component', {
        audioSrc,
        postType: post.type
      });

      return (
        <div className="w-full rounded-lg overflow-hidden bg-midnight-black/50 p-4">
          <WaveformAudioPlayer
            audioUrl={audioSrc}
            className="w-full"
          />
        </div>
      );
    }

    // Default to image if available
    if (post.imageUrl || post.media_url) {
      const imageSrc = post.imageUrl || post.media_url;

      console.log('🖼️ ProfilePostDetailDrawer: Rendering image', {
        imageSrc,
        postType: post.type
      });

      return (
        <div className="w-full bg-midnight-black/50 rounded-lg overflow-hidden">
          <img
            src={imageSrc}
            alt="Post content"
            className={`w-full h-auto object-contain ${isMobile ? 'max-h-[35vh]' : 'max-h-[60vh]'}`}
            onError={() => {
              console.warn('Image failed to load in ProfilePostDetailDrawer:', imageSrc);
            }}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"}
        className={isMobile 
          ? "w-full h-[85vh] bg-midnight-black border-t border-neon-lilac/20 p-0 rounded-t-2xl instagram-drawer" 
          : "w-full sm:w-[500px] sm:max-w-[90vw] bg-midnight-black border-l border-neon-lilac/20 p-0"
        }
      >
        {/* Mobile: Show drag handle + header, Desktop: Show header */}
        {isMobile ? (
          <div className="border-b border-neon-lilac/20">
            <div className="flex justify-center p-2">
              <div className="w-12 h-1 bg-muted-lavender/40 rounded-full" />
            </div>
            <SheetHeader className="pb-3 px-4">
              <SheetTitle className="font-headline text-pearl-white text-center">
                Post Details
              </SheetTitle>
            </SheetHeader>
          </div>
        ) : (
          <SheetHeader className="p-4 border-b border-neon-lilac/20">
            <SheetTitle className="font-headline text-pearl-white">
              Post Details
            </SheetTitle>
          </SheetHeader>
        )}
        
        <div className={isMobile 
          ? "h-[calc(85vh-60px)] overflow-hidden" 
          : "h-[calc(100vh-80px)] overflow-hidden"
        }>
          <div className="flex flex-col h-full">
            {/* Post Header */}
            <div className={`flex items-center justify-between p-4 ${isMobile ? '' : 'border-b border-neon-lilac/20'}`}>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-2 ring-neon-lilac/30">
                  {avatarData.src ? (
                    <AvatarImage src={avatarData.src} alt="Profile picture" />
                  ) : null}
                  <AvatarFallback className="bg-neon-lilac/20 text-pearl-white">
                    {userInfo?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SafeUsername 
                    username={userInfo?.username || 'Unknown User'} 
                    className="font-headline text-pearl-white" 
                  />
                  <p className="text-xs text-muted-lavender">
                    {post.timestamp || 'Just now'}
                  </p>
                </div>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-muted-lavender hover:text-neon-lilac"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-muted-lavender hover:text-glitch-red"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Post Caption */}
            <div className="p-4">
              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedCaption}
                    onChange={(e) => setEditedCaption(e.target.value)}
                    placeholder="Edit your post..."
                    className="bg-midnight-black/50 border-neon-lilac/20 text-pearl-white resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveEdit}
                      disabled={isLoading}
                      className="bg-neon-lilac text-midnight-black hover:bg-neon-lilac/80"
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedCaption(post.caption || post.text_body || post.content || '');
                      }}
                      size="sm"
                      className="border-neon-lilac/20 text-muted-lavender hover:text-pearl-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-pearl-white/90 leading-relaxed">
                  {post.caption || post.text_body || post.content || ''}
                </div>
              )}
            </div>

            {/* Post Media */}
            <div className="px-4">
              {renderPostMedia()}
            </div>

            {/* Post Actions */}
            <div className="flex items-center justify-between p-4 border-b border-neon-lilac/20">
              {/* Left group: Like and Comments */}
              <div className="flex items-center gap-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`flex items-center gap-2 ${
                    isLiked 
                      ? 'text-glitch-red hover:text-glitch-red/80' 
                      : 'text-muted-lavender hover:text-pearl-white'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                  <span>{currentLikes}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 text-muted-lavender hover:text-pearl-white"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span>{post.comments || post.comment_count || 0}</span>
                </Button>
              </div>

              {/* Right group: Bookmark and Share */}
              <div className="flex items-center gap-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmark}
                  className={`${
                    isBookmarked 
                      ? 'text-neon-lilac hover:text-neon-lilac/80' 
                      : 'text-muted-lavender hover:text-pearl-white'
                  }`}
                >
                  <Bookmark className={`w-6 h-6 ${isBookmarked ? 'fill-current' : ''}`} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-lavender hover:text-pearl-white"
                >
                  <Share className="w-6 h-6" />
                </Button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Comments Header */}
              <div className="p-4 border-b border-neon-lilac/20">
                <h3 className="font-headline text-pearl-white">Comments</h3>
              </div>

              {/* Comments Content */}
              <div className={`flex-1 min-h-0 p-4 ${isMobile ? 'mobile-comments-scroll' : ''}`}>
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-lavender text-sm">
                    No comments yet. Be the first to comment!
                  </p>
                </div>
              </div>

              {/* Comment Input */}
              <div className={`p-4 border-t border-neon-lilac/20 ${isMobile ? 'pb-safe' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Write a comment..."
                      className={`bg-midnight-black/50 border-neon-lilac/20 text-pearl-white resize-none pr-12 ${isMobile ? 'mobile-comments-input' : ''}`}
                      rows={1}
                    />
                  </div>
                  <Button
                    size="sm"
                    className={`bg-neon-lilac text-midnight-black hover:bg-neon-lilac/80 p-2 ${isMobile ? 'touch-target' : ''}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}