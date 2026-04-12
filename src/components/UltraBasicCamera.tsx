import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface UltraBasicCameraProps {
  onClose?: () => void;
}

export function UltraBasicCamera({ onClose }: UltraBasicCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string) => {
    console.log(`[ULTRA CAMERA] ${message}`);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCamera = async () => {
    setIsRunning(true);
    setError('');
    setLogs([]);
    
    try {
      addLog('🚀 Starting ultra-basic camera test...');
      
      // Step 1: Check browser support
      addLog('📱 Checking browser support...');
      if (!navigator.mediaDevices) {
        throw new Error('navigator.mediaDevices not available');
      }
      addLog('✅ navigator.mediaDevices is available');
      
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not available');
      }
      addLog('✅ getUserMedia is available');
      
      // Step 2: Check HTTPS
      addLog('🔒 Checking HTTPS...');
      const isHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      addLog(`${isHTTPS ? '✅' : '❌'} HTTPS status: ${window.location.protocol} on ${window.location.hostname}`);
      
      // Step 3: Simple constraints first
      addLog('🎥 Requesting camera with minimal constraints...');
      const simpleConstraints = { video: true };
      
      addLog('⏳ Calling getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
      addLog('✅ getUserMedia successful!');
      
      // Step 4: Check stream
      const tracks = stream.getTracks();
      addLog(`📹 Stream has ${tracks.length} tracks`);
      tracks.forEach((track, i) => {
        addLog(`   Track ${i}: ${track.kind} - ${track.label} - ${track.readyState}`);
      });
      
      // Step 5: Get video element
      addLog('🎬 Getting video element...');
      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not found');
      }
      addLog('✅ Video element found');
      
      // Step 6: Assign stream
      addLog('🔗 Assigning stream to video...');
      video.srcObject = stream;
      addLog('✅ Stream assigned');
      
      // Step 7: Play video
      addLog('▶️ Starting video playback...');
      await video.play();
      addLog('✅ Video playing!');
      
      // Step 8: Check video dimensions
      addLog(`📐 Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
      
      addLog('🎉 Camera test completed successfully!');
      
    } catch (err: any) {
      const errorMsg = err.message || err.toString();
      addLog(`❌ Error: ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setIsRunning(false);
    }
  };

  const stopCamera = () => {
    addLog('🛑 Stopping camera...');
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        addLog(`   Stopping ${track.kind} track`);
        track.stop();
      });
      video.srcObject = null;
      addLog('✅ Camera stopped');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-midnight-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-midnight-black border border-muted-lavender/30 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-xl text-pearl-white">
            Ultra-Basic Camera Test
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-muted-lavender hover:text-pearl-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Video Preview */}
          <div className="relative bg-black rounded-xl overflow-hidden border border-muted-lavender/20">
            <video
              ref={videoRef}
              className="w-full h-48"
              autoPlay
              playsInline
              muted
              style={{
                backgroundColor: '#000000',
                objectFit: 'cover'
              }}
            />
            {isRunning && (
              <div className="absolute inset-0 bg-midnight-black/80 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-lilac mx-auto mb-2"></div>
                  <p className="text-muted-lavender text-sm">Testing...</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex space-x-3">
            <Button
              onClick={testCamera}
              disabled={isRunning}
              className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-white border-none"
            >
              {isRunning ? 'Testing...' : 'Start Test'}
            </Button>
            
            <Button
              onClick={stopCamera}
              variant="outline"
            >
              Stop
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-glitch-red/20 border border-glitch-red/50 rounded-lg">
              <div className="text-glitch-red text-sm font-medium">
                Error: {error}
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="flex-1 min-h-0">
            <h3 className="text-pearl-white font-medium mb-2">Real-time Log:</h3>
            <div className="bg-midnight-black/50 border border-muted-lavender/20 rounded-lg p-3 h-32 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-muted-lavender text-sm italic">Click "Start Test" to begin...</p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono text-muted-lavender">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Browser Info */}
          <details className="text-xs">
            <summary className="text-muted-lavender cursor-pointer hover:text-pearl-white">
              Browser Info
            </summary>
            <div className="mt-2 p-2 bg-midnight-black/30 rounded text-muted-lavender font-mono space-y-1">
              <div>User Agent: {navigator.userAgent.substring(0, 100)}...</div>
              <div>Location: {window.location.href}</div>
              <div>Protocol: {window.location.protocol}</div>
              <div>MediaDevices: {navigator.mediaDevices ? 'Available' : 'Not Available'}</div>
              <div>getUserMedia: {navigator.mediaDevices?.getUserMedia ? 'Available' : 'Not Available'}</div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}