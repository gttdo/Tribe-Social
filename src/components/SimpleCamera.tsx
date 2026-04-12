import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Camera, Video, Square, X, AlertTriangle, Download } from 'lucide-react';

interface SimpleCameraProps {
  onCapture?: (file: File, type: 'image' | 'video') => void;
  onClose?: () => void;
  isOpen?: boolean;
}

export function SimpleCamera({ onCapture, onClose, isOpen = true }: SimpleCameraProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null); // Track stream in ref
  const recordedVideoUrlRef = useRef<string>(''); // Track video URL in ref

  // State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>('');

  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    recordedVideoUrlRef.current = recordedVideoUrl;
  }, [recordedVideoUrl]);

  // Camera constraints as specified
  const constraints = {
    video: { facingMode: 'user', width: 480, height: 360 },
    audio: true
  };

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('🎥 Initializing camera...');

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('🎥 Camera stream obtained:', mediaStream);
      
      // Set stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        console.log('🎥 Video element playing');
      }
      
      setStream(mediaStream);
      setIsLoading(false);
      console.log('🎥 Camera initialization complete');
    } catch (err: any) {
      console.error('🎥 Camera access failed:', err);
      
      let errorMessage = 'Camera access failed. Please check permissions and try again.';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is busy or unavailable. Please close other applications using the camera.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  // Clean up camera stream
  const cleanup = useCallback(() => {
    console.log('🎥 Cleaning up camera resources...');
    
    // Use refs to get current values
    const currentStream = streamRef.current;
    const currentVideoUrl = recordedVideoUrlRef.current;
    
    if (currentStream) {
      console.log('🎥 Stopping stream tracks');
      currentStream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('🎥 Stopping media recorder');
      mediaRecorderRef.current.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
      recordedVideoUrlRef.current = '';
      setRecordedVideoUrl('');
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    console.log('🎥 Camera cleanup complete');
  }, []); // No dependencies - uses refs

  // Initialize camera when component opens - FIXED: stable dependencies
  useEffect(() => {
    console.log('🎥 useEffect triggered - isOpen:', isOpen);
    
    if (isOpen) {
      initCamera();
    }

    // Only cleanup when component unmounts or isOpen changes to false
    return () => {
      if (!isOpen) {
        cleanup();
      }
    };
  }, [isOpen]); // Remove initCamera and cleanup from dependencies to prevent re-renders

  // Separate cleanup effect for when component unmounts
  useEffect(() => {
    return () => {
      console.log('🎥 Component unmounting - final cleanup');
      // Cleanup when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, []); // Empty dependency - only runs on unmount

  // Take photo function
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !stream) {
      console.error('Video, canvas, or stream not available');
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Cannot get canvas context');
      return;
    }
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        console.log('Photo captured:', file);
        
        if (onCapture) {
          onCapture(file, 'image');
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `photo-${Date.now()}.jpg`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    }, 'image/jpeg', 0.95);
  }, [stream, onCapture]);

  // Start recording function
  const startRecording = useCallback(() => {
    if (!stream) {
      console.error('No stream available for recording');
      return;
    }

    try {
      recordedChunksRef.current = [];
      
      // Create MediaRecorder
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
        
        console.log('Video recorded:', file);
        
        if (onCapture) {
          onCapture(file, 'video');
        } else {
          // Fallback: show preview and download option
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Recording failed:', err);
      setError('Recording failed. Please try again.');
    }
  }, [stream, onCapture]);

  // Stop recording function
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Download recorded video
  const downloadRecordedVideo = useCallback(() => {
    if (recordedVideoUrl) {
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      a.download = `video-${Date.now()}.webm`;
      a.click();
    }
  }, [recordedVideoUrl]);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-midnight-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-midnight-black border border-muted-lavender/30 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-pearl-white">Camera</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-muted-lavender hover:text-pearl-white transition-colors"
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
                    <p className="text-muted-lavender">Starting Camera...</p>
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
          <div className="flex items-center justify-center space-x-4">
            {/* Photo button */}
            <Button
              onClick={capturePhoto}
              disabled={isLoading || !stream}
              className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-white border-none disabled:opacity-50"
              size="lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              Photo
            </Button>

            {/* Video recording button */}
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || !stream}
              className={`${
                isRecording 
                  ? 'bg-glitch-red hover:bg-glitch-red/80' 
                  : 'bg-gradient-to-r from-electric-blue to-neon-lilac hover:from-electric-blue/80 hover:to-neon-lilac/80'
              } text-white border-none disabled:opacity-50`}
              size="lg"
            >
              {isRecording ? (
                <>
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  Record
                </>
              )}
            </Button>
          </div>
        )}

        {/* Recorded video controls */}
        {recordedVideoUrl && (
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={downloadRecordedVideo}
              className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-white border-none"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Video
            </Button>
            
            <Button
              onClick={() => {
                URL.revokeObjectURL(recordedVideoUrl);
                setRecordedVideoUrl('');
              }}
              variant="outline"
              size="lg"
            >
              Record Again
            </Button>
          </div>
        )}

        {/* Retry button for errors */}
        {error && (
          <div className="flex justify-center">
            <Button
              onClick={initCamera}
              variant="outline"
              size="lg"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}