import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface BasicCameraTestProps {
  onClose?: () => void;
}

export function BasicCameraTest({ onClose }: BasicCameraTestProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('Not started');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    console.log('🎥 [BASIC CAMERA] Starting camera...');
    setIsLoading(true);
    setError('');
    setStatus('Requesting camera access...');

    try {
      // Step 1: Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }
      console.log('✅ [BASIC CAMERA] getUserMedia is available');
      setStatus('getUserMedia available');

      // Step 2: Request camera access with your exact constraints
      const constraints = {
        video: { facingMode: 'user', width: 480, height: 360 },
        audio: true
      };

      console.log('📲 [BASIC CAMERA] Requesting media with constraints:', constraints);
      setStatus('Requesting media stream...');

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ [BASIC CAMERA] Got media stream:', mediaStream);
      setStatus('Media stream obtained');

      // Step 3: Check if we have video tracks
      const videoTracks = mediaStream.getVideoTracks();
      console.log('📹 [BASIC CAMERA] Video tracks:', videoTracks.length);
      if (videoTracks.length === 0) {
        throw new Error('No video tracks in stream');
      }

      const videoTrack = videoTracks[0];
      console.log('📹 [BASIC CAMERA] Video track details:', {
        label: videoTrack.label,
        enabled: videoTrack.enabled,
        readyState: videoTrack.readyState,
        settings: videoTrack.getSettings()
      });

      setStatus('Video track ready');

      // Step 4: Get video element
      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not found');
      }
      console.log('🎬 [BASIC CAMERA] Video element found');
      setStatus('Video element ready');

      // Step 5: Assign stream to video element
      console.log('🔗 [BASIC CAMERA] Assigning stream to video element...');
      video.srcObject = mediaStream;
      setStream(mediaStream);
      setStatus('Stream assigned to video');

      // Step 6: Wait for video to load and play
      video.onloadedmetadata = () => {
        console.log('📊 [BASIC CAMERA] Video metadata loaded:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          duration: video.duration
        });
        setStatus(`Video loaded: ${video.videoWidth}x${video.videoHeight}`);

        video.play().then(() => {
          console.log('▶️ [BASIC CAMERA] Video playing successfully');
          setStatus('✅ Camera preview active!');
          setIsLoading(false);
        }).catch((playError) => {
          console.error('❌ [BASIC CAMERA] Video play failed:', playError);
          setError('Failed to start video playback: ' + playError.message);
          setIsLoading(false);
        });
      };

      video.onerror = (e) => {
        console.error('❌ [BASIC CAMERA] Video element error:', e);
        setError('Video element error');
        setIsLoading(false);
      };

    } catch (err: any) {
      console.error('❌ [BASIC CAMERA] Failed:', err);
      setError('Camera failed: ' + err.message);
      setStatus('❌ Failed');
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    console.log('🛑 [BASIC CAMERA] Stopping camera...');
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind} - ${track.label}`);
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('Camera stopped');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="fixed inset-0 z-50 bg-midnight-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-midnight-black border border-muted-lavender/30 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-headline text-xl text-pearl-white mb-2">
              Basic Camera Test
            </h2>
            <p className="text-muted-lavender text-sm">
              Minimal camera implementation for debugging
            </p>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-muted-lavender hover:text-pearl-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Status */}
        <div className="mb-4 p-3 bg-midnight-black/50 border border-muted-lavender/20 rounded-lg">
          <div className="text-muted-lavender text-sm">
            <strong>Status:</strong> {status}
          </div>
          {error && (
            <div className="text-glitch-red text-sm mt-2">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Video Preview */}
        <div className="mb-6 relative bg-black rounded-xl overflow-hidden border border-muted-lavender/20">
          <video
            ref={videoRef}
            className="w-full h-64"
            style={{
              backgroundColor: '#000000',
              display: 'block',
              width: '100%',
              height: '256px'
            }}
            autoPlay
            playsInline
            muted
          />
          
          {isLoading && (
            <div className="absolute inset-0 bg-midnight-black/80 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-lilac mx-auto mb-2"></div>
                <p className="text-muted-lavender text-sm">Loading camera...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-midnight-black/80 flex items-center justify-center">
              <div className="text-center p-4">
                <div className="text-glitch-red text-lg mb-2">❌</div>
                <p className="text-muted-lavender text-sm">Camera Error</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex space-x-4">
          <Button
            onClick={startCamera}
            disabled={isLoading || !!stream}
            className="flex-1 bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-white border-none"
          >
            {isLoading ? 'Starting...' : 'Start Camera'}
          </Button>
          
          <Button
            onClick={stopCamera}
            disabled={!stream}
            variant="outline"
            className="flex-1"
          >
            Stop Camera
          </Button>
        </div>

        {/* Debug Info */}
        <details className="mt-4">
          <summary className="text-muted-lavender text-sm cursor-pointer hover:text-pearl-white">
            Debug Info
          </summary>
          <div className="mt-2 p-3 bg-midnight-black/30 rounded-lg text-xs font-mono text-muted-lavender space-y-1">
            <div>Browser: {navigator.userAgent}</div>
            <div>MediaDevices available: {navigator.mediaDevices ? '✅' : '❌'}</div>
            <div>getUserMedia available: {navigator.mediaDevices?.getUserMedia ? '✅' : '❌'}</div>
            <div>HTTPS: {window.location.protocol === 'https:' ? '✅' : '❌'}</div>
            <div>Video element: {videoRef.current ? '✅' : '❌'}</div>
            <div>Stream active: {stream ? '✅' : '❌'}</div>
            {stream && (
              <div>Stream tracks: {stream.getTracks().length}</div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}