import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { AlertTriangle, X, Settings, ExternalLink } from 'lucide-react';

export function DevelopmentBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [edgeFunctionsAvailable, setEdgeFunctionsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Only show in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Check if user has dismissed this before
    const dismissed = localStorage.getItem('dev-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Quick check for edge functions - simplified to avoid additional fetch errors
    const checkEdgeFunctions = async () => {
      try {
        const { projectId } = await import('../utils/supabase/info');
        if (!projectId) {
          setEdgeFunctionsAvailable(false);
          return;
        }

        // Instead of making a fetch request, just check if we have the basic setup
        // This avoids generating additional "Failed to fetch" errors in the console
        setEdgeFunctionsAvailable(false);
      } catch (error) {
        setEdgeFunctionsAvailable(false);
      }
    };

    checkEdgeFunctions();
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('dev-banner-dismissed', 'true');
  };

  const handleOpenDocs = () => {
    window.open('https://supabase.com/docs/guides/functions/quickstart', '_blank');
  };

  // Don't show if not in development, dismissed, or edge functions are working
  if (process.env.NODE_ENV !== 'development' || isDismissed || edgeFunctionsAvailable === true) {
    return null;
  }

  // Don't show until we've checked
  if (edgeFunctionsAvailable === null) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 border-b border-glitch-red/30 bg-glitch-red/10 backdrop-blur-sm">
      <Alert className="border-0 rounded-none bg-transparent">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-4 w-4 text-glitch-red" />
            <AlertDescription className="text-sm text-pearl-white">
              <strong>Development Mode:</strong> Edge functions not deployed. 
              Some features like likes, comments, and post creation are limited.
            </AlertDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpenDocs}
              className="text-electric-blue hover:text-electric-blue/80 text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Setup Guide
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-muted-lavender hover:text-pearl-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}