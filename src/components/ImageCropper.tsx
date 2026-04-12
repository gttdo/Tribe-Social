import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  RotateCcw, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Move,
  Check,
  X,
  Grid3X3,
  Maximize
} from 'lucide-react';
import { AspectRatio, CropData } from '../utils/post-creation-types';
import { ASPECT_RATIOS } from '../utils/post-creation-constants';

interface ImageCropperProps {
  image: File;
  aspectRatio: AspectRatio;
  onCropComplete: (cropData: CropData) => void;
  onCancel: () => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
}

export function ImageCropper({ 
  image, 
  aspectRatio, 
  onCropComplete, 
  onCancel,
  onAspectRatioChange 
}: ImageCropperProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [cropData, setCropData] = useState<CropData>({ x: 0, y: 0, width: 0, height: 0, zoom: 1, rotation: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image and calculate initial crop
  useEffect(() => {
    const url = URL.createObjectURL(image);
    setImageUrl(url);
    
    const img = new Image();
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;
      setImageDimensions({ width: naturalWidth, height: naturalHeight });
      
      // Calculate initial crop for the aspect ratio
      const targetRatio = ASPECT_RATIOS.find(ar => ar.value === aspectRatio)?.ratio || 1;
      const imageRatio = naturalWidth / naturalHeight;
      
      let cropWidth: number;
      let cropHeight: number;
      let x: number = 0;
      let y: number = 0;

      if (imageRatio > targetRatio) {
        cropHeight = naturalHeight;
        cropWidth = naturalHeight * targetRatio;
        x = (naturalWidth - cropWidth) / 2;
      } else {
        cropWidth = naturalWidth;
        cropHeight = naturalWidth / targetRatio;
        y = (naturalHeight - cropHeight) / 2;
      }

      setCropData({
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.min(cropWidth, naturalWidth),
        height: Math.min(cropHeight, naturalHeight),
        zoom: 1,
        rotation: 0
      });
    };
    img.src = url;
    
    return () => URL.revokeObjectURL(url);
  }, [image, aspectRatio]);

  // Draw image with crop overlay
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageDimensions.width) return;

    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size to match display size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Calculate scaling to fit image in canvas
    const scaleX = rect.width / imageDimensions.width;
    const scaleY = rect.height / imageDimensions.height;
    const scale = Math.min(scaleX, scaleY);
    
    const displayWidth = imageDimensions.width * scale;
    const displayHeight = imageDimensions.height * scale;
    const offsetX = (rect.width - displayWidth) / 2;
    const offsetY = (rect.height - displayHeight) / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw image
    ctx.save();
    ctx.translate(offsetX + displayWidth/2, offsetY + displayHeight/2);
    ctx.rotate((cropData.rotation || 0) * Math.PI / 180);
    ctx.scale(cropData.zoom || 1, cropData.zoom || 1);
    ctx.drawImage(img, -displayWidth/2, -displayHeight/2, displayWidth, displayHeight);
    ctx.restore();
    
    // Draw crop overlay
    const cropX = offsetX + (cropData.x * scale);
    const cropY = offsetY + (cropData.y * scale);
    const cropWidth = cropData.width * scale;
    const cropHeight = cropData.height * scale;
    
    // Darken area outside crop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.clearRect(cropX, cropY, cropWidth, cropHeight);
    
    // Draw crop border
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);
    
    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.3)';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let i = 1; i < 3; i++) {
        const x = cropX + (cropWidth / 3) * i;
        ctx.beginPath();
        ctx.moveTo(x, cropY);
        ctx.lineTo(x, cropY + cropHeight);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let i = 1; i < 3; i++) {
        const y = cropY + (cropHeight / 3) * i;
        ctx.beginPath();
        ctx.moveTo(cropX, y);
        ctx.lineTo(cropX + cropWidth, y);
        ctx.stroke();
      }
    }
    
    // Draw corner handles
    const handleSize = 12;
    const handles = [
      { x: cropX - handleSize/2, y: cropY - handleSize/2 },
      { x: cropX + cropWidth - handleSize/2, y: cropY - handleSize/2 },
      { x: cropX - handleSize/2, y: cropY + cropHeight - handleSize/2 },
      { x: cropX + cropWidth - handleSize/2, y: cropY + cropHeight - handleSize/2 }
    ];
    
    ctx.fillStyle = '#C084FC';
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
    });
    
  }, [imageDimensions, cropData, showGrid]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setShowGrid(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / imageDimensions.width, rect.height / imageDimensions.height);
    
    const deltaX = (e.clientX - dragStart.x) / scale;
    const deltaY = (e.clientY - dragStart.y) / scale;
    
    setCropData(prev => ({
      ...prev,
      x: Math.max(0, Math.min(imageDimensions.width - prev.width, prev.x + deltaX)),
      y: Math.max(0, Math.min(imageDimensions.height - prev.height, prev.y + deltaY))
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setShowGrid(false);
  };

  const handleZoomChange = (value: number[]) => {
    setCropData(prev => ({ ...prev, zoom: value[0] }));
  };

  const handleRotation = (degrees: number) => {
    setCropData(prev => ({ 
      ...prev, 
      rotation: ((prev.rotation || 0) + degrees) % 360 
    }));
  };

  const resetCrop = () => {
    const targetRatio = ASPECT_RATIOS.find(ar => ar.value === aspectRatio)?.ratio || 1;
    const imageRatio = imageDimensions.width / imageDimensions.height;
    
    let cropWidth: number;
    let cropHeight: number;
    let x: number = 0;
    let y: number = 0;

    if (imageRatio > targetRatio) {
      cropHeight = imageDimensions.height;
      cropWidth = imageDimensions.height * targetRatio;
      x = (imageDimensions.width - cropWidth) / 2;
    } else {
      cropWidth = imageDimensions.width;
      cropHeight = imageDimensions.width / targetRatio;
      y = (imageDimensions.height - cropHeight) / 2;
    }

    setCropData({
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: Math.min(cropWidth, imageDimensions.width),
      height: Math.min(cropHeight, imageDimensions.height),
      zoom: 1,
      rotation: 0
    });
  };

  return (
    <div className="min-h-screen bg-midnight-black flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/90 border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            onClick={onCancel}
            variant="ghost" 
            size="sm"
            className="text-muted-lavender hover:text-pearl-white"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>
          
          <h1 className="font-headline text-pearl-white">Crop Image</h1>
          
          <Button
            onClick={() => onCropComplete(cropData)}
            size="sm"
            className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white"
          >
            <Check className="w-5 h-5 mr-2" />
            Done
          </Button>
        </div>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="px-4 py-3 border-b border-muted-lavender/20">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
          {ASPECT_RATIOS.map((ratio) => (
            <Button
              key={ratio.value}
              onClick={() => onAspectRatioChange(ratio.value)}
              variant={aspectRatio === ratio.value ? "default" : "outline"}
              size="sm"
              className={`flex-shrink-0 ${
                aspectRatio === ratio.value 
                  ? 'bg-neon-lilac text-white' 
                  : 'bg-transparent border-muted-lavender/30 text-muted-lavender hover:text-pearl-white'
              }`}
            >
              {ratio.label}
              <Badge variant="secondary" className="ml-2 text-xs">
                {ratio.value}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Image Cropper */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative bg-black">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {/* Hidden image for loading */}
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop preview"
              className="hidden"
              onLoad={drawCanvas}
            />
          )}
        </div>

        {/* Controls */}
        <Card className="bg-midnight-black/90 border-muted-lavender/30 m-4">
          <CardContent className="p-4 space-y-4">
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-body text-pearl-white text-sm">Zoom</label>
                <span className="text-muted-lavender text-sm">
                  {Math.round((cropData.zoom || 1) * 100)}%
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => handleZoomChange([Math.max(0.5, (cropData.zoom || 1) - 0.1)])}
                  variant="outline"
                  size="sm"
                  className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                
                <Slider
                  value={[cropData.zoom || 1]}
                  onValueChange={handleZoomChange}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                
                <Button
                  onClick={() => handleZoomChange([Math.min(3, (cropData.zoom || 1) + 0.1)])}
                  variant="outline"
                  size="sm"
                  className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleRotation(-90)}
                  variant="outline"
                  size="sm"
                  className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={() => handleRotation(90)}
                  variant="outline"
                  size="sm"
                  className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={() => setShowGrid(!showGrid)}
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  className={showGrid 
                    ? "bg-neon-lilac text-white" 
                    : "border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
                  }
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                onClick={resetCrop}
                variant="outline"
                size="sm"
                className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>

            {/* Drag Instruction */}
            <div className="flex items-center justify-center space-x-2 text-muted-lavender/60 text-sm">
              <Move className="w-4 h-4" />
              <span className="font-body">Drag to reposition • Pinch to zoom</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}