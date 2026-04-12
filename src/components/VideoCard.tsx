import React from 'react';
import { FeedPost } from '../utils/social-feed-types';

interface VideoCardProps {
  post: FeedPost;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * VideoCard component that uses poster for feed display
 * Based on user's suggested implementation for bandwidth optimization
 */
export function VideoCard({ 
  post, 
  controls = false, 
  autoPlay = false, 
  muted = true,
  className = "",
  onClick
}: VideoCardProps) {
  const poster = post.mediaThumbnailUrl ?? undefined; // fallback handled by CSS or skeleton
  
  return (
    <video
      className={`w-full rounded-xl bg-muted video-responsive ${className}`}
      controls={controls}
      playsInline
      preload="metadata"
      poster={poster}
      autoPlay={autoPlay}
      muted={muted}
      // Option A: do not set src until user taps play (save bandwidth)
      // Option B: set src now but keep controls hidden for a feed look
      src={post.imageUrl}
      onClick={onClick}
      onError={(e) => {
        // Show a neutral placeholder if both poster & video fail
        (e.currentTarget as HTMLVideoElement).poster = '';
        console.log('VideoCard: Video failed to load for post', post.id, post.imageUrl);
      }}
    />
  );
}

/**
 * VideoThumbnail component for use in list tiles and grids
 * Uses the thumbnail as a regular image with video indicator overlay
 */
export function VideoThumbnail({ 
  post, 
  className = "h-16 w-16 rounded-md object-cover",
  showPlayIcon = true,
  onClick
}: {
  post: FeedPost;
  className?: string;
  showPlayIcon?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      <img
        src={post.mediaThumbnailUrl || '/static/video-placeholder.webp'}
        alt="Video thumbnail"
        className={className}
        onError={(e) => {
          // Fallback to a placeholder image
          (e.currentTarget as HTMLImageElement).src = '/static/video-placeholder.webp';
        }}
      />
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
          <div className="w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
            <svg 
              className="w-3 h-3 text-white ml-0.5" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}