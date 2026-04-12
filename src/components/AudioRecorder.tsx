import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Loader2, 
  AlertTriangle,
  Volume2,
  VolumeX,
  CheckCircle,
  Shield,
  Upload,
  Clock,
  Activity
} from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onClose: () => void;
  isOpen: boolean;
}

type RecordingState = 'requesting' | 'idle' | 'recording' | 'stopped' | 'playing' | 'error';
type ErrorType = 'permission' | 'https' | 'unsupported' | 'device' | 'unknown';

export function AudioRecorder({ onRecordingComplete, onClose, isOpen }: AudioRecorderProps) {
  // Core state
  const [state, setState] = useState<RecordingState>('requesting');
  const [error, setError] = useState<{ type: ErrorType; message: string } | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Recording state
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Check security context
  const isSecureContext = window.isSecureContext || location.protocol === 'https:';
  const isMediaSupported = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

  // Initialize audio recording - now deferred
  const initializeRecording = useCallback(async () => {
    console.log('🎤 Initializing audio recording...');
    
    if (!isSecureContext) {
      console.error('❌ Not a secure context');
      setError({ type: 'https', message: 'Microphone access requires a secure connection (HTTPS)' });
      setState('error');
      return;
    }

    if (!isMediaSupported) {
      console.error('❌ Media not supported');
      setError({ type: 'unsupported', message: 'Audio recording is not supported by your browser' });
      setState('error');
      return;
    }

    try {
      setError(null);
      console.log('🔑 Requesting microphone access...');

      // More robust microphone configuration
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 44100, min: 16000 },
          channelCount: { ideal: 1 },
          latency: { ideal: 0.01 }
        } 
      });

      console.log('✅ Microphone access granted');
      console.log('🎤 Stream details:', {
        id: mediaStream.id,
        active: mediaStream.active,
        audioTracks: mediaStream.getAudioTracks().length
      });

      // Verify we have active audio tracks
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available in the media stream');
      }

      console.log('🎤 Audio track details:', audioTracks.map(track => ({
        id: track.id,
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings()
      })));

      // Test audio data flow
      try {
        const testRecorder = new MediaRecorder(mediaStream);
        console.log('🧪 Test MediaRecorder created successfully');
        console.log('🧪 Test MediaRecorder MIME type:', testRecorder.mimeType);
        console.log('🧪 MediaRecorder.isTypeSupported tests:', {
          'audio/webm': MediaRecorder.isTypeSupported('audio/webm'),
          'audio/mp4': MediaRecorder.isTypeSupported('audio/mp4'),
          'audio/ogg': MediaRecorder.isTypeSupported('audio/ogg'),
          'audio/wav': MediaRecorder.isTypeSupported('audio/wav')
        });
      } catch (testError) {
        console.warn('⚠️ MediaRecorder test failed:', testError);
      }

      setStream(mediaStream);

      // Register stream for tracking and cleanup
      try {
        const { registerMediaStream } = await import('../utils/media-permission-helpers');
        registerMediaStream('audio-recorder-microphone', mediaStream);
      } catch (error) {
        console.log('Could not register audio stream for tracking:', error);
      }

      // Set up audio context for visualization
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        // Resume audio context if it's suspended (required by some browsers)
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log('🎵 Audio context resumed');
        }
        
        const source = audioContextRef.current.createMediaStreamSource(mediaStream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.smoothingTimeConstant = 0.8;
        analyserRef.current.minDecibels = -90;
        analyserRef.current.maxDecibels = -10;
        source.connect(analyserRef.current);
        
        console.log('🎵 Audio visualization initialized');
        console.log('🎵 Audio context state:', audioContextRef.current.state);
        console.log('🎵 Analyser settings:', {
          fftSize: analyserRef.current.fftSize,
          frequencyBinCount: analyserRef.current.frequencyBinCount,
          sampleRate: audioContextRef.current.sampleRate
        });
      } catch (audioContextError) {
        console.warn('⚠️ Audio visualization not available:', audioContextError);
      }

      setState('idle');
      toast.success('Microphone ready! 🎤 Tap the red button to start recording.');

    } catch (error) {
      console.error('❌ Audio initialization error:', error);
      
      let errorType: ErrorType = 'unknown';
      let errorMessage = 'Failed to access microphone. Please try again.';
      
      if (error instanceof Error) {
        console.log('Error details:', { name: error.name, message: error.message });
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorType = 'permission';
          errorMessage = 'Microphone access was denied. Please enable microphone permissions in your browser settings.';
        } else if (error.name === 'NotFoundError') {
          errorType = 'device';
          errorMessage = 'No microphone found on this device.';
        } else if (error.name === 'NotReadableError') {
          errorType = 'device';
          errorMessage = 'Microphone is being used by another application.';
        } else if (error.name === 'OverconstrainedError') {
          errorType = 'device';
          errorMessage = 'Microphone settings are not supported by your device.';
        } else {
          errorMessage = `Audio error: ${error.message}`;
        }
      }
      
      setError({ type: errorType, message: errorMessage });
      setState('error');
      toast.error(`Microphone error: ${errorMessage}`);
    }
  }, [isSecureContext, isMediaSupported]);

  // Update audio level for visualization
  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current && (state === 'recording' || state === 'idle')) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      setAudioLevel(normalizedLevel);
      
      // Continue monitoring for both idle and recording states
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [state]);

  // Start audio level monitoring when microphone is ready
  useEffect(() => {
    if (state === 'idle' && analyserRef.current) {
      console.log('🎤 Starting audio level monitoring for idle state');
      updateAudioLevel();
    } else if (state !== 'recording' && state !== 'idle' && animationFrameRef.current) {
      console.log('🎤 Stopping audio level monitoring');
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      setAudioLevel(0);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [state, updateAudioLevel]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!stream || state !== 'idle') {
      console.warn('⚠️ Cannot start recording:', { hasStream: !!stream, state });
      toast.error('Cannot start recording. Please try again.');
      return;
    }

    // Verify stream is still active
    if (!stream.active) {
      console.error('❌ Stream is not active');
      setError({ type: 'device', message: 'Microphone stream is not active. Please refresh and try again.' });
      setState('error');
      return;
    }

    // Verify audio tracks are still active
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error('❌ No active audio tracks');
      setError({ type: 'device', message: 'No active audio tracks found. Please refresh and try again.' });
      setState('error');
      return;
    }

    const activeTrack = audioTracks.find(track => track.readyState === 'live');
    if (!activeTrack) {
      console.error('❌ No live audio tracks');
      setError({ type: 'device', message: 'Audio track is not live. Please refresh and try again.' });
      setState('error');
      return;
    }

    console.log('🎤 Active audio track verified:', {
      id: activeTrack.id,
      enabled: activeTrack.enabled,
      muted: activeTrack.muted,
      readyState: activeTrack.readyState,
      settings: activeTrack.getSettings()
    });

    // Additional check: ensure track is not muted
    if (activeTrack.muted) {
      console.error('❌ Audio track is muted');
      setError({ type: 'device', message: 'Microphone is muted. Please unmute and try again.' });
      setState('error');
      return;
    }

    try {
      console.log('🔴 Starting recording...');
      recordedChunksRef.current = [];
      
      // Test different MIME types for compatibility - prioritize MP3 formats that work with Supabase
      let mimeType = '';
      const supportedTypes = [
        'audio/mpeg',             // MP3 format - most compatible with Supabase
        'audio/mp3',              // MP3 alternative MIME type
        'audio/mp4;codecs=mp4a.40.2',  // MP4 AAC - backup option
        'audio/mp4',              // MP4 fallback
        'audio/aac',              // AAC format - backup
        'audio/ogg;codecs=opus',  // OGG Opus - will need conversion
        'audio/ogg',              // OGG fallback - will need conversion
        'audio/webm;codecs=opus', // WebM Opus - will need conversion
        'audio/webm',             // WebM fallback - will need conversion
        'audio/wav',              // WAV - needs conversion for Supabase
        '' // Browser default fallback
      ];
      
      for (const type of supportedTypes) {
        if (type === '' || MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('📼 Selected MIME type:', mimeType || 'browser default');
          break;
        }
      }

      console.log('📼 All MIME type support:', supportedTypes.map(type => ({
        type: type || 'browser default',
        supported: type === '' ? 'browser default' : MediaRecorder.isTypeSupported(type)
      })));

      // Resume audio context if needed (for Chrome autoplay policy)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
        console.log('🎵 Audio context resumed for recording');
      }

      // Create MediaRecorder with optimized settings for compatibility
      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 96000 // Lower bitrate for better compatibility
      };

      // Only add mimeType if it's not empty (let browser choose default if needed)
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      console.log('🎤 MediaRecorder created with options:', recorderOptions);
      console.log('🎤 MediaRecorder actual mimeType:', mediaRecorder.mimeType);
      console.log('🎤 MediaRecorder state:', mediaRecorder.state);

      let chunkCount = 0;
      let totalDataSize = 0;
      let lastDataTime = 0;

      mediaRecorder.ondataavailable = (event) => {
        const now = Date.now();
        console.log('📊 ondataavailable fired:', {
          dataSize: event.data.size,
          dataType: event.data.type,
          timeStamp: event.timeStamp,
          timeSinceLastData: lastDataTime ? now - lastDataTime : 0
        });
        lastDataTime = now;

        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          chunkCount++;
          totalDataSize += event.data.size;
          console.log(`📊 Valid recording data chunk ${chunkCount}:`, {
            size: event.data.size,
            type: event.data.type,
            totalChunks: recordedChunksRef.current.length,
            totalSize: totalDataSize
          });
        } else {
          console.warn('⚠️ Received empty or invalid data chunk:', {
            hasData: !!event.data,
            dataSize: event.data?.size || 0,
            dataType: event.data?.type || 'unknown',
            streamActive: stream.active,
            trackEnabled: activeTrack.enabled,
            trackMuted: activeTrack.muted,
            recorderState: mediaRecorder.state
          });
          
          // Check if this is a systematic issue
          if (chunkCount === 0 && now - lastDataTime > 2000) {
            console.error('❌ No valid audio data received for 2+ seconds, stopping recording');
            mediaRecorder.stop();
            setError({ type: 'device', message: 'No audio data is being captured. Please check your microphone settings and try again.' });
            setState('error');
            return;
          }
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped, creating blob...');
        console.log('📊 Final recording stats:', {
          chunkCount: recordedChunksRef.current.length,
          totalSize: recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
          chunks: recordedChunksRef.current.map(chunk => ({ size: chunk.size, type: chunk.type }))
        });
        
        if (recordedChunksRef.current.length === 0) {
          console.error('❌ No recording data available');
          setError({ type: 'device', message: 'No audio data was recorded. Please check your microphone and try again.' });
          setState('error');
          toast.error('No audio was recorded - please check microphone permissions');
          return;
        }

        // Use the actual mimeType from the MediaRecorder, with fallbacks
        let finalMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        
        // Ensure we have a valid MIME type
        if (!finalMimeType || finalMimeType === '') {
          finalMimeType = 'audio/webm'; // Safe fallback
        }
        
        const blob = new Blob(recordedChunksRef.current, { type: finalMimeType });
        
        console.log('✅ Blob created:', {
          size: blob.size,
          type: blob.type,
          chunksUsed: recordedChunksRef.current.length
        });

        if (blob.size === 0) {
          console.error('❌ Created blob is empty');
          setError({ type: 'device', message: 'Recording failed to capture audio. Please try again.' });
          setState('error');
          toast.error('Recording failed - no audio captured');
          return;
        }

        // Validate minimum recording size (at least 1KB for a meaningful recording)
        if (blob.size < 1000) {
          console.warn('⚠️ Recording is very small, might be corrupted:', blob.size, 'bytes');
          
          // If recording time is very short, guide user to record longer
          if (recordingTime < 2) {
            toast.error('Recording too short. Please record for at least 2 seconds.');
            setState('idle'); // Allow user to try again immediately
            return;
          } else {
            toast.error('Recording is too short or corrupted. Please try recording for longer.');
            setState('idle'); // Allow user to try again immediately
            return;
          }
        }

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
        setState('stopped');
        
        // Stop audio level monitoring
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setAudioLevel(0);
        
        console.log('✅ Recording blob created successfully:', blob.size, 'bytes');
        toast.success(`Recording saved! ${(blob.size / 1024).toFixed(1)} KB`, {
          description: 'Audio recorded successfully. You can preview or use it now.'
        });
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        console.error('❌ MediaRecorder error details:', {
          error: (event as any).error,
          target: event.target,
          type: event.type,
          recorderState: mediaRecorder.state,
          streamActive: stream.active,
          trackStates: audioTracks.map(track => ({
            id: track.id,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
          }))
        });
        setError({ type: 'device', message: 'Recording failed. Please try again.' });
        setState('error');
        toast.error('Recording failed');
      };

      mediaRecorder.onstart = () => {
        console.log('🎤 MediaRecorder started');
        console.log('🎤 MediaRecorder state after start:', mediaRecorder.state);
        toast.success('🔴 Recording in progress...', {
          description: 'Speak clearly into your microphone'
        });
      };

      mediaRecorder.onpause = () => {
        console.log('⏸️ MediaRecorder paused');
      };

      mediaRecorder.onresume = () => {
        console.log('▶️ MediaRecorder resumed');
      };

      // Start recording with longer timeslice for better data capture
      const timeslice = 200; // Use 200ms chunks for more reliable data capture
      console.log('🎤 Starting MediaRecorder with timeslice:', timeslice);
      
      // Add a slight delay to ensure MediaRecorder is fully ready
      setTimeout(() => {
        try {
          mediaRecorder.start(timeslice);
          console.log('🎤 MediaRecorder.start() called');
          
          // Check state with multiple attempts
          let stateCheckAttempts = 0;
          const checkRecordingState = () => {
            stateCheckAttempts++;
            console.log(`🎤 MediaRecorder state check #${stateCheckAttempts}:`, mediaRecorder.state);
            
            if (mediaRecorder.state === 'recording') {
              console.log('✅ MediaRecorder confirmed recording');
              
              // Set state to recording only after confirming MediaRecorder is actually recording
              setState('recording');
              setRecordingTime(0);

              // Start timer
              recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                  const newTime = prev + 1;
                  console.log(`⏱️ Recording time: ${newTime}s, chunks: ${recordedChunksRef.current.length}`);
                  return newTime;
                });
              }, 1000);

              // Start audio level monitoring
              updateAudioLevel();

              console.log('✅ Recording setup completed');
              
              // Set up a data validation check after 3 seconds
              setTimeout(() => {
                if (recordedChunksRef.current.length === 0 && mediaRecorder.state === 'recording') {
                  console.warn('⚠️ No audio data received after 3 seconds, checking audio setup...');
                  toast.error('No audio detected. Please check your microphone and speak louder.');
                }
              }, 3000);
              
            } else if (stateCheckAttempts < 5) {
              // Try again in 100ms, up to 5 times
              setTimeout(checkRecordingState, 100);
            } else {
              console.error('❌ MediaRecorder failed to start properly after multiple attempts. Final state:', mediaRecorder.state);
              setError({ type: 'device', message: 'Failed to start recording. Please try again.' });
              setState('error');
              toast.error('Failed to start recording');
            }
          };
          
          // Start state checking after a small delay
          setTimeout(checkRecordingState, 50);
          
        } catch (startError) {
          console.error('❌ Error calling MediaRecorder.start():', startError);
          setError({ type: 'device', message: 'Failed to start recording. Please try again.' });
          setState('error');
          toast.error('Failed to start recording');
        }
      }, 10); // Small delay to let MediaRecorder fully initialize

    } catch (error) {
      console.error('❌ Recording start error:', error);
      setError({ type: 'device', message: 'Failed to start recording. Please try again.' });
      setState('error');
      toast.error('Failed to start recording');
    }
  }, [stream, state, updateAudioLevel]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      console.log('⏹️ Stopping recording...');
      mediaRecorderRef.current.stop();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [state]);

  // Play recorded audio
  const playAudio = useCallback(() => {
    if (audioRef.current && state === 'stopped') {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = volume;
      audioRef.current.play()
        .then(() => {
          setState('playing');
          setPlaybackTime(0);

          // Start playback timer
          playbackTimerRef.current = setInterval(() => {
            if (audioRef.current) {
              setPlaybackTime(audioRef.current.currentTime);
              
              if (audioRef.current.ended) {
                setState('stopped');
                setPlaybackTime(0);
                if (playbackTimerRef.current) {
                  clearInterval(playbackTimerRef.current);
                  playbackTimerRef.current = null;
                }
              }
            }
          }, 100);
        })
        .catch(error => {
          console.error('❌ Playback error:', error);
          setState('stopped');
          toast.error('Playback failed');
        });
    }
  }, [state, volume]);

  // Pause audio playback
  const pauseAudio = useCallback(() => {
    if (audioRef.current && state === 'playing') {
      audioRef.current.pause();
      setState('stopped');
      
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    }
  }, [state]);

  // Reset recording
  const resetRecording = useCallback(() => {
    console.log('🔄 Resetting recording...');
    
    // Clear timers
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear audio data
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
    }
    
    setRecordingTime(0);
    setPlaybackTime(0);
    setDuration(0);
    setAudioLevel(0);
    setAudioBlob(null);
    setState('idle');
  }, [audioUrl]);

  // Save recording
  const saveRecording = useCallback(() => {
    if (audioBlob) {
      console.log('💾 Saving recording:', audioBlob.size, 'bytes');
      onRecordingComplete(audioBlob);
      toast.success('Audio recording saved! 🎵');
    } else {
      console.error('❌ No audio blob to save');
      toast.error('No recording to save');
    }
  }, [audioBlob, onRecordingComplete]);

  // Cleanup function
  const cleanup = useCallback(async () => {
    console.log('🧹 Cleaning up audio recorder...');
    
    // Unregister from media tracking system
    try {
      const { unregisterMediaStream } = await import('../utils/media-permission-helpers');
      unregisterMediaStream('audio-recorder-microphone');
    } catch (error) {
      console.log('Could not unregister audio stream:', error);
    }
    
    // Clear timers
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop MediaRecorder if it's recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        console.log('🛑 Stopping active MediaRecorder...');
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.warn('⚠️ Error stopping MediaRecorder:', error);
      }
    }
    mediaRecorderRef.current = null;
    
    // Stop stream
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
          console.log('⏹️ Stopped track:', track.kind);
        } catch (error) {
          console.warn('⚠️ Error stopping track:', error);
        }
      });
      setStream(null);
    }
    
    // Cleanup URLs
    if (audioUrl) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch (error) {
        console.warn('⚠️ Error revoking audio URL:', error);
      }
    }
    
    // Close audio context safely
    if (audioContextRef.current) {
      try {
        // Only close if not already closed
        if (audioContextRef.current.state !== 'closed') {
          console.log('🔇 Closing AudioContext...');
          audioContextRef.current.close();
        } else {
          console.log('🔇 AudioContext already closed');
        }
      } catch (error) {
        console.warn('⚠️ Error closing AudioContext (this is usually safe to ignore):', error);
      }
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
  }, [stream, audioUrl]);

  // Initialize on mount and when modal opens - now deferred to avoid blocking render
  useEffect(() => {
    if (isOpen && state === 'requesting') {
      console.log('🎤 Modal opened, scheduling deferred initialization...');
      
      // Defer initialization to next tick to allow UI to render first
      const timeoutId = setTimeout(() => {
        initializeRecording();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        // Only cleanup if not actively recording
        if (state !== 'recording') {
          cleanup();
        }
      };
    }
    
    // Only run cleanup if modal is closed or component unmounts
    // Never cleanup during recording state changes
    if (!isOpen) {
      return cleanup;
    }
    
    return () => {
      // Only cleanup on unmount if not recording
      if (state !== 'recording') {
        cleanup();
      }
    };
  }, [isOpen, state === 'requesting']); // Only depend on isOpen and whether we're in requesting state

  // Set up audio element events
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      };
      
      audioRef.current.onended = () => {
        setState('stopped');
        setPlaybackTime(0);
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
          playbackTimerRef.current = null;
        }
      };
    }
  }, [audioUrl]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fallback file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📁 File uploaded:', file.name, file.size, 'bytes');
      const blob = new Blob([file], { type: file.type });
      onRecordingComplete(blob);
      toast.success('Audio file uploaded! 🎵');
    }
  };

  // Permission request state
  if (state === 'requesting') {
    return (
      <div className="fixed inset-0 z-50 bg-midnight-black/95 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-midnight-black/90 rounded-2xl border border-muted-lavender/30 p-6 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-neon-lilac/20 border border-neon-lilac/40 flex items-center justify-center animate-pulse">
            <Mic className="w-8 h-8 text-neon-lilac" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-headline text-pearl-white text-xl">Microphone Access Required</h3>
            <p className="text-muted-lavender font-body">
              Tribe needs access to your mic to record audio.
            </p>
          </div>

          <div className="bg-muted-lavender/10 rounded-xl p-4 text-left">
            <h4 className="font-body font-medium text-pearl-white mb-2">We'll need permission to:</h4>
            <ul className="text-muted-lavender font-body text-sm space-y-1">
              <li>• Access your device microphone</li>
              <li>• Record audio with noise cancellation</li>
              <li>• Preview recordings before posting</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
            >
              Cancel
            </Button>
            <Button
              onClick={initializeRecording}
              className="flex-1 bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white"
            >
              Allow Microphone
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="fixed inset-0 z-50 bg-midnight-black/95 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-midnight-black/90 rounded-2xl border border-glitch-red/50 p-6 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-glitch-red/20 border border-glitch-red/50 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-glitch-red" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-headline text-pearl-white">
              {error?.type === 'permission' ? 'Microphone Permission Denied' :
               error?.type === 'https' ? 'Secure Connection Required' :
               error?.type === 'unsupported' ? 'Audio Recording Not Supported' :
               'Microphone Error'}
            </h3>
            <p className="text-muted-lavender font-body text-sm">{error?.message}</p>
          </div>

          {error?.type === 'permission' && (
            <div className="bg-muted-lavender/10 rounded-xl p-4 text-left">
              <p className="text-pearl-white font-body font-medium text-sm mb-2">To enable microphone access:</p>
              <ul className="text-muted-lavender font-body text-xs space-y-1">
                <li>1. Click the microphone icon in your browser's address bar</li>
                <li>2. Select "Allow" for microphone permissions</li>
                <li>3. Refresh this page if needed</li>
              </ul>
            </div>
          )}

          {error?.type === 'https' && (
            <div className="bg-muted-lavender/10 rounded-xl p-4 text-left">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-electric-blue" />
                <p className="text-pearl-white font-body font-medium text-sm">Security Notice</p>
              </div>
              <p className="text-muted-lavender font-body text-xs">
                Microphone access requires HTTPS for security. Please use a secure connection.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {/* Fallback file upload */}
            <div className="bg-electric-blue/10 rounded-xl p-4 border border-electric-blue/30">
              <h4 className="text-electric-blue font-body font-medium text-sm mb-2">Upload Instead</h4>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center justify-center space-x-2 bg-electric-blue/20 hover:bg-electric-blue/30 rounded-lg p-3 transition-all duration-300">
                  <Upload className="w-4 h-4 text-electric-blue" />
                  <span className="text-electric-blue font-body text-sm">
                    Choose Audio from Device
                  </span>
                </div>
              </label>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
              >
                Cancel
              </Button>
              <Button
                onClick={initializeRecording}
                className="flex-1 bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main recording interface
  return (
    <div className="fixed inset-0 z-50 bg-midnight-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-midnight-black/90 rounded-2xl border border-neon-lilac/50 shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline text-pearl-white text-lg">Record Audio</h3>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/20 rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Recording interface */}
          <div className="space-y-6">
            {/* Visual indicator */}
            <div className="text-center">
              <div className={`w-32 h-32 mx-auto rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                state === 'recording' 
                  ? 'border-glitch-red bg-glitch-red/20 animate-pulse' 
                  : state === 'playing'
                  ? 'border-electric-blue bg-electric-blue/20'
                  : 'border-neon-lilac/50 bg-neon-lilac/10'
              }`}>
                {state === 'recording' && (
                  <div 
                    className="bg-glitch-red rounded-full transition-all duration-150 flex items-center justify-center"
                    style={{ 
                      width: `${Math.max(48, audioLevel * 80)}px`, 
                      height: `${Math.max(48, audioLevel * 80)}px` 
                    }}
                  >
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                )}
                {state === 'idle' && (
                  <div className="relative">
                    <Mic className={`w-12 h-12 text-neon-lilac transition-all duration-150 ${
                      audioLevel > 0.1 ? 'animate-pulse' : ''
                    }`} style={{ 
                      filter: audioLevel > 0.1 ? `drop-shadow(0 0 ${audioLevel * 10}px rgba(192, 132, 252, 0.8))` : 'none'
                    }} />
                    {/* Small level indicator rings for idle state */}
                    {audioLevel > 0.05 && (
                      <div 
                        className="absolute inset-0 rounded-full border border-neon-lilac/30 animate-ping"
                        style={{ 
                          transform: `scale(${1 + audioLevel * 0.3})`, 
                          opacity: audioLevel * 0.8
                        }}
                      />
                    )}
                  </div>
                )}
                {state !== 'recording' && state !== 'idle' && (
                  <Mic className={`w-12 h-12 ${
                    state === 'playing' ? 'text-electric-blue' :
                    'text-neon-lilac'
                  }`} />
                )}
              </div>
              
              {/* Audio level indicator for idle state */}
              {state === 'idle' && (
                <div className="mt-4">
                  <div className="text-xs text-muted-lavender mb-2">Microphone Level</div>
                  <div className="w-full h-1 bg-muted-lavender/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-neon-lilac to-electric-blue transition-all duration-150"
                      style={{ width: `${Math.max(2, audioLevel * 100)}%` }}
                    />
                  </div>
                  {audioLevel > 0.1 && (
                    <div className="text-xs text-neon-lilac mt-1 animate-pulse">
                      ✓ Audio detected - ready to record!
                    </div>
                  )}
                  {audioLevel <= 0.05 && (
                    <div className="text-xs text-muted-lavender mt-1">
                      Speak to test your microphone
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status and timer */}
            <div className="text-center space-y-2">
              <Badge variant="secondary" className={`${
                state === 'recording' ? 'bg-glitch-red/20 text-glitch-red border-glitch-red/30' :
                state === 'playing' ? 'bg-electric-blue/20 text-electric-blue border-electric-blue/30' :
                state === 'stopped' ? 'bg-neon-lilac/20 text-neon-lilac border-neon-lilac/30' :
                'bg-muted-lavender/20 text-muted-lavender border-muted-lavender/30'
              }`}>
                <Clock className="w-3 h-3 mr-1" />
                {state === 'recording' ? 'Recording...' :
                 state === 'playing' ? 'Playing...' :
                 state === 'stopped' ? 'Ready to share' :
                 'Ready to record'}
              </Badge>
              
              <div className="font-mono text-3xl text-pearl-white">
                {state === 'playing' 
                  ? formatTime(playbackTime)
                  : formatTime(recordingTime)
                }
              </div>
              
              {state === 'stopped' && duration > 0 && (
                <div className="text-sm text-muted-lavender font-body">
                  Duration: {formatTime(duration)}
                </div>
              )}
            </div>

            {/* Playback progress */}
            {state === 'stopped' && duration > 0 && (
              <div className="space-y-2">
                <Progress 
                  value={(playbackTime / duration) * 100} 
                  className="h-2 bg-muted-lavender/20"
                />
              </div>
            )}

            {/* Volume control for playback */}
            {(state === 'stopped' || state === 'playing') && audioUrl && (
              <div className="flex items-center space-x-3">
                <VolumeX className="w-4 h-4 text-muted-lavender" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-muted-lavender/20 rounded-lg outline-none slider"
                />
                <Volume2 className="w-4 h-4 text-muted-lavender" />
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4">
              {state === 'idle' && (
                <Button
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-glitch-red to-glitch-red/80 hover:from-glitch-red/90 hover:to-glitch-red/70 text-white border-2 border-glitch-red/50 transition-all duration-300 shadow-lg dreamy-glow"
                >
                  <Mic className="w-8 h-8" />
                </Button>
              )}

              {state === 'recording' && (
                <Button
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-glitch-red to-glitch-red/80 hover:from-glitch-red/90 hover:to-glitch-red/70 text-white border-2 border-glitch-red/50 transition-all duration-300 shadow-lg"
                >
                  <Square className="w-8 h-8" />
                </Button>
              )}

              {state === 'stopped' && (
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={playAudio}
                    className="w-12 h-12 rounded-full bg-electric-blue/20 hover:bg-electric-blue/30 text-electric-blue border border-electric-blue/30 hover:border-electric-blue/50 transition-all duration-300"
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                  
                  <Button
                    onClick={resetRecording}
                    className="w-12 h-12 rounded-full bg-muted-lavender/20 hover:bg-muted-lavender/30 text-muted-lavender border border-muted-lavender/30 hover:border-muted-lavender/50 transition-all duration-300"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </Button>
                </div>
              )}

              {state === 'playing' && (
                <Button
                  onClick={pauseAudio}
                  className="w-12 h-12 rounded-full bg-electric-blue/20 hover:bg-electric-blue/30 text-electric-blue border border-electric-blue/30 hover:border-electric-blue/50 transition-all duration-300"
                >
                  <Pause className="w-6 h-6" />
                </Button>
              )}
            </div>

            {/* Action buttons */}
            {(state === 'stopped' || state === 'playing') && audioBlob && (
              <div className="flex space-x-3">
                <Button
                  onClick={resetRecording}
                  variant="outline"
                  className="flex-1 border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
                >
                  Record Again
                </Button>
                <Button
                  onClick={saveRecording}
                  className="flex-1 bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Use Recording
                </Button>
              </div>
            )}

            {/* Hidden audio element */}
            {audioUrl && (
              <audio ref={audioRef} src={audioUrl} className="hidden" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}