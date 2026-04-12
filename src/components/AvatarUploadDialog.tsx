import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Upload, Camera, X, RotateCcw } from 'lucide-react';
import { AvatarCropper } from './AvatarCropper';
import { StableCameraModal } from './StableCameraModal';
import { uploadAvatar } from '../utils/supabase/avatar-helpers';
import { useAvatarRefresh } from '../utils/avatar-refresh-context';
import { useIsMobile } from './ui/use-mobile';
import { toast } from 'sonner@2.0.3';

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AvatarUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarUpdate: (avatarUrl: string) => void;
  userId: string;
  currentAvatarUrl?: string | null;
}

type UploadState = 'selecting' | 'cropping' | 'uploading' | 'camera';

export function AvatarUploadDialog({ 
  isOpen, 
  onClose, 
  onAvatarUpdate, 
  userId,
  currentAvatarUrl 
}: AvatarUploadDialogProps) {
  const [uploadState, setUploadState] = useState<UploadState>('selecting');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropData, setCropData] = useState<CropData>({ x: 0, y: 0, width: 0, height: 0 });
  const [zoom, setZoom] = useState([1]);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const { triggerAvatarRefresh } = useAvatarRefresh();
  const isMobile = useIsMobile();

  // Image refs for cropping
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const previewRef = React.useRef<HTMLCanvasElement>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setUploadState('selecting');
      setSelectedFile(null);
      setZoom([1]);
      setImageOffset({ x: 0, y: 0 });
      setImageLoaded(false);
    }
  }, [isOpen]);

  // Initialize image for cropping
  React.useEffect(() => {
    if (!selectedFile || uploadState !== 'cropping') return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      centerImage();
    };
    img.src = URL.createObjectURL(selectedFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [selectedFile, uploadState]);

  // Center image in crop area
  const centerImage = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const img = imageRef.current;
    
    const scale = zoom[0];
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    
    const centerX = (canvas.width - scaledWidth) / 2;
    const centerY = (canvas.height - scaledHeight) / 2;
    
    setImageOffset({ x: centerX, y: centerY });
  }, [zoom]);

  // Draw canvas with cropping interface
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !previewRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const preview = previewRef.current;
    const ctx = canvas.getContext('2d');
    const previewCtx = preview.getContext('2d');
    const img = imageRef.current;

    if (!ctx || !previewCtx) return;

    const scale = zoom[0];
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(
      img,
      imageOffset.x,
      imageOffset.y,
      scaledWidth,
      scaledHeight
    );

    // Draw crop overlay - square crop area
    const cropSize = Math.min(canvas.width, canvas.height) - 40; // 20px margin on each side
    const cropX = (canvas.width - cropSize) / 2;
    const cropY = (canvas.height - cropSize) / 2;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(cropX, cropY, cropSize, cropSize);
    ctx.globalCompositeOperation = 'source-over';

    // Draw crop border with green dashed line like in design
    ctx.strokeStyle = '#10B981'; // Green color
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(cropX, cropY, cropSize, cropSize);
    ctx.setLineDash([]);

    // Update crop data
    const sourceX = Math.max(0, cropX - imageOffset.x) / scale;
    const sourceY = Math.max(0, cropY - imageOffset.y) / scale;
    const sourceSize = cropSize / scale;

    const newCropData = {
      x: sourceX,
      y: sourceY,
      width: sourceSize,
      height: sourceSize
    };

    setCropData(newCropData);

    // Draw circular preview
    previewCtx.clearRect(0, 0, preview.width, preview.height);
    previewCtx.save();
    
    // Create circular clip
    previewCtx.beginPath();
    previewCtx.arc(preview.width / 2, preview.height / 2, preview.width / 2, 0, Math.PI * 2);
    previewCtx.clip();
    
    // Draw cropped area to preview
    previewCtx.drawImage(
      canvas,
      cropX, cropY, cropSize, cropSize,
      0, 0, preview.width, preview.height
    );
    
    previewCtx.restore();

    // Draw preview border
    previewCtx.strokeStyle = '#C084FC';
    previewCtx.lineWidth = 3;
    previewCtx.beginPath();
    previewCtx.arc(preview.width / 2, preview.height / 2, preview.width / 2 - 1.5, 0, Math.PI * 2);
    previewCtx.stroke();

  }, [imageLoaded, zoom, imageOffset]);

  // Redraw when dependencies change
  React.useEffect(() => {
    if (uploadState === 'cropping') {
      drawCanvas();
    }
  }, [drawCanvas, uploadState]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('Image must be smaller than 2MB');
      return;
    }

    setSelectedFile(file);
    setUploadState('cropping');
  }, []);

  // Handle camera capture
  const handleCameraCapture = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadState('cropping');
  }, []);

  // Handle mouse/touch events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    setImageOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setDragStart({ x: clientX, y: clientY });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle zoom change
  const handleZoomChange = useCallback((value: number[]) => {
    setZoom(value);
  }, []);

  // Handle recenter
  const handleRecenter = useCallback(() => {
    centerImage();
  }, [centerImage]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    
    try {
      const result = await uploadAvatar(userId, selectedFile, cropData);
      
      if (result.success && result.url) {
        // Trigger global avatar refresh for all components
        triggerAvatarRefresh(userId);
        
        // Call the original callback (may be empty but still call it)
        onAvatarUpdate(result.url);
        
        toast.success('Avatar updated! 📸');
        onClose();
      } else {
        throw new Error(result.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Try again.';
      toast.error('Upload failed', { description: errorMessage });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, cropData, userId, onAvatarUpdate, onClose, isUploading]);

  // Handle back/change
  const handleChange = useCallback(() => {
    setUploadState('selecting');
    setSelectedFile(null);
    setImageLoaded(false);
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return (
    <>
      <Dialog open={isOpen && uploadState !== 'camera'} onOpenChange={onClose}>
        <DialogContent 
          className={`${isMobile ? 'h-full max-h-screen w-full max-w-none m-0 rounded-none' : 'max-w-lg'} bg-gradient-to-br from-midnight-black/95 to-midnight-black/90 border-muted-lavender/30 p-0`}
          onPointerDownOutside={(e) => {
            if (isUploading) e.preventDefault();
          }}
        >
          {/* Header */}
          <DialogHeader className="p-6 border-b border-muted-lavender/20">
            <DialogTitle className="text-xl font-headline text-pearl-white">
              Upload Avatar
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-lavender mt-1">
              Choose a photo to use as your profile picture. You can upload from your device or take a new photo.
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="p-6">
            {uploadState === 'selecting' && (
              <div className="space-y-6">
                {/* Upload Icon */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-muted-lavender/20 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-lavender" />
                  </div>
                  <h3 className="text-lg font-medium text-pearl-white mb-2">
                    Choose your avatar photo
                  </h3>
                  <p className="text-sm text-muted-lavender">
                    JPG, PNG • Max 2MB
                  </p>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-1 gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="w-full p-4 border border-muted-lavender/30 rounded-xl text-center text-pearl-white hover:bg-muted-lavender/10 transition-colors">
                      <Upload className="w-5 h-5 mx-auto mb-2" />
                      <span className="font-medium">Choose File</span>
                    </div>
                  </label>

                  <button
                    onClick={() => setUploadState('camera')}
                    className="w-full p-4 border border-electric-blue/30 rounded-xl text-center text-electric-blue hover:bg-electric-blue/10 transition-colors"
                  >
                    <Camera className="w-5 h-5 mx-auto mb-2" />
                    <span className="font-medium">Camera</span>
                  </button>
                </div>
              </div>
            )}

            {uploadState === 'cropping' && selectedFile && (
              <div className="space-y-6">
                {/* File info */}
                <div className="text-center">
                  <h3 className="text-lg font-medium text-pearl-white mb-1">
                    {selectedFile.name}
                  </h3>
                  <p className="text-sm text-muted-lavender">
                    {formatFileSize(selectedFile.size)} • Drag to position, use slider to zoom
                  </p>
                </div>

                {/* Cropping area */}
                <div className="relative bg-midnight-black/50 rounded-xl overflow-hidden border border-muted-lavender/20">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={400}
                    className="w-full h-auto cursor-move touch-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                  />
                </div>

                {/* Zoom controls */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-pearl-white mb-2 block">
                      Zoom
                    </label>
                    <Slider
                      value={zoom}
                      onValueChange={handleZoomChange}
                      min={0.5}
                      max={3}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-lavender mt-1">
                      <span>0.5x</span>
                      <span>3x</span>
                    </div>
                  </div>

                  {/* Recenter button */}
                  <Button
                    onClick={handleRecenter}
                    variant="outline"
                    className="w-full border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Recenter
                  </Button>
                </div>

                {/* Preview */}
                <div className="text-center">
                  <canvas
                    ref={previewRef}
                    width={120}
                    height={120}
                    className="mx-auto rounded-full"
                  />
                  <p className="text-sm text-muted-lavender mt-2">Preview</p>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleChange}
                    variant="outline"
                    className="border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10"
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Change
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-midnight-black/30 border-t-midnight-black rounded-full animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Modal */}
      {uploadState === 'camera' && (
        <StableCameraModal
          onClose={() => setUploadState('selecting')}
          onCapture={handleCameraCapture}
          avatarMode={true}
        />
      )}
    </>
  );
}