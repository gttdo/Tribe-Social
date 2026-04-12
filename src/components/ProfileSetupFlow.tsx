import React, { useState } from 'react';
import { ChevronLeft, User, Palette, Frame, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { LogoutButton } from './LogoutButton';
import type { UserResult, UserInfo } from '../App';

interface ProfileSetupFlowProps {
  userResult: UserResult;
  userInfo: UserInfo;
  onComplete: (profileData: UserResult['profile']) => void;
  onSkip: () => void;
  onLogout?: () => Promise<void>;
}

const PORTRAIT_OPTIONS = [
  { id: 1, emoji: '🌙', label: 'Lunar Mystic' },
  { id: 2, emoji: '✨', label: 'Star Wanderer' },
  { id: 3, emoji: '🔮', label: 'Crystal Seer' },
  { id: 4, emoji: '🌸', label: 'Bloom Keeper' },
  { id: 5, emoji: '🔥', label: 'Flame Bearer' },
  { id: 6, emoji: '🌊', label: 'Wave Dancer' },
  { id: 7, emoji: '🍃', label: 'Wind Walker' },
  { id: 8, emoji: '⚡', label: 'Storm Caller' }
];

const FRAME_OPTIONS = [
  { id: 'classic', name: 'Classic', border: 'border-2 border-muted-lavender/40' },
  { id: 'neon', name: 'Neon Glow', border: 'border-2 border-neon-lilac shadow-lg shadow-neon-lilac/30' },
  { id: 'electric', name: 'Electric', border: 'border-2 border-electric-blue shadow-lg shadow-electric-blue/30' },
  { id: 'blush', name: 'Soft Blush', border: 'border-2 border-soft-blush shadow-lg shadow-soft-blush/30' }
];

const GLOW_OPTIONS = [
  { id: 'none', name: 'No Glow', class: '' },
  { id: 'lilac', name: 'Lilac Glow', class: 'shadow-lg shadow-neon-lilac/40' },
  { id: 'blue', name: 'Blue Glow', class: 'shadow-lg shadow-electric-blue/40' },
  { id: 'blush', name: 'Blush Glow', class: 'shadow-lg shadow-soft-blush/40' }
];

export function ProfileSetupFlow({ userResult, userInfo, onComplete, onSkip, onLogout }: ProfileSetupFlowProps) {
  const [step, setStep] = useState<'portrait' | 'frame' | 'username' | 'preview'>('portrait');
  const [selectedPortrait, setSelectedPortrait] = useState<number>(1);
  const [selectedFrame, setSelectedFrame] = useState<string>('classic');
  const [selectedGlow, setSelectedGlow] = useState<string>('none');
  const [username, setUsername] = useState<string>(userInfo.username || '');
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (step === 'portrait') setStep('frame');
      else if (step === 'frame') setStep('username');
      else if (step === 'username') setStep('preview');
      setIsAnimating(false);
    }, 200);
  };

  const handleBack = () => {
    if (step === 'portrait') {
      onSkip();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        if (step === 'frame') setStep('portrait');
        else if (step === 'username') setStep('frame');
        else if (step === 'preview') setStep('username');
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleComplete = () => {
    const profileData = {
      selectedPortrait,
      frameId: selectedFrame,
      glowColor: selectedGlow,
      username
    };
    onComplete(profileData);
  };

  const currentPortrait = PORTRAIT_OPTIONS.find(p => p.id === selectedPortrait);
  const currentFrame = FRAME_OPTIONS.find(f => f.id === selectedFrame);
  const currentGlow = GLOW_OPTIONS.find(g => g.id === selectedGlow);

  const canProceed = () => {
    if (step === 'portrait') return selectedPortrait > 0;
    if (step === 'frame') return selectedFrame !== '';
    if (step === 'username') return username.trim().length >= 3;
    return true;
  };

  const getStepTitle = () => {
    switch (step) {
      case 'portrait': return 'Choose Your Avatar';
      case 'frame': return 'Select Your Frame';
      case 'username': return 'Set Your Username';
      case 'preview': return 'Preview Your Profile';
      default: return '';
    }
  };

  const realmColors = {
    mirrorcore: 'from-electric-blue/20 to-neon-lilac/20',
    embercore: 'from-soft-blush/20 to-neon-lilac/20',
    shadowcore: 'from-muted-lavender/20 to-electric-blue/20'
  };

  return (
    <div className="min-h-screen bg-midnight-black relative overflow-hidden">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2 text-muted-lavender hover:text-pearl-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-body">Back</span>
        </Button>

        {/* Step indicator */}
        <div className="flex items-center space-x-2">
          {['portrait', 'frame', 'username', 'preview'].map((s, index) => (
            <div 
              key={s}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                s === step ? 'bg-neon-lilac' : 
                ['portrait', 'frame', 'username', 'preview'].indexOf(step) > index ? 'bg-electric-blue' : 'bg-muted-lavender/30'
              }`} 
            />
          ))}
        </div>

        {/* Logout button */}
        {onLogout && (
          <LogoutButton 
            onLogout={onLogout}
            variant="ghost"
            size="sm"
            showText={false}
            className="text-muted-lavender hover:text-glitch-red"
          />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 md:px-6 flex-1 max-w-2xl mx-auto">
        <div className={`transition-all duration-200 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-headline text-3xl md:text-4xl text-pearl-white mb-2">
              {getStepTitle()}
            </h1>
            <p className="font-body text-muted-lavender">
              Customize your {userResult.coreRealm} identity
            </p>
          </div>

          {/* Portrait Selection */}
          {step === 'portrait' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {PORTRAIT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedPortrait(option.id)}
                    className={`
                      aspect-square rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center p-4
                      ${selectedPortrait === option.id 
                        ? `bg-gradient-to-br ${realmColors[userResult.coreRealm]} border-neon-lilac scale-105 dreamy-glow` 
                        : 'bg-midnight-black/30 border-muted-lavender/20 hover:border-muted-lavender/40'
                      }
                    `}
                  >
                    <span className="text-4xl mb-2">{option.emoji}</span>
                    <span className="font-body text-sm text-pearl-white text-center">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Frame Selection */}
          {step === 'frame' && (
            <div className="space-y-6">
              {/* Preview */}
              <div className="flex justify-center mb-8">
                <div className={`w-24 h-24 rounded-2xl ${currentFrame?.border} ${currentGlow?.class} flex items-center justify-center bg-gradient-to-br ${realmColors[userResult.coreRealm]}`}>
                  <span className="text-4xl">{currentPortrait?.emoji}</span>
                </div>
              </div>

              {/* Frame options */}
              <div className="space-y-3">
                {FRAME_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedFrame(option.id)}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all duration-300 text-left
                      ${selectedFrame === option.id 
                        ? 'bg-neon-lilac/10 border-neon-lilac text-pearl-white' 
                        : 'bg-midnight-black/30 border-muted-lavender/20 hover:border-muted-lavender/40 text-muted-lavender hover:text-pearl-white'
                      }
                    `}
                  >
                    <span className="font-body">{option.name}</span>
                  </button>
                ))}
              </div>

              {/* Glow options */}
              <div className="mt-8">
                <h3 className="font-headline text-lg text-pearl-white mb-4">Glow Effect</h3>
                <div className="space-y-3">
                  {GLOW_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedGlow(option.id)}
                      className={`
                        w-full p-4 rounded-xl border-2 transition-all duration-300 text-left
                        ${selectedGlow === option.id 
                          ? 'bg-neon-lilac/10 border-neon-lilac text-pearl-white' 
                          : 'bg-midnight-black/30 border-muted-lavender/20 hover:border-muted-lavender/40 text-muted-lavender hover:text-pearl-white'
                        }
                      `}
                    >
                      <span className="font-body">{option.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Username Input */}
          {step === 'username' && (
            <div className="space-y-6">
              <div className="flex justify-center mb-8">
                <div className={`w-24 h-24 rounded-2xl ${currentFrame?.border} ${currentGlow?.class} flex items-center justify-center bg-gradient-to-br ${realmColors[userResult.coreRealm]}`}>
                  <span className="text-4xl">{currentPortrait?.emoji}</span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block font-body text-pearl-white">
                  Choose your username
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username..."
                  className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/60 font-body text-lg"
                />
                <p className="text-sm text-muted-lavender">
                  This is how other Tribal members will see you
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          {step === 'preview' && (
            <div className="space-y-8">
              <div className="text-center">
                <div className={`w-32 h-32 mx-auto rounded-2xl ${currentFrame?.border} ${currentGlow?.class} flex items-center justify-center bg-gradient-to-br ${realmColors[userResult.coreRealm]} mb-6`}>
                  <span className="text-6xl">{currentPortrait?.emoji}</span>
                </div>
                
                <h2 className="font-headline text-2xl text-pearl-white mb-2">{username}</h2>
                <p className="font-body text-electric-blue mb-1">{userResult.nickname}</p>
                <p className="font-body text-muted-lavender text-sm mb-4">{userResult.coreRealm}</p>
                
                <div className="bg-midnight-black/30 rounded-xl p-4 border border-muted-lavender/20">
                  <p className="font-body text-pearl-white text-sm leading-relaxed italic">
                    "{userResult.description}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-12 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onSkip}
              className="text-muted-lavender hover:text-pearl-white font-body"
            >
              Skip for now
            </Button>

            <Button
              onClick={step === 'preview' ? handleComplete : handleNext}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-midnight-black font-body px-8"
            >
              {step === 'preview' ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Complete Profile
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Background effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-midnight-black via-purple-950/20 to-indigo-950/30" />
        
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-neon-lilac/10 rounded-full blur-3xl animate-pulse float" />
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-electric-blue/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-soft-blush/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>
    </div>
  );
}