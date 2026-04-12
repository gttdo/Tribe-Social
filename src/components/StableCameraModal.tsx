import React, { useRef, useState } from 'react';
import { Camera, Video, Square, X, AlertTriangle, Download, RotateCcw } from 'lucide-react';

interface StableCameraModalProps {
  onClose?: () => void;
  onCapture?: (file: File, type: 'image' | 'video') => void;
  avatarMode?: boolean; // New prop for avatar-specific UI
}

export function StableCameraModal({ onClose, onCapture, avatarMode = false }: StableCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMobile, setIsMobile] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');

  // Check if device is mobile on mount
  React.useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      setIsMobile(mobileCheck);
    };
    
    checkMobile();
  }, []);

  // Initialize camera function
  const initCamera = React.useCallback(async (facingModeToUse: 'user' | 'environment' = 'user') => {
    try {
      console.log('🎥 StableCamera: Starting camera initialization with facingMode:', facingModeToUse);
      setIsLoading(true);
      setError('');

      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Request camera access with specified facing mode
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingModeToUse, 
          width: 480, 
          height: 360 
        },
        audio: true
      });

      console.log('🎥 StableCamera: MediaStream obtained:', mediaStream);
      streamRef.current = mediaStream;

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('🎥 StableCamera: Video playing successfully');
              setIsLoading(false);
            }).catch(err => {
              console.error('🎥 StableCamera: Video play failed:', err);
              setError('Failed to start video preview');
              setIsLoading(false);
            });
          }
        };
      }

    } catch (err: any) {
      console.error('🎥 StableCamera: Camera access failed:', err);
      
      let errorMessage = 'Camera access failed. Please check permissions and try again.';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is busy or unavailable. Please close other applications using the camera.';
      } else if (err.name === 'OverconstrainedError') {
        // If requested facing mode is not available, try the opposite
        const fallbackMode = facingModeToUse === 'user' ? 'environment' : 'user';
        console.log('🎥 StableCamera: Facing mode not supported, trying fallback:', fallbackMode);
        try {
          await initCamera(fallbackMode);
          setFacingMode(fallbackMode);
          return;
        } catch (fallbackErr) {
          errorMessage = 'Camera not available with requested settings. Try switching camera modes.';
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  // Initialize camera - called only once when component mounts
  // Use setTimeout to defer initialization until after initial render
  React.useEffect(() => {
    let mounted = true;
    
    // Defer camera initialization to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      if (!mounted) return;
      initCamera(facingMode);
    }, 100); // Short delay to allow UI to render first

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      console.log('🎥 StableCamera: Cleaning up...');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, []); // Empty dependency array - runs only once

  // Toggle camera facing mode (front/back)
  const toggleCamera = async () => {
    if (isLoading || isRecording) return;
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    console.log('🎥 StableCamera: Toggling camera from', facingMode, 'to', newFacingMode);
    
    setFacingMode(newFacingMode);
    await initCamera(newFacingMode);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const stream = streamRef.current;
    
    if (!video || !canvas || !stream) {
      console.error('🎥 StableCamera: Missing elements for photo capture');
      return;
    }

    console.log('🎥 StableCamera: Capturing photo...');

    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('🎥 StableCamera: Cannot get canvas context');
      return;
    }
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        console.log('🎥 StableCamera: Photo captured successfully:', file);
        
        if (onCapture) {
          onCapture(file, 'image');
        } else {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `photo-${Date.now()}.jpg`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    }, 'image/jpeg', 0.95);
  };

  const startRecording = () => {
    const stream = streamRef.current;
    
    if (!stream) {
      console.error('🎥 StableCamera: No stream available for recording');
      return;
    }

    try {
      console.log('🎥 StableCamera: Starting recording...');
      recordedChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        
        console.log('🎥 StableCamera: Video recorded successfully:', file);
        
        if (onCapture) {
          onCapture(file, 'video');
        } else {
          // Show preview
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
        }
      };

      // Start recording
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('🎥 StableCamera: Recording failed:', err);
      setError('Recording failed. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('🎥 StableCamera: Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const retryCamera = () => {
    console.log('🎥 StableCamera: Retrying camera initialization...');
    setError('');
    setIsLoading(true);
    
    // Force re-mount by reloading the page (simple but effective)
    window.location.reload();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-midnight-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-midnight-black border border-muted-lavender/30 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-headline text-pearl-white">
              {avatarMode ? 'Take a Photo' : 'Camera'}
            </h2>
            <p className="text-sm text-muted-lavender">
              {avatarMode ? 'Capture your avatar photo' : isRecording ? 'Recording...' : captureMode === 'photo' ? 'Tap the button to take a photo' : 'Tap the button to start recording'}
            </p>
          </div>
          {onClose && (
            <button
              onClick={() => {
                console.log('🎥 StableCamera: Close button clicked');
                onClose();
              }}
              className="p-2 text-muted-lavender hover:text-pearl-white transition-colors"
              style={{ zIndex: 100, position: 'relative' }}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Camera Preview */}
        <div className="relative bg-midnight-black rounded-xl overflow-hidden border border-muted-lavender/20 mb-6">
          {!recordedVideoUrl ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-64 object-cover bg-black"
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '16rem',
                  objectFit: 'cover',
                  backgroundColor: '#000000'
                }}
              />
              
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-midnight-black/80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-lilac mx-auto mb-2"></div>
                    <p className="text-muted-lavender">Starting Stable Camera...</p>
                  </div>
                </div>
              )}
              
              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-glitch-red/90 text-white px-3 py-1 rounded-full">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="font-mono text-sm">{formatTime(recordingTime)}</span>
                </div>
              )}

              {/* Camera flip button - only show on mobile and when not recording */}
              {isMobile && !isRecording && !isLoading && (
                <button
                  onClick={toggleCamera}
                  className="absolute top-4 right-4 p-2 bg-midnight-black/70 border border-muted-lavender/30 rounded-full text-pearl-white hover:bg-midnight-black/90 hover:border-muted-lavender/50 transition-all duration-200 touch-target"
                  style={{ 
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                  title={`Switch to ${facingMode === 'user' ? 'back' : 'front'} camera`}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            /* Recorded video preview */
            <video
              src={recordedVideoUrl}
              className="w-full h-64 object-cover"
              controls
              playsInline
            />
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-glitch-red/10 border-2 border-glitch-red/30 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-glitch-red" />
            </div>
            <h3 className="font-headline text-pearl-white mb-2">Camera Error</h3>
            <p className="text-muted-lavender font-body text-sm">{error}</p>
          </div>
        )}

        {/* Controls */}
        {!error && !recordedVideoUrl && (
          <div className="space-y-4">
            {/* Camera flip button */}
            {isMobile && (
              <div className="flex items-center justify-center">
                <button
                  onClick={toggleCamera}
                  disabled={isLoading || isRecording}
                  className="flex items-center space-x-2 px-4 py-2 bg-muted-lavender/10 border border-muted-lavender/30 rounded-full text-muted-lavender hover:bg-muted-lavender/20 hover:text-pearl-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm">Flip</span>
                </button>
              </div>
            )}

            {/* Mode toggle + capture button */}
            <div className="flex flex-col items-center space-y-4">
              {/* Single capture button */}
              <button
                onClick={captureMode === 'video' ? (isRecording ? stopRecording : startRecording) : capturePhoto}
                disabled={isLoading}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isRecording
                    ? 'bg-glitch-red hover:bg-glitch-red/80 scale-110'
                    : 'bg-gradient-to-br from-neon-lilac to-electric-blue hover:opacity-90'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={captureMode === 'video' ? (isRecording ? 'Stop recording' : 'Start recording') : 'Take photo'}
              >
                {isRecording ? (
                  <Square className="w-6 h-6 text-white" />
                ) : captureMode === 'video' ? (
                  <Video className="w-6 h-6 text-white" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>

              {/* Mode toggle - Photo / Video (not shown in avatar mode) */}
              {!avatarMode && (
                <div className="flex items-center bg-muted-lavender/10 rounded-full p-1 border border-border/20">
                  <button
                    onClick={() => setCaptureMode('photo')}
                    disabled={isRecording}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      captureMode === 'photo'
                        ? 'bg-neon-lilac/20 text-pearl-white'
                        : 'text-muted-lavender/60 hover:text-pearl-white'
                    } disabled:opacity-50`}
                  >
                    Photo
                  </button>
                  <button
                    onClick={() => setCaptureMode('video')}
                    disabled={isRecording}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      captureMode === 'video'
                        ? 'bg-electric-blue/20 text-pearl-white'
                        : 'text-muted-lavender/60 hover:text-pearl-white'
                    } disabled:opacity-50`}
                  >
                    Video
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recorded video controls */}
        {recordedVideoUrl && (
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => {
                if (recordedVideoUrl) {
                  const a = document.createElement('a');
                  a.href = recordedVideoUrl;
                  a.download = `video-${Date.now()}.webm`;
                  a.click();
                }
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(to right, #C084FC, #7DD3FC)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Download className="w-5 h-5" />
              Download Video
            </button>
            
            <button
              onClick={() => {
                URL.revokeObjectURL(recordedVideoUrl);
                setRecordedVideoUrl('');
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'transparent',
                color: '#DDD6FE',
                border: '1px solid #DDD6FE',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              Record Again
            </button>
          </div>
        )}

        {/* Retry button for errors */}
        {error && (
          <div className="flex justify-center">
            <button
              onClick={retryCamera}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'transparent',
                color: '#DDD6FE',
                border: '1px solid #DDD6FE',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}