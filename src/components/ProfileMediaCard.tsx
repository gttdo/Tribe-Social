import React from 'react';
import { Heart, MessageCircle, Image, Video, Mic, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { WaveformAudioPlayer } from './WaveformAudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Button } from './ui/button';
import exampleVideoThumbnail from 'figma:asset/07f030192747d676c53451bded0aef75c76b5e63.png';
import exampleThoughtCard from 'figma:asset/74246d319dea1e3099c871bd8def0cdafe7a2e43.png';
import referenceVideoCard from 'figma:asset/534071bc68c3e14f42d25178a2d477147974f5b1.png';
import videoThumbnailExample from 'figma:asset/4c26025f057cfe7fe79b1e7a02bdc43c930c7bf0.png';
import videoBackgroundExample from 'figma:asset/fb75a84f6c857bf7de088809021bb5e69ed2e088.png';
import videoThumbnailFixed from 'figma:asset/6947be2b5b8943cf1a0b2892a1db74d5673b42b8.png';

interface ProfileMediaCardProps {
  post: {
    id: string;
    caption: string;
    timestamp: string;
    likes: number;
    comments: number;
    imageUrl?: string;
    videoUrl?: string; // Original video URL for video posts
    thumbnailUrl?: string; // Dedicated thumbnail URL
    mediaThumbnailUrl?: string; // PostCard compatible thumbnail field
    media_thumb_url?: string; // Alternative thumbnail field name
    media_url?: string; // Alternative media URL field name
    type?: 'image' | 'video' | 'audio' | 'thought';
    post_type?: 'image' | 'video' | 'audio' | 'thought'; // Alternative type field
    mediaType?: string;
    isSaved?: boolean; // Flag to indicate this is a saved post
  };
  onClick?: (post: any) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  showMenu?: boolean; // Show the three-dot menu (typically for own posts)
}

export function ProfileMediaCard({ post, onClick, onEdit, onDelete, showMenu = false }: ProfileMediaCardProps) {
  const [isClicked, setIsClicked] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  // Determine post type from available data
  const getPostType = () => {
    if (post.type) {
      switch (post.type) {
        case 'image': return 'Photo';
        case 'video': return 'Video';
        case 'audio': return 'Audio';
        case 'thought': return 'Thought';
        default: return 'Thought'; // Default to 'Thought' instead of 'Post'
      }
    }
    
    // Fallback logic based on media URL or type
    if (post.imageUrl) {
      if (post.mediaType?.includes('video') || post.imageUrl.includes('.mp4') || post.imageUrl.includes('.mov')) {
        return 'Video';
      }
      if (post.mediaType?.includes('audio') || post.imageUrl.includes('.mp3') || post.imageUrl.includes('.wav')) {
        return 'Audio';
      }
      return 'Photo';
    }
    
    return 'Thought'; // Default to 'Thought' instead of 'Post'
  };

  const getPostIcon = () => {
    const type = getPostType();
    switch (type) {
      case 'Photo': return <Image className="w-3 h-3" />;
      case 'Video': return <Video className="w-3 h-3" />;
      case 'Audio': return <Mic className="w-3 h-3" />;
      default: return <MessageCircle className="w-3 h-3" />;
    }
  };

  const postType = getPostType();
  const hasMedia = post.imageUrl && postType !== 'Thought';

  // Simplified debug log for video posts
  if (postType === 'Video' && process.env.NODE_ENV === 'development') {
    console.log('🎬 Video post card rendered for:', post.id);
  }

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    // Prevent multiple rapid clicks or if already processing
    if (isClicked || isProcessing) {
      console.log('Card click ignored - already clicked or processing');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Prevent card click when interacting with media controls or menu
    const target = e.target as HTMLElement;
    const isMediaControl = target.closest('button') || 
                          target.closest('input') || 
                          target.closest('audio') || 
                          target.closest('video') ||
                          target.closest('[role="button"]') ||
                          target.closest('.waveform-slider') ||
                          target.closest('[data-radix-popper-content-wrapper]') ||
                          target.closest('[role="menu"]') ||
                          target.closest('.three-dot-menu');
    
    if (isMediaControl) {
      console.log('Media control or menu clicked, not triggering card click');
      return;
    }
    
    // Prevent event bubbling and default behavior
    e.preventDefault();
    e.stopPropagation();
    
    if (onClick) {
      console.log('Card click triggered for post:', post.id);
      setIsClicked(true);
      setIsProcessing(true);
      
      // Use requestAnimationFrame for smoother handling
      requestAnimationFrame(() => {
        onClick(post);
        
        // Reset processing state quickly
        setTimeout(() => setIsProcessing(false), 300);
        
        // Reset click state after longer delay
        setTimeout(() => setIsClicked(false), 1000);
      });
    }
  }, [isClicked, isProcessing, onClick, post]);

  const handleEdit = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) {
      onEdit(post.id);
    }
  }, [onEdit, post.id]);

  const handleDelete = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(post.id);
    }
  }, [onDelete, post.id]);

  return (
    <div 
      onClick={handleClick}
      className={`bg-gradient-to-br from-midnight-black/90 to-midnight-black/70 border border-muted-lavender/20 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-neon-lilac/40 hover:shadow-lg hover:shadow-neon-lilac/10 group touch-manipulation relative min-h-[320px] flex flex-col ${
        isClicked ? 'opacity-80 scale-95 border-neon-lilac/60' : ''
      } ${isProcessing ? 'pointer-events-none' : ''}`}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {/* Three-dot menu */}
      {showMenu && (
        <div className="absolute top-3 right-3 z-10 three-dot-menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-midnight-black/80 hover:bg-midnight-black/90 border border-muted-lavender/20 hover:border-muted-lavender/40 backdrop-blur-sm rounded-full transition-all duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <MoreHorizontal className="h-4 w-4 text-pearl-white" />
                <span className="sr-only">Post options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-midnight-black/95 backdrop-blur-sm border-muted-lavender/30"
            >
              <DropdownMenuItem
                onClick={handleEdit}
                className="flex items-center space-x-2 text-pearl-white hover:bg-muted-lavender/10 focus:bg-muted-lavender/10 cursor-pointer"
              >
                <Edit3 className="h-4 w-4 text-electric-blue" />
                <span>Edit post</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="flex items-center space-x-2 text-pearl-white hover:bg-glitch-red/10 focus:bg-glitch-red/10 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 text-glitch-red" />
                <span>Delete post</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Media Section - Consistent Heights for All Post Types */}
      <div className="relative overflow-hidden flex-1 min-h-[200px] flex items-center justify-center">
        {hasMedia ? (
          <>
            {/* Audio Post Media */}
            {postType === 'Audio' && (
              <div className="absolute inset-0 p-4 bg-gradient-to-br from-midnight-black/80 to-midnight-black/60 flex flex-col justify-center">
                {/* Audio header */}
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-6 h-6 bg-neon-lilac/20 rounded-full flex items-center justify-center">
                    <Mic className="w-3 h-3 text-neon-lilac" />
                  </div>
                  <span className="text-xs text-muted-lavender font-body">Audio</span>
                </div>
                
                {/* Audio Player */}
                <div className="flex-1 flex items-center">
                  <WaveformAudioPlayer 
                    audioUrl={post.imageUrl!}
                    className="border-0 bg-transparent p-0 w-full"
                  />
                </div>
              </div>
            )}

            {/* Video Post Media */}
            {postType === 'Video' && (
              <div className="relative h-[220px] overflow-hidden rounded-lg bg-midnight-black/20">
                {/* Video thumbnail image - z-0 */}
                <img
                  src={videoThumbnailFixed}
                  alt="Video thumbnail"
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  loading="lazy"
                  onError={(e) => {
                    console.warn('Video thumbnail failed to load');
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* Gradient overlay - z-10 */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30 z-10" />
                
                {/* Play button - z-20 */}
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="w-16 h-16 bg-black/70 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg transition-all duration-200 hover:bg-black/80 hover:scale-105">
                    <div className="w-0 h-0 border-l-[12px] border-l-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1"></div>
                  </div>
                </div>
                
                {/* Video badge - z-30 */}
                <div className="absolute top-3 left-3 z-30">
                  <div className="flex items-center space-x-1.5 bg-midnight-black/80 backdrop-blur-sm rounded-full px-2.5 py-1 border border-muted-lavender/20">
                    <div className="text-electric-blue">
                      <Video className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-medium text-pearl-white">
                      Video
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Image/Photo Post Media */}
            {postType === 'Photo' && (
              <>
                <div className="absolute inset-0">
                  <ImageWithFallback
                    src={post.imageUrl!}
                    alt={`${postType} content`}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                
                {/* Media Type Overlay for images */}
                <div className="absolute top-3 left-3">
                  <div className="flex items-center space-x-1.5 bg-midnight-black/80 backdrop-blur-sm rounded-full px-2.5 py-1 border border-muted-lavender/20">
                    <div className="text-electric-blue">
                      {getPostIcon()}
                    </div>
                    <span className="text-xs font-medium text-pearl-white">
                      {postType}
                    </span>
                  </div>
                </div>

                {/* Gradient Overlay for Text Readability */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-midnight-black/90 to-transparent" />
              </>
            )}
          </>
        ) : (
          // Thought posts - clean design matching reference image
          <div className="absolute inset-0 bg-gradient-to-br from-midnight-black/90 to-midnight-black/70">
            {/* Thought tag in top-left corner */}
            <div className="absolute top-3 left-3">
              <div className="flex items-center space-x-1.5 bg-midnight-black/80 backdrop-blur-sm rounded-full px-2.5 py-1 border border-muted-lavender/20">
                <div className="text-electric-blue">
                  <MessageCircle className="w-3 h-3" />
                </div>
                <span className="text-xs font-medium text-pearl-white">
                  Thought
                </span>
              </div>
            </div>
            
            {/* Content area - positioned to not overlap with bottom interaction area */}
            <div className="absolute inset-x-4 top-16 bottom-20 flex items-center justify-center">
              <div className="text-center max-w-full px-2">
                <p className="text-pearl-white font-body leading-relaxed text-sm line-clamp-4">
                  {post.caption || 'No content'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 mt-auto">
        {/* Caption */}
        <div className="mb-3">
          <p className="text-sm text-pearl-white line-clamp-2 leading-relaxed">
            {post.caption || 'No caption provided'}
          </p>
        </div>

        {/* Interaction Stats */}
        <div className="flex items-center justify-between">
          {/* Show stats only for regular posts, not saved posts */}
          {!post.isSaved && (
            <div className="flex items-center space-x-4">
              {/* Likes */}
              <div className="flex items-center space-x-1.5 group/like">
                <Heart className="w-4 h-4 text-muted-lavender/70 transition-colors duration-200 group-hover/like:text-soft-blush" />
                <span className="text-xs text-muted-lavender/70 font-medium">
                  {post.likes}
                </span>
              </div>

              {/* Comments */}
              <div className="flex items-center space-x-1.5 group/comment">
                <MessageCircle className="w-4 h-4 text-muted-lavender/70 transition-colors duration-200 group-hover/comment:text-electric-blue" />
                <span className="text-xs text-muted-lavender/70 font-medium">
                  {post.comments}
                </span>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <span className="text-xs text-muted-lavender/50 font-medium">
            {post.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
}