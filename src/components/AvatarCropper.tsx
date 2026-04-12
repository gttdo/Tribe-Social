import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { RotateCcw } from 'lucide-react';

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AvatarCropperProps {
  imageFile: File;
  onCropChange: (cropData: CropData) => void;
  className?: string;
}

export function AvatarCropper({ imageFile, onCropChange, className }: AvatarCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [zoom, setZoom] = useState([1]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Initialize image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      centerImage();
    };
    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile]);

  // Center image in crop area
  const centerImage = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const img = imageRef.current;
    
    // Calculate centered position
    const scale = zoom[0];
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    
    const centerX = (canvas.width - scaledWidth) / 2;
    const centerY = (canvas.height - scaledHeight) / 2;
    
    setImageOffset({ x: centerX, y: centerY });
  }, [zoom]);

  // Draw canvas
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

    // Draw crop overlay
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

    // Draw crop border
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
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

    console.log('✂️ Crop data updated:', {
      cropArea: { cropX, cropY, cropSize },
      imageOffset,
      scale,
      sourceCrop: newCropData
    });

    onCropChange(newCropData);

    // Draw circular preview
    previewCtx.clearRect(0, 0, preview.width, preview.height);
    previewCtx.save();
    
    // Create circular clip
    previewCtx.beginPath();
    previewCtx.arc(preview.width / 2, preview.height / 2, preview.width / 2, 0, Math.PI * 2);
    previewCtx.clip();
    
    // Draw cropped area to preview
    const previewScale = preview.width / cropSize;
    previewCtx.drawImage(
      canvas,
      cropX, cropY, cropSize, cropSize,
      0, 0, preview.width, preview.height
    );
    
    previewCtx.restore();

    // Draw preview border
    previewCtx.strokeStyle = '#C084FC';
    previewCtx.lineWidth = 2;
    previewCtx.beginPath();
    previewCtx.arc(preview.width / 2, preview.height / 2, preview.width / 2 - 1, 0, Math.PI * 2);
    previewCtx.stroke();

  }, [imageLoaded, zoom, imageOffset, onCropChange]);

  // Redraw when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle mouse/touch events
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

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Main cropper */}
        <div className="relative bg-muted rounded-lg overflow-hidden">
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

        {/* Controls */}
        <div className="space-y-4">
          {/* Zoom slider */}
          <div className="space-y-2">
            <label htmlFor="zoom-slider" className="text-sm font-medium">
              Zoom
            </label>
            <Slider
              id="zoom-slider"
              value={zoom}
              onValueChange={handleZoomChange}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full"
              aria-label="Zoom"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5x</span>
              <span>3x</span>
            </div>
          </div>

          {/* Recenter button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRecenter}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Recenter
          </Button>
        </div>
      </div>

      {/* Circular preview */}
      <div className="mt-6 flex justify-center">
        <div className="text-center space-y-2">
          <canvas
            ref={previewRef}
            width={120}
            height={120}
            className="rounded-full"
          />
          <p className="text-sm text-muted-foreground">Preview</p>
        </div>
      </div>
    </div>
  );
}