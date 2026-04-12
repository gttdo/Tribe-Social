import React, { useState } from 'react';
import { Share2, RotateCcw, ArrowRight, ChevronLeft, Copy, Download, Instagram, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { LogoutButton } from './LogoutButton';
import type { UserResult } from '../App';

interface ResultsPageProps {
  result: UserResult;
  onRetakeQuiz: () => void;
  onViewSocial: () => void;
  onBack: () => void;
  onLogout?: () => Promise<void>;
}

export function ResultsPage({ result, onRetakeQuiz, onViewSocial, onBack, onLogout }: ResultsPageProps) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  const realmColors = {
    mirrorcore: {
      gradient: 'from-electric-blue/30 via-neon-lilac/20 to-pearl-white/10',
      border: 'border-electric-blue/50',
      glow: 'shadow-electric-blue/30'
    },
    embercore: {
      gradient: 'from-soft-blush/30 via-neon-lilac/20 to-pearl-white/10',
      border: 'border-soft-blush/50',
      glow: 'shadow-soft-blush/30'
    },
    shadowcore: {
      gradient: 'from-muted-lavender/30 via-electric-blue/20 to-pearl-white/10',
      border: 'border-muted-lavender/50',
      glow: 'shadow-muted-lavender/30'
    }
  };

  const colors = realmColors[result.coreRealm];

  const generateShareText = () => {
    return `✨ I just discovered my Tribal identity! ✨\n\n🔮 Core Realm: ${result.coreRealm}\n💫 Nickname: ${result.nickname}\n\n"${result.description}"\n\nDiscover your realm at Tribe Board! 🌟`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShareToInstagram = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://www.instagram.com/?text=${text}`, '_blank');
  };

  const handleShareToSnapchat = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://www.snapchat.com/add?text=${text}`, '_blank');
  };

  const handleShareToTikTok = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://www.tiktok.com/foryou?text=${text}`, '_blank');
  };

  const ProfileDisplay = () => {
    if (result.profile) {
      const portraitOptions = [
        { id: 1, emoji: '🌙' }, { id: 2, emoji: '✨' }, { id: 3, emoji: '🔮' }, { id: 4, emoji: '🌸' },
        { id: 5, emoji: '🔥' }, { id: 6, emoji: '🌊' }, { id: 7, emoji: '🍃' }, { id: 8, emoji: '⚡' }
      ];
      
      const frameStyles = {
        classic: 'border-2 border-muted-lavender/40',
        neon: 'border-2 border-neon-lilac shadow-lg shadow-neon-lilac/30',
        electric: 'border-2 border-electric-blue shadow-lg shadow-electric-blue/30',
        blush: 'border-2 border-soft-blush shadow-lg shadow-soft-blush/30'
      };
      
      const glowStyles = {
        none: '',
        lilac: 'shadow-lg shadow-neon-lilac/40',
        blue: 'shadow-lg shadow-electric-blue/40',
        blush: 'shadow-lg shadow-soft-blush/40'
      };
      
      const portrait = portraitOptions.find(p => p.id === result.profile.selectedPortrait);
      const frameClass = frameStyles[result.profile.frameId as keyof typeof frameStyles] || frameStyles.classic;
      const glowClass = glowStyles[result.profile.glowColor as keyof typeof glowStyles] || '';
      
      return (
        <div className={`w-32 h-32 mx-auto rounded-2xl ${frameClass} ${glowClass} flex items-center justify-center bg-gradient-to-br ${colors.gradient} mb-6`}>
          <span className="text-6xl">{portrait?.emoji || '✨'}</span>
        </div>
      );
    }
    
    return (
      <div className={`w-32 h-32 mx-auto rounded-2xl border-2 ${colors.border} bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-6`}>
        <span className="text-6xl">✨</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-midnight-black relative overflow-hidden">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-muted-lavender hover:text-pearl-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-body">Back</span>
        </Button>

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

      {/* Results Content */}
      <div className="relative z-10 px-4 md:px-6 flex-1 max-w-2xl mx-auto pb-20">
        
        {/* Celebration Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <h1 className="font-headline text-4xl md:text-5xl text-pearl-white mb-2 glitch-text">
              Welcome to the Tribe
            </h1>
            <p className="font-body text-muted-lavender">
              Your cosmic identity has been revealed
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className={`bg-gradient-to-br ${colors.gradient} rounded-3xl border-2 ${colors.border} p-8 mb-8 soft-blur shadow-2xl ${colors.glow}`}>
          
          {/* Profile Display */}
          <div className="text-center mb-6">
            <ProfileDisplay />
            
            <h2 className="font-headline text-2xl md:text-3xl text-pearl-white mb-2">
              {result.profile?.username || 'Tribal Wanderer'}
            </h2>
            <p className="font-body text-xl text-electric-blue mb-1">{result.nickname}</p>
            <p className="font-accent text-lg text-muted-lavender uppercase tracking-wider">
              {result.coreRealm}
            </p>
          </div>

          {/* Realm Description */}
          <div className="bg-midnight-black/30 rounded-2xl p-6 border border-muted-lavender/20 mb-6">
            <p className="font-body text-pearl-white leading-relaxed text-center italic">
              "{result.description}"
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="font-headline text-2xl text-neon-lilac">{result.xp}</div>
              <div className="font-body text-sm text-muted-lavender">XP Points</div>
            </div>
            <div className="text-center">
              <div className="font-headline text-2xl text-electric-blue">{Math.floor(result.xp / 100) + 1}</div>
              <div className="font-body text-sm text-muted-lavender">Level</div>
            </div>
            <div className="text-center">
              <div className="font-headline text-2xl text-soft-blush">{result.badges.length}</div>
              <div className="font-body text-sm text-muted-lavender">Badges</div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-2">
            {result.badges.map((badge, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-midnight-black/50 border border-muted-lavender/30 rounded-full text-xs font-body text-muted-lavender"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Share Section */}
        <div className="mb-8">
          <Button
            onClick={() => setShowShareOptions(!showShareOptions)}
            variant="outline"
            className="w-full gap-2 border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10 mb-4"
          >
            <Share2 className="w-4 h-4" />
            Share Your Results
          </Button>

          {showShareOptions && (
            <div className="space-y-3 bg-midnight-black/30 rounded-xl p-4 border border-muted-lavender/20">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleCopyLink}
                  variant="ghost"
                  size="sm"
                  className="gap-2 justify-start text-muted-lavender hover:text-pearl-white"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Text'}
                </Button>
                
                <Button
                  onClick={handleShareToInstagram}
                  variant="ghost"
                  size="sm"
                  className="gap-2 justify-start text-muted-lavender hover:text-pearl-white"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Button>
                
                <Button
                  onClick={handleShareToSnapchat}
                  variant="ghost"
                  size="sm"
                  className="gap-2 justify-start text-muted-lavender hover:text-pearl-white"
                >
                  <MessageCircle className="w-4 h-4" />
                  Snapchat
                </Button>
                
                <Button
                  onClick={handleShareToTikTok}
                  variant="ghost"
                  size="sm"
                  className="gap-2 justify-start text-muted-lavender hover:text-pearl-white"
                >
                  <Share2 className="w-4 h-4" />
                  TikTok
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={onViewSocial}
            className="w-full bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-midnight-black font-body text-lg py-6"
          >
            Enter the Tribal Realm
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <Button
            onClick={onRetakeQuiz}
            variant="outline"
            className="w-full gap-2 border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
          >
            <RotateCcw className="w-4 h-4" />
            Retake Discovery Quiz
          </Button>
        </div>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-midnight-black via-purple-950/20 to-indigo-950/30" />
        
        {/* Realm-specific floating orbs */}
        <div className={`absolute top-1/4 left-1/4 w-32 h-32 bg-${result.coreRealm === 'mirrorcore' ? 'electric-blue' : result.coreRealm === 'embercore' ? 'soft-blush' : 'muted-lavender'}/10 rounded-full blur-3xl animate-pulse float`} />
        <div className={`absolute bottom-1/3 right-1/4 w-24 h-24 bg-neon-lilac/10 rounded-full blur-2xl animate-pulse`} style={{ animationDelay: '2s' }} />
        <div className={`absolute top-1/2 right-1/3 w-20 h-20 bg-electric-blue/10 rounded-full blur-xl animate-pulse`} style={{ animationDelay: '4s' }} />
        
        {/* Celebration particles */}
        <div className="absolute top-20 left-16 w-2 h-2 bg-neon-lilac rounded-full animate-ping opacity-60" />
        <div className="absolute top-40 right-20 w-1 h-1 bg-electric-blue rounded-full animate-ping opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-12 w-3 h-3 bg-soft-blush rounded-full animate-ping opacity-50" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-20 right-32 w-1.5 h-1.5 bg-muted-lavender rounded-full animate-ping opacity-60" style={{ animationDelay: '2.5s' }} />
      </div>
    </div>
  );
}