import React from 'react';

interface AppBackgroundProps {
  children: React.ReactNode;
}

export const AppBackground: React.FC<AppBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative">
      {/* Fixed background layer */}
      <div className="fixed inset-0 z-0">
        {/* Base gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-midnight-black via-purple-950/20 to-indigo-950/30" />
        
        {/* Floating orbs with vaporwave colors */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-lilac/10 rounded-full blur-3xl animate-pulse float" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-electric-blue/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-soft-blush/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />
        
        {/* Geometric shapes for liminal aesthetic */}
        <div className="absolute top-20 left-16 w-2 h-2 bg-neon-lilac rounded-full animate-ping opacity-60" />
        <div className="absolute top-40 right-20 w-1 h-1 bg-electric-blue rounded-full animate-ping opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-12 w-3 h-3 bg-soft-blush rounded-full animate-ping opacity-50" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-20 right-32 w-1.5 h-1.5 bg-muted-lavender rounded-full animate-ping opacity-60" style={{ animationDelay: '2.5s' }} />
        
        {/* Dreamy grid lines for depth */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(192, 132, 252, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(192, 132, 252, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-20 mix-blend-screen">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px'
          }} />
        </div>
      </div>
      
      {/* Content layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};