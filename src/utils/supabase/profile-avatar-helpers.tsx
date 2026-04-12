import { supabase } from './client';
import { STORAGE_BUCKETS } from '../storage-constants';

/**
 * Database-first avatar fetching helper
 * Always fetches the latest avatar from profiles.avatar_url + avatar_version
 * Use this helper consistently across the app for post headers, user cards, etc.
 */

export interface ProfileAvatarData {
  avatar_url?: string;
  avatar_version?: number;
  display_name?: string;
}

export interface AvatarResult {
  src: string;
  username: string;
  loading: boolean;
  error: string;
}

/**
 * Fetch user's avatar from profiles table only
 * @param userId - The user ID to fetch avatar for
 * @returns Promise with avatar src, username, and status
 */
export async function fetchUserAvatar(userId: string): Promise<AvatarResult> {
  try {
    console.log('🔄 Fetching avatar for user:', userId.substring(0, 8) + '...');

    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url, avatar_version, display_name')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('⚠️ Avatar fetch error:', error.message);
      return {
        src: '',
        username: 'Unknown User',
        loading: false,
        error: error.message
      };
    }

    // Build usable image URL with cache-bust
    let src = data?.avatar_url ?? '';
    if (src) {
      if (src.startsWith('http')) {
        // Absolute URL - add version parameter
        src = `${src}?v=${data.avatar_version ?? 0}`;
      } else {
        // Stored as path in the 'avatars' bucket
        const { data: pub } = supabase.storage
          .from(STORAGE_BUCKETS.AVATARS)
          .getPublicUrl(src, { 
            transform: { width: 256, height: 256, resize: 'cover' } 
          });
        src = `${pub.publicUrl}?v=${data.avatar_version ?? 0}`;
      }
    }

    console.log('✅ Avatar fetched successfully:', {
      hasAvatar: !!src,
      username: data?.display_name || 'Unknown User'
    });

    return {
      src,
      username: data?.display_name || 'Unknown User',
      loading: false,
      error: ''
    };

  } catch (error) {
    console.error('❌ Avatar fetch failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      src: '',
      username: 'Unknown User',
      loading: false,
      error: errorMessage
    };
  }
}

/**
 * Batch fetch multiple user avatars efficiently
 * @param userIds - Array of user IDs to fetch avatars for
 * @returns Promise with map of userId -> AvatarResult
 */
export async function fetchMultipleUserAvatars(userIds: string[]): Promise<Map<string, AvatarResult>> {
  const results = new Map<string, AvatarResult>();
  
  if (userIds.length === 0) {
    return results;
  }

  try {
    console.log('🔄 Batch fetching avatars for', userIds.length, 'users');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, avatar_url, avatar_version, display_name')
      .in('id', userIds);

    if (error) {
      console.warn('⚠️ Batch avatar fetch error:', error.message);
      // Return empty results for all users
      userIds.forEach(userId => {
        results.set(userId, {
          src: '',
          username: 'Unknown User',
          loading: false,
          error: error.message
        });
      });
      return results;
    }

    // Process each user's data
    userIds.forEach(userId => {
      const userData = data?.find(profile => profile.id === userId);
      
      if (!userData) {
        results.set(userId, {
          src: '',
          username: 'Unknown User',
          loading: false,
          error: 'User not found'
        });
        return;
      }

      // Build usable image URL with cache-bust
      let src = userData.avatar_url ?? '';
      if (src) {
        if (src.startsWith('http')) {
          src = `${src}?v=${userData.avatar_version ?? 0}`;
        } else {
          const { data: pub } = supabase.storage
            .from(STORAGE_BUCKETS.AVATARS)
            .getPublicUrl(src, { 
              transform: { width: 256, height: 256, resize: 'cover' } 
            });
          src = `${pub.publicUrl}?v=${userData.avatar_version ?? 0}`;
        }
      }

      results.set(userId, {
        src,
        username: userData.display_name || 'Unknown User',
        loading: false,
        error: ''
      });
    });

    console.log('✅ Batch avatar fetch completed for', results.size, 'users');
    return results;

  } catch (error) {
    console.error('❌ Batch avatar fetch failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return error results for all users
    userIds.forEach(userId => {
      results.set(userId, {
        src: '',
        username: 'Unknown User',
        loading: false,
        error: errorMessage
      });
    });
    
    return results;
  }
}

/**
 * React hook for fetching user avatar with loading state
 * @param userId - The user ID to fetch avatar for
 * @returns Avatar result with loading state
 */
export function useUserAvatar(userId: string | null): AvatarResult {
  const [result, setResult] = React.useState<AvatarResult>({
    src: '',
    username: 'Unknown User',
    loading: true,
    error: ''
  });

  React.useEffect(() => {
    if (!userId) {
      setResult({
        src: '',
        username: 'Unknown User',
        loading: false,
        error: 'No user ID provided'
      });
      return;
    }

    let cancelled = false;

    const loadAvatar = async () => {
      if (cancelled) return;
      
      setResult(prev => ({ ...prev, loading: true, error: '' }));
      
      const avatarResult = await fetchUserAvatar(userId);
      
      if (!cancelled) {
        setResult(avatarResult);
      }
    };

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return result;
}

// Note: This file uses React hooks, so make sure to import React where needed
import React from 'react';