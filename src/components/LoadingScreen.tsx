import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  error?: string;
}

const loadingMessages = [
  "Entering the Tribal Realms...",
  "Synchronizing your cosmic essence...",
  "Connecting to the digital universe...",
  "Loading your tribal connections...",
  "Preparing your creative space...",
  "Almost ready for adventure..."
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ error }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 2000);

    const timeTimer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(messageTimer);
      clearInterval(timeTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-midnight-black flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 border-2 border-neon-lilac/40 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-neon-lilac animate-spin" />
        </div>
        
        <div className="space-y-3">
          <h2 className="font-headline text-pearl-white text-xl">
            {loadingMessages[messageIndex]}
          </h2>
          <p className="text-muted-lavender font-body text-sm">
            This might take a moment on first load
          </p>
          
          {timeElapsed > 5 && (
            <div className="text-muted-lavender/60 font-body text-xs">
              <p>Still loading... ({timeElapsed}s)</p>
              {timeElapsed > 10 && (
                <p className="mt-1">If this takes too long, try refreshing the page</p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-glitch-red/10 border border-glitch-red/30">
            <p className="text-glitch-red font-body text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};