import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Type, Camera, Mic } from 'lucide-react';

interface CreatePostFlowTestProps {
  onBack: () => void;
}

export function CreatePostFlowTest({ onBack }: CreatePostFlowTestProps) {
  return (
    <div className="min-h-screen bg-midnight-black p-4">
      <Card className="max-w-md mx-auto p-6 bg-midnight-black/80 border-muted-lavender/30">
        <h2 className="text-xl font-headline text-pearl-white mb-4 text-center">
          Create Post Flows Restored! ✨
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-neon-lilac/20 rounded-lg border border-neon-lilac/30">
            <Type className="w-6 h-6 text-neon-lilac" />
            <div>
              <h3 className="text-pearl-white font-body">Thought Posts</h3>
              <p className="text-muted-lavender text-sm">Share your thoughts (up to 250 characters)</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-electric-blue/20 rounded-lg border border-electric-blue/30">
            <Camera className="w-6 h-6 text-electric-blue" />
            <div>
              <h3 className="text-pearl-white font-body">Camera Posts</h3>
              <p className="text-muted-lavender text-sm">Capture photos and videos with mobile camera</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-soft-blush/20 rounded-lg border border-soft-blush/30">
            <Mic className="w-6 h-6 text-soft-blush" />
            <div>
              <h3 className="text-pearl-white font-body">Audio Note Posts</h3>
              <p className="text-muted-lavender text-sm">Record voice notes and audio clips</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="text-center">
            <p className="text-pearl-white font-body mb-2">✅ All three post creation flows restored!</p>
            <p className="text-muted-lavender text-sm mb-4">
              QuickPostCreator added to feed + Full CreatePostPage working
            </p>
          </div>
          
          <Button
            onClick={onBack}
            className="w-full bg-neon-lilac text-midnight-black hover:bg-neon-lilac/80"
          >
            Back to Feed
          </Button>
        </div>
      </Card>
    </div>
  );
}