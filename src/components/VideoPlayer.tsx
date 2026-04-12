import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle, RefreshCw } from 'lucide-react';
import { logVideoDebugInfo, generateVideoFallbacks } from '../utils/video-diagnostics';
import { logVideoError } from '../utils/video-error-suppression';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export function VideoPlayer({ 
  src, 
  poster, 
  className = "", 
  autoPlay = false, 
  muted = false, 
  loop = false 
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackSources, setFallbackSources] = useState<string[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update play state when video starts/pauses
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      if (isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };
    const handleTimeUpdate = () => {
      if (isFinite(video.currentTime)) {
        setCurrentTime(video.currentTime);
      }
    };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleError = (event: Event) => {
      const target = event.target as HTMLVideoElement;
      const error = target.error;
      
      let userMessage = 'Video could not be loaded';
      let debugMessage = 'Video loading error';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            userMessage = 'Video loading was interrupted';
            debugMessage = 'Video loading was aborted by user or system';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            userMessage = 'Network error - check your connection';
            debugMessage = 'Network error while loading video';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            userMessage = 'Video format not supported';
            debugMessage = 'Video format cannot be decoded by browser';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            userMessage = 'Video source not supported';
            debugMessage = 'Video file or format is not supported';
            break;
          default:
            userMessage = 'Unknown video error';
            debugMessage = 'Unknown video loading error';
        }
      }
      
      // Use centralized error logging that filters non-critical issues
      logVideoError(error, {
        videoUrl: src,
        errorMessage: debugMessage,
        component: 'VideoPlayer'
      });
      
      // Try fallback sources before showing error
      if (currentSourceIndex < fallbackSources.length - 1) {
        const nextIndex = currentSourceIndex + 1;
        const nextSource = fallbackSources[nextIndex];
        
        console.log(`Trying fallback source ${nextIndex + 1}/${fallbackSources.length}:`, nextSource);
        setCurrentSourceIndex(nextIndex);
        setIsBuffering(true);
        
        // Update video source
        if (target && nextSource) {
          target.src = nextSource;
          target.load();
        }
        
        return; // Don't show error yet, try the fallback
      }
      
      setErrorMessage(userMessage);
      setHasError(true);
      setIsBuffering(false);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    
    // Additional event listeners for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      video.addEventListener('loadstart', () => console.log('Video: Load started'));
      video.addEventListener('loadeddata', () => console.log('Video: Data loaded'));
      video.addEventListener('canplaythrough', () => console.log('Video: Can play through'));
      video.addEventListener('stalled', () => console.log('Video: Loading stalled'));
      video.addEventListener('suspend', () => console.log('Video: Loading suspended'));
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, []);

  // Initialize fallback sources and reset state when src changes
  useEffect(() => {
    if (src) {
      const fallbacks = generateVideoFallbacks(src);
      setFallbackSources(fallbacks);
      setCurrentSourceIndex(0);
      
      if (hasError) {
        console.log('Video src changed, resetting error state:', src);
        setHasError(false);
        setErrorMessage('');
        setRetryCount(0);
        setIsBuffering(false);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
      
      // Run diagnostics in development
      if (process.env.NODE_ENV === 'development') {
        logVideoDebugInfo(src, 'VideoPlayer initialization');
      }
    }
  }, [src]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControls && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (error) {
      console.error('Error toggling video playback:', error);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    
    if (newVolume === 0) {
      setIsMuted(true);
      video.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      video.muted = false;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const seekTime = (parseFloat(e.target.value) / 100) * duration;
      if (isFinite(seekTime) && seekTime >= 0 && seekTime <= duration) {
        video.currentTime = seekTime;
        setCurrentTime(seekTime);
      }
    } catch (error) {
      console.error('Error seeking video:', error);
    }
  };

  const handleMouseEnter = () => {
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 1000);
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Retry video loading
  const handleRetry = () => {
    const video = videoRef.current;
    if (!video) return;
    
    setHasError(false);
    setErrorMessage('');
    setIsBuffering(true);
    setRetryCount(prev => prev + 1);
    
    // Reset to original source on retry
    setCurrentSourceIndex(0);
    const sourceToTry = fallbackSources[0] || src;
    
    console.log(`Retrying video load (attempt ${retryCount + 1}):`, sourceToTry);
    
    // Reset video state
    video.currentTime = 0;
    video.src = sourceToTry;
    video.load(); // Reload the video
  };

  // Show error state if video failed to load
  if (hasError) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-midnight-black/50 flex items-center justify-center min-h-[200px] ${className}`}>
        <div className="text-center p-6 max-w-sm">
          <div className="w-16 h-16 bg-muted-lavender/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-muted-lavender/60" />
          </div>
          <p className="text-muted-lavender/80 text-sm mb-2 font-medium">
            {errorMessage || 'Video could not be loaded'}
          </p>
          <p className="text-muted-lavender/50 text-xs mb-4">
            Try refreshing or check your internet connection
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-neon-lilac/20 hover:bg-neon-lilac/30 text-neon-lilac border border-neon-lilac/40 rounded-lg transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">Retry</span>
          </button>
          {retryCount > 0 && (
            <p className="text-muted-lavender/40 text-xs mt-2">
              Retry attempts: {retryCount}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative group overflow-hidden rounded-lg ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={fallbackSources[currentSourceIndex] || src}
        poster={poster}
        className="w-full h-auto object-contain bg-midnight-black"
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
        controls={false}
        onClick={togglePlayPause}
        onLoadStart={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onStalled={() => console.log('Video stalled:', fallbackSources[currentSourceIndex] || src)}
      />

      {/* Play Button Overlay - Always visible when paused */}
      {(!isPlaying || showControls) && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <button
            onClick={togglePlayPause}
            className="w-20 h-20 bg-midnight-black/80 hover:bg-midnight-black/90 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm border-2 border-neon-lilac/50 hover:border-neon-lilac/80 dreamy-glow"
            disabled={isBuffering}
          >
            {isBuffering ? (
              <div className="w-8 h-8 border-2 border-neon-lilac border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 text-neon-lilac ml-0" />
            ) : (
              <Play className="w-8 h-8 text-neon-lilac ml-1" />
            )}
          </button>
        </div>
      )}

      {/* Bottom Controls - Show on hover or when paused */}
      {(showControls || !isPlaying) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-midnight-black/90 via-midnight-black/60 to-transparent p-4 transition-opacity duration-300">
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={progressPercentage}
                onChange={handleSeek}
                className="w-full h-1 bg-muted-lavender/30 rounded-full appearance-none cursor-pointer video-progress-slider"
                style={{
                  background: `linear-gradient(to right, #C084FC ${progressPercentage}%, rgba(221, 214, 254, 0.3) ${progressPercentage}%)`
                }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                className="p-2 text-pearl-white hover:text-neon-lilac transition-colors duration-200"
                disabled={isBuffering}
              >
                {isBuffering ? (
                  <div className="w-5 h-5 border border-pearl-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="p-2 text-pearl-white hover:text-neon-lilac transition-colors duration-200"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-muted-lavender/30 rounded-full appearance-none cursor-pointer video-volume-slider"
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="flex items-center space-x-2 text-sm text-pearl-white font-mono">
              <span>{formatTime(currentTime)}</span>
              <span className="text-muted-lavender">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}