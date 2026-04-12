import React, { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { PostTextArea } from './PostTextArea';
import { MediaAttachment } from './MediaAttachment';
import { MediaToolbar } from './MediaToolbar';
import { usePostSubmit } from './usePostSubmit';
import { POST_TEXT_LIMIT, POST_CAPTION_LIMIT, type Visibility } from './post-constants';
import { toast } from 'sonner';
import { StableCameraModal } from '../StableCameraModal';
import { AudioRecorder } from '../AudioRecorder';

interface PostComposerProps {
  onBack: () => void;
  onPostCreated?: () => void;
}

export function PostComposer({ onBack, onPostCreated }: PostComposerProps) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [mediaError, setMediaError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const { submit, isSubmitting, error, clearError } = usePostSubmit();

  const hasMedia = !!media || !!audioBlob;
  const limit = hasMedia ? POST_CAPTION_LIMIT : POST_TEXT_LIMIT;
  const hasContent = text.trim().length > 0 || hasMedia;
  const isOverLimit = text.length > limit;
  const canPost = hasContent && !isOverLimit && !isSubmitting;

  const handleBack = useCallback(() => {
    if (hasContent && !isSubmitting) {
      setShowDiscardDialog(true);
    } else {
      onBack();
    }
  }, [hasContent, isSubmitting, onBack]);

  const handlePost = async () => {
    clearError();
    const result = await submit({ text, media, audioBlob, visibility });
    if (result.success) {
      toast.success('Posted!');
      onPostCreated?.();
      onBack();
    }
  };

  const handleFileSelected = useCallback((file: File) => {
    setMedia(file);
    setAudioBlob(null);
    setMediaError('');
    clearError();
  }, [clearError]);

  const handleCameraCapture = useCallback((file: File) => {
    setMedia(file);
    setAudioBlob(null);
    setShowCamera(false);
    setMediaError('');
    clearError();
  }, [clearError]);

  const handleAudioCapture = useCallback((blob: Blob) => {
    setAudioBlob(blob);
    setMedia(null);
    setShowAudioRecorder(false);
    setMediaError('');
    clearError();
  }, [clearError]);

  const handleRemoveMedia = useCallback(() => {
    setMedia(null);
    setAudioBlob(null);
    setMediaError('');
  }, []);

  const openCamera = useCallback((mode: 'photo' | 'video') => {
    setCameraMode(mode);
    setShowCamera(true);
  }, []);

  const displayError = error || mediaError;

  return (
    <div className="min-h-screen bg-midnight-black flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/20 shrink-0">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-lg text-muted-lavender/70 hover:text-pearl-white transition-colors"
          aria-label="Back"
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold font-display text-pearl-white">New Post</h1>
        <Button
          onClick={handlePost}
          disabled={!canPost}
          size="sm"
          className="px-5 bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black font-semibold disabled:opacity-40"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
        </Button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <PostTextArea
          value={text}
          onChange={(v) => { setText(v); clearError(); }}
          hasMedia={hasMedia}
        />

        <MediaAttachment
          file={media}
          audioBlob={audioBlob}
          onRemove={handleRemoveMedia}
        />

        {displayError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-glitch-red/10 border border-glitch-red/20" role="alert">
            <AlertCircle className="w-4 h-4 text-glitch-red shrink-0" />
            <p className="text-sm text-glitch-red">{displayError}</p>
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="px-4 pb-4 pt-1 shrink-0">
        <MediaToolbar
          onFileSelected={handleFileSelected}
          onCameraOpen={openCamera}
          onAudioOpen={() => setShowAudioRecorder(true)}
          onError={setMediaError}
          visibility={visibility}
          onVisibilityChange={setVisibility}
          disabled={isSubmitting}
          hasMedia={hasMedia}
        />
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <StableCameraModal
          onClose={() => setShowCamera(false)}
          onCapture={(file: File) => {
            handleCameraCapture(file);
          }}
        />
      )}

      {/* Audio Recorder Modal */}
      {showAudioRecorder && (
        <AudioRecorder
          isOpen={showAudioRecorder}
          onClose={() => setShowAudioRecorder(false)}
          onRecordingComplete={(blob: Blob) => handleAudioCapture(blob)}
        />
      )}

      {/* Discard Confirmation */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="bg-midnight-black/95 border border-muted-lavender/20 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-pearl-white">Discard post?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-lavender/70">
              You have unsaved changes. Are you sure you want to discard this post?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/30 text-muted-lavender hover:text-pearl-white hover:bg-muted/10">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onBack}
              className="bg-glitch-red hover:bg-glitch-red/80 text-white"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
