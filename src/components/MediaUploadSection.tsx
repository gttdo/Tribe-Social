import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Upload, 
  Camera, 
  Mic, 
  X, 
  Play, 
  Pause, 
  Volume2,
  Image as ImageIcon,
  Video,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { TribeSelectionDropdown } from './TribeSelectionDropdown';
import { VisibilitySelector } from './VisibilitySelector';
import { 
  PostType, 
  Visibility, 
  TribeWithDetails 
} from '../utils/supabase/database-types';
import { 
  validateFileSize, 
  validateFileType, 
  formatFileSize,
  MediaValidationResult 
} from '../utils/post-creation-types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { isVideoFile } from '../utils/videoThumb';

interface MediaUploadSectionProps {
  /** Type of post being created */
  postType: PostType;
  
  /** Current media file */
  mediaFile?: File;
  
  /** Current audio blob */
  audioBlob?: Blob;
  
  /** Current caption text */
  caption?: string;
  
  /** Current visibility setting */
  visibility: Visibility;
  
  /** Currently selected tribes */
  selectedTribes: string[];
  
  /** Available tribes for selection */
  availableTribes: TribeWithDetails[];
  
  /** Whether upload is in progress */
  isUploading?: boolean;
  
  /** Upload progress (0-100) */
  uploadProgress?: number;
  
  /** Callback when media file changes */
  onMediaFileChange: (file: File | undefined) => void;
  
  /** Callback when audio blob changes */
  onAudioBlobChange: (blob: Blob | undefined) => void;
  
  /** Callback when caption changes */
  onCaptionChange: (caption: string) => void;
  
  /** Callback when visibility changes */
  onVisibilityChange: (visibility: Visibility) => void;
  
  /** Callback when tribe selection changes */
  onTribeSelectionChange: (tribeIds: string[]) => void;
  
  /** Callback to trigger camera capture */
  onCameraCapture?: () => void;
  
  /** Callback to trigger audio recording */
  onAudioRecord?: () => void;
  
  /** Whether to show compact visibility selector */
  compactVisibility?: boolean;
  
  /** Maximum caption length */
  maxCaptionLength?: number;
  
  /** Additional CSS classes */
  className?: string;
}

export function MediaUploadSection({
  postType,
  mediaFile,
  audioBlob,
  caption = '',
  visibility,
  selectedTribes,
  availableTribes,
  isUploading = false,
  uploadProgress = 0,
  onMediaFileChange,
  onAudioBlobChange,
  onCaptionChange,
  onVisibilityChange,
  onTribeSelectionChange,
  onCameraCapture,
  onAudioRecord,
  compactVisibility = false,
  maxCaptionLength = 250,
  className = ''
}: MediaUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');

  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [validation, setValidation] = useState<MediaValidationResult>({ isValid: true });
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate preview URLs when files change
  React.useEffect(() => {
    if (mediaFile) {
      const url = URL.createObjectURL(mediaFile);
      setMediaPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setMediaPreview('');
    }
  }, [mediaFile]);

  React.useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl('');
      setIsPlaying(false);
    }
  }, [audioBlob]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file based on post type
    let typeValidation: MediaValidationResult;
    if (postType === 'image') {
      typeValidation = validateFileType(file, 'image');
    } else if (postType === 'video') {
      typeValidation = validateFileType(file, 'video');
    } else if (postType === 'audio') {
      typeValidation = validateFileType(file, 'audio');
    } else {
      typeValidation = { isValid: false, error: 'Invalid post type for file upload' };
    }

    if (!typeValidation.isValid) {
      setValidation(typeValidation);
      toast.error(typeValidation.error, {
        description: 'Please select a valid file type for your post.',
        action: {
          label: 'Try Again',
          onClick: openFileSelect
        }
      });
      return;
    }

    // Validate file size
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.isValid) {
      setValidation(sizeValidation);
      toast.error(sizeValidation.error, {
        description: 'Please compress your file or select a smaller one.',
        action: {
          label: 'Choose Different File',
          onClick: openFileSelect
        }
      });
      return;
    }

    // Additional validation for image files
    if (postType === 'image' && file.type.startsWith('image/')) {
      // Check if image is corrupted or invalid
      const img = new Image();
      img.onload = () => {
        // Image loaded successfully
        setValidation({ isValid: true });
        
        if (postType === 'audio') {
          // Convert file to blob for audio
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
              const blob = new Blob([reader.result], { type: file.type });
              onAudioBlobChange(blob);
              toast.success('Audio file loaded successfully');
            }
          };
          reader.onerror = () => {
            setValidation({ isValid: false, error: 'Failed to read audio file' });
            toast.error('Failed to read audio file', {
              description: 'The file may be corrupted. Please try a different audio file.',
              action: {
                label: 'Try Again',
                onClick: openFileSelect
              }
            });
          };
          reader.readAsArrayBuffer(file);
        } else {
          onMediaFileChange(file);
          toast.success(`${postType === 'image' ? 'Image' : 'Video'} loaded successfully`);
        }
      };
      
      img.onerror = () => {
        setValidation({ isValid: false, error: 'Invalid or corrupted image file' });
        toast.error('Invalid or corrupted image file', {
          description: 'Please select a different image file. Supported formats: JPEG, PNG, WebP, GIF.',
          action: {
            label: 'Choose Different Image',
            onClick: openFileSelect
          }
        });
      };
      
      // Start loading the image to validate it
      img.src = URL.createObjectURL(file);
    } else {
      // For non-image files, proceed normally
      setValidation({ isValid: true });
      
      if (postType === 'audio') {
        // Convert file to blob for audio
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            const blob = new Blob([reader.result], { type: file.type });
            onAudioBlobChange(blob);
            toast.success('Audio file loaded successfully');
          }
        };
        reader.onerror = () => {
          setValidation({ isValid: false, error: 'Failed to read audio file' });
          toast.error('Failed to read audio file', {
            description: 'The file may be corrupted. Please try a different audio file.',
            action: {
              label: 'Try Again',
              onClick: openFileSelect
            }
          });
        };
        reader.readAsArrayBuffer(file);
      } else {
        onMediaFileChange(file);
        
        // Note: Video thumbnail generation is now handled during post creation
        
        toast.success(`${postType === 'video' ? 'Video' : 'File'} loaded successfully`);
      }
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Note: Video thumbnail generation is now handled during post creation
  // This component focuses on preview only

  const openFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeMedia = () => {
    onMediaFileChange(undefined);
    setMediaPreview('');
    setValidation({ isValid: true });
  };

  const removeAudio = () => {
    onAudioBlobChange(undefined);
    setAudioUrl('');
    setIsPlaying(false);
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const getAcceptedFileTypes = () => {
    switch (postType) {
      case 'image':
        return 'image/jpeg,image/png,image/webp,image/gif';
      case 'video':
        return 'video/mp4,video/webm,video/quicktime';
      case 'audio':
        return 'audio/mp3,audio/wav,audio/m4a,audio/ogg';
      default:
        return '';
    }
  };

  const captionLength = caption.length;
  const isOverLimit = captionLength > maxCaptionLength;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedFileTypes()}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Media Upload Area */}
      {['image', 'video', 'audio'].includes(postType) && (
        <Card className="bg-midnight-black/50 border-muted-lavender/20">
          <CardContent className="p-6">
            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-pearl-white font-body">Uploading...</span>
                  <span className="text-sm text-muted-lavender">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-muted-lavender/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-neon-lilac to-electric-blue h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Media Preview */}
            {mediaPreview && (postType === 'image' || postType === 'video') && (
              <div className="relative mb-4">
                {postType === 'image' ? (
                  <ImageWithFallback
                    src={mediaPreview}
                    alt="Upload preview"
                    className="w-full max-h-80 object-cover rounded-xl"
                    fallback={
                      <div className="w-full h-64 bg-muted-lavender/10 rounded-xl flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-muted-lavender/40" />
                      </div>
                    }
                  />
                ) : (
                  <div className="relative">
                    <video
                      src={mediaPreview}
                      className="w-full max-h-80 object-cover rounded-xl"
                      controls
                    />
                  </div>
                )}
                
                <Button
                  onClick={removeMedia}
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 bg-midnight-black/80 border-muted-lavender/40 text-pearl-white hover:bg-glitch-red/20 hover:border-glitch-red/60"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Audio Preview */}
            {audioUrl && postType === 'audio' && (
              <div className="mb-4 p-4 bg-muted-lavender/10 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={toggleAudioPlayback}
                    variant="outline"
                    size="sm"
                    className="bg-midnight-black/50 border-muted-lavender/40 text-pearl-white"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-muted-lavender" />
                      <span className="text-sm text-pearl-white font-body">Audio recording</span>
                    </div>
                    {audioBlob && (
                      <p className="text-xs text-muted-lavender">
                        {formatFileSize(audioBlob.size)}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    onClick={removeAudio}
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-glitch-red/40 text-glitch-red hover:bg-glitch-red/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    preload="metadata"
                  />
                )}
              </div>
            )}

            {/* Upload Actions */}
            {!mediaFile && !audioBlob && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={openFileSelect}
                    variant="outline"
                    className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white hover:border-electric-blue/50 hover:bg-electric-blue/10"
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {postType === 'audio' ? 'Audio' : 'File'}
                  </Button>
                  
                  {onCameraCapture && (postType === 'image' || postType === 'video') && (
                    <Button
                      onClick={onCameraCapture}
                      variant="outline"
                      className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white hover:border-neon-lilac/50 hover:bg-neon-lilac/10"
                      disabled={isUploading}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {postType === 'image' ? 'Take Photo' : 'Record Video'}
                    </Button>
                  )}
                  
                  {onAudioRecord && postType === 'audio' && (
                    <Button
                      onClick={onAudioRecord}
                      variant="outline"
                      className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white hover:border-soft-blush/50 hover:bg-soft-blush/10"
                      disabled={isUploading}
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Record Audio
                    </Button>
                  )}
                </div>
                
                {/* File Type Help */}
                <div className="text-center">
                  <p className="text-xs text-muted-lavender font-body">
                    {postType === 'image' && 'Supports: JPEG, PNG, WebP, GIF (max 5MB)'}
                    {postType === 'video' && 'Supports: MP4, WebM, QuickTime (max 5MB)'}
                    {postType === 'audio' && 'Supports: MP3, WAV, M4A, OGG (max 5MB)'}
                  </p>
                </div>
              </div>
            )}

            {/* Validation Error */}
            {!validation.isValid && (
              <div className="mt-4 p-3 bg-glitch-red/10 border border-glitch-red/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-glitch-red" />
                  <p className="text-sm text-glitch-red font-body">{validation.error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Caption Input */}
      <div className="space-y-2">
        <label className="block text-pearl-white font-body font-medium">
          {postType === 'thought' ? 'What\'s on your mind?' : 'Add a caption'}
        </label>
        
        <Textarea
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder={
            postType === 'thought' 
              ? 'Share your thoughts with the tribe...' 
              : 'Write a caption for your post...'
          }
          className={`bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/60 resize-none ${
            isOverLimit ? 'border-glitch-red/50' : ''
          }`}
          rows={postType === 'thought' ? 4 : 3}
          disabled={isUploading}
        />
        
        <div className="flex justify-between items-center">
          <p className={`text-xs font-body ${
            isOverLimit ? 'text-glitch-red' : 'text-muted-lavender'
          }`}>
            {captionLength}/{maxCaptionLength} characters
          </p>
          
          {isOverLimit && (
            <Badge variant="outline" className="border-glitch-red/40 text-glitch-red">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Over limit
            </Badge>
          )}
        </div>
      </div>

      {/* Visibility and Tribe Selection */}
      <div className="space-y-4">
        {compactVisibility ? (
          <div className="space-y-3">
            <VisibilitySelector
              visibility={visibility}
              selectedTribes={selectedTribes}
              availableTribes={availableTribes}
              onVisibilityChange={onVisibilityChange}
              onTribeSelectionChange={onTribeSelectionChange}
              compact={true}
            />
          </div>
        ) : (
          <>
            <VisibilitySelector
              visibility={visibility}
              selectedTribes={selectedTribes}
              availableTribes={availableTribes}
              onVisibilityChange={onVisibilityChange}
              onTribeSelectionChange={onTribeSelectionChange}
            />
          </>
        )}
      </div>
    </div>
  );
}