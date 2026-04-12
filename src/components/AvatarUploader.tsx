import React, { useCallback, useState, useRef } from 'react';
import { Button } from './ui/button';
import { Upload, Camera, Image, X, Check, RotateCcw } from 'lucide-react';
// Removed cn import due to bundling conflicts
import { validateImageFile } from '../utils/supabase/avatar-helpers';
import { useIsMobile } from './ui/use-mobile';
import { requestCameraPermission, stopMediaStream, hasCamera } from '../utils/camera-permission-helpers';

interface AvatarUploaderProps {
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

type CaptureMode = 'upload' | 'camera' | 'preview';

export function AvatarUploader({ onFileSelect, onError, className, disabled }: AvatarUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragReject, setIsDragReject] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('upload');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processFile = useCallback((file: File) => {
    console.log('📁 Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      console.error('❌ File validation failed:', validation.error);
      onError(validation.error || 'Invalid file');
      return;
    }

    console.log('✅ File validation passed');

    // Check image dimensions
    const img = new Image();
    img.onload = () => {
      console.log('📐 Image loaded, dimensions:', img.width, 'x', img.height);
      
      if (img.width < 256 || img.height < 256) {
        console.error('❌ Image too small:', img.width, 'x', img.height);
        onError('Image must be at least 256×256 px.');
        return;
      }
      
      console.log('✅ Image dimensions valid, proceeding to crop step');
      onFileSelect(file);
    };
    img.onerror = (error) => {
      console.error('❌ Failed to load image:', error);
      onError('Failed to load image. Please try another file.');
    };
    
    const imageUrl = URL.createObjectURL(file);
    console.log('🔗 Created object URL for image:', imageUrl);
    img.src = imageUrl;
  }, [onFileSelect, onError]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔥 Drag enter event');
    setIsDragActive(true);
    setIsDragReject(false); // Keep it simple to avoid constructor issues
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setIsDragReject(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setIsDragReject(false);

    console.log('🔥 Drop event triggered');

    if (disabled) {
      console.log('❌ Upload is disabled');
      return;
    }

    try {
      // Safer way to access dropped files
      if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) {
        console.log('❌ No files in drop event');
        onError('No file dropped');
        return;
      }

      const file = e.dataTransfer.files.item(0); // Use .item() instead of array access
      if (!file) {
        console.log('❌ Could not get file from drop');
        onError('No file dropped');
        return;
      }

      console.log('📄 Dropped file:', file.name, file.type, file.size);
      processFile(file);
    } catch (error) {
      console.error('❌ Error processing drop:', error);
      onError('Error processing dropped file');
    }
  }, [disabled, processFile, onError]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 File input change event triggered');
    const file = e.target.files?.[0];
    if (file) {
      console.log('📄 File selected:', file.name, file.type, file.size);
      processFile(file);
    } else {
      console.log('❌ No file selected from input');
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    console.log('🖱️ Handle click triggered, disabled:', disabled);
    if (!disabled && fileInputRef.current) {
      console.log('📱 Opening file picker');
      fileInputRef.current.click();
    } else if (!fileInputRef.current) {
      console.error('❌ File input ref is null');
    }
  }, [disabled]);

  // Camera functionality
  const startCamera = useCallback(async () => {
    if (disabled) return;
    
    try {
      setIsLoadingCamera(true);
      setCaptureMode('camera');
      
      const result = await requestCameraPermission({
        video: {
          facingMode: 'user', // Front-facing camera
          width: { ideal: 640, max: 1280 },
          height: { ideal: 640, max: 1280 } // Square aspect for avatars
        }
      });
      
      if (result.granted && result.stream) {
        setStream(result.stream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = result.stream;
          await videoRef.current.play();
        }
      } else {
        throw new Error(result.error || 'Camera access failed');
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      onError(error.message || 'Unable to access camera. Please check permissions and try again.');
      setCaptureMode('upload');
    } finally {
      setIsLoadingCamera(false);
    }
  }, [disabled, onError]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stopMediaStream(stream);
      setStream(null);
    }
    setCaptureMode('upload');
    setCapturedImage(null);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      onError('Failed to capture photo. Please try again.');
      return;
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(imageDataUrl);
    setCaptureMode('preview');
    
    // Stop camera stream
    if (stream) {
      stopMediaStream(stream);
      setStream(null);
    }
    
    // Brief success feedback
    // Note: using timeout to avoid blocking the capture
    setTimeout(() => {
      // Toast is handled by parent if needed
    }, 100);
  }, [stream, onError]);

  const saveCapturedPhoto = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;
    
    // Convert data URL to blob and then to file
    canvasRef.current.toBlob((blob) => {
      if (!blob) {
        onError('Failed to process captured image');
        return;
      }
      
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      processFile(file);
      setCapturedImage(null);
      setCaptureMode('upload');
    }, 'image/jpeg', 0.8);
  }, [capturedImage, processFile, onError]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const cancelCapture = useCallback(() => {
    stopCamera();
  }, [stopCamera]);

  // Handle camera capture on mobile (fallback)
  const handleCameraCapture = useCallback(() => {
    console.log('📸 Mobile camera capture triggered');
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'user'; // Front-facing camera
      
      input.onchange = (e) => {
        console.log('📸 Mobile camera input change');
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          console.log('📄 Camera file selected:', file.name, file.type, file.size);
          processFile(file);
        } else {
          console.log('❌ No file from camera');
        }
      };
      
      input.onerror = (error) => {
        console.error('❌ Camera input error:', error);
        onError('Failed to access camera');
      };
      
      // Add input to DOM briefly for iOS compatibility
      document.body.appendChild(input);
      input.click();
      
      // Clean up after a delay
      setTimeout(() => {
        document.body.removeChild(input);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Camera capture setup failed:', error);
      onError('Camera not available');
    }
  }, [processFile, onError]);

  // Cleanup effect
  React.useEffect(() => {
    return () => {
      // Stop camera stream when component unmounts
      if (stream) {
        stopMediaStream(stream);
      }
    };
  }, [stream]);

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload avatar image"
        disabled={disabled}
// Removed key prop to avoid constructor issues
      />

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Mode */}
      {captureMode === 'camera' && (
        <div className="space-y-6">
          <div className="relative bg-midnight-black rounded-lg overflow-hidden aspect-square max-w-sm mx-auto border border-muted-lavender/20">
            {isLoadingCamera ? (
              <div className="absolute inset-0 flex items-center justify-center bg-midnight-black">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-muted-lavender/30 border-b-neon-lilac mx-auto"></div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-lilac/20 to-electric-blue/20 blur-sm"></div>
                  </div>
                  <p className="text-sm text-muted-lavender">Starting camera...</p>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Vaporwave camera overlay with animated circle guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    <div className="w-48 h-48 border-2 border-neon-lilac rounded-full opacity-60 animate-pulse"></div>
                    <div className="absolute inset-0 w-48 h-48 border border-electric-blue/40 rounded-full"></div>
                    {/* Corner guides */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-electric-blue"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-r-2 border-t-2 border-electric-blue"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-l-2 border-b-2 border-electric-blue"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-electric-blue"></div>
                  </div>
                </div>
                
                {/* Subtle gradient overlay for aesthetic */}
                <div className="absolute inset-0 bg-gradient-to-t from-midnight-black/20 via-transparent to-midnight-black/10 pointer-events-none"></div>
              </>
            )}
          </div>

          {/* Camera controls */}
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              size="lg"
              onClick={cancelCapture}
              disabled={isLoadingCamera}
              className="border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10 px-6"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>
            
            <Button
              size="lg"
              onClick={capturePhoto}
              disabled={isLoadingCamera}
              className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-midnight-black min-w-[140px] px-8 shadow-lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              Capture
            </Button>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-lavender">
              Position your face in the circle guide and tap Capture
            </p>
            <p className="text-xs text-muted-lavender/60">
              Make sure you're well-lit for the best result ✨
            </p>
          </div>
        </div>
      )}

      {/* Preview Mode */}
      {captureMode === 'preview' && capturedImage && (
        <div className="space-y-6">
          {/* Preview with side-by-side comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
            {/* Original capture */}
            <div className="space-y-2">
              <p className="text-xs text-muted-lavender text-center font-medium">Captured Photo</p>
              <div className="relative bg-midnight-black rounded-lg overflow-hidden aspect-square border border-muted-lavender/20">
                <img
                  src={capturedImage}
                  alt="Captured photo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            {/* Circle preview (how it will appear) */}
            <div className="space-y-2">
              <p className="text-xs text-muted-lavender text-center font-medium">How It'll Look</p>
              <div className="relative bg-midnight-black rounded-lg aspect-square flex items-center justify-center border border-muted-lavender/20">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neon-lilac/40">
                  <img
                    src={capturedImage}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview controls */}
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              size="lg"
              onClick={retakePhoto}
              className="border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10 px-6"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Retake
            </Button>
            
            <Button
              size="lg"
              onClick={saveCapturedPhoto}
              className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-midnight-black min-w-[140px] px-8 shadow-lg"
            >
              <Check className="w-5 h-5 mr-2" />
              Use Photo
            </Button>
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-lavender">
              Happy with your photo? Tap "Use Photo" to continue
            </p>
            <p className="text-xs text-muted-lavender/60">
              You can always crop and adjust it on the next step
            </p>
          </div>
        </div>
      )}

      {/* Upload Mode */}
      {captureMode === 'upload' && (
        <>
          {/* Drag and drop zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={(e) => {
              // Only handle clicks on the zone itself, not on buttons
              if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.zone-text')) {
                console.log('🎯 Drop zone clicked');
                handleClick();
              }
            }}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              isDragActive 
                ? "border-neon-lilac bg-neon-lilac/5" 
                : isDragReject 
                  ? "border-glitch-red bg-glitch-red/5" 
                  : "border-muted-lavender/25"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="space-y-4">
              {/* Upload icon */}
              <div className="mx-auto w-12 h-12 rounded-full bg-muted-lavender/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-muted-lavender" />
              </div>

              {/* Main text */}
              <div className="space-y-2 zone-text">
                <p className="text-sm font-medium text-pearl-white pointer-events-none">
                  {isDragActive 
                    ? "Drop your image here"
                    : "Drag and drop your image here"
                  }
                </p>
                <p className="text-xs text-muted-lavender pointer-events-none">
                  JPG, PNG, or WebP • Max 2MB • Min 256×256px
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('🔘 Choose image button clicked');
                    handleClick();
                  }}
                  disabled={disabled}
                  className="border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Choose image
                </Button>
                
                {/* Camera button - enhanced for better device support */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasCamera() && !isMobile) {
                      startCamera(); // Full camera experience on desktop
                    } else {
                      handleCameraCapture(); // Mobile-optimized file input with camera
                    }
                  }}
                  disabled={disabled}
                  className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take photo
                </Button>
              </div>
            </div>
          </div>

          {/* Helper text */}
          <p className="mt-3 text-xs text-muted-lavender text-center">
            Use a clear headshot. Square image recommended.
          </p>

          {/* Content rules */}
          <div className="mt-4 p-3 bg-muted-lavender/5 border border-muted-lavender/20 rounded-lg">
            <p className="text-xs text-muted-lavender font-medium mb-2">Image Requirements:</p>
            <ul className="text-xs text-muted-lavender space-y-1">
              <li>• Aspect ratio: 1:1 (square); we display as a circle</li>
              <li>• Accept: JPG, PNG, WebP</li>
              <li>• Min size: ≥ 256×256px</li>
              <li>• Upload cap: ≤ 1024×1024px (auto-downscale if larger)</li>
              <li>• Max file size: ≤ 2 MB</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}