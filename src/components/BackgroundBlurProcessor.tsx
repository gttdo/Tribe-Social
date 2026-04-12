import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Card, CardContent } from './ui/card';
import { 
  Check, 
  X, 
  Focus,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { AspectRatio, ProcessedImage } from '../utils/post-creation-types';
import { ASPECT_RATIOS } from '../utils/post-creation-constants';

interface BackgroundBlurProcessorProps {
  image: File;
  aspectRatio: AspectRatio;
  onComplete: (processedImage: ProcessedImage) => void;
  onCancel: () => void;
}

export function BackgroundBlurProcessor({
  image,
  aspectRatio,
  onComplete,
  onCancel
}: BackgroundBlurProcessorProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [blurStrength, setBlurStrength] = useState([15]);
  const [imageScale, setImageScale] = useState([1]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(image);
    setImageUrl(url);
    
    return () => URL.revokeObjectURL(url);
  }, [image]);

  // Get target dimensions
  const targetRatio = ASPECT_RATIOS.find(ar => ar.value === aspectRatio)?.ratio || 1;
  const canvasWidth = 400; // Fixed width for preview
  const canvasHeight = canvasWidth / targetRatio;

  // Draw preview with blur background
  const drawPreview = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Calculate image scaling to fit within target while maintaining aspect ratio
    const imageAspect = img.naturalWidth / img.naturalHeight;
    const targetAspect = canvasWidth / canvasHeight;
    
    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number = 0;
    let offsetY: number = 0;

    // Scale the main image to fit within the target area
    if (imageAspect > targetAspect) {
      // Image is wider - fit by height
      drawHeight = canvasHeight * imageScale[0];
      drawWidth = drawHeight * imageAspect;
      offsetX = (canvasWidth - drawWidth) / 2;
    } else {
      // Image is taller - fit by width  
      drawWidth = canvasWidth * imageScale[0];
      drawHeight = drawWidth / imageAspect;
      offsetY = (canvasHeight - drawHeight) / 2;
    }

    // Draw blurred background to fill entire canvas
    ctx.filter = `blur(${blurStrength[0]}px)`;
    
    // For background, we want to fill the entire area
    let bgWidth: number;
    let bgHeight: number;
    let bgOffsetX: number = 0;
    let bgOffsetY: number = 0;

    if (imageAspect > targetAspect) {
      // Fill by width for background
      bgWidth = canvasWidth;
      bgHeight = canvasWidth / imageAspect;
      bgOffsetY = (canvasHeight - bgHeight) / 2;
    } else {
      // Fill by height for background
      bgHeight = canvasHeight;
      bgWidth = canvasHeight * imageAspect;
      bgOffsetX = (canvasWidth - bgWidth) / 2;
    }

    ctx.drawImage(img, bgOffsetX, bgOffsetY, bgWidth, bgHeight);

    // Reset filter and draw sharp image on top
    ctx.filter = 'none';
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      drawPreview();
    }
  }, [blurStrength, imageScale]);

  const handleImageLoad = () => {
    drawPreview();
  };

  const resetSettings = () => {
    setBlurStrength([15]);
    setImageScale([1]);
  };

  const processImage = async () => {
    setIsProcessing(true);
    
    try {
      const img = imageRef.current;
      if (!img) throw new Error('Image not loaded');

      // Create high-resolution canvas for final output
      const outputCanvas = document.createElement('canvas');
      const ctx = outputCanvas.getContext('2d')!;
      
      // Use higher resolution for final output
      const outputWidth = 1080; // Instagram-like resolution
      const outputHeight = outputWidth / targetRatio;
      
      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;

      // Calculate scaling for high-res output
      const imageAspect = img.naturalWidth / img.naturalHeight;
      const targetAspect = outputWidth / outputHeight;
      
      let drawWidth: number;
      let drawHeight: number;
      let offsetX: number = 0;
      let offsetY: number = 0;

      // Scale the main image
      if (imageAspect > targetAspect) {
        drawHeight = outputHeight * imageScale[0];
        drawWidth = drawHeight * imageAspect;
        offsetX = (outputWidth - drawWidth) / 2;
      } else {
        drawWidth = outputWidth * imageScale[0];
        drawHeight = drawWidth / imageAspect;
        offsetY = (outputHeight - drawHeight) / 2;
      }

      // Draw blurred background
      ctx.filter = `blur(${blurStrength[0]}px)`;
      
      let bgWidth: number;
      let bgHeight: number;
      let bgOffsetX: number = 0;
      let bgOffsetY: number = 0;

      if (imageAspect > targetAspect) {
        bgWidth = outputWidth;
        bgHeight = outputWidth / imageAspect;
        bgOffsetY = (outputHeight - bgHeight) / 2;
      } else {
        bgHeight = outputHeight;
        bgWidth = outputHeight * imageAspect;
        bgOffsetX = (outputWidth - bgWidth) / 2;
      }

      ctx.drawImage(img, bgOffsetX, bgOffsetY, bgWidth, bgHeight);

      // Draw sharp image on top
      ctx.filter = 'none';
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Convert to blob and create file
      const blob = await new Promise<Blob>((resolve) => {
        outputCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.9);
      });

      const processedFile = new File([blob], `processed_${image.name}`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const processedUrl = URL.createObjectURL(processedFile);

      const processedImage: ProcessedImage = {
        file: processedFile,
        url: processedUrl,
        aspectRatio,
        hasBackgroundBlur: true
      };

      onComplete(processedImage);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
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
          
          <h1 className="font-headline text-pearl-white">Background Blur</h1>
          
          <Button
            onClick={processImage}
            disabled={isProcessing}
            size="sm"
            className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white disabled:opacity-50"
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Done
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-4 bg-black">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full rounded-xl shadow-lg"
              style={{ 
                width: Math.min(400, window.innerWidth - 32),
                height: (Math.min(400, window.innerWidth - 32)) / targetRatio
              }}
            />
            
            {/* Loading overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-2 border-neon-lilac border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-pearl-white font-body text-sm">Processing...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Hidden image for loading */}
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Source"
              className="hidden"
              onLoad={handleImageLoad}
            />
          )}
        </div>

        {/* Controls */}
        <Card className="bg-midnight-black/90 border-muted-lavender/30 m-4">
          <CardContent className="p-4 space-y-6">
            {/* Blur Strength */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-body text-pearl-white text-sm flex items-center space-x-2">
                  <Focus className="w-4 h-4" />
                  <span>Blur Strength</span>
                </label>
                <span className="text-muted-lavender text-sm">
                  {blurStrength[0]}px
                </span>
              </div>
              
              <Slider
                value={blurStrength}
                onValueChange={setBlurStrength}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-muted-lavender/60">
                <span>Subtle</span>
                <span>Dreamy</span>
                <span>Artistic</span>
              </div>
            </div>

            {/* Image Scale */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-body text-pearl-white text-sm flex items-center space-x-2">
                  <ZoomIn className="w-4 h-4" />
                  <span>Image Size</span>
                </label>
                <span className="text-muted-lavender text-sm">
                  {Math.round(imageScale[0] * 100)}%
                </span>
              </div>
              
              <Slider
                value={imageScale}
                onValueChange={setImageScale}
                min={0.5}
                max={1.5}
                step={0.05}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-muted-lavender/60">
                <span>Smaller</span>
                <span>Original</span>
                <span>Larger</span>
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex justify-center">
              <Button
                onClick={resetSettings}
                variant="outline"
                size="sm"
                className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to defaults
              </Button>
            </div>

            {/* Tips */}
            <div className="bg-neon-lilac/10 border border-neon-lilac/30 rounded-lg p-3">
              <p className="text-pearl-white font-body text-sm font-medium mb-1">
                💡 Pro tip
              </p>
              <p className="text-muted-lavender font-body text-xs">
                Higher blur creates a dreamier effect, while lower blur keeps more detail in the background.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}