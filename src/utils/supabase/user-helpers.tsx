// This file has been consolidated into client.tsx to prevent multiple Supabase instances
// All user helper functions are now exported from ./client.tsx
export {
  getUserProfile,
  checkProfileCompletion,
  updateUserProfile,
  updateUserMetadata
} from './client';

import { supabase, makeAuthenticatedRequest } from './client';
import type { PublicProfile } from '../../types/user';
import type { SupabaseClient } from '@supabase/supabase-js';

// Get public profile from database view
export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  const { data, error } = await supabase
    .from('user_public_profile')
    .select('id, username, avatar_url, bio, xp, created_at')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

// Get current user's public profile using view
export async function fetchMyPublicProfile(): Promise<PublicProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_public_profile')
    .select('id, username, avatar_url, bio, xp, is_private, created_at')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

// Get user posts from view (if available) or fallback to direct query
export async function fetchUserPosts(userId: string) {
  try {
    // Use posts_with_reaction_count view for accurate reaction counts
    const { data, error } = await supabase
      .from('posts_with_reaction_count')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.log('posts_with_reaction_count view not available, falling back to posts table');
    // Fallback to direct posts table query
    const { data, error: fallbackError } = await supabase
      .from('posts')
      .select('id, text_body, created_at, media_url, like_count, comment_count, reaction_count')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fallbackError) throw fallbackError;
    return data;
  }
}

// Get user stats from view (if available)
export async function fetchUserStats(userId: string) {
  try {
    // Try to use user stats view first
    const { data, error } = await supabase
      .from('user_stats_view') // Assuming this view exists
      .select('user_id, post_count, follower_count, following_count, xp, level')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.log('User stats view not available, calculating manually');
    // Fallback to manual calculation
    const [postsResult, followersResult, followingResult] = await Promise.allSettled([
      supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('follow').select('follower_id', { count: 'exact' }).eq('followed_id', userId),
      supabase.from('follow').select('followed_id', { count: 'exact' }).eq('follower_id', userId)
    ]);

    const postCount = postsResult.status === 'fulfilled' ? postsResult.value.count || 0 : 0;
    const followerCount = followersResult.status === 'fulfilled' ? followersResult.value.count || 0 : 0;
    const followingCount = followingResult.status === 'fulfilled' ? followingResult.value.count || 0 : 0;

    // Get XP from user profile
    const { data: profileData } = await supabase
      .from('user_public_profile')
      .select('xp')
      .eq('id', userId)
      .single();

    const xp = profileData?.xp || 0;
    const level = Math.floor(xp / 100) + 1;

    return {
      user_id: userId,
      post_count: postCount,
      follower_count: followerCount,
      following_count: followingCount,
      xp,
      level
    };
  }
}

// Helper functions for quiz results and realm data
export function generateNickname(realm: 'mirrorcore' | 'embercore' | 'shadowcore'): string {
  const nicknames = {
    mirrorcore: ['Reflection Seeker', 'Mirror Walker', 'Echo Dreamer', 'Glass Soul', 'Prism Wanderer', 'Liquid Light', 'Fractal Being'],
    embercore: ['Flame Keeper', 'Spark Dancer', 'Fire Whisperer', 'Ember Heart', 'Phoenix Soul', 'Solar Mystic', 'Burning Star'],
    shadowcore: ['Night Wanderer', 'Shadow Weaver', 'Void Dancer', 'Dark Star', 'Lunar Mystic', 'Obsidian Soul', 'Cosmic Drifter']
  };
  return nicknames[realm][Math.floor(Math.random() * nicknames[realm].length)];
}

export function getRealmDescription(realm: 'mirrorcore' | 'embercore' | 'shadowcore'): string {
  const descriptions = {
    mirrorcore: 'You exist in the liminal space between reflections, where truth bends like light through glass. Your essence flows like liquid mercury, adapting and shifting with the cosmic tides of digital reality.',
    embercore: 'You carry the eternal flame within, a beacon that ignites transformation in the spaces between dreams. Your spirit burns with the intensity of a thousand suns, illuminating pathways through the void.',
    shadowcore: 'You find profound beauty in the depths that others fear to traverse. Your power emanates from the velvet darkness, where mysteries unfold like midnight flowers blooming in reverse time.'
  };
  return descriptions[realm];
}

// Helper to convert quiz results to database format
export function prepareQuizResultsForDatabase(userResult: any) {
  return {
    coreRealm: userResult.coreRealm, // Will be converted to capitalized form in server
    xp: userResult.xp || 100,
    level: Math.floor((userResult.xp || 100) / 100) + 1
    // Removed achievement_ids since the column doesn't exist in the database
  };
}

// Enhanced bio update function with improved persistence and error handling
export async function updateBio(userId: string, bio: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Client-side validation and sanitization
  const trimmed = bio.trim().slice(0, 280);

  try {
    console.log('🔄 Starting enhanced bio update...', {
      userId: userId.substring(0, 8) + '...',
      bioLength: trimmed.length,
      timestamp: new Date().toISOString()
    });

    // Primary update method using edge function
    try {
      console.log('📡 Attempting primary bio update via edge function...');
      
      const response = await makeAuthenticatedRequest('/make-server-70df0d6e/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Update-Type': 'bio-update'
        },
        body: JSON.stringify({ 
          bio: trimmed,
          updated_at: new Date().toISOString()
        })
      });

      console.log('📨 Bio update response received:', {
        hasResponse: !!response,
        success: response?.success,
        hasProfile: !!response?.profile,
        hasError: !!response?.error
      });

      if (!response) {
        throw new Error('No response received from server');
      }

      // Check for successful response
      if (response.success || response.profile) {
        console.log('✅ Primary bio update successful');
        
        // Verify the update was persisted
        await verifyBioUpdate(userId, trimmed);
        return;
      }

      // Handle error response
      if (response.error) {
        console.warn('⚠️ Server returned error:', response.error);
        throw new Error(response.error);
      }

      // Unexpected response format
      console.warn('⚠️ Unexpected response format:', response);
      throw new Error('Server returned unexpected response');

    } catch (primaryError) {
      console.warn('⚠️ Primary update method failed:', primaryError.message);
      
      // Try fallback method for network issues
      if (primaryError instanceof Error && 
          (primaryError.message.includes('Failed to fetch') || 
           primaryError.message.includes('network') ||
           primaryError.message.includes('timeout'))) {
        
        console.log('🔄 Attempting fallback bio update...');
        await updateBioFallback(userId, trimmed);
        
        // Verify fallback update
        await verifyBioUpdate(userId, trimmed);
        return;
      }
      
      // Re-throw non-network errors
      throw primaryError;
    }

  } catch (error) {
    console.error('❌ Bio update failed completely:', error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('280 characters')) {
        throw new Error('Bio is too long. Please keep it under 280 characters.');
      } else if (error.message.includes('authentication') || error.message.includes('401')) {
        throw new Error('Your session has expired. Please sign in again to update your bio.');
      } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else if (error.message.includes('timeout')) {
        throw new Error('The request timed out. Please try again.');
      } else if (error.message.includes('Server returned unexpected response')) {
        throw new Error('Server error occurred. Please try again in a moment.');
      } else {
        throw new Error(`Failed to update bio: ${error.message}`);
      }
    }
    
    throw new Error('Failed to update bio. Please try again.');
  }
}

// Verify that the bio update was actually persisted
async function verifyBioUpdate(userId: string, expectedBio: string): Promise<void> {
  try {
    console.log('🔍 Verifying bio update persistence...');
    
    // Wait a moment for database consistency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data, error } = await supabase
      .from('profile')
      .select('bio')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.warn('⚠️ Could not verify bio update:', error.message);
      return; // Don't fail the update if verification fails
    }
    
    const actualBio = data.bio || '';
    const bioMatches = actualBio === expectedBio;
    
    console.log('🔍 Bio verification result:', {
      expected: expectedBio.substring(0, 50) + '...',
      actual: actualBio.substring(0, 50) + '...',
      matches: bioMatches
    });
    
    if (!bioMatches) {
      console.warn('⚠️ Bio verification failed - persistence may have issues');
      // Could trigger a retry here in the future
    } else {
      console.log('✅ Bio update verification successful');
    }
    
  } catch (verifyError) {
    console.warn('⚠️ Bio verification error:', verifyError);
    // Don't throw - verification is optional
  }
}

// Fallback bio update using direct Supabase client
async function updateBioFallback(userId: string, bio: string): Promise<void> {
  try {
    console.log('🔄 Using fallback bio update method...');
    
    // Update bio in profiles table using upsert
    const { data, error } = await supabase
      .from('profile')
      .upsert({ 
        id: userId,
        bio: bio
      }, { onConflict: 'id' })
      .select('id, bio')
      .single();

    if (error) {
      console.error('❌ Fallback bio update error:', error);
      throw new Error(`Fallback update failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('Fallback update returned no data - user may not exist');
    }

    console.log('✅ Fallback bio update successful:', {
      bioLength: data.bio ? data.bio.length : 0,
      userId: data.id.substring(0, 8) + '...'
    });

  } catch (fallbackError) {
    console.error('❌ Fallback bio update failed:', fallbackError);
    throw fallbackError;
  }
}

// Alternative bio update function for debugging
export async function updateBioDirectFetch(userId: string, bio: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const trimmed = bio.trim().slice(0, 280);

  try {
    console.log('🔄 Starting direct fetch bio update...');
    
    // Get session manually
    const { getCurrentSession } = await import('./client');
    const session = await getCurrentSession();
    
    if (!session?.access_token) {
      throw new Error('No valid session for direct fetch');
    }

    const { serverUrl } = await import('./client');
    const url = `${serverUrl}/make-server-70df0d6e/users/profile`;
    
    console.log('📡 Direct fetch URL:', url);
    console.log('🔑 Using token:', session.access_token.substring(0, 20) + '...');

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bio: trimmed })
    });

    console.log('📨 Direct fetch response status:', response.status);
    console.log('📨 Direct fetch response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Direct fetch error response:', errorText);
      throw new Error(`Direct fetch failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Direct fetch bio update successful:', result);

    if (!result.profile) {
      throw new Error('Direct fetch: No profile returned');
    }

  } catch (error) {
    console.error('❌ Direct fetch bio update error:', error);
    throw error;
  }
}

// Ultra-simple bio update using Supabase client directly
export async function updateBioSimple(userId: string, bio: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const trimmed = bio.trim().slice(0, 280);

  try {
    console.log('🔄 Starting simple Supabase bio update...');
    
    // Use direct Supabase client
    const { supabase } = await import('./client');
    
    const { data, error } = await supabase
      .from('profile')
      .upsert({ 
        id: userId,
        bio: trimmed
      }, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('❌ Supabase bio update error:', error);
      throw new Error(`Supabase update failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No profile found to update');
    }

    console.log('✅ Simple Supabase bio update successful:', data[0]);

  } catch (error) {
    console.error('❌ Simple bio update error:', error);
    throw error;
  }
}

// Update user profile with avatar URL
export async function updateProfile(userId: string, updates: { profileImageUrl?: string }): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    console.log('🔄 Starting profile update...', { userId: userId.substring(0, 8) + '...', updates });
    
    // Update in profile table (main profile table)
    const { data: userData, error: userError } = await supabase
      .from('profile')
      .update({
        avatar_url: updates.profileImageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (userError) {
      console.error('❌ User table update error:', userError);
      throw new Error(`Profile update failed: ${userError.message}`);
    }

    console.log('✅ Profile update successful:', userData);

  } catch (error) {
    console.error('❌ Profile update error:', error);
    throw error;
  }
}