import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Crop, 
  Focus, 
  ZoomIn, 
  Sparkles,
  Image as ImageIcon,
  ArrowRight,
  Info
} from 'lucide-react';
import { AspectRatio } from '../utils/post-creation-types';
import { ASPECT_RATIOS } from '../utils/post-creation-constants';

interface MediaOptionsProps {
  image: File;
  imageUrl: string;
  imageDimensions: { width: number; height: number };
  suggestedAspectRatio: AspectRatio;
  onCropSelected: (aspectRatio: AspectRatio) => void;
  onBlurSelected: (aspectRatio: AspectRatio) => void;
  onSkip: () => void;
}

export function MediaOptions({
  image,
  imageUrl,
  imageDimensions,
  suggestedAspectRatio,
  onCropSelected,
  onBlurSelected,
  onSkip
}: MediaOptionsProps) {
  const [selectedOption, setSelectedOption] = useState<'crop' | 'blur' | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(suggestedAspectRatio);

  const currentRatio = imageDimensions.width / imageDimensions.height;
  const targetRatio = ASPECT_RATIOS.find(ar => ar.value === suggestedAspectRatio)?.ratio || 1;
  const needsAdjustment = Math.abs(currentRatio - targetRatio) > 0.05;

  const handleProceed = () => {
    if (selectedOption === 'crop') {
      onCropSelected(selectedAspectRatio);
    } else if (selectedOption === 'blur') {
      onBlurSelected(selectedAspectRatio);
    }
  };

  return (
    <div className="min-h-screen bg-midnight-black flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/90 border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            onClick={onSkip}
            variant="ghost" 
            size="sm"
            className="text-muted-lavender hover:text-pearl-white"
          >
            Skip
          </Button>
          
          <h1 className="font-headline text-pearl-white">Optimize Image</h1>
          
          {selectedOption && (
            <Button
              onClick={handleProceed}
              size="sm"
              className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {!selectedOption && (
            <div className="w-20" />
          )}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Image Preview */}
        <Card className="bg-midnight-black/80 border-muted-lavender/30">
          <CardContent className="p-4">
            <div className="relative w-full h-64 rounded-xl overflow-hidden bg-black">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              
              {/* Aspect Ratio Overlay */}
              <div className="absolute top-2 right-2">
                <Badge className="bg-midnight-black/80 text-pearl-white">
                  {imageDimensions.width} × {imageDimensions.height}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        {needsAdjustment && (
          <Card className="bg-gradient-to-r from-neon-lilac/10 to-electric-blue/10 border-neon-lilac/30">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-neon-lilac mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-pearl-white font-body font-medium mb-1">
                    Image optimization recommended
                  </p>
                  <p className="text-muted-lavender font-body text-sm">
                    Your image will look better in the feed with a {ASPECT_RATIOS.find(ar => ar.value === suggestedAspectRatio)?.label.toLowerCase()} aspect ratio ({suggestedAspectRatio}).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aspect Ratio Selector */}
        <div className="space-y-3">
          <h3 className="font-headline text-pearl-white">Choose aspect ratio</h3>
          <div className="grid grid-cols-2 gap-3">
            {ASPECT_RATIOS.map((ratio) => (
              <Button
                key={ratio.value}
                onClick={() => setSelectedAspectRatio(ratio.value)}
                variant={selectedAspectRatio === ratio.value ? "default" : "outline"}
                className={`p-4 h-auto flex flex-col items-center space-y-2 ${
                  selectedAspectRatio === ratio.value 
                    ? 'bg-neon-lilac text-white border-neon-lilac' 
                    : 'bg-transparent border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:border-muted-lavender/50'
                }`}
              >
                <div 
                  className={`w-12 h-12 border-2 rounded ${
                    selectedAspectRatio === ratio.value ? 'border-white' : 'border-current'
                  }`}
                  style={{
                    aspectRatio: ratio.ratio,
                    width: ratio.ratio > 1 ? '48px' : `${48 * ratio.ratio}px`,
                    height: ratio.ratio < 1 ? '48px' : `${48 / ratio.ratio}px`
                  }}
                />
                <div className="text-center">
                  <div className="font-medium">{ratio.label}</div>
                  <div className="text-xs opacity-60">{ratio.value}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Processing Options */}
        <div className="space-y-3">
          <h3 className="font-headline text-pearl-white">How would you like to adjust it?</h3>
          
          {/* Crop Option */}
          <Card 
            className={`cursor-pointer transition-all duration-300 ${
              selectedOption === 'crop'
                ? 'bg-gradient-to-r from-electric-blue/20 to-soft-blush/20 border-electric-blue/50'
                : 'bg-midnight-black/60 border-muted-lavender/30 hover:border-electric-blue/30'
            }`}
            onClick={() => setSelectedOption('crop')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-3 text-pearl-white">
                <div className={`p-2 rounded-lg ${
                  selectedOption === 'crop' ? 'bg-electric-blue text-white' : 'bg-electric-blue/20 text-electric-blue'
                }`}>
                  <Crop className="w-5 h-5" />
                </div>
                <span className="font-headline">Crop to fit</span>
                {selectedOption === 'crop' && (
                  <Badge className="bg-electric-blue text-white">Selected</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-lavender font-body text-sm mb-3">
                Manually adjust what part of your image to show. You can zoom, rotate, and position it perfectly.
              </p>
              <div className="flex items-center space-x-4 text-xs text-muted-lavender/60">
                <span>✨ Full control</span>
                <span>🎯 Perfect framing</span>
                <span>🔄 Non-destructive</span>
              </div>
            </CardContent>
          </Card>

          {/* Background Blur Option */}
          <Card 
            className={`cursor-pointer transition-all duration-300 ${
              selectedOption === 'blur'
                ? 'bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 border-neon-lilac/50'
                : 'bg-midnight-black/60 border-muted-lavender/30 hover:border-neon-lilac/30'
            }`}
            onClick={() => setSelectedOption('blur')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-3 text-pearl-white">
                <div className={`p-2 rounded-lg ${
                  selectedOption === 'blur' ? 'bg-neon-lilac text-white' : 'bg-neon-lilac/20 text-neon-lilac'
                }`}>
                  <Focus className="w-5 h-5" />
                </div>
                <span className="font-headline">Add background blur</span>
                {selectedOption === 'blur' && (
                  <Badge className="bg-neon-lilac text-white">Selected</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-lavender font-body text-sm mb-3">
                Keep your full image and add an artistic blurred background to fill the aspect ratio. Great for portraits.
              </p>
              <div className="flex items-center space-x-4 text-xs text-muted-lavender/60">
                <span>🖼 Keep full image</span>
                <span>🌈 Artistic background</span>
                <span>📱 Mobile-friendly</span>
              </div>
            </CardContent>
          </Card>

          {/* Skip Option */}
          <Card 
            className="bg-midnight-black/40 border-muted-lavender/20 hover:border-muted-lavender/30 cursor-pointer transition-all duration-300"
            onClick={onSkip}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-muted-lavender/10 text-muted-lavender">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-headline text-pearl-white font-medium">Use as-is</p>
                    <p className="text-muted-lavender font-body text-sm">
                      Post without any adjustments
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-lavender" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}