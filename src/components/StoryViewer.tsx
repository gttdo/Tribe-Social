import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { TribeAccessRequestDialog } from './TribeAccessRequestDialog';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  MessageCircle, 
  Eye,
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Lock,
  Shield
} from 'lucide-react';
import { StoryGroup, Story } from '../utils/story-types';
import { markStoryAsViewed, addStoryReaction, removeStoryReaction } from '../utils/story-helpers';
import { hasRequestedAccess } from '../utils/tribe-access-helpers';
import { formatTimeAgo } from '../utils/timestamp-helpers';

interface StoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  storyGroups: StoryGroup[];
  initialGroupIndex?: number;
  initialStoryIndex?: number;
}

export function StoryViewer({ 
  isOpen, 
  onClose, 
  storyGroups, 
  initialGroupIndex = 0,
  initialStoryIndex = 0 
}: StoryViewerProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [hasRequestedTribeAccess, setHasRequestedTribeAccess] = useState(false);

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const isVideo = currentStory?.media_type === 'video';

  // Story duration constants
  const IMAGE_DURATION = 5000; // 5 seconds for images
  const VIDEO_DURATION = currentStory?.duration_seconds ? currentStory.duration_seconds * 1000 : 15000; // Use actual duration or 15 seconds default

  const storyDuration = isVideo ? VIDEO_DURATION : IMAGE_DURATION;

  // Mark story as viewed when it loads
  useEffect(() => {
    if (currentStory && isOpen) {
      markStoryAsViewed({ story_id: currentStory.id });
    }
  }, [currentStory?.id, isOpen]);

  // Progress tracking
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    startTimeRef.current = Date.now();
    setProgress(0);

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / storyDuration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        nextStory();
      }
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [currentStoryIndex, currentGroupIndex, isPlaying, isOpen, storyDuration]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    const handleLoadedMetadata = () => {
      if (isPlaying) {
        video.play().catch(console.error);
      }
    };

    const handleEnded = () => {
      nextStory();
    };

    const handleTimeUpdate = () => {
      if (video.duration > 0) {
        const progress = (video.currentTime / video.duration) * 100;
        setProgress(progress);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [currentStory, isPlaying]);

  // Pause/resume video when play state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    if (isPlaying) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [isPlaying, isVideo]);

  // Check if user has already requested access to this tribe
  useEffect(() => {
    const checkAccessStatus = async () => {
      if (currentGroup?.tribe?.id && currentGroup.tribe.is_private) {
        try {
          const requested = await hasRequestedAccess(currentGroup.tribe.id);
          setHasRequestedTribeAccess(requested);
        } catch (error) {
          console.warn('Error checking tribe access status:', error);
        }
      }
    };

    checkAccessStatus();
  }, [currentGroup?.tribe?.id, currentGroup?.tribe?.is_private]);

  const handleAccessRequestSent = () => {
    setHasRequestedTribeAccess(true);
  };

  const nextStory = useCallback(() => {
    const nextStoryIndex = currentStoryIndex + 1;
    
    if (nextStoryIndex < currentGroup.stories.length) {
      // Next story in current group
      setCurrentStoryIndex(nextStoryIndex);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      // First story of next group
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      // End of all stories
      onClose();
    }
    
    setProgress(0);
    setUserReaction(null);
  }, [currentStoryIndex, currentGroupIndex, currentGroup?.stories.length, storyGroups.length, onClose]);

  const previousStory = useCallback(() => {
    const previousStoryIndex = currentStoryIndex - 1;
    
    if (previousStoryIndex >= 0) {
      // Previous story in current group
      setCurrentStoryIndex(previousStoryIndex);
    } else if (currentGroupIndex > 0) {
      // Last story of previous group
      const previousGroup = storyGroups[currentGroupIndex - 1];
      setCurrentGroupIndex(currentGroupIndex - 1);
      setCurrentStoryIndex(previousGroup.stories.length - 1);
    }
    
    setProgress(0);
    setUserReaction(null);
  }, [currentStoryIndex, currentGroupIndex, storyGroups]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStoryTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width * 0.3) {
      // Left side - previous story
      previousStory();
    } else if (x > width * 0.7) {
      // Right side - next story
      nextStory();
    } else {
      // Center - pause/play
      togglePlayPause();
    }
  };

  const handleReaction = async (reaction: string) => {
    if (!currentStory) return;

    try {
      if (userReaction === reaction) {
        // Remove existing reaction
        await removeStoryReaction({ story_id: currentStory.id, reaction });
        setUserReaction(null);
      } else {
        // Add or update reaction
        await addStoryReaction({ story_id: currentStory.id, reaction });
        setUserReaction(reaction);
      }
    } catch (error) {
      console.error('Error handling story reaction:', error);
    }
  };

  const handleClose = () => {
    setIsPlaying(false);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          previousStory();
          break;
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextStory();
          break;
        case 'Escape':
          handleClose();
          break;
        case 'k':
          togglePlayPause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextStory, previousStory]);

  if (!currentStory || !currentGroup) {
    return null;
  }

  // Format timestamp with consistent "username • time" format for non-private stories
  const getDisplayTimestamp = () => {
    if (currentGroup.user?.is_private) {
      return 'Private story';
    }
    
    const username = currentGroup.user?.nickname || currentGroup.user?.username || 'Unknown User';
    const timeAgo = formatTimeAgo(currentStory.created_at);
    return `${username} • ${timeAgo}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm h-screen p-0 bg-midnight-black border-none sm:max-w-md sm:h-[80vh] sm:rounded-2xl overflow-hidden">
        {/* Hidden accessibility elements */}
        <DialogHeader className="sr-only">
          <DialogTitle>
            Story Viewer - {currentGroup.user?.is_private 
              ? 'Private Story' 
              : (currentGroup.user?.nickname || currentGroup.user?.username || 'Unknown User')
            }
          </DialogTitle>
          <DialogDescription>
            {currentGroup.user?.is_private 
              ? 'This is a private story. You may need permission to view it.'
              : `Viewing story from ${currentGroup.user?.nickname || currentGroup.user?.username || 'Unknown User'}. Use arrow keys or tap to navigate, space to pause/play.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative w-full h-full flex flex-col">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 p-3">
            <div className="flex gap-1">
              {currentGroup.stories.map((_, index) => (
                <div
                  key={index}
                  className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                    style={{
                      width: index < currentStoryIndex 
                        ? '100%' 
                        : index === currentStoryIndex 
                          ? `${progress}%` 
                          : '0%'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between p-3 pt-8">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border-2 border-white/50">
                <AvatarImage src={currentGroup.user?.is_private ? undefined : currentGroup.user?.avatar_url} />
                <AvatarFallback className="bg-neon-lilac/20 text-white text-xs">
                  {currentGroup.user?.is_private ? (
                    '🔒'
                  ) : (
                    currentGroup.user?.nickname?.[0] || currentGroup.user?.username?.[0] || 'U'
                  )}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-body text-white font-medium text-sm truncate">
                    {currentGroup.user?.is_private 
                      ? 'Private User' 
                      : (currentGroup.user?.nickname || currentGroup.user?.username || 'Unknown User')
                    }
                  </h3>
                  {currentGroup.tribe && (
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs border-none">
                      {currentGroup.tribe.is_private ? (
                        <>🔒 Private Tribe</>
                      ) : (
                        currentGroup.tribe.name
                      )}
                    </Badge>
                  )}
                </div>
                <p className="font-body text-white/70 text-xs">
                  {getDisplayTimestamp()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isVideo && !currentGroup.user?.is_private && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-8 h-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlayPause}
                    className="w-8 h-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="w-8 h-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Media Content */}
          <div 
            className="flex-1 relative cursor-pointer select-none"
            onClick={currentGroup.user?.is_private ? undefined : handleStoryTap}
          >
            {currentGroup.user?.is_private ? (
              // Show locked state for private stories
              <div className="w-full h-full bg-midnight-black/80 flex flex-col items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 mx-auto bg-muted-lavender/10 rounded-full flex items-center justify-center">
                    <Lock className="w-10 h-10 text-muted-lavender/60" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-headline text-white text-lg">This story is private</h3>
                    <p className="font-body text-white/70 text-sm max-w-xs">
                      {currentGroup.tribe?.is_private 
                        ? "Join this tribe to view their stories" 
                        : "You don't have permission to view this story"
                      }
                    </p>
                    
                    {/* Request Access Button for Private Tribes */}
                    {currentGroup.tribe?.is_private && currentGroup.tribe?.id && (
                      <div className="pt-2">
                        {hasRequestedTribeAccess ? (
                          <div className="bg-electric-blue/10 border border-electric-blue/30 rounded-lg p-3">
                            <p className="text-electric-blue text-sm font-body">
                              ✓ Request Sent
                            </p>
                            <p className="text-electric-blue/70 text-xs font-body mt-1">
                              Waiting for admin approval
                            </p>
                          </div>
                        ) : (
                          <TribeAccessRequestDialog
                            tribeId={currentGroup.tribe.id}
                            tribeName={currentGroup.tribe.name}
                            onRequestSent={handleAccessRequestSent}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-neon-lilac/10 border-neon-lilac/30 text-neon-lilac hover:bg-neon-lilac/20 hover:border-neon-lilac/50"
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Request Access
                            </Button>
                          </TribeAccessRequestDialog>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : isVideo ? (
              <video
                ref={videoRef}
                src={currentStory.media_url}
                className="w-full h-full object-cover"
                muted={isMuted}
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}

            {/* Tap zones for navigation - only for non-private stories */}
            {!currentGroup.user?.is_private && (
              <div className="absolute inset-0 flex">
                <div className="w-1/3 h-full" />
                <div className="w-1/3 h-full flex items-center justify-center">
                  {!isPlaying && (
                    <div className="bg-black/50 rounded-full p-3">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="w-1/3 h-full" />
              </div>
            )}
          </div>

          {/* Caption - only show for non-private stories */}
          {currentStory.caption && !currentGroup.user?.is_private && (
            <div className="absolute bottom-20 left-0 right-0 z-20 p-4">
              <p className="font-body text-white text-sm bg-black/30 backdrop-blur-sm rounded-lg p-3">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Action buttons - disabled for private stories */}
          <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReaction('like')}
                disabled={currentGroup.user?.is_private}
                className={`w-10 h-10 p-0 rounded-full ${
                  currentGroup.user?.is_private
                    ? 'text-white/30 cursor-not-allowed'
                    : userReaction === 'like' 
                    ? 'text-red-500 bg-red-500/20' 
                    : 'text-white/70 hover:text-red-500 hover:bg-red-500/10'
                }`}
              >
                <Heart className={`w-5 h-5 ${userReaction === 'like' ? 'fill-current' : ''}`} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReactions(!showReactions)}
                disabled={currentGroup.user?.is_private}
                className={`w-10 h-10 p-0 rounded-full ${
                  currentGroup.user?.is_private
                    ? 'text-white/30 cursor-not-allowed'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
            </div>

            {/* Navigation arrows for larger screens */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={previousStory}
                disabled={currentGroupIndex === 0 && currentStoryIndex === 0}
                className="w-10 h-10 p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-full disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={nextStory}
                className="w-10 h-10 p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Quick reactions overlay - only for non-private stories */}
          {showReactions && !currentGroup.user?.is_private && (
            <div className="absolute bottom-16 left-4 right-4 z-30 bg-black/80 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3 justify-center">
                {['❤️', '😂', '😮', '😢', '😡', '👏'].map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    onClick={() => {
                      handleReaction(emoji);
                      setShowReactions(false);
                    }}
                    className="w-12 h-12 p-0 text-2xl hover:bg-white/10 rounded-full"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}