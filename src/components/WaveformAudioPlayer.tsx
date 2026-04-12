import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

interface WaveformAudioPlayerProps {
  audioUrl: string;
  className?: string;
  autoPlay?: boolean;
}

export function WaveformAudioPlayer({ audioUrl, className = '', autoPlay = false }: WaveformAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioData, setAudioData] = useState<number[]>([]);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Generate waveform data (mock data for now - in a real app you'd analyze the audio)
  const generateWaveformData = useCallback(() => {
    const bars = 60; // Number of bars in the waveform
    const data = [];
    for (let i = 0; i < bars; i++) {
      // Create a more realistic waveform pattern matching the mockup
      const progress = i / bars;
      
      // Create varied heights with some peaks and valleys
      let height;
      if (i < 8) {
        // Start with lower bars
        height = 0.2 + Math.random() * 0.3;
      } else if (i < 15) {
        // Build up
        height = 0.4 + Math.random() * 0.4;
      } else if (i < 25) {
        // Peak section
        height = 0.6 + Math.random() * 0.4;
      } else if (i < 35) {
        // High activity
        height = 0.7 + Math.random() * 0.3;
      } else if (i < 45) {
        // Medium activity  
        height = 0.5 + Math.random() * 0.4;
      } else {
        // Fade out
        height = 0.3 + Math.random() * 0.3;
      }
      
      data.push(Math.max(0.1, Math.min(1, height)));
    }
    return data;
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        setIsLoading(false);
        setAudioData(generateWaveformData());
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handleLoadStart = () => {
        setIsLoading(true);
      };

      const handleCanPlay = () => {
        setIsLoading(false);
        if (autoPlay) {
          handlePlay();
        }
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [audioUrl, autoPlay, generateWaveformData]);

  const handlePlay = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && progressRef.current && duration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className={`w-full bg-midnight-black/50 border border-muted-lavender/20 rounded-2xl p-4 ${className}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
      />
      
      <div className="flex items-center space-x-4">
        {/* Play/Pause Button */}
        <Button
          onClick={handlePlay}
          disabled={isLoading}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white border-0 shadow-lg dreamy-glow flex-shrink-0"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6" fill="currentColor" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
          )}
        </Button>

        {/* Waveform and Progress */}
        <div className="flex-1">
          <div 
            ref={progressRef}
            onClick={handleProgressClick}
            className="relative h-12 cursor-pointer group"
          >
            {/* Waveform Bars */}
            <div className="flex items-end justify-between h-full space-x-[1px]">
              {audioData.map((height, index) => {
                const barProgress = index / audioData.length;
                const isActive = barProgress <= progress;
                
                return (
                  <div
                    key={index}
                    className={`flex-1 rounded-sm transition-all duration-150 ${
                      isActive 
                        ? 'bg-gradient-to-t from-neon-lilac to-electric-blue' 
                        : 'bg-muted-lavender/30 group-hover:bg-muted-lavender/50'
                    }`}
                    style={{ 
                      height: `${Math.max(8, height * 100)}%`,
                      minHeight: '4px'
                    }}
                  />
                );
              })}
            </div>

            {/* Progress Line */}
            <div 
              className="absolute top-0 w-0.5 h-full bg-pearl-white/80 shadow-md transition-all duration-150"
              style={{ left: `${progress * 100}%` }}
            />
          </div>

          {/* Time Display */}
          <div className="flex justify-between items-center mt-2 text-xs text-muted-lavender font-body">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 text-muted-lavender hover:text-pearl-white"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-muted-lavender/20 rounded-lg outline-none slider"
            style={{
              background: `linear-gradient(to right, #C084FC 0%, #C084FC ${(isMuted ? 0 : volume) * 100}%, rgba(221, 214, 254, 0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(221, 214, 254, 0.2) 100%)`
            }}
          />
        </div>
      </div>
    </div>
  );
}