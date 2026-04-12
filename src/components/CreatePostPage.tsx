import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';
import { normalizeThought, validateThoughtText, getGraphemeCount } from '../utils/text-normalization';
import { 
  ArrowLeft, 
  Type,
  Image,
  Mic,
  Camera,
  Upload,
  Play,
  Pause,
  Square,
  RotateCcw,
  Sparkles,
  Loader2,
  X,
  Video,
  Volume2,
  Users,
  Globe,
  Lock,
  AlertTriangle,
  FileText,
  ImageIcon,
  VideoIcon,
  MicIcon,
  CheckCircle
} from 'lucide-react';
import { UserInfo } from '../App';
import { PostType, Visibility } from '../utils/supabase/database-types';
import { MediaCapture } from './MediaCapture';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { formatFileSize } from '../utils/post-creation-types';
import { createVideoPost, uploadVideoOnly, isValidVideoFile, validateVideoFile } from '../utils/video-upload-helpers';

// Lazy load heavy components to improve initial performance
const StableCameraModal = React.lazy(() => 
  import('./StableCameraModal').then(module => ({ default: module.StableCameraModal }))
);
const AudioRecorder = React.lazy(() => 
  import('./AudioRecorder').then(module => ({ default: module.AudioRecorder }))
);

// Modal loading spinner component with enhanced visual feedback
const ModalLoadingSpinner = ({ type }: { type: 'camera' | 'audio' }) => (
  <div className="fixed inset-0 z-50 bg-midnight-black/95 flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-midnight-black border border-muted-lavender/30 rounded-2xl p-6 shadow-2xl">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-neon-lilac/20 border border-neon-lilac/40 flex items-center justify-center relative overflow-hidden">
          {type === 'camera' ? (
            <Camera className="w-8 h-8 text-neon-lilac animate-pulse" />
          ) : (
            <Mic className="w-8 h-8 text-neon-lilac animate-pulse" />
          )}
          {/* Subtle background animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-lilac/20 to-transparent animate-ping"></div>
        </div>
        <div className="space-y-2">
          <h3 className="font-headline text-pearl-white">
            {type === 'camera' ? 'Loading Camera...' : 'Loading Audio Recorder...'}
          </h3>
          <p className="text-muted-lavender font-body text-sm">
            {type === 'camera' ? 'Preparing camera interface' : 'Setting up audio recording'}
          </p>
        </div>
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-neon-lilac rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-electric-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-soft-blush rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  </div>
);

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 250; // characters

// Supported file types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];
const SUPPORTED_AUDIO_TYPES = ['audio/mp3', 'audio/mpeg']; // Updated based on bucket compatibility

type CreationStep = 'select-type' | 'create-content' | 'publishing';

interface PostData {
  type: PostType;
  text?: string;
  caption?: string;
  mediaFile?: File;
  audioBlob?: Blob;
  visibility: Visibility;
  thumbnailBlob?: Blob; // For video thumbnails (legacy)
  thumbnailUrl?: string; // For uploaded video thumbnails
}

interface CreatePostPageProps {
  onBack: () => void;
  userInfo: UserInfo | null;
  onPostCreated?: () => void;
}

export function CreatePostPage({ onBack, userInfo, onPostCreated }: CreatePostPageProps) {
  const [step, setStep] = useState<CreationStep>('select-type');
  const [postData, setPostData] = useState<PostData>({
    type: 'thought',
    visibility: 'public'
  });
  
  // Media states
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [audioURL, setAudioURL] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  
  // UI states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showMediaCapture, setShowMediaCapture] = useState(false);
  const [showStableCamera, setShowStableCamera] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Character count for text posts (using grapheme-safe counting on normalized text)
  const rawInputText = postData.text || '';
  
  // Only run text normalization and validation for thought posts and when there's actual text
  const shouldProcessText = postData.type === 'thought' && rawInputText.length > 0;
  const normalizedText = shouldProcessText ? normalizeThought(rawInputText) : '';
  const textLength = shouldProcessText ? getGraphemeCount(normalizedText) : 0;
  const textValidation = shouldProcessText ? validateThoughtText(rawInputText) : { isValid: true, graphemeCount: 0 };
  
  // Debug logging for character counting (reduced)
  React.useEffect(() => {
    if (postData.type === 'thought' && rawInputText && !textValidation.isValid) {
      console.log('📝 Text validation issue:', textValidation.error);
    }
  }, [rawInputText, textValidation.isValid, textValidation.error, postData.type]);

  // Debug logging for media state - REDUCED FREQUENCY
  React.useEffect(() => {
    // Only log when actually necessary to reduce console spam
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Media state debug:');
      console.log('  Post type:', postData.type);
      console.log('  Has mediaFile:', !!postData.mediaFile);
      console.log('  MediaFile size:', postData.mediaFile?.size || 0);
      console.log('  MediaFile type:', postData.mediaFile?.type || 'none');
      console.log('  Has audioBlob:', !!postData.audioBlob);
      console.log('  AudioBlob size:', postData.audioBlob?.size || 0);
      console.log('  Has audioURL:', !!audioURL);
      console.log('  Has mediaPreview:', !!mediaPreview);
    }
  }, [postData.type, postData.mediaFile, postData.audioBlob]); // Reduced dependencies to prevent spam

  // Debug logging for modal states
  React.useEffect(() => {
    console.log('🎯 Modal states changed:');
    console.log('  showStableCamera:', showStableCamera);
    console.log('  showAudioRecorder:', showAudioRecorder);
    console.log('  showMediaCapture:', showMediaCapture);
  }, [showStableCamera, showAudioRecorder, showMediaCapture]);

  // Check if user has unsaved content
  const hasUnsavedContent = () => {
    return (
      (postData.text && postData.text.trim().length > 0) ||
      (postData.caption && postData.caption.trim().length > 0) ||
      postData.mediaFile ||
      postData.audioBlob
    );
  };

  // Handle back navigation with confirmation if needed
  const handleBackNavigation = () => {
    if (hasUnsavedContent()) {
      setShowCancelDialog(true);
    } else {
      onBack();
    }
  };

  // Cancel and go back
  const handleCancelAndReturn = () => {
    // Clean up any media URLs
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    
    setShowCancelDialog(false);
    onBack();
  };

  // File validation functions
  const validateFile = (file: File, type: 'image' | 'video' | 'audio'): { isValid: boolean; error?: string } => {
    let maxSize: number;
    let supportedTypes: string[];
    
    switch (type) {
      case 'image':
        maxSize = MAX_IMAGE_SIZE;
        supportedTypes = SUPPORTED_IMAGE_TYPES;
        break;
      case 'video':
        maxSize = MAX_VIDEO_SIZE;
        supportedTypes = SUPPORTED_VIDEO_TYPES;
        break;
      case 'audio':
        maxSize = MAX_AUDIO_SIZE;
        supportedTypes = SUPPORTED_AUDIO_TYPES;
        break;
    }
    
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size ${formatFileSize(file.size)} exceeds the maximum limit of ${formatFileSize(maxSize)} for ${type} files.`
      };
    }
    
    if (!supportedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not supported. Supported types: ${supportedTypes.join(', ')}`
      };
    }
    
    return { isValid: true };
  };

  // Handle media file upload
  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 File upload started:', file.name, file.size, 'bytes', file.type);

    let mediaType: 'image' | 'video' | 'audio';
    if (file.type.startsWith('image/')) {
      mediaType = 'image';
    } else if (file.type.startsWith('video/')) {
      mediaType = 'video';
    } else if (file.type.startsWith('audio/')) {
      mediaType = 'audio';
    } else {
      toast.error('Unsupported file type');
      return;
    }

    // Validate file
    const validation = validateFile(file, mediaType);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    
    if (mediaType === 'audio') {
      console.log('🎵 Setting up audio file upload');
      setAudioURL(url);
      setPostData(prev => ({ 
        ...prev, 
        type: 'audio', 
        audioBlob: file,  // Store audio file as blob
        mediaFile: undefined 
      }));
      console.log('🎵 Audio file stored in audioBlob');
    } else if (mediaType === 'video') {
      console.log('🎬 Setting up video file upload with thumbnail generation');
      setMediaPreview(url);
      setPostData(prev => ({ 
        ...prev, 
        type: mediaType, 
        mediaFile: file, 
        audioBlob: undefined 
      }));
      
      // Note: Thumbnail generation will be handled during post creation
      
      console.log('🎬 Video file stored in mediaFile');
    } else {
      console.log('📸 Setting up image file upload');
      setMediaPreview(url);
      setPostData(prev => ({ 
        ...prev, 
        type: mediaType, 
        mediaFile: file, 
        audioBlob: undefined 
      }));
      console.log('📸 Image file stored in mediaFile');
    }

    // Show file size info
    toast.success(`File uploaded: ${formatFileSize(file.size)}`);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Note: Video thumbnail generation is now handled by the video upload helper

  // Handle media capture
  const handleMediaCapture = async (file: File, type: 'image' | 'video') => {
    console.log('📷 Media capture received:', { 
      type, 
      fileName: file.name,
      fileSize: file.size, 
      fileType: file.type
    });
    
    const validation = validateFile(file, type);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    const url = URL.createObjectURL(file);
    setMediaPreview(url);
    
    // IMPORTANT: When media is captured, change post type to match media type and go to content creation
    setPostData(prev => ({ 
      ...prev, 
      type, // This changes to 'image' or 'video'
      mediaFile: file, 
      audioBlob: undefined 
    }));
    
    // Close both camera modals
    setShowMediaCapture(false);
    setShowStableCamera(false);
    
    // Automatically move to content creation step
    setStep('create-content');
    
    console.log('📷 Media capture stored in mediaFile:', {
      postType: type,
      fileName: file.name,
      fileSize: file.size
    });
    
    toast.success(`${type === 'image' ? 'Photo' : 'Video'} captured! Add a caption and share.`, {
      description: `${formatFileSize(file.size)} • Ready to post`
    });
  };

  // Handle photo capture specifically
  const handlePhotoCapture = () => {
    console.log('📸 Opening stable camera for photos');
    setShowStableCamera(true);
  };

  // Handle video capture specifically
  const handleVideoCapture = () => {
    console.log('🎬 Opening stable camera for videos');
    setShowStableCamera(true);
  };

  // Handle Camera Post (unified photo/video) - Fix the delayed response issue
  const handleCameraPost = () => {
    console.log('📷 Camera Post clicked - providing immediate feedback');
    
    // Instead of showing a modal immediately, let's change the post type and step
    // This gives immediate feedback while also setting up the camera
    setPostData(prev => ({ ...prev, type: 'image' })); // Default to image, can change to video
    setStep('create-content');
    
    // Then show the camera modal after a brief moment to allow the UI to update
    setTimeout(() => {
      console.log('📷 Now opening camera modal');
      setShowStableCamera(true);
    }, 100);
  };

  // Handle Audio Post (similar fix to camera post) - Fix the delayed response issue
  const handleAudioPost = () => {
    console.log('🎵 Audio Post clicked - providing immediate feedback');
    
    // Instead of showing a modal immediately, let's change the post type and step
    // This gives immediate feedback while also setting up the audio recorder
    setPostData(prev => ({ ...prev, type: 'audio' })); // Set to audio type
    setStep('create-content');
    
    // Then show the audio recorder modal after a brief moment to allow the UI to update
    setTimeout(() => {
      console.log('🎵 Now opening audio recorder modal');
      setShowAudioRecorder(true);
    }, 100);
  };

  // Handle audio recording
  const handleAudioCapture = (blob: Blob) => {
    console.log('🎵 Audio recording captured:', blob.size, 'bytes');
    const url = URL.createObjectURL(blob);
    setAudioURL(url);
    setPostData(prev => ({ 
      ...prev, 
      type: 'audio', 
      audioBlob: blob, 
      mediaFile: undefined 
    }));
    setShowAudioRecorder(false);
    
    // Automatically move to content creation step after recording
    setStep('create-content');
    
    console.log('🎵 Audio recording stored in audioBlob');
    toast.success(`Audio recorded: ${formatFileSize(blob.size)} 🎵`);
  };

  // Audio playback controls
  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const resetAudio = () => {
    console.log('🔄 Resetting audio...');
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL('');
    setPostData(prev => ({ ...prev, audioBlob: undefined }));
    setIsPlaying(false);
    console.log('🔄 Audio reset complete');
  };

  const resetMedia = () => {
    console.log('🔄 Resetting media...');
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setMediaPreview('');
    setThumbnailPreview('');
    setPostData(prev => ({ 
      ...prev, 
      mediaFile: undefined, 
      thumbnailBlob: undefined,
      thumbnailUrl: undefined
    }));
    console.log('🔄 Media reset complete');
  };

  // Publishing function for thoughts with proper validation per requirements
  const publishThought = async (rawText: string, visibility: 'public' | 'private' | 'tribe', tribeIds: string[] = []) => {
    console.log('=== THOUGHT PUBLISHING WITH VALIDATION ===');
    console.log('Raw text input:', JSON.stringify(rawText));
    
    // 1. Read the input value as a string, defaulting to "" if null/undefined.
    const inputValue = rawText != null ? String(rawText) : "";
    console.log('Input as string:', JSON.stringify(inputValue));
    
    // 2. Trim it → text = toString(input).trim().
    const text = inputValue.trim();
    console.log('Trimmed text:', JSON.stringify(text));
    console.log('Trimmed text length:', text.length);
    
    // 3. If text.length === 0, show error "Please type something" and do not call the API.
    if (text.length === 0) {
      console.error('❌ Text is empty after trimming');
      toast.error("Please type something");
      return null;
    }
    
    // 4. If text.length > 250, show error "Max 250 characters" and do not call the API.
    if (text.length > 250) {
      console.error('❌ Text too long:', text.length, 'characters');
      toast.error("Max 250 characters");
      return null;
    }
    
    console.log('✅ Text validation passed, proceeding with post creation');
    console.log('Final text for submission:', JSON.stringify(text));

    // 5. Otherwise, send POST to /make-server-70df0d6e/posts with correct payload
    const payload = {
      post_type: 'thought',
      text_body: text,
      visibility: 'public'
    };

    console.log('Final thought payload:', JSON.stringify(payload, null, 2));
    
    // Get session and make request
    const { supabase } = await import('../utils/supabase/client');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('User not authenticated - please sign in again');
    }

    const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
    const createResult = await makeAuthenticatedRequest('/make-server-70df0d6e/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // 6. On 201: clear the input and trigger Refresh Feed (handled by caller)
    // 7. On non-OK: log response body and show "Couldn't publish thought"
    if (createResult && createResult.post?.id) {
      console.log('✅ Thought published successfully:', createResult.post.id);
      return createResult;
    } else {
      console.error('❌ Failed to publish thought. Response:', createResult);
      throw new Error('Couldn\'t publish thought');
    }
  };

  // Publishing function
  const publishPost = async () => {
    console.log('🚀 Starting post publication...');
    console.log('📊 Post data before publishing:', {
      type: postData.type,
      hasMediaFile: !!postData.mediaFile,
      mediaFileSize: postData.mediaFile?.size || 0,
      hasAudioBlob: !!postData.audioBlob,
      audioBlobSize: postData.audioBlob?.size || 0,
      hasText: !!postData.text,
      textLength: postData.text?.length || 0
    });

    // Handle thought posts with proper validation
    if (postData.type === 'thought') {
      console.log('📝 Handling thought post with dedicated function');
      setIsUploading(true);
      setUploadProgress(10);
      
      try {
        const result = await publishThought(postData.text || '', postData.visibility);
        
        if (result) {
          console.log('✅ Thought published successfully');
          setUploadProgress(100);
          
          // Clear the input (6. On 201: clear the input and trigger Refresh Feed)
          setPostData(prev => ({ ...prev, text: '' }));
          
          // Success feedback
          toast.success('Thought shared! 💭', {
            description: 'Your thought has been posted to the feed.',
            duration: 3000
          });
          
          // Notify parent and navigate
          console.log('✅ CreatePostPage: Thought published successfully, calling onPostCreated callback...');
          if (onPostCreated) {
            onPostCreated();
          } else {
            console.warn('⚠️ CreatePostPage: No onPostCreated callback provided');
          }
          
          setIsUploading(false);
          return;
        }
      } catch (error) {
        console.error('❌ Thought publication failed:', error);
        // Error handling is already done in publishThought function
        setIsUploading(false);
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Start progress simulation
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 80) return prev;
          return Math.min(prev + Math.random() * 10 + 5, 80);
        });
      }, 300);

      setUploadProgress(5);

      // Get current user session
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('User not authenticated - please sign in again');
      }

      setUploadProgress(10);

      // Upload media first if present
      let mediaInfo = null;
      
      // Handle regular media files (images/videos)
      if (postData.mediaFile) {
        console.log('📤 Uploading media file...', { 
          fileName: postData.mediaFile.name, 
          fileSize: postData.mediaFile.size,
          fileType: postData.mediaFile.type,
          hasVideoThumbnail: postData.type === 'video' && !!postData.thumbnailBlob
        });
        setUploadProgress(20);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Please log in again.');

        // Special handling for video files using new video upload helper
        if (postData.type === 'video') {
          console.log('🎬 Using new video upload system...');
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Please log in again.');
          
          try {
            // Use the new video upload helper to handle everything
            const videoPostData = await createVideoPost({
              file: postData.mediaFile,
              userId: user.id,
              visibility: postData.visibility,
              caption: postData.caption?.trim() || null
            });
            
            // The video post has been created successfully by the helper
            console.log('✅ Video post created via helper:', videoPostData);
            
            // Complete progress
            if (progressInterval) {
              clearInterval(progressInterval);
              progressInterval = null;
            }
            
            setUploadProgress(100);
            
            // Calculate XP and show success message
            const xpGained = 25; // Video posts give 25 XP
            toast.success('Video posted successfully! 🎬', {
              description: `Great work! You earned ${xpGained} tribe points.`,
              duration: 4000
            });
            
            // Notify parent and navigate
            console.log('✅ CreatePostPage: Video uploaded successfully, calling onPostCreated callback...');
            if (onPostCreated) {
              onPostCreated();
            } else {
              console.warn('⚠️ CreatePostPage: No onPostCreated callback provided');
            }
            
            // Clean up
            if (mediaPreview) URL.revokeObjectURL(mediaPreview);
            if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
            
            setIsUploading(false);
            return;
            
          } catch (videoUploadError) {
            console.error('❌ New video upload system failed:', videoUploadError);
            throw new Error(`Video upload failed: ${videoUploadError instanceof Error ? videoUploadError.message : 'Unknown error'}`);
          }
        } else {
          // Regular upload for images and videos without thumbnails
          const path = `posts/${user.id}/${Date.now()}_${postData.mediaFile.name}`;
          const { error: upErr } = await supabase.storage
            .from('make-70df0d6e-media')
            .upload(path, postData.mediaFile, { upsert: false });

          if (upErr) {
            console.error('❌ Media upload error:', upErr);
            throw new Error(upErr.message);
          }

          // Get public URL
          const { data: pub } = supabase.storage
            .from('make-70df0d6e-media')
            .getPublicUrl(path);
          
          if (!pub?.publicUrl) {
            throw new Error('Failed to get media URL');
          }

          // Test if the URL is accessible
          console.log('🔍 Testing media URL accessibility:', pub.publicUrl);
          try {
            const testResponse = await fetch(pub.publicUrl, { method: 'HEAD' });
            console.log('🔍 Media URL test response:', testResponse.status, testResponse.statusText);
            if (!testResponse.ok) {
              console.warn('⚠️ Media URL may not be accessible:', pub.publicUrl, testResponse.status);
            }
          } catch (testError) {
            console.warn('⚠️ Could not test media URL accessibility:', testError);
          }

          mediaInfo = {
            media_url: pub.publicUrl,
            media_width: null,
            media_height: null,
            media_thumb_url: null
          };

          console.log('✅ Media file upload successful:', pub.publicUrl);
          console.log('📋 Full media info:', mediaInfo);
          setUploadProgress(50);
        }
      }

      // Handle audio blobs (both recorded and uploaded audio)
      if (postData.audioBlob) {
        console.log('🎵 Uploading audio blob...', {
          audioBlobSize: postData.audioBlob.size,
          audioBlobType: postData.audioBlob.type || 'unknown'
        });
        setUploadProgress(20);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Please log in again.');

        // Convert audio if needed to supported format
        console.log('🔄 Checking if audio conversion is needed...');
        let processedAudioBlob = postData.audioBlob;
        
        try {
          // Import audio conversion utilities
          const { convertAudioIfNeeded, createAudioFileForUpload, validateAudioForUpload } = await import('../utils/audio-conversion-helpers');
          
          // Validate audio first
          const validation = validateAudioForUpload(postData.audioBlob);
          if (!validation.isValid) {
            throw new Error(validation.error || 'Invalid audio file');
          }
          
          if (validation.warnings) {
            validation.warnings.forEach(warning => console.warn('⚠️ Audio warning:', warning));
          }
          
          // Convert audio if needed (this handles WebM to WAV conversion)
          const conversionResult = await convertAudioIfNeeded(postData.audioBlob);
          processedAudioBlob = conversionResult.blob;
          
          if (conversionResult.wasConverted) {
            console.log('✅ Audio converted successfully:', {
              originalFormat: conversionResult.originalFormat,
              newFormat: processedAudioBlob.type,
              originalSize: postData.audioBlob.size,
              newSize: processedAudioBlob.size
            });
            toast.success('Audio converted to compatible format', {
              description: `${conversionResult.originalFormat} → ${processedAudioBlob.type}`
            });
          } else {
            console.log('✅ Audio format already supported or conversion not needed');
          }
          
        } catch (conversionError) {
          console.error('❌ Audio conversion failed:', conversionError);
          console.log('🔄 Attempting upload with original audio blob...');
          
          // Show warning to user about potential upload issues
          toast.error('Audio format may not be supported', {
            description: 'Upload may fail. Please try recording again or use a different format.'
          });
        }

        // Convert blob to file with appropriate name and type
        let audioFile: File;
        if (processedAudioBlob instanceof File) {
          // It's already a file (uploaded audio)
          audioFile = processedAudioBlob;
          console.log('🎵 Using uploaded audio file:', audioFile.name);
        } else {
          // It's a blob (recorded audio or converted audio) - create file with proper naming
          try {
            const { createAudioFileForUpload } = await import('../utils/audio-conversion-helpers');
            audioFile = createAudioFileForUpload(processedAudioBlob);
            console.log('🎵 Created file from processed blob:', audioFile.name, audioFile.type);
          } catch (fileError) {
            console.warn('⚠️ Failed to use audio helper, falling back to basic file creation');
            // Fallback to basic file creation
            audioFile = new File([processedAudioBlob], 'recording.wav', { 
              type: processedAudioBlob.type || 'audio/wav' 
            });
            console.log('🎵 Created file from blob (fallback)');
          }
        }
        
        // Upload audio
        const path = `posts/${user.id}/${Date.now()}_${audioFile.name}`;
        const { error: upErr } = await supabase.storage
          .from('make-70df0d6e-media')
          .upload(path, audioFile, { upsert: false });

        if (upErr) {
          console.error('❌ Audio upload error:', upErr);
          throw new Error(upErr.message);
        }

        // Get public URL
        const { data: pub } = supabase.storage
          .from('make-70df0d6e-media')
          .getPublicUrl(path);
        
        if (!pub?.publicUrl) {
          throw new Error('Failed to get audio URL');
        }

        mediaInfo = {
          media_url: pub.publicUrl,
          media_width: null,
          media_height: null,
          media_thumb_url: null
        };

        console.log('✅ Audio upload successful:', pub.publicUrl);
        setUploadProgress(50);
      }

      // Create post with media information
      console.log('📝 Creating post...');
      setUploadProgress(60);
      
      let createResult;
      
      if (postData.type === 'thought') {
        // Use the dedicated thought publishing function with pre-submit guard
        createResult = await publishThought(
          postData.text || '',
          postData.visibility,
          [] // Add empty array for now, will be enhanced later for tribe support
        );
        
        if (!createResult) {
          // publishThought already showed error message
          throw new Error('Failed to publish thought');
        }
      } else {
        // For media posts (non-video), use the existing logic
        if (!mediaInfo?.media_url) {
          console.error('❌ Cannot publish media post without media URL');
          console.error('❌ Media state:', {
            hasMediaFile: !!postData.mediaFile,
            mediaFileSize: postData.mediaFile?.size || 0,
            hasMediaPreview: !!mediaPreview
          });
          console.error('❌ Post data:', {
            type: postData.type,
            hasMediaFile: !!postData.mediaFile,
            hasAudioBlob: !!postData.audioBlob
          });
          
          // If we're trying to publish an audio post but have no audio blob, something went wrong
          if (postData.type === 'audio') {
            throw new Error('No audio data available. Please record or upload audio again.');
          } else {
            throw new Error('No media data available for this post type.');
          }
        }

        // Create media post with uploaded media URL
        const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
        const mediaPayload = {
          post_type: postData.type,
          text_body: null,
          caption: postData.caption?.trim() || null,
          media_url: mediaInfo.media_url,
          visibility: postData.visibility,
          tribeIds: [] // Add empty array for now, will be enhanced later for tribe support
        };

        console.log('📝 Creating media post with payload:', JSON.stringify(mediaPayload, null, 2));

        createResult = await makeAuthenticatedRequest('/make-server-70df0d6e/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mediaPayload)
        });

        if (!createResult.post?.id) {
          throw new Error(createResult.error || 'Failed to create media post');
        }

        console.log('✅ Media post created successfully:', createResult.post.id);
        setUploadProgress(80);
      }

      // Complete progress
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      // Calculate XP gained
      const xpGained = createResult.xpGained || (
        postData.type === 'thought' ? 10 : 
        postData.type === 'audio' ? 20 : 25
      );
      
      console.log('✅ Post published successfully!', {
        postId: createResult.post.id,
        xpGained
      });
      
      // Show success notification and redirect to feed immediately
      toast.success(`Post shared successfully! +${xpGained} XP earned ✨`, {
        description: 'Your post has been added to your feed'
      });

      // Call the callback to redirect and refresh feed
      console.log('✅ CreatePostPage: Post creation successful, calling onPostCreated callback...');
      if (onPostCreated) {
        onPostCreated();
      } else {
        console.warn('⚠️ CreatePostPage: No onPostCreated callback provided');
      }

      // Set uploading to false
      setIsUploading(false);

    } catch (error) {
      console.error('❌ Publishing error:', error);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post';
      
      // Provide specific feedback for validation errors and redirect to feed
      if (errorMessage.includes('post_type')) {
        toast.error('Failed to share post', {
          description: 'Invalid post type. Please try again.'
        });
      } else if (errorMessage.includes('text_body')) {
        toast.error('Failed to share post', {
          description: 'Text content is invalid. Please check your message.'
        });
      } else if (errorMessage.includes('media_url') || errorMessage.includes('Media is required')) {
        toast.error('Failed to share post', {
          description: 'Media upload failed. Please try again.'
        });
      } else if (errorMessage.includes('visibility')) {
        toast.error('Failed to share post', {
          description: 'Post visibility setting is invalid.'
        });
      } else if (errorMessage.includes('User not authenticated')) {
        toast.error('Failed to share post', {
          description: 'Please sign in again to continue.'
        });
      } else {
        toast.error('Failed to share post', {
          description: 'Something went wrong. Please try again.'
        });
      }
      
      setIsUploading(false);
      setUploadProgress(0);
      
      // Redirect to feed even on error after a short delay
      setTimeout(() => {
        if (onPostCreated) {
          onPostCreated();
        }
      }, 2000);
    }
  };

  // Check if post can be published - OPTIMIZED TO REDUCE CONSOLE SPAM
  const canPublish = () => {
    // Only log in development and throttle the logging
    const shouldLog = process.env.NODE_ENV === 'development';
    
    if (shouldLog) {
      console.log('📊 PUBLISH VALIDATION CHECK:', {
        postType: postData.type,
        hasText: !!postData.text,
        textValid: postData.type === 'thought' ? textValidation.isValid : 'N/A (not thought)',
        hasMediaFile: !!postData.mediaFile,
        mediaFileSize: postData.mediaFile?.size || 0,
        hasAudioBlob: !!postData.audioBlob,
        audioBlobSize: postData.audioBlob?.size || 0
      });
    }
    
    // Always require post_type to be set
    if (!postData.type) {
      if (shouldLog) console.warn('❌ Cannot publish: post_type is missing');
      return false;
    }
    
    switch (postData.type) {
      case 'thought':
        const isValidThought = textValidation.isValid;
        if (!isValidThought && shouldLog) {
          console.warn('❌ Cannot publish thought:', textValidation.error);
        } else if (isValidThought && shouldLog) {
          console.log('✅ Thought is valid for publishing');
        }
        return isValidThought;
        
      case 'image':
      case 'video':
        const hasValidMedia = !!postData.mediaFile;
        if (!hasValidMedia && shouldLog) {
          console.warn('❌ Cannot publish media: no media file');
          console.warn('❌ Media state:', {
            hasMediaFile: !!postData.mediaFile,
            mediaFileSize: postData.mediaFile?.size || 0,
            hasMediaPreview: !!mediaPreview
          });
        } else if (hasValidMedia && shouldLog) {
          console.log('✅ Media is valid for publishing:', {
            type: postData.type,
            fileSize: postData.mediaFile.size,
            fileName: postData.mediaFile.name
          });
        }
        return hasValidMedia;
        
      case 'audio':
        const hasValidAudio = !!postData.audioBlob;
        if (!hasValidAudio) {
          // Significantly reduce audio validation logging to prevent spam
          if (shouldLog && Math.random() < 0.1) { // Only log 10% of the time
            console.log('🔍 Audio validation: no audio blob detected');
            console.log('📊 Current audio state:', {
              hasAudioBlob: !!postData.audioBlob,
              audioBlobSize: postData.audioBlob?.size || 0,
              hasAudioURL: !!audioURL,
              audioURLValue: audioURL || 'none'
            });
          }
        } else if (shouldLog) {
          console.log('✅ Audio is valid for publishing:', {
            audioBlobSize: postData.audioBlob.size,
            audioBlobType: postData.audioBlob.type || 'unknown',
            isFile: postData.audioBlob instanceof File
          });
        }
        return hasValidAudio;
        
      default:
        if (shouldLog) console.warn('❌ Cannot publish: unknown post type:', postData.type);
        return false;
    }
  };

  // Get publish button text
  const getPublishButtonText = () => {
    if (!postData.type) {
      return 'Select post type first';
    }
    
    if (!canPublish()) {
      switch (postData.type) {
        case 'thought':
          return textValidation.error || 'Add content to share';
        case 'image':
        case 'video':
          return 'Add media to share';
        case 'audio':
          return audioURL ? 'Audio ready!' : 'Record audio to share';
        default:
          return 'Invalid post type';
      }
    }
    return 'Share Post';
  };

  // Post type options with fixed actions
  const typeOptions = [
    {
      type: 'thought' as const,
      title: 'Thought Post',
      description: 'Share a quick thought (250 characters)',
      icon: FileText,
      gradient: 'from-crystal-pink/20 to-crystal-cyan/20',
      action: () => {
        console.log('📝 Thought Post selected');
        setPostData(prev => ({ ...prev, type: 'thought' }));
        setStep('create-content');
      }
    },
    {
      type: 'camera' as const,
      title: 'Camera Post',
      description: 'Capture a photo or video',
      icon: Camera,
      gradient: 'from-crystal-cyan/20 to-soft-lavender/20',
      action: handleCameraPost
    },
    {
      type: 'audio' as const,
      title: 'Audio Note Post',
      description: 'Record a voice memo or upload audio',
      icon: MicIcon,
      gradient: 'from-soft-lavender/20 to-crystal-pink/20',
      action: handleAudioPost
    }
  ];

  // Render post type selection
  if (step === 'select-type') {
    return (
      <div className="min-h-screen bg-midnight-black pb-safe">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-midnight-black/80 backdrop-blur-xl border-b border-muted-lavender/20 pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleBackNavigation}
              className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="font-headline font-medium text-pearl-white">Create Post</h1>
            
            <div className="w-10 h-10" />
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="text-center mb-8">
            <h2 className="font-headline text-pearl-white text-xl mb-2">What would you like to share?</h2>
            <p className="text-muted-lavender">Choose the type of content you want to create</p>
          </div>

          <div className="space-y-4">
            {typeOptions.map((typeOption) => {
              const Icon = typeOption.icon;
              return (
                <Card
                  key={typeOption.type}
                  className="bg-midnight-black/50 border-muted-lavender/30 hover:border-crystal-pink/50 transition-all duration-300 cursor-pointer hover:bg-midnight-black/80"
                  onClick={typeOption.action}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${typeOption.gradient} border border-pearl-white/10`}>
                        <Icon className="w-6 h-6 text-pearl-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-headline text-pearl-white font-medium mb-1">
                          {typeOption.title}
                        </h3>
                        <p className="text-muted-lavender text-sm">
                          {typeOption.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Render content creation
  if (step === 'create-content') {
    return (
      <div className="min-h-screen bg-midnight-black pb-safe">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-midnight-black/80 backdrop-blur-xl border-b border-muted-lavender/20 pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setStep('select-type')}
              className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="font-headline font-medium text-pearl-white">
              {postData.type === 'thought' ? 'Share Thought' : 
               postData.type === 'image' ? 'Share Picture' :
               postData.type === 'video' ? 'Share Video' : 'Share Audio'}
            </h1>
            
            <Button
              onClick={publishPost}
              disabled={!canPublish() || isUploading}
              className={`font-medium ${
                canPublish() 
                  ? 'bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black' 
                  : 'bg-muted-lavender/20 text-muted-lavender cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                getPublishButtonText()
              )}
            </Button>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-neon-lilac/20 text-neon-lilac font-headline">
                {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-pearl-white">@{userInfo?.username || 'user'}</p>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-electric-blue" />
                <span className="text-sm text-muted-lavender">Public</span>
              </div>
            </div>
          </div>

          {/* Content Input */}
          {postData.type === 'thought' && (
            <div className="space-y-2">
              <Textarea
                placeholder="What's on your mind?"
                value={postData.text || ''}
                onChange={(e) => setPostData(prev => ({ ...prev, text: e.target.value }))}
                className="min-h-[120px] bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender resize-none"
                maxLength={MAX_TEXT_LENGTH}
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className={`text-sm ${
                    !textValidation.isValid ? 'text-glitch-red' : 
                    textLength > MAX_TEXT_LENGTH * 0.8 ? 'text-soft-blush' : 'text-muted-lavender'
                  }`}>
                    {textLength}/{MAX_TEXT_LENGTH}
                  </span>
                  {!textValidation.isValid && (
                    <span className="text-xs text-glitch-red">
                      {textValidation.error}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-lavender">
                  <Sparkles className="w-3 h-3" />
                  <span>+10 XP</span>
                </div>
              </div>
            </div>
          )}

          {/* Image/Video Content */}
          {(postData.type === 'image' || postData.type === 'video') && (
            <div className="space-y-4">
              {!mediaPreview ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={postData.type === 'image' ? handlePhotoCapture : handleVideoCapture}
                      className={`h-32 flex-col space-y-3 ${
                        postData.type === 'image' 
                          ? 'bg-electric-blue/20 hover:bg-electric-blue/30 border border-electric-blue/30 text-pearl-white'
                          : 'bg-soft-blush/20 hover:bg-soft-blush/30 border border-soft-blush/30 text-pearl-white'
                      }`}
                    >
                      <div className="relative">
                        <Camera className="w-8 h-8" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-neon-lilac rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-pearl-white rounded-full"></div>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium">
                          {postData.type === 'image' ? 'Take Photo' : 'Record Video'}
                        </span>
                        <div className="text-xs text-muted-lavender/80 mt-1">
                          Stable Camera
                        </div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className={`h-32 flex-col space-y-3 ${
                        postData.type === 'image' 
                          ? 'bg-electric-blue/10 hover:bg-electric-blue/20 border border-electric-blue/20 text-pearl-white'
                          : 'bg-soft-blush/10 hover:bg-soft-blush/20 border border-soft-blush/20 text-pearl-white'
                      }`}
                    >
                      <Upload className="w-8 h-8" />
                      <span className="text-sm font-medium">
                        Upload {postData.type === 'image' ? 'Photo' : 'Video'}
                      </span>
                    </Button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={postData.type === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <Card className={`bg-midnight-black/50 ${
                  postData.type === 'image' ? 'border-electric-blue/30' : 'border-soft-blush/30'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-pearl-white">
                        {postData.type === 'image' ? 'Photo' : 'Video'} Preview
                      </h3>
                      <Button
                        onClick={resetMedia}
                        variant="ghost"
                        size="sm"
                        className={`${
                          postData.type === 'image' ? 'text-electric-blue hover:bg-electric-blue/10' : 'text-soft-blush hover:bg-soft-blush/10'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="rounded-lg overflow-hidden bg-midnight-black/80">
                      {postData.type === 'image' ? (
                        <img
                          src={mediaPreview}
                          alt="Preview"
                          className="w-full max-h-80 object-contain"
                        />
                      ) : (
                        <video
                          src={mediaPreview}
                          controls
                          className="w-full max-h-80"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Caption for media */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a caption (optional)..."
                  value={postData.caption || ''}
                  onChange={(e) => setPostData(prev => ({ ...prev, caption: e.target.value }))}
                  className="min-h-[80px] bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender resize-none"
                />
              </div>
            </div>
          )}

          {/* Audio Content */}
          {postData.type === 'audio' && (
            <div className="space-y-4">
              {!audioURL ? (
                <div className="text-center py-12">
                  <div className="space-y-6">
                    <div className="w-24 h-24 mx-auto rounded-full bg-glitch-red/10 border-2 border-glitch-red/30 flex items-center justify-center">
                      <Mic className="w-12 h-12 text-glitch-red" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-headline text-pearl-white text-lg">Ready to Record</h3>
                      <p className="text-muted-lavender text-sm max-w-xs mx-auto">
                        Tap the button below to start recording your audio message
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => setShowAudioRecorder(true)}
                      className="bg-glitch-red/20 hover:bg-glitch-red/30 border border-glitch-red/30 text-pearl-white px-8 py-3"
                    >
                      <Mic className="w-5 h-5 mr-2" />
                      Start Recording
                    </Button>
                    
                    <div className="text-xs text-muted-lavender/60">
                      Max {formatFileSize(MAX_AUDIO_SIZE)} • MP3 only
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card className="bg-midnight-black/50 border-glitch-red/30">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 rounded-xl bg-glitch-red/10 border border-glitch-red/30">
                            <Volume2 className="w-6 h-6 text-glitch-red" />
                          </div>
                          <div>
                            <h3 className="font-medium text-pearl-white">
                              {postData.audioBlob instanceof File ? 'Uploaded Audio' : 'Audio Recording'}
                            </h3>
                            <p className="text-sm text-muted-lavender">
                              {formatFileSize(postData.audioBlob?.size || 0)} • Ready to share
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={resetAudio}
                          variant="ghost"
                          size="sm"
                          className="text-glitch-red hover:bg-glitch-red/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Button
                          onClick={playAudio}
                          variant="ghost"
                          size="sm"
                          className="text-pearl-white hover:bg-pearl-white/10"
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <div className="text-sm text-muted-lavender">
                            Audio ready for sharing
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-electric-blue">
                          <CheckCircle className="w-3 h-3" />
                          <span>+20 XP</span>
                        </div>
                      </div>
                      
                      <audio
                        ref={audioRef}
                        src={audioURL}
                        onEnded={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Caption for audio */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a caption (optional)..."
                      value={postData.caption || ''}
                      onChange={(e) => setPostData(prev => ({ ...prev, caption: e.target.value }))}
                      className="min-h-[80px] bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Media Capture Modal */}
        {showMediaCapture && (
          <MediaCapture
            onCapture={handleMediaCapture}
            onClose={() => setShowMediaCapture(false)}
            captureMode={captureMode}
            isOpen={showMediaCapture}
          />
        )}

        {/* Audio Recorder Modal */}
        {showAudioRecorder && (
          <Suspense fallback={<ModalLoadingSpinner type="audio" />}>
            <AudioRecorder
              onRecordingComplete={handleAudioCapture}
              onClose={() => setShowAudioRecorder(false)}
              isOpen={showAudioRecorder}
            />
          </Suspense>
        )}

        {/* Stable Camera Modal - Our working camera implementation */}
        {showStableCamera && (
          <Suspense fallback={<ModalLoadingSpinner type="camera" />}>
            <StableCameraModal
              onCapture={handleMediaCapture}
              onClose={() => {
                console.log('📷 Closing stable camera modal');
                setShowStableCamera(false);
              }}
            />
          </Suspense>
        )}

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent className="bg-midnight-black border-muted-lavender/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-pearl-white">Discard Changes?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-lavender">
                You have unsaved changes. Are you sure you want to go back? Your content will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10">
                Keep Editing
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCancelAndReturn}
                className="bg-glitch-red hover:bg-glitch-red/90 text-white"
              >
                Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Render publishing state
  if (step === 'publishing') {
    return (
      <div className="min-h-screen bg-midnight-black pb-safe flex items-center justify-center">
        <div className="text-center space-y-6 px-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 border-2 border-neon-lilac/40 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-neon-lilac animate-spin" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-headline text-pearl-white">
              Sharing your {postData.type}...
            </h2>
            <p className="text-muted-lavender">
              {uploadProgress < 100 ? 'Uploading your content...' : 'Finishing up and returning to feed...'}
            </p>
          </div>

          <div className="w-full max-w-xs mx-auto">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-lavender mt-2">{Math.round(uploadProgress)}% complete</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}