import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trash2, RotateCcw, Database, HardDrive, Loader2, Bell, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { VideoThumbnailBackfill } from './VideoThumbnailBackfill';

interface DevUtilitiesProps {
  onClose?: () => void;
  onNavigateToNotificationTest?: () => void;
}

export function DevUtilities({ onClose, onNavigateToNotificationTest }: DevUtilitiesProps) {
  const [isClearing, setIsClearing] = React.useState(false);
  const [showThumbnailBackfill, setShowThumbnailBackfill] = React.useState(false);

  const clearLocalStorage = () => {
    try {
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('tribe_') || key.startsWith('supabase.')
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      toast.success(`Cleared ${keysToRemove.length} localStorage keys`);
      console.log('Cleared localStorage keys:', keysToRemove);
    } catch (error) {
      toast.error('Failed to clear localStorage');
      console.error('Error clearing localStorage:', error);
    }
  };

  const clearAllStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      toast.success('Cleared all browser storage');
      console.log('Cleared all localStorage and sessionStorage');
    } catch (error) {
      toast.error('Failed to clear storage');
      console.error('Error clearing storage:', error);
    }
  };

  const clearServerKVCache = async () => {
    setIsClearing(true);
    try {
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Not authenticated - cannot clear server cache');
        return;
      }

      // Call the server endpoint to clear user's KV cache using makeAuthenticatedRequest
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const data = await makeAuthenticatedRequest('/users/clear-cache', {
        method: 'POST'
      });

      toast.success(`Server cache cleared! ${data.message}`, {
        description: `Cleared ${data.clearedKeys} cache entries`
      });
      console.log('Server cache cleared:', data);
      
    } catch (error) {
      toast.error('Failed to clear server cache');
      console.error('Error clearing server cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const hardRefresh = () => {
    toast.info('Performing hard refresh...');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const clearCacheAndRefresh = () => {
    clearAllStorage();
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Show thumbnail backfill utility if requested
  if (showThumbnailBackfill) {
    return (
      <div className="fixed inset-0 z-50 bg-midnight-black/80 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-6xl py-8">
          <div className="mb-4">
            <Button
              onClick={() => setShowThumbnailBackfill(false)}
              variant="outline"
              className="font-body border-muted-lavender/30 text-pearl-white hover:bg-electric-blue/10 hover:border-electric-blue/50"
            >
              ← Back to Dev Utilities
            </Button>
          </div>
          <VideoThumbnailBackfill />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-midnight-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-midnight-black border border-muted-lavender/30">
        <CardHeader>
          <CardTitle className="font-headline text-pearl-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-neon-lilac" />
            Developer Utilities
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Testing Tools Section */}
          <div className="space-y-3">
            <h3 className="font-headline text-pearl-white text-sm">Testing Tools</h3>
            
            <Button
              onClick={() => {
                if (onNavigateToNotificationTest) {
                  onNavigateToNotificationTest();
                  onClose?.();
                } else {
                  toast.error('Notification test not available');
                }
              }}
              variant="outline"
              className="w-full justify-start font-body border-muted-lavender/30 text-pearl-white hover:bg-electric-blue/10 hover:border-electric-blue/50"
            >
              <Bell className="w-4 h-4 mr-2 text-electric-blue" />
              Test Notifications
            </Button>

            <Button
              onClick={() => setShowThumbnailBackfill(true)}
              variant="outline"
              className="w-full justify-start font-body border-muted-lavender/30 text-pearl-white hover:bg-neon-lilac/10 hover:border-neon-lilac/50"
            >
              <ImageIcon className="w-4 h-4 mr-2 text-neon-lilac" />
              Video Thumbnail Backfill
            </Button>
          </div>

          {/* Storage Management Section */}
          <div className="space-y-3 pt-4 border-t border-muted-lavender/20">
            <h3 className="font-headline text-pearl-white text-sm">Storage Management</h3>
            
            <Button
              onClick={clearLocalStorage}
              variant="outline"
              className="w-full justify-start font-body border-muted-lavender/30 text-pearl-white hover:bg-electric-blue/10 hover:border-electric-blue/50"
            >
              <Trash2 className="w-4 h-4 mr-2 text-electric-blue" />
              Clear App Storage
            </Button>

            <Button
              onClick={clearAllStorage}
              variant="outline"
              className="w-full justify-start font-body border-muted-lavender/30 text-pearl-white hover:bg-soft-blush/10 hover:border-soft-blush/50"
            >
              <Database className="w-4 h-4 mr-2 text-soft-blush" />
              Clear All Browser Storage
            </Button>

            <Button
              onClick={clearServerKVCache}
              disabled={isClearing}
              variant="outline"
              className="w-full justify-start font-body border-muted-lavender/30 text-pearl-white hover:bg-neon-lilac/10 hover:border-neon-lilac/50 disabled:opacity-50"
            >
              {isClearing ? (
                <Loader2 className="w-4 h-4 mr-2 text-neon-lilac animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2 text-neon-lilac" />
              )}
              Clear Server Cache
            </Button>

            <Button
              onClick={hardRefresh}
              variant="outline"
              className="w-full justify-start font-body border-muted-lavender/30 text-pearl-white hover:bg-glitch-red/10 hover:border-glitch-red/50"
            >
              <RotateCcw className="w-4 h-4 mr-2 text-glitch-red" />
              Hard Refresh
            </Button>

            <Button
              onClick={clearCacheAndRefresh}
              className="w-full font-body bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All & Refresh
            </Button>
          </div>

          <div className="pt-4 border-t border-muted-lavender/20">
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full font-body text-muted-lavender hover:text-pearl-white"
            >
              Close
            </Button>
          </div>

          <div className="text-xs text-muted-lavender/60 font-body space-y-1">
            <p>• Test Notifications: Create test notifications</p>
            <p>• Video Thumbnail Backfill: Generate thumbnails for existing videos</p>
            <p>• App Storage: Clears user data, posts, auth tokens</p>
            <p>• All Storage: Clears everything including browser data</p>
            <p>• Server Cache: Clears your KV data on server (if authenticated)</p>
            <p>• Hard Refresh: Reloads page bypassing cache</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}