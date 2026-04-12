import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { 
  Camera, 
  Video, 
  SwitchCamera, 
  X, 
  Loader2, 
  AlertTriangle,
  RotateCcw,
  Square,
  Circle,
  CheckCircle,
  RefreshCw,
  Upload
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface MediaCaptureProps {
  onCapture: (file: File, type: 'image' | 'video') => void;
  onClose: () => void;
  captureMode: 'photo' | 'video';
  isOpen: boolean;
}

type CaptureState = 'idle' | 'initializing' | 'ready' | 'recording' | 'captured' | 'error';

export function MediaCapture({ onCapture, onClose, captureMode, isOpen }: MediaCaptureProps) {
  const mode = captureMode;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<CaptureState>('idle');
  const [error, setError] = useState<string>('');
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasBothCameras, setHasBothCameras] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string>('');
  const [chosenMimeType, setChosenMimeType] = useState<string>('');
  const [showFallbackOptions, setShowFallbackOptions] = useState(false);
  const [showCameraTip, setShowCameraTip] = useState(false);
  const cameraTipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up streams and resources
  const cleanup = useCallback(async () => {
    console.log('🧹 Cleaning up camera resources...');
    
    // Unregister from media tracking system
    try {
      const { unregisterMediaStream } = await import('../utils/media-permission-helpers');
      unregisterMediaStream('media-capture-camera');
    } catch (error) {
      console.log('Could not unregister media stream:', error);
    }
    
    if (stream) {
      console.log('🛑 Stopping all media tracks...');
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recorder:', e);
      }
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (cameraTipTimeoutRef.current) {
      clearTimeout(cameraTipTimeoutRef.current);
      cameraTipTimeoutRef.current = null;
    }
    
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl('');
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCapturedBlob(null);
    setRecordingTime(0);
    setShowFallbackOptions(false);
  }, [stream, capturedUrl]);

  // Clean up on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setState('idle');
      setError('');
    }
    return () => cleanup();
  }, [isOpen, cleanup]);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      setState('initializing');
      setError('');
      setShowFallbackOptions(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: currentDeviceId ? undefined : facingMode,
          deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!mediaStream || mediaStream.getTracks().length === 0) {
        throw new Error('No media tracks in stream');
      }

      // Register stream for tracking and cleanup
      try {
        const { registerMediaStream } = await import('../utils/media-permission-helpers');
        registerMediaStream('media-capture-camera', mediaStream);
      } catch (error) {
        console.log('Could not register media stream for tracking:', error);
      }

      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not found');
      }

      if (video.srcObject) {
        const oldStream = video.srcObject as MediaStream;
        oldStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }

      video.srcObject = mediaStream;
      setStream(mediaStream);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for video to load')), 10000);

        const handleLoadedMetadata = async () => {
          try {
            clearTimeout(timeout);
            if (video.videoWidth === 0 || video.videoHeight === 0) {
              throw new Error('Invalid video dimensions');
            }
            await video.play();
            setState('ready');
            resolve();
          } catch (playError) {
            reject(playError);
          }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        video.addEventListener('error', () => reject(new Error('Video element error')), { once: true });
      });

    } catch (error: any) {
      console.error('Camera init failed:', error);
      let errorMessage = 'Camera access failed. Please check permissions and try again.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is busy or unavailable. Please close other applications using the camera.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setState('error');
      setTimeout(() => setShowFallbackOptions(true), 2000);
    }

    // Get available devices
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }));
      
      setDevices(videoDevices);
      
      const hasMultipleCameras = videoDevices.length >= 2;
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setHasBothCameras(hasMultipleCameras && isMobileDevice);
      
      if (videoDevices.length > 0 && !currentDeviceId) {
        setCurrentDeviceId(videoDevices[0].deviceId);
      }

      if (hasMultipleCameras && isMobileDevice) {
        const showTipTimeout = setTimeout(() => setShowCameraTip(true), 2000);
        const hideTipTimeout = setTimeout(() => setShowCameraTip(false), 5000);
        cameraTipTimeoutRef.current = hideTipTimeout;
      }
    } catch (deviceError) {
      console.warn('Could not enumerate devices:', deviceError);
    }
  }, [currentDeviceId, facingMode]);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen && state === 'idle') {
      const timer = setTimeout(() => initCamera(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, state, initCamera]);

  // Toggle between front and rear cameras
  const toggleCamera = useCallback(async () => {
    if (!hasBothCameras && devices.length <= 1) {
      toast('Only one camera available');
      return;
    }
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setState('initializing');
    
    try {
      setFacingMode(newFacingMode);
      setCurrentDeviceId('');
      cleanup();
      setState('idle');
      
      setTimeout(() => setState('idle'), 200);
      toast(`Switched to ${newFacingMode === 'user' ? 'front' : 'back'} camera`, { duration: 2000 });
    } catch (error) {
      setFacingMode(facingMode);
      setState('ready');
      toast('Camera switch failed. Please try again.', { duration: 3000 });
    }
  }, [facingMode, hasBothCameras, devices.length, cleanup]);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Close with cleanup
  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || state !== 'ready') return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedUrl(url);
        setState('captured');
      } else {
        setError('Failed to capture photo - please try again');
      }
    }, 'image/jpeg', 0.95);
  }, [state]);

  // Start video recording
  const startRecording = useCallback(() => {
    if (!stream || state !== 'ready') return;

    recordedChunksRef.current = [];
    
    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedUrl(url);
        setState('captured');
      };

      mediaRecorder.start(100);
      setState('recording');
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      setError('Recording failed. Please try again.');
    }
  }, [stream, state]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || state !== 'recording') return;

    mediaRecorderRef.current.stop();
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, [state]);

  // Use captured media
  const useCapture = useCallback(() => {
    if (!capturedBlob) return;

    const fileExtension = mode === 'photo' ? 'jpg' : 'webm';
    const mediaType = mode === 'photo' ? 'image' : 'video';
    
    const file = new File(
      [capturedBlob], 
      `tribe-${mode}-${Date.now()}.${fileExtension}`,
      { type: capturedBlob.type }
    );

    onCapture(file, mediaType);
    cleanup();
    onClose();
  }, [capturedBlob, mode, onCapture, cleanup, onClose]);

  // Retake capture
  const retake = useCallback(() => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl('');
    }
    setCapturedBlob(null);
    setState('ready');
  }, [capturedUrl]);

  // Try again after error
  const onTryAgain = useCallback(() => {
    cleanup();
    setState('idle');
    setShowFallbackOptions(false);
    setError('');
  }, [cleanup]);

  // Handle file upload fallback
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const expectedType = mode === 'photo' ? 'image' : 'video';
    const isValidType = expectedType === 'image' 
      ? file.type.startsWith('image/') 
      : file.type.startsWith('video/');

    if (!isValidType) {
      setError(`Please select a valid ${expectedType} file.`);
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError('File size too large. Please select a file under 50MB.');
      return;
    }

    onCapture(file, expectedType);
    cleanup();
    onClose();
  }, [mode, onCapture, cleanup, onClose]);

  // Open file picker
  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-midnight-black/95 flex items-center justify-center p-4 safe-area-inset">
      <div className="w-full max-w-md bg-midnight-black border border-muted-lavender/30 rounded-2xl p-4 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="font-headline text-pearl-white text-lg sm:text-xl">
            {mode === 'photo' ? 'Take Photo' : 'Record Video'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-muted-lavender hover:text-pearl-white transition-colors touch-target"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Camera Preview Area */}
          <div className="relative bg-midnight-black rounded-xl overflow-hidden border border-muted-lavender/20 aspect-video sm:aspect-[4/3]">
            {state === 'captured' && capturedUrl ? (
              // Show captured media
              mode === 'photo' ? (
                <img
                  src={capturedUrl}
                  alt="Captured photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={capturedUrl}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                />
              )
            ) : (
              // Show live camera preview
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover bg-black"
                  autoPlay
                  playsInline
                  muted
                />
                
                {/* Loading overlay */}
                {state === 'initializing' && (
                  <div className="absolute inset-0 bg-midnight-black/80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-neon-lilac animate-spin mx-auto mb-2" />
                      <p className="text-muted-lavender">Starting Camera...</p>
                    </div>
                  </div>
                )}
                
                {/* Recording indicator */}
                {state === 'recording' && (
                  <div className="absolute top-4 left-4 flex items-center space-x-2 bg-glitch-red/90 text-white px-3 py-1 rounded-full z-10">
                    <Circle className="w-3 h-3 fill-current animate-pulse" />
                    <span className="font-mono">{formatTime(recordingTime)}</span>
                  </div>
                )}

                {/* Camera toggle button */}
                {(hasBothCameras || devices.length > 1) && state === 'ready' && (
                  <button
                    onClick={toggleCamera}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-3 bg-midnight-black/80 text-pearl-white border border-muted-lavender/30 rounded-xl hover:bg-midnight-black/90 transition-all duration-300 transform hover:scale-105 active:scale-95 z-10 touch-target"
                    aria-label={`Switch to ${facingMode === 'user' ? 'back' : 'front'} camera`}
                  >
                    <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-neon-lilac border border-midnight-black text-xs flex items-center justify-center">
                      <span className="text-midnight-black text-[8px] font-bold">
                        {facingMode === 'user' ? 'F' : 'B'}
                      </span>
                    </div>
                  </button>
                )}

                {/* Camera mode indicator */}
                {state === 'ready' && (
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 px-2 py-1 sm:px-3 sm:py-1 bg-midnight-black/80 text-pearl-white border border-muted-lavender/30 rounded-lg z-10">
                    <span className="text-xs font-medium">
                      {facingMode === 'user' ? '🤳 Front' : '📷 Back'} Camera
                    </span>
                  </div>
                )}

                {/* Camera tip tooltip */}
                {showCameraTip && (hasBothCameras || devices.length > 1) && state === 'ready' && (
                  <div className="absolute top-16 right-3 sm:top-20 sm:right-4 max-w-48 px-3 py-2 bg-neon-lilac/90 text-midnight-black border border-neon-lilac rounded-lg z-20 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center space-x-1">
                      <SwitchCamera className="w-3 h-3 flex-shrink-0" />
                      <span className="text-xs font-medium">Tap to switch cameras</span>
                    </div>
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-neon-lilac/90 rotate-45 border-l border-t border-neon-lilac"></div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Error State */}
          {state === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-glitch-red/10 border-2 border-glitch-red/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-glitch-red" />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-headline text-pearl-white">Camera Error</h3>
                <p className="text-muted-lavender font-body">{error}</p>
              </div>

              <div className="flex flex-col items-center space-y-3">
                <div className="flex items-center space-x-3">
                  <Button onClick={onTryAgain} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={handleClose} variant="ghost" size="sm">
                    <X className="w-4 h-4 mr-2" />
                    Close
                  </Button>
                </div>
                
                {/* Fallback upload option */}
                {showFallbackOptions && (
                  <div className="w-full pt-3 border-t border-muted-lavender/20">
                    <p className="text-muted-lavender font-body mb-3">
                      Or upload a {mode === 'photo' ? 'photo' : 'video'} from your device:
                    </p>
                    <Button 
                      onClick={openFilePicker}
                      variant="outline" 
                      size="sm"
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload {mode === 'photo' ? 'Photo' : 'Video'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Capture Controls */}
          {(state === 'ready' || state === 'recording') && (
            <div className="flex items-center justify-center space-x-3 sm:space-x-4 px-2">
              {mode === 'photo' ? (
                <Button
                  onClick={capturePhoto}
                  disabled={state !== 'ready'}
                  className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-white border-none disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                  size="lg"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  <span className="hidden sm:inline">Capture Photo</span>
                  <span className="sm:hidden">Capture</span>
                </Button>
              ) : (
                <Button
                  onClick={state === 'recording' ? stopRecording : startRecording}
                  disabled={state !== 'ready' && state !== 'recording'}
                  className={`${
                    state === 'recording' 
                      ? 'bg-glitch-red hover:bg-glitch-red/80' 
                      : 'bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80'
                  } text-white border-none disabled:opacity-50 disabled:cursor-not-allowed touch-target`}
                  size="lg"
                >
                  {state === 'recording' ? (
                    <>
                      <Square className="w-5 h-5 mr-2" />
                      <span className="hidden sm:inline">Stop Recording</span>
                      <span className="sm:hidden">Stop</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5 mr-2" />
                      <span className="hidden sm:inline">Start Recording</span>
                      <span className="sm:hidden">Record</span>
                    </>
                  )}
                </Button>
              )}

              <Button onClick={handleClose} variant="outline" size="lg" className="touch-target">
                <X className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">✕</span>
              </Button>
            </div>
          )}

          {/* Captured Media Controls */}
          {state === 'captured' && (
            <div className="flex items-center justify-center space-x-3 sm:space-x-4 px-2">
              <Button
                onClick={useCapture}
                className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-white border-none touch-target"
                size="lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Use This {mode === 'photo' ? 'Photo' : 'Video'}</span>
                <span className="sm:hidden">Use {mode === 'photo' ? 'Photo' : 'Video'}</span>
              </Button>

              <Button onClick={retake} variant="outline" size="lg" className="touch-target">
                <RotateCcw className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Retake</span>
                <span className="sm:hidden">↻</span>
              </Button>
            </div>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Hidden file input for fallback upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept={mode === 'photo' ? 'image/*' : 'video/*'}
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}