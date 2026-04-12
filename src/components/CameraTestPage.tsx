import React, { useState } from 'react';
import { SimpleCamera } from './SimpleCamera';
import { StableCameraModal } from './StableCameraModal';
import { BasicCameraTest } from './BasicCameraTest';
import { UltraBasicCamera } from './UltraBasicCamera';
import { SimpleTestModal } from './SimpleTestModal';
import { Button } from './ui/button';
import { Camera, ArrowLeft, Bug, Zap } from 'lucide-react';

interface CameraTestPageProps {
  onBack?: () => void;
}

export function CameraTestPage({ onBack }: CameraTestPageProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [showBasicTest, setShowBasicTest] = useState(false);
  const [showUltraTest, setShowUltraTest] = useState(false);
  const [capturedFiles, setCapturedFiles] = useState<Array<{
    file: File;
    type: 'image' | 'video';
    url: string;
    timestamp: number;
  }>>([]);

  // Debug logging
  console.log('🎪 CameraTestPage render:', {
    showCamera,
    showBasicTest,
    showUltraTest,
    capturedFilesCount: capturedFiles.length
  });

  const handleCapture = (file: File, type: 'image' | 'video') => {
    console.log('Captured:', { file, type });
    
    const url = URL.createObjectURL(file);
    const newCapture = {
      file,
      type,
      url,
      timestamp: Date.now()
    };
    
    setCapturedFiles(prev => [newCapture, ...prev]);
    setShowCamera(false);
  };

  const downloadFile = (capture: typeof capturedFiles[0]) => {
    const a = document.createElement('a');
    a.href = capture.url;
    a.download = capture.file.name;
    a.click();
  };

  const clearFiles = () => {
    capturedFiles.forEach(capture => {
      URL.revokeObjectURL(capture.url);
    });
    setCapturedFiles([]);
  };

  return (
    <div 
      className="min-h-screen bg-midnight-black p-4"
      style={{ position: 'relative', zIndex: 1 }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={() => {
                  console.log('🔙 Back button clicked');
                  onBack();
                }}
                className="p-2 text-muted-lavender hover:text-pearl-white transition-colors"
                style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <h1 className="font-headline text-3xl text-pearl-white">Camera Test</h1>
          </div>
          
          <div className="flex space-x-3">
            {/* RAW HTML BUTTONS TO AVOID CSS CONFLICTS */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Ultra Test RAW button clicked - event object:', e);
                console.log('🔥 Ultra Test - current state before update:', { showUltraTest });
                setShowUltraTest(true);
                console.log('🔥 Ultra Test - setShowUltraTest(true) called');
              }}
              style={{
                position: 'relative',
                zIndex: 100,
                pointerEvents: 'auto',
                padding: '8px 16px',
                border: '1px solid rgba(125, 211, 252, 0.5)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: '#7DD3FC',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(125, 211, 252, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Zap className="w-4 h-4" />
              Ultra Test
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🐛 Debug Test RAW button clicked - event object:', e);
                console.log('🐛 Debug Test - current state before update:', { showBasicTest });
                setShowBasicTest(true);
                console.log('🐛 Debug Test - setShowBasicTest(true) called');
              }}
              style={{
                position: 'relative',
                zIndex: 100,
                pointerEvents: 'auto',
                padding: '8px 16px',
                border: '1px solid rgba(255, 107, 107, 0.5)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: '#FF6B6B',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Bug className="w-4 h-4" />
              Debug Test
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📷 Full Camera RAW button clicked - event object:', e);
                console.log('📷 Full Camera - current state before update:', { showCamera });
                setShowCamera(true);
                console.log('📷 Full Camera - setShowCamera(true) called');
              }}
              style={{
                position: 'relative',
                zIndex: 100,
                pointerEvents: 'auto',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(to right, #C084FC, #7DD3FC)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <Camera className="w-5 h-5" />
              Full Camera
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-midnight-black/50 border border-muted-lavender/20 rounded-xl p-6 mb-8">
          <h2 className="font-headline text-xl text-pearl-white mb-4">Camera Features</h2>
          <ul className="space-y-2 text-muted-lavender">
            <li>• Live camera preview at 480x360 resolution</li>
            <li>• Take photos (captures current frame as JPEG)</li>
            <li>• Record videos (saves as WebM format)</li>
            <li>• Audio included in video recordings</li>
            <li>• Automatic cleanup of camera resources</li>
            <li>• Error handling for camera permissions</li>
          </ul>
          
          {/* Test Button to verify clicks work */}
          <div className="mt-4 p-3 bg-glitch-red/10 border border-glitch-red/30 rounded-lg">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                alert('✅ Click test successful! Buttons are working.');
                console.log('✅ Test button clicked successfully');
              }}
              style={{
                position: 'relative',
                zIndex: 100,
                pointerEvents: 'auto',
                padding: '8px 16px',
                border: '1px solid rgba(255, 107, 107, 0.5)',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 107, 107, 0.2)',
                color: '#FF6B6B',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.2)';
              }}
            >
              🧪 Click Test Button
            </button>
            <p className="text-glitch-red text-xs mt-2">
              Click this button to verify button clicks are working
            </p>
          </div>
        </div>

        {/* Captured Files */}
        {capturedFiles.length > 0 && (
          <div className="bg-midnight-black/50 border border-muted-lavender/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-xl text-pearl-white">
                Captured Files ({capturedFiles.length})
              </h2>
              <Button
                onClick={clearFiles}
                variant="outline"
                size="sm"
              >
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {capturedFiles.map((capture, index) => (
                <div
                  key={capture.timestamp}
                  className="bg-midnight-black border border-muted-lavender/10 rounded-lg p-4"
                >
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-3">
                    {capture.type === 'image' ? (
                      <img
                        src={capture.url}
                        alt={`Captured photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={capture.url}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-pearl-white font-medium">
                        {capture.type === 'image' ? 'Photo' : 'Video'}
                      </p>
                      <p className="text-muted-lavender text-sm">
                        {(capture.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => downloadFile(capture)}
                      variant="outline"
                      size="sm"
                    >
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {capturedFiles.length === 0 && (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 text-muted-lavender mx-auto mb-4 opacity-50" />
            <p className="text-muted-lavender">
              No files captured yet. Click "Open Camera" to start taking photos and videos.
            </p>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <StableCameraModal
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Basic Camera Test Modal */}
      {showBasicTest && (
        <>
          {console.log('🐛 Rendering BasicCameraTest modal')}
          <SimpleTestModal 
            title="Debug" 
            onClose={() => setShowBasicTest(false)} 
          />
        </>
      )}

      {/* Ultra Basic Camera Test Modal */}
      {showUltraTest && (
        <>
          {console.log('🔥 Rendering UltraBasicCamera modal')}
          <SimpleTestModal 
            title="Ultra" 
            onClose={() => setShowUltraTest(false)} 
          />
        </>
      )}
    </div>
  );
}