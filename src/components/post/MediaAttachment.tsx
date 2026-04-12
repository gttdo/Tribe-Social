import React, { useEffect, useState } from 'react';
import { X, Play, Pause, Volume2 } from 'lucide-react';

interface MediaAttachmentProps {
  file: File | null;
  audioBlob: Blob | null;
  onRemove: () => void;
}

export function MediaAttachment({ file, audioBlob, onRemove }: MediaAttachmentProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const source = audioBlob || file;
    if (source) {
      const url = URL.createObjectURL(source);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file, audioBlob]);

  if (!previewUrl) return null;

  const isImage = file?.type.startsWith('image/');
  const isVideo = file?.type.startsWith('video/');
  const isAudio = !!audioBlob || file?.type.startsWith('audio/');

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/30 bg-muted/5">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-midnight-black/80 border border-border/30 flex items-center justify-center text-pearl-white hover:bg-glitch-red/80 transition-colors"
        aria-label="Remove attachment"
      >
        <X className="w-4 h-4" />
      </button>

      {isImage && (
        <img
          src={previewUrl}
          alt="Attached image"
          className="w-full max-h-[480px] object-contain bg-black/50"
        />
      )}

      {isVideo && (
        <video
          src={previewUrl}
          className="w-full max-h-[480px] object-contain bg-black/50"
          controls
          preload="metadata"
        />
      )}

      {isAudio && (
        <div className="flex items-center gap-3 p-4">
          <audio
            ref={audioRef}
            src={previewUrl}
            onEnded={() => setIsPlaying(false)}
          />
          <button
            onClick={toggleAudio}
            className="w-10 h-10 rounded-full bg-neon-lilac/20 flex items-center justify-center text-neon-lilac hover:bg-neon-lilac/30 transition-colors shrink-0"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-lavender/70">
            <Volume2 className="w-4 h-4" />
            <span>Audio recording</span>
          </div>
        </div>
      )}
    </div>
  );
}
