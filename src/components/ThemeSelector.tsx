import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, Palette, Check } from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  description: string;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
  };
  cssVars: Record<string, string>;
}

const AVAILABLE_THEMES: Theme[] = [
  {
    id: 'cosmic-nebula',
    name: 'Cosmic Nebula',
    description: 'Deep purples and electric blues with ethereal glows',
    preview: {
      primary: '#8B5CF6', // violet-500
      secondary: '#EC4899', // pink-500  
      accent: '#06B6D4' // cyan-500
    },
    cssVars: {
      '--profile-primary': '#8B5CF6',
      '--profile-secondary': '#EC4899',
      '--profile-accent': '#06B6D4'
    }
  },
  {
    id: 'midnight-aurora',
    name: 'Midnight Aurora',
    description: 'Dark greens and ice blues with mystical vibes',
    preview: {
      primary: '#10B981', // emerald-500
      secondary: '#3B82F6', // blue-500
      accent: '#06B6D4' // cyan-500
    },
    cssVars: {
      '--profile-primary': '#10B981',
      '--profile-secondary': '#3B82F6',
      '--profile-accent': '#06B6D4'
    }
  },
  {
    id: 'sunset-dream',
    name: 'Sunset Dream',
    description: 'Warm oranges and soft pinks with dreamy aesthetics',
    preview: {
      primary: '#F97316', // orange-500
      secondary: '#EC4899', // pink-500
      accent: '#EAB308' // yellow-500
    },
    cssVars: {
      '--profile-primary': '#F97316',
      '--profile-secondary': '#EC4899',
      '--profile-accent': '#EAB308'
    }
  },
  {
    id: 'forest-mystique',
    name: 'Forest Mystique',
    description: 'Deep greens and earth tones with natural magic',
    preview: {
      primary: '#059669', // emerald-600
      secondary: '#7C3AED', // violet-600
      accent: '#DC2626' // red-600
    },
    cssVars: {
      '--profile-primary': '#059669',
      '--profile-secondary': '#7C3AED',
      '--profile-accent': '#DC2626'
    }
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    description: 'Electric greens and hot pinks with futuristic vibes',
    preview: {
      primary: '#00F5FF', // cyan
      secondary: '#FF1493', // deep pink
      accent: '#ADFF2F' // green yellow
    },
    cssVars: {
      '--profile-primary': '#00F5FF',
      '--profile-secondary': '#FF1493',
      '--profile-accent': '#ADFF2F'
    }
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    description: 'Rich purples and golden accents with regal elegance',
    preview: {
      primary: '#6D28D9', // violet-800
      secondary: '#F59E0B', // amber-500
      accent: '#DC2626' // red-600
    },
    cssVars: {
      '--profile-primary': '#6D28D9',
      '--profile-secondary': '#F59E0B',
      '--profile-accent': '#DC2626'
    }
  }
];

interface ThemeSelectorProps {
  onBack: () => void;
  onContinue: (theme: string) => void;
  onSkip?: () => void; // Add optional skip handler
}

export function ThemeSelector({ onBack, onContinue, onSkip }: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>('cosmic-nebula');

  const handleContinue = () => {
    onContinue(selectedTheme);
  };

  const handleSkip = () => {
    // If onSkip is provided, use it; otherwise default to continuing without a theme
    if (onSkip) {
      onSkip();
    } else {
      onContinue(''); // Pass empty string to indicate no theme selected
    }
  };

  return (
    <div className="min-h-screen bg-midnight-black flex flex-col safe-area-inset">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-muted-lavender/20">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="text-muted-lavender hover:text-pearl-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <h1 className="font-headline text-xl text-pearl-white">
          Choose Your Style
        </h1>
        
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Introduction */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 border-2 border-neon-lilac/40 flex items-center justify-center">
              <Palette className="w-8 h-8 text-neon-lilac" />
            </div>
            
            <h2 className="font-headline text-2xl text-pearl-white">
              Pick Your Profile Theme
            </h2>
            
            <p className="text-muted-lavender font-body">
              Your chosen theme will personalize your profile page while keeping the main app's signature vaporwave aesthetic. This step is optional - you can skip it or change it later in settings.
            </p>
          </div>

          {/* Theme Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {AVAILABLE_THEMES.map((theme) => (
              <Card 
                key={theme.id}
                className={`
                  relative cursor-pointer transition-all duration-300 soft-blur
                  hover:scale-105 hover:dreamy-glow
                  ${selectedTheme === theme.id 
                    ? 'ring-2 ring-neon-lilac dreamy-glow' 
                    : 'border-muted-lavender/30'
                  }
                `}
                onClick={() => setSelectedTheme(theme.id)}
              >
                <div className="p-6 space-y-4">
                  {/* Theme Preview */}
                  <div className="flex space-x-2">
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.preview.primary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.preview.secondary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.preview.accent }}
                    />
                  </div>

                  {/* Theme Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-headline text-lg text-pearl-white">
                        {theme.name}
                      </h3>
                      {selectedTheme === theme.id && (
                        <Check className="w-5 h-5 text-neon-lilac" />
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-lavender font-body">
                      {theme.description}
                    </p>
                  </div>

                  {/* Preview Banner */}
                  <div 
                    className="h-16 rounded-lg relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${theme.preview.primary}40, ${theme.preview.secondary}40, ${theme.preview.accent}40)`
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="flex items-center justify-center h-full">
                      <span className="font-body text-xs text-white/80">
                        Profile Preview
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Selected Theme Preview */}
          {selectedTheme && (
            <div className="mt-8 p-6 rounded-lg soft-blur border border-neon-lilac/30">
              <h3 className="font-headline text-lg text-pearl-white mb-3">
                Selected: {AVAILABLE_THEMES.find(t => t.id === selectedTheme)?.name}
              </h3>
              <p className="text-muted-lavender font-body text-sm">
                This theme will be applied to your profile page, giving you a unique identity while maintaining the app's cohesive design.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-muted-lavender/20">
        <div className="max-w-2xl mx-auto space-y-3">
          <Button 
            onClick={handleContinue}
            className="w-full bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-medium"
            size="lg"
          >
            Continue to Tribe Discovery
          </Button>
          
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="w-full text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
            size="lg"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}