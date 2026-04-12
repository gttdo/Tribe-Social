import React, { useRef } from 'react';
import { Camera, Video, Mic, Paperclip, Globe, Lock } from 'lucide-react';
import { validateMedia } from './post-constants';
import type { Visibility } from './post-constants';

interface MediaToolbarProps {
  onFileSelected: (file: File) => void;
  onCameraOpen: (mode: 'photo' | 'video') => void;
  onAudioOpen: () => void;
  onError: (message: string) => void;
  visibility: Visibility;
  onVisibilityChange: (v: Visibility) => void;
  disabled?: boolean;
  hasMedia: boolean;
}

export function MediaToolbar({
  onFileSelected, onCameraOpen, onAudioOpen, onError,
  visibility, onVisibilityChange, disabled, hasMedia,
}: MediaToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = validateMedia(file);
    if (!result.valid) {
      onError(result.error!);
      return;
    }
    onFileSelected(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex items-center justify-between border-t border-border/20 pt-3">
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={<Camera className="w-5 h-5" />}
          label="Camera"
          onClick={() => onCameraOpen('photo')}
          disabled={disabled || hasMedia}
        />
        <ToolbarButton
          icon={<Mic className="w-5 h-5" />}
          label="Record audio"
          onClick={onAudioOpen}
          disabled={disabled || hasMedia}
        />
        <ToolbarButton
          icon={<Paperclip className="w-5 h-5" />}
          label="Upload file"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || hasMedia}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      <button
        onClick={() => onVisibilityChange(visibility === 'public' ? 'tribe' : 'public')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-border/30 text-muted-lavender/70 hover:border-electric-blue/40 hover:text-electric-blue transition-colors"
        disabled={disabled}
      >
        {visibility === 'public' ? (
          <><Globe className="w-3.5 h-3.5" /> Public</>
        ) : (
          <><Lock className="w-3.5 h-3.5" /> Tribe</>
        )}
      </button>
    </div>
  );
}

function ToolbarButton({ icon, label, onClick, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-2.5 rounded-lg text-muted-lavender/60 hover:text-electric-blue hover:bg-electric-blue/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      aria-label={label}
    >
      {icon}
    </button>
  );
}
