import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  showText?: boolean;
  onFollowChange?: (targetUserId: string, isFollowing: boolean, followerCountDelta: number) => void;
}

export function FollowButton({ 
  targetUserId, 
  className = '', 
  variant = 'default',
  size = 'default',
  showText = true,
  onFollowChange
}: FollowButtonProps) {
  // State
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Check session and owner status on mount
  useEffect(() => {
    const initializeButton = async () => {
      try {
        // Get session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If no session → set label "Follow" and disable until login
          setHasSession(false);
          setIsOwner(false);
          setIsFollowing(false);
          return;
        }

        setHasSession(true);
        
        // isOwner = session.user.id === targetUserId
        const ownerCheck = session.user.id === targetUserId;
        setIsOwner(ownerCheck);
        
        // If isOwner → hide button (handled in render)
        if (ownerCheck) {
          return;
        }

        // Check follow status: GET /make-server-70df0d6e/users/:targetUserId/follow-status
        const { projectId } = await import('../utils/supabase/info');
        const SUPABASE_URL = `https://${projectId}.supabase.co`;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-70df0d6e/users/${targetUserId}/follow-status`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401) {
          // If 401 → show login CTA
          toast.info('Please sign in to follow users');
          setHasSession(false);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          // If response { following: true } → isFollowing = true
          setIsFollowing(data.following === true);
        } else {
          console.warn('Failed to check follow status:', response.status);
          setIsFollowing(false);
        }

      } catch (error) {
        console.error('Error initializing follow button:', error);
        setIsFollowing(false);
      }
    };

    if (targetUserId) {
      initializeButton();
    }
  }, [targetUserId]);

  // Handle follow/unfollow click
  const handleClick = async () => {
    // If loading return
    if (loading) return;
    
    // Set loading = true, disable button (prevent double taps)
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If 401 and no session → show "Follow" and on click open login
        toast.info('Please sign in to follow users');
        // Trigger auth required event to open login
        window.dispatchEvent(new CustomEvent('auth:required'));
        return;
      }

      const { projectId } = await import('../utils/supabase/info');
      const SUPABASE_URL = `https://${projectId}.supabase.co`;

      let response: Response;
      let followerCountDelta = 0;

      if (isFollowing) {
        // If isFollowing → DELETE /make-server-70df0d6e/users/:targetUserId/follow
        response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-70df0d6e/users/${targetUserId}/follow`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        // On 200/204 → isFollowing = false
        if (response.status === 200 || response.status === 204) {
          setIsFollowing(false);
          followerCountDelta = -1;
          toast.success('Unfollowed');
          
          // Update follower count UI (-1) optimistically
          onFollowChange?.(targetUserId, false, followerCountDelta);
        } else if (response.status === 404) {
          // If response 404 Not following → keep false
          setIsFollowing(false);
          toast.info('Already not following this user');
        } else {
          // If request fails, show a small toast
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('Unfollow failed:', response.status, errorText);
          toast.error('Failed to unfollow user');
        }
      } else {
        // Else → POST /make-server-70df0d6e/users/:targetUserId/follow
        response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-70df0d6e/users/${targetUserId}/follow`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        // On 200/201 or 409 ("Already following") → isFollowing = true
        if (response.status === 200 || response.status === 201 || response.status === 409) {
          setIsFollowing(true);
          followerCountDelta = 1;
          
          if (response.status === 409) {
            toast.success('Already following this user');
          } else {
            toast.success('Now following!');
          }
          
          // Update follower count UI (+1) optimistically
          onFollowChange?.(targetUserId, true, followerCountDelta);
        } else {
          // If request fails, show a small toast
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('Follow failed:', response.status, errorText);
          toast.error('Failed to follow user');
        }
      }

    } catch (error) {
      console.error('Network error during follow action:', error);
      toast.error('Network error occurred');
    } finally {
      // Re-enable button
      setLoading(false);
    }
  };

  // Hide on own profile (isOwner)
  if (isOwner) {
    return null;
  }

  // Button text & style react to isFollowing
  const buttonText = showText ? (isFollowing ? 'Following' : 'Follow') : '';
  const buttonIcon = isFollowing ? UserCheck : UserPlus;
  const IconComponent = buttonIcon;

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={isFollowing ? 'outline' : variant}
      size={size}
      aria-label={isFollowing ? `Unfollow user` : `Follow user`}
      aria-pressed={isFollowing}
      className={`
        transition-all duration-200 font-body
        ${isFollowing 
          ? 'border-muted-lavender/50 text-muted-lavender hover:border-glitch-red/50 hover:text-glitch-red hover:bg-glitch-red/10' 
          : 'bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black border-neon-lilac'
        }
        ${loading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
        ${!hasSession ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <div className="flex items-center justify-center space-x-2">
        {loading ? (
          <>
            {/* Show subtle spinner when loading */}
            <Loader2 className="w-4 h-4 animate-spin" />
            {showText && <span>Loading...</span>}
          </>
        ) : (
          <>
            <IconComponent className="w-4 h-4" />
            {showText && <span>{buttonText}</span>}
          </>
        )}
      </div>
    </Button>
  );
}

// Export a hook for external components that need follow functionality
export const useFollowStatus = (targetUserId: string) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const checkFollowStatus = async () => {
    if (!targetUserId) return false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      if (session.user.id === targetUserId) {
        setIsOwner(true);
        return false;
      }

      const { projectId } = await import('../utils/supabase/info');
      const SUPABASE_URL = `https://${projectId}.supabase.co`;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-70df0d6e/users/${targetUserId}/follow-status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const following = data.following === true;
        setIsFollowing(following);
        return following;
      }

      return false;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  };

  const toggleFollow = async () => {
    if (loading || isOwner) return isFollowing;

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.info('Please sign in to follow users');
        return isFollowing;
      }

      const { projectId } = await import('../utils/supabase/info');
      const SUPABASE_URL = `https://${projectId}.supabase.co`;

      if (isFollowing) {
        // Unfollow
        const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-70df0d6e/users/${targetUserId}/follow`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200 || response.status === 204) {
          setIsFollowing(false);
          toast.success('Unfollowed');
          return false;
        } else if (response.status === 404) {
          // If response 404 Not following → keep false
          setIsFollowing(false);
          toast.info('Already not following this user');
          return false;
        } else {
          toast.error('Failed to unfollow user');
          return true;
        }
      } else {
        // Follow
        const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-70df0d6e/users/${targetUserId}/follow`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200 || response.status === 201 || response.status === 409) {
          setIsFollowing(true);
          if (response.status === 409) {
            toast.success('Already following this user');
          } else {
            toast.success('Now following!');
          }
          return true;
        } else {
          toast.error('Failed to follow user');
          return false;
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Network error occurred');
      return isFollowing;
    } finally {
      setLoading(false);
    }
  };

  return {
    isFollowing,
    loading,
    isOwner,
    checkFollowStatus,
    toggleFollow
  };
};