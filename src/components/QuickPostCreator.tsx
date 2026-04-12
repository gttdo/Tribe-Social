import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner@2.0.3';
import { 
  Type,
  Camera,
  Mic,
  Plus,
  Sparkles,
  Send,
  X
} from 'lucide-react';
import { UserInfo } from '../App';

interface QuickPostCreatorProps {
  userInfo: UserInfo | null;
  isAuthenticated: boolean;
  onPostCreated: () => void;
  onOpenFullCreator: () => void;
}

export function QuickPostCreator({ userInfo, isAuthenticated, onPostCreated, onOpenFullCreator }: QuickPostCreatorProps) {
  const [showQuickThought, setShowQuickThought] = useState(false);
  const [thoughtText, setThoughtText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Handle quick thought posting with proper validation
  const handleQuickThought = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to post');
      return;
    }

    const text = thoughtText.trim();
    if (!text) {
      toast.error('Please type something');
      return;
    }

    if (text.length > 250) {
      toast.error('Max 250 characters');
      return;
    }

    setIsPosting(true);

    try {
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Please sign in again');
      }

      const payload = {
        post_type: 'thought',
        text_body: text,
        visibility: 'public'
      };

      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const result = await makeAuthenticatedRequest('/make-server-70df0d6e/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (result && result.post?.id) {
        setThoughtText('');
        setShowQuickThought(false);
        
        toast.success('Thought shared! 💭', {
          description: 'Your thought has been posted to the feed.'
        });
        
        onPostCreated();
      } else {
        throw new Error('Failed to publish thought');
      }
    } catch (error) {
      console.error('Quick thought post error:', error);
      toast.error('Couldn\'t publish thought', {
        description: 'Please try again'
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Handle camera post - opens full creator
  const handleCameraPost = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to post');
      return;
    }
    
    toast.success('Opening camera...', {
      description: 'Capture photos and videos',
      duration: 1500
    });
    
    onOpenFullCreator();
  };

  // Handle audio post - opens full creator  
  const handleAudioPost = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to post');
      return;
    }
    
    toast.success('Opening audio recorder...', {
      description: 'Record voice notes and audio',
      duration: 1500
    });
    
    onOpenFullCreator();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mb-4 sm:mb-6">
      <Card className="p-3 sm:p-4 bg-midnight-black/50 border-muted-lavender/20 backdrop-blur-sm">
        {!showQuickThought ? (
          <div className="space-y-3 sm:space-y-4">
            {/* Welcome message - Enhanced mobile responsiveness */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-neon-lilac to-electric-blue flex items-center justify-center flex-shrink-0">
                {userInfo?.username ? (
                  <span className="text-midnight-black font-bold text-xs sm:text-sm">
                    {userInfo.username.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-midnight-black" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-pearl-white font-body text-sm sm:text-base">
                  Hey {userInfo?.username || 'there'}! What's on your mind?
                </p>
                <p className="text-muted-lavender text-xs sm:text-sm">
                  Share your thoughts, capture moments, or record audio
                </p>
              </div>
            </div>

            {/* Quick action buttons - Enhanced mobile layout */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* Thought Post */}
              <Button
                onClick={() => setShowQuickThought(true)}
                variant="outline"
                className="flex flex-col items-center justify-center h-16 sm:h-20 bg-midnight-black/30 hover:bg-neon-lilac/20 border-muted-lavender/30 hover:border-neon-lilac/50 text-pearl-white hover:text-neon-lilac transition-all duration-300 touch-target"
              >
                <Type className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                <span className="text-xs">Thought</span>
              </Button>

              {/* Camera Post */}
              <Button
                onClick={handleCameraPost}
                variant="outline"
                className="flex flex-col items-center justify-center h-16 sm:h-20 bg-midnight-black/30 hover:bg-electric-blue/20 border-muted-lavender/30 hover:border-electric-blue/50 text-pearl-white hover:text-electric-blue transition-all duration-300 touch-target"
              >
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                <span className="text-xs">Camera</span>
              </Button>

              {/* Audio Post */}
              <Button
                onClick={handleAudioPost}
                variant="outline"
                className="flex flex-col items-center justify-center h-16 sm:h-20 bg-midnight-black/30 hover:bg-soft-blush/20 border-muted-lavender/30 hover:border-soft-blush/50 text-pearl-white hover:text-soft-blush transition-all duration-300 touch-target"
              >
                <Mic className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                <span className="text-xs">Audio</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* Quick thought input - Enhanced mobile responsiveness */}
            <div className="flex items-start space-x-2 sm:space-x-3">
              <Button
                onClick={() => setShowQuickThought(false)}
                variant="ghost"
                size="icon"
                className="text-muted-lavender hover:text-pearl-white touch-target flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Type className="w-4 h-4 text-neon-lilac" />
                  <span className="text-pearl-white font-body text-sm sm:text-base">Share a thought</span>
                </div>
                <textarea
                  value={thoughtText}
                  onChange={(e) => setThoughtText(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-midnight-black/50 border border-muted-lavender/30 rounded-lg p-3 text-pearl-white placeholder-muted-lavender resize-none focus:border-neon-lilac/50 focus:ring-1 focus:ring-neon-lilac/20 transition-colors text-sm sm:text-base"
                  rows={3}
                  maxLength={250}
                />
                <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                  <span className="text-xs text-muted-lavender">
                    {thoughtText.length}/250 characters
                  </span>
                  <Button
                    onClick={handleQuickThought}
                    disabled={!thoughtText.trim() || isPosting || thoughtText.length > 250}
                    className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black disabled:opacity-50 touch-target text-sm"
                  >
                    {isPosting ? (
                      <div className="w-4 h-4 border-2 border-midnight-black/30 border-t-midnight-black rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="ml-1">Post</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}