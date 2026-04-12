import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { QrCode, Info, X } from 'lucide-react';
import { InfoModal } from './InfoModal';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { VisuallyHidden } from './ui/visually-hidden';
import crystalImage from 'figma:asset/e22313690bdd7d3499ac6d9e1c84f155bebc32cb.png';
import qrCodeImage from 'figma:asset/b73245c420537ef43df743bdb16123b68a98d359.png';

// App version
const APP_VERSION = '1.0.0';

interface LandingPageProps {
  onStartSignup: () => void;
  onSignIn: () => void;
}

export function LandingPage({ onStartSignup, onSignIn }: LandingPageProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    // Ensure page starts at the top immediately on mount
    window.scrollTo(0, 0);
    
    // Force scroll to top after a brief delay for any async rendering
    const scrollToTop = () => window.scrollTo(0, 0);
    scrollToTop();
    setTimeout(scrollToTop, 100);
    
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div className="landing-page-container landing-page-no-scroll">
        {/* Enhanced atmospheric background */}
        <div className="fixed inset-0 z-0">
          {/* Base gradient with parallax */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-midnight-black via-purple-950/30 to-indigo-950/40"
            style={{ transform: `translateY(${scrollY * 0.5}px)` }}
          />
          
          {/* Floating particles */}
          <div className="absolute top-20 left-10 w-1 h-1 bg-neon-lilac rounded-full animate-ping opacity-70" />
          <div className="absolute top-32 right-16 w-2 h-2 bg-electric-blue rounded-full animate-pulse opacity-60" style={{ animationDelay: '1s' }} />
          <div className="absolute top-48 left-1/4 w-1.5 h-1.5 bg-soft-blush rounded-full animate-ping opacity-50" style={{ animationDelay: '2s' }} />
          <div className="absolute top-64 right-1/3 w-1 h-1 bg-muted-lavender rounded-full animate-pulse opacity-80" style={{ animationDelay: '3s' }} />
          <div className="absolute bottom-40 left-12 w-2 h-2 bg-neon-lilac rounded-full animate-ping opacity-60" style={{ animationDelay: '4s' }} />
          <div className="absolute bottom-60 right-20 w-1.5 h-1.5 bg-electric-blue rounded-full animate-pulse opacity-70" style={{ animationDelay: '5s' }} />
          
          {/* Larger ambient orbs */}
          <div className="absolute top-1/3 left-1/6 w-96 h-96 bg-neon-lilac/5 rounded-full blur-3xl animate-pulse float" />
          <div className="absolute bottom-1/4 right-1/5 w-64 h-64 bg-electric-blue/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
          <div className="absolute top-2/3 right-1/4 w-48 h-48 bg-soft-blush/5 rounded-full blur-2xl animate-pulse float" style={{ animationDelay: '6s' }} />
          
          {/* Glitch grid overlay */}
          <div className="absolute inset-0 opacity-3">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(rgba(192, 132, 252, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(192, 132, 252, 0.08) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }} />
          </div>
          
          {/* Subtle film grain */}
          <div className="absolute inset-0 opacity-25 mix-blend-screen">
            <div className="w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: '512px 512px'
            }} />
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10">
          {/* Single Viewport Section - Enhanced mobile responsiveness */}
          <section className="h-screen flex flex-col px-3 sm:px-4 md:px-6 text-center pt-safe overflow-hidden">
            {/* Main content area */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
                {/* Vaporwave Crystal Hero Image */}
                <div className="relative mb-4 sm:mb-6">
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto float">
                    <img 
                      src={crystalImage} 
                      alt="Vaporwave Crystal"
                      className="w-full h-full object-contain drop-shadow-2xl"
                      style={{
                        filter: 'drop-shadow(0 0 20px rgba(192, 132, 252, 0.4)) drop-shadow(0 0 40px rgba(125, 211, 252, 0.2))'
                      }}
                    />
                    {/* Glow effect behind crystal */}
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-neon-lilac/20 via-electric-blue/20 to-soft-blush/20 rounded-full blur-3xl animate-pulse" />
                    {/* Rotating glow ring */}
                    <div className="absolute inset-0 -z-20 w-full h-full animate-spin" style={{ animationDuration: '20s' }}>
                      <div className="w-full h-full rounded-full border border-neon-lilac/20 border-dashed" />
                    </div>
                  </div>
                </div>
                
                {/* Main headline */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-headline font-bold leading-tight">
                      <span className="block bg-gradient-to-r from-neon-lilac via-electric-blue to-soft-blush bg-clip-text text-transparent dreamy-glow">
                        Find your tribe.
                      </span>
                      <span className="block text-pearl-white mt-1 sm:mt-2">
                        Share your world.
                      </span>
                    </h1>
                    <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-neon-lilac/10 to-electric-blue/10 rounded-2xl sm:rounded-3xl blur-2xl sm:blur-3xl opacity-60 animate-pulse" />
                  </div>
                  
                  <p className="text-base sm:text-lg md:text-xl text-muted-lavender/90 font-body leading-relaxed max-w-2xl mx-auto px-2 sm:px-0">
                    Join communities that match your vibe. Create, share, and connect in the digital realms that understand you.
                  </p>
                </div>

                {/* Main action buttons - Enhanced mobile responsiveness */}
                <div className="space-y-3 px-4 sm:px-0">
                  <Button
                    onClick={onStartSignup}
                    size="lg"
                    className="w-full max-w-sm mx-auto bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-medium text-base sm:text-lg py-4 sm:py-6 dreamy-glow flex items-center justify-center touch-target"
                  >
                    Join Tribe
                  </Button>
                  
                  <Button
                    onClick={onSignIn}
                    variant="outline"
                    size="lg"
                    className="w-full max-w-sm mx-auto border-electric-blue/50 text-electric-blue hover:bg-electric-blue/10 font-medium block py-4 sm:py-6 touch-target"
                  >
                    Sign In
                  </Button>
                </div>
                
                {/* Info text and quick actions - Enhanced mobile responsiveness */}
                <div className="space-y-3 px-2 sm:px-0">
                  <p className="text-sm text-muted-lavender/60 font-body italic">
                    New to Tribe? Start your journey • Already exploring? Sign in
                  </p>
                  

                  {/* Quick actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                    <button
                      onClick={() => setShowInfoModal(true)}
                      className="flex items-center space-x-2 text-muted-lavender/80 hover:text-electric-blue transition-all duration-300 group touch-target p-2"
                    >
                      <Info className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                      <span className="font-body text-sm">What is Tribe?</span>
                    </button>
                    
                    <div className="hidden sm:block w-1 h-1 bg-muted-lavender/40 rounded-full" />
                    
                    <button 
                      onClick={() => setShowQRModal(true)}
                      className="flex items-center space-x-2 text-muted-lavender/80 hover:text-soft-blush transition-all duration-300 group touch-target p-2"
                    >
                      <QrCode className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                      <span className="font-body text-sm">Scanned a QR? Start now</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Footer */}
            <footer className="py-4 px-2 border-t border-muted-lavender/10 mt-auto">
              <div className="max-w-4xl mx-auto text-center">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-muted-lavender/50">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button onClick={() => {}} className="hover:text-electric-blue transition-colors duration-300">Privacy</button>
                    <div className="w-1 h-1 bg-muted-lavender/30 rounded-full" />
                    <button onClick={() => {}} className="hover:text-electric-blue transition-colors duration-300">Terms</button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-lavender/40">
                    <span className="italic">
                      {new Date().getFullYear()} Tribe Social
                    </span>
                  </div>
                </div>
              </div>
            </footer>
          </section>
        </div>

        {/* VHS scan lines overlay */}
        <div className="vhs-lines fixed inset-0 pointer-events-none z-20" />
      </div>

      {/* Info Modal */}
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-midnight-black/95 to-midnight-black/90 border-muted-lavender/30 border-2">
          <VisuallyHidden>
            <DialogTitle>Tribe Board QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to access Tribe Board on your mobile device or join directly from this page.
            </DialogDescription>
          </VisuallyHidden>
          
          {/* Modal content */}
          <div className="text-center space-y-6 p-4">
              {/* Header */}
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 rounded-full flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-soft-blush" />
                </div>
                <h2 className="text-xl font-headline font-semibold text-pearl-white">
                  Join Tribe Board
                </h2>
                <p className="text-sm text-muted-lavender/80 font-body">
                  Scan this QR code with your mobile device to instantly access Tribe Board
                </p>
              </div>

              {/* QR Code Image */}
              <div className="relative">
                <div className="bg-pearl-white p-4 rounded-2xl inline-block">
                  <img 
                    src={qrCodeImage} 
                    alt="Tribe Board QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-neon-lilac/20 via-electric-blue/20 to-soft-blush/20 rounded-2xl blur-xl opacity-60 animate-pulse -z-10" />
              </div>

              {/* Instructions */}
              <div className="bg-electric-blue/10 border border-electric-blue/30 rounded-xl p-4 space-y-2">
                <p className="text-sm text-electric-blue font-medium">
                  📱 How to scan:
                </p>
                <ul className="text-xs text-muted-lavender/80 space-y-1 text-left">
                  <li>• Open your camera app</li>
                  <li>• Point at the QR code</li>
                  <li>• Tap the notification that appears</li>
                  <li>• Join your tribe instantly!</li>
                </ul>
              </div>

              {/* Alternative action */}
              <div className="pt-2">
                <p className="text-xs text-muted-lavender/60 mb-3">
                  Or get started right here:
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowQRModal(false);
                      onStartSignup();
                    }}
                    className="flex-1 bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-medium text-sm py-2"
                  >
                    Join Now
                  </Button>
                  <Button
                    onClick={() => {
                      setShowQRModal(false);
                      onSignIn();
                    }}
                    variant="outline"
                    className="flex-1 border-electric-blue/50 text-electric-blue hover:bg-electric-blue/10 font-medium text-sm py-2"
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}