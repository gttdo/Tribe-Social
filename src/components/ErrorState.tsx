import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorState({ 
  title = "Something went wrong", 
  message, 
  onRetry, 
  showRetry = true 
}: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-midnight-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-midnight-black/50 border-muted-lavender/30">
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="w-16 h-16 mb-4 bg-glitch-red/10 border border-glitch-red/20 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-glitch-red/60" />
          </div>
          <h3 className="font-headline text-pearl-white mb-2">{title}</h3>
          <p className="text-muted-lavender font-body text-sm mb-4">{message}</p>
          {showRetry && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}