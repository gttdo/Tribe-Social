import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { 
  Camera, 
  Video, 
  X, 
  Upload, 
  Image as ImageIcon, 
  Loader2,
  Globe,
  Users,
  Lock
} from 'lucide-react';
import { createStory } from '../utils/story-helpers';
import { CreateStoryRequest, StoryMediaType, STORY_CONSTANTS } from '../utils/story-types';
import { UserResult, UserInfo } from '../App';

interface StoryCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
  userResult?: UserResult | null;
  userInfo?: UserInfo | null;
}

export function StoryCreator({ 
  isOpen, 
  onClose, 
  onStoryCreated, 
  userResult, 
  userInfo 
}: StoryCreatorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<StoryMediaType>('image');
  const [caption, setCaption] = useState('');
  const [selectedTribe, setSelectedTribe] = useState<string>('');
  const [privacy, setPrivacy] = useState<'public' | 'tribe'>('public');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [availableTribes, setAvailableTribes] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Load user's tribes when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      loadUserTribes();
    }
  }, [isOpen]);

  const loadUserTribes = async () => {
    try {
      const { supabase, getCurrentSession } = await import('../utils/supabase/client');
      const session = await getCurrentSession();
      
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('tribe_members')
        .select(`
          tribe:tribe_id (
            id,
            name,
            icon_url,
            is_public
          )
        `)
        .eq('user_id', session.user.id);

      if (!error && data) {
        setAvailableTribes(data.map(item => item.tribe).filter(Boolean));
      }
    } catch (error) {
      console.warn('Could not load user tribes:', error);
    }
  };

  const handleFileSelect = useCallback((file: File, type: StoryMediaType) => {
    // Validate file size
    if (file.size > STORY_CONSTANTS.MAX_FILE_SIZE) {
      setError(`File size exceeds maximum allowed (${Math.round(STORY_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024)}MB)`);
      return;
    }

    // Validate file type
    const validTypes = type === 'image' 
      ? STORY_CONSTANTS.SUPPORTED_IMAGE_TYPES 
      : STORY_CONSTANTS.SUPPORTED_VIDEO_TYPES;

    if (!validTypes.includes(file.type)) {
      setError(`Invalid file type for ${type}. Please select a valid file.`);
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
    setMediaType(type);
    setError('');
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, 'image');
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, 'video');
    }
  };

  const handleCreateStory = async () => {
    if (!selectedFile) {
      setError('Please select a media file');
      return;
    }

    if (caption.length > STORY_CONSTANTS.MAX_CAPTION_LENGTH) {
      setError(`Caption too long. Maximum ${STORY_CONSTANTS.MAX_CAPTION_LENGTH} characters.`);
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const request: CreateStoryRequest = {
        media_file: selectedFile,
        caption: caption.trim() || undefined,
        tribe_id: privacy === 'tribe' && selectedTribe ? selectedTribe : null,
        media_type: mediaType
      };

      console.log('Creating story with request:', request);

      const result = await createStory(request);

      if (result.success) {
        console.log('Story created successfully:', result.story);
        onStoryCreated();
        resetForm();
        onClose();
      } else {
        setError(result.error || 'Failed to create story');
      }
    } catch (error) {
      console.error('Story creation error:', error);
      setError('Failed to create story. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCaption('');
    setSelectedTribe('');
    setPrivacy('public');
    setError('');
    setMediaType('image');
  };

  const handleClose = () => {
    if (!isUploading) {
      resetForm();
      onClose();
    }
  };

  const remainingChars = STORY_CONSTANTS.MAX_CAPTION_LENGTH - caption.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-midnight-black/95 border-muted-lavender/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-pearl-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-neon-lilac" />
            Create Story
          </DialogTitle>
          <DialogDescription className="text-muted-lavender font-body">
            Share a moment with your community. Upload a photo or video to create your story.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-neon-lilac/30">
              <AvatarImage src={userResult?.profile?.glowColor} />
              <AvatarFallback className="bg-neon-lilac/20 text-neon-lilac font-headline">
                {userResult?.nickname?.[0] || userInfo?.username?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-body text-pearl-white font-medium">
                {userResult?.nickname || userInfo?.username || 'Tribe Member'}
              </h3>
              <p className="font-body text-muted-lavender text-sm">
                Creating a new story
              </p>
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-4">
            <Label className="font-body text-pearl-white">Add Media</Label>
            
            {!selectedFile ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 flex-col gap-2 border-muted-lavender/30 hover:border-neon-lilac/50 hover:bg-neon-lilac/10"
                  disabled={isUploading}
                >
                  <ImageIcon className="w-8 h-8 text-neon-lilac" />
                  <span className="font-body text-sm">Photo</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => videoInputRef.current?.click()}
                  className="h-24 flex-col gap-2 border-muted-lavender/30 hover:border-electric-blue/50 hover:bg-electric-blue/10"
                  disabled={isUploading}
                >
                  <Video className="w-8 h-8 text-electric-blue" />
                  <span className="font-body text-sm">Video</span>
                </Button>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-midnight-black border border-muted-lavender/30">
                {mediaType === 'image' ? (
                  <img
                    src={previewUrl || ''}
                    alt="Story preview"
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <video
                    src={previewUrl || ''}
                    className="w-full h-48 object-cover"
                    controls
                  />
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 bg-midnight-black/80 hover:bg-glitch-red/80 text-pearl-white"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                </Button>

                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="bg-midnight-black/80 text-pearl-white border-none">
                    {mediaType === 'image' ? 'Image' : 'Video'}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-body text-pearl-white">Caption (optional)</Label>
              <span className={`font-body text-sm ${
                remainingChars < 50 ? 'text-glitch-red' : 'text-muted-lavender'
              }`}>
                {remainingChars}
              </span>
            </div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share what's happening..."
              className="bg-input-background border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender resize-none"
              rows={3}
              maxLength={STORY_CONSTANTS.MAX_CAPTION_LENGTH}
              disabled={isUploading}
            />
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <Label className="font-body text-pearl-white">Privacy</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={privacy === 'public' ? 'default' : 'outline'}
                onClick={() => {
                  setPrivacy('public');
                  setSelectedTribe('');
                }}
                className={`flex-col gap-2 h-20 ${
                  privacy === 'public'
                    ? 'bg-neon-lilac hover:bg-neon-lilac/90'
                    : 'border-muted-lavender/30 hover:border-neon-lilac/50'
                }`}
                disabled={isUploading}
              >
                <Globe className="w-5 h-5" />
                <span className="font-body text-xs">Everyone</span>
              </Button>

              <Button
                variant={privacy === 'tribe' ? 'default' : 'outline'}
                onClick={() => setPrivacy('tribe')}
                className={`flex-col gap-2 h-20 ${
                  privacy === 'tribe'
                    ? 'bg-electric-blue hover:bg-electric-blue/90 text-midnight-black'
                    : 'border-muted-lavender/30 hover:border-electric-blue/50'
                }`}
                disabled={isUploading}
              >
                <Users className="w-5 h-5" />
                <span className="font-body text-xs">Tribe Only</span>
              </Button>
            </div>

            {privacy === 'tribe' && availableTribes.length > 0 && (
              <div className="space-y-2">
                <Label className="font-body text-pearl-white text-sm">Select Tribe</Label>
                <Select value={selectedTribe} onValueChange={setSelectedTribe} disabled={isUploading}>
                  <SelectTrigger className="bg-input-background border-muted-lavender/30 text-pearl-white">
                    <SelectValue placeholder="Choose a tribe..." />
                  </SelectTrigger>
                  <SelectContent className="bg-midnight-black border-muted-lavender/30">
                    {availableTribes.map((tribe) => (
                      <SelectItem key={tribe.id} value={tribe.id} className="text-pearl-white hover:bg-neon-lilac/10">
                        <div className="flex items-center gap-2">
                          {tribe.icon_url && (
                            <img src={tribe.icon_url} alt="" className="w-4 h-4 rounded" />
                          )}
                          <span>{tribe.name}</span>
                          {!tribe.is_public && <Lock className="w-3 h-3 text-muted-lavender" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-glitch-red/10 border border-glitch-red/30">
              <p className="font-body text-glitch-red text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-muted-lavender/30 hover:border-muted-lavender/50"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateStory}
              disabled={!selectedFile || isUploading || (privacy === 'tribe' && !selectedTribe)}
              className="flex-1 bg-neon-lilac hover:bg-neon-lilac/90"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Share Story
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept={STORY_CONSTANTS.SUPPORTED_IMAGE_TYPES.join(',')}
          onChange={handleImageUpload}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept={STORY_CONSTANTS.SUPPORTED_VIDEO_TYPES.join(',')}
          onChange={handleVideoUpload}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}