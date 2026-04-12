import React from 'react';
import { Video, Play, Clock } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface VideoPlaceholderProps {
  coreRealm: string;
  variant?: 'generating' | 'unavailable' | 'loading';
  className?: string;
  aspectRatio?: string;
}

export function VideoPlaceholder({ 
  coreRealm, 
  variant = 'generating', 
  className = '',
  aspectRatio = '16/9'
}: VideoPlaceholderProps) {
  const getPlaceholderContent = () => {
    switch (variant) {
      case 'generating':
        return {
          icon: <Clock className="w-12 h-12 text-muted-lavender/40 mx-auto animate-spin" />,
          title: "Generating thumbnail...",
          subtitle: "This may take a moment"
        };
      case 'loading':
        return {
          icon: <Video className="w-12 h-12 text-muted-lavender/40 mx-auto animate-pulse" />,
          title: "Loading video...",
          subtitle: "Please wait"
        };
      case 'unavailable':
      default:
        return {
          icon: <Video className="w-12 h-12 text-muted-lavender/40 mx-auto" />,
          title: "Video content",
          subtitle: "Thumbnail not available"
        };
    }
  };

  const content = getPlaceholderContent();

  return (
    <div 
      className={`relative w-full rounded-2xl overflow-hidden ${className}`}
      style={{ aspectRatio }}
    >
      {/* Background image */}
      <ImageWithFallback
        src="https://images.unsplash.com/photo-1608186286925-8c0e1c1fbeac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8fDE3NTU3MDI0NDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
        alt="Video placeholder background"
        className="absolute inset-0 w-full h-full object-cover opacity-20"
        fallback={<div className="absolute inset-0 bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5" />}
      />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-midnight-black/80 via-midnight-black/60 to-midnight-black/80" />
      
      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-3 p-6">
          {content.icon}
          <div className="space-y-1">
            <p className="text-sm text-muted-lavender/80 font-body font-medium">
              {content.title}
            </p>
            <p className="text-xs text-muted-lavender/60 font-body">
              {content.subtitle}
            </p>
            <p className="text-xs text-muted-lavender/40 font-body mt-2">
              {coreRealm} Style
            </p>
          </div>
        </div>
      </div>
      
      {/* Play button overlay for generating/unavailable states */}
      {(variant === 'generating' || variant === 'unavailable') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute top-4 right-4">
            <div className="w-8 h-8 bg-black/30 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white/60 ml-0.5" fill="currentColor" />
            </div>
          </div>
        </div>
      )}
      
      {/* Border */}
      <div className="absolute inset-0 border border-muted-lavender/20 rounded-2xl pointer-events-none" />
    </div>
  );
}