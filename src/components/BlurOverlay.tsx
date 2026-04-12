import React from 'react';
import { Button } from './ui/button';
import { Lock, Users } from 'lucide-react';
import { getTruncatedCaption, getContentTypeDisplayName } from '../utils/visibility-helpers';

interface BlurOverlayProps {
  /** Content type for display messaging */
  contentType: 'image' | 'video' | 'audio' | 'text' | 'thought';
  
  /** Name of the tribe that has access */
  tribeName: string;
  
  /** ID of the tribe for join action */
  tribeId: string;
  
  /** Whether the tribe is private */
  isPrivate?: boolean;
  
  /** Optional caption/content preview */
  caption?: string;
  
  /** Optional custom blur strength (default: 'blur-lg') */
  blurStrength?: 'blur-sm' | 'blur-md' | 'blur-lg' | 'blur-xl';
  
  /** Whether to maintain aspect ratio (default: true) */
  maintainAspectRatio?: boolean;
  
  /** Custom aspect ratio (e.g., '16/9', '1/1', '4/5') */
  aspectRatio?: string;
  
  /** Custom height for the overlay container */
  height?: string;
  
  /** Custom width for the overlay container */
  width?: string;
  
  /** Callback when join button is clicked */
  onJoinClick: (tribeId: string) => void;
  
  /** Custom children to render in the background (for complex content) */
  children?: React.ReactNode;
  
  /** Additional CSS classes */
  className?: string;
}

export function BlurOverlay({
  contentType,
  tribeName,
  tribeId,
  isPrivate = false,
  caption,
  blurStrength = 'blur-lg',
  maintainAspectRatio = true,
  aspectRatio = '1/1',
  height,
  width,
  onJoinClick,
  children,
  className = ''
}: BlurOverlayProps) {
  const truncatedCaption = caption ? getTruncatedCaption(caption, 50) : '';
  const contentDisplayName = getContentTypeDisplayName(contentType);
  
  const containerStyle: React.CSSProperties = {
    ...(maintainAspectRatio && aspectRatio ? { aspectRatio } : {}),
    ...(height ? { height } : {}),
    ...(width ? { width } : {})
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-midnight-black/80 ${className}`}
      style={containerStyle}
    >
      {/* Background Content (if provided) */}
      {children && (
        <div className={`absolute inset-0 ${blurStrength}`}>
          {children}
        </div>
      )}
      
      {/* Default background pattern for content without children */}
      {!children && (
        <div className={`absolute inset-0 ${blurStrength}`}>
          <div className="w-full h-full bg-gradient-to-br from-muted-lavender/20 via-electric-blue/10 to-neon-lilac/20">
            {/* Subtle pattern overlay */}
            <div 
              className="w-full h-full opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C084FC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px'
              }}
            />
          </div>
        </div>
      )}
      
      {/* Overlay Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-midnight-black/40">
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-full bg-midnight-black/80 border-2 border-muted-lavender/40 flex items-center justify-center mb-4 backdrop-blur-sm">
          <Lock className="w-8 h-8 text-muted-lavender" />
        </div>
        
        {/* Main Message */}
        <div className="text-center space-y-2 mb-6">
          <h3 className="font-headline text-pearl-white text-lg">
            Join {tribeName} to View
          </h3>
          <p className="text-muted-lavender font-body text-sm max-w-xs">
            This {contentDisplayName} is only visible to {isPrivate ? 'approved members' : 'members'} of {tribeName}
          </p>
        </div>
        
        {/* Join Button */}
        <Button
          onClick={() => onJoinClick(tribeId)}
          className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white font-body rounded-xl px-6 py-2 transition-all duration-300 transform hover:scale-105"
        >
          <Users className="w-4 h-4 mr-2" />
          {isPrivate ? 'Request Access' : `Join ${tribeName}`}
        </Button>
        
        {/* Truncated Caption Preview */}
        {truncatedCaption && (
          <div className="mt-4 pt-4 border-t border-muted-lavender/20">
            <p className="text-muted-lavender/60 font-body text-xs text-center max-w-xs leading-relaxed">
              "{truncatedCaption}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Specialized blur overlay for images
 */
export function ImageBlurOverlay({
  imageUrl,
  alt,
  tribeName,
  tribeId,
  isPrivate,
  caption,
  onJoinClick,
  className = '',
  ...props
}: Omit<BlurOverlayProps, 'contentType' | 'children'> & {
  imageUrl: string;
  alt: string;
}) {
  return (
    <BlurOverlay
      contentType="image"
      tribeName={tribeName}
      tribeId={tribeId}
      isPrivate={isPrivate}
      caption={caption}
      onJoinClick={onJoinClick}
      className={className}
      {...props}
    >
      <img 
        src={imageUrl} 
        alt={alt}
        className="w-full h-full object-contain"
      />
    </BlurOverlay>
  );
}

/**
 * Specialized blur overlay for videos
 */
export function VideoBlurOverlay({
  videoUrl,
  posterUrl,
  tribeName,
  tribeId,
  isPrivate,
  caption,
  onJoinClick,
  className = '',
  ...props
}: Omit<BlurOverlayProps, 'contentType' | 'children'> & {
  videoUrl: string;
  posterUrl?: string;
}) {
  return (
    <BlurOverlay
      contentType="video"
      tribeName={tribeName}
      tribeId={tribeId}
      isPrivate={isPrivate}
      caption={caption}
      onJoinClick={onJoinClick}
      className={className}
      {...props}
    >
      <video 
        src={videoUrl}
        poster={posterUrl}
        className="w-full h-full object-contain"
        muted
      />
    </BlurOverlay>
  );
}

/**
 * Specialized blur overlay for audio content
 */
export function AudioBlurOverlay({
  audioUrl,
  tribeName,
  tribeId,
  isPrivate,
  caption,
  onJoinClick,
  className = '',
  ...props
}: Omit<BlurOverlayProps, 'contentType' | 'children'> & {
  audioUrl: string;
}) {
  return (
    <BlurOverlay
      contentType="audio"
      tribeName={tribeName}
      tribeId={tribeId}
      isPrivate={isPrivate}
      caption={caption}
      onJoinClick={onJoinClick}
      className={className}
      height="200px"
      maintainAspectRatio={false}
      {...props}
    >
      {/* Audio waveform visualization background */}
      <div className="w-full h-full bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 flex items-center justify-center">
        <div className="flex items-end space-x-1 opacity-40">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="bg-pearl-white/60 rounded-full animate-pulse"
              style={{
                width: '3px',
                height: `${Math.random() * 40 + 10}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      </div>
    </BlurOverlay>
  );
}