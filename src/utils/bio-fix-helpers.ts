/**
 * Bio Fix Helpers - Comprehensive bio update functionality
 * This file provides multiple methods to update user bios with fallbacks
 */

import { supabase, makeAuthenticatedRequest } from './supabase/client';

export interface BioUpdateResult {
  success: boolean;
  error?: string;
  method?: string;
  profile?: any;
}

/**
 * Primary bio update function with multiple fallback methods
 */
export async function updateUserBio(userId: string, bio: string): Promise<BioUpdateResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  const trimmedBio = bio.trim().slice(0, 280);

  // Method 1: Try the edge function (primary method)
  try {
    console.log('🔄 Bio Fix: Attempting primary edge function method...');
    
    const response = await makeAuthenticatedRequest('/make-server-70df0d6e/users/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        bio: trimmedBio,
        description: trimmedBio, // Keep both fields in sync
        updated_at: new Date().toISOString()
      })
    });

    if (response && (response.success || response.profile)) {
      console.log('✅ Bio Fix: Primary method successful');
      
      // Verify the update
      const verified = await verifyBioUpdate(userId, trimmedBio);
      if (verified) {
        return { 
          success: true, 
          method: 'edge-function',
          profile: response.profile 
        };
      } else {
        console.warn('⚠️ Bio Fix: Primary method succeeded but verification failed');
      }
    }
  } catch (error) {
    console.warn('⚠️ Bio Fix: Primary method failed:', error);
  }

  // Method 2: Direct Supabase update to users table
  try {
    console.log('🔄 Bio Fix: Attempting direct users table update...');
    
    const { data, error } = await supabase
      .from('users')
      .update({ 
        bio: trimmedBio,
        description: trimmedBio,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, bio, description, updated_at');

    if (error) {
      console.error('❌ Bio Fix: Users table update error:', error);
    } else if (data && data.length > 0) {
      console.log('✅ Bio Fix: Direct users table update successful');
      
      // Verify the update
      const verified = await verifyBioUpdate(userId, trimmedBio);
      if (verified) {
        return { 
          success: true, 
          method: 'direct-users-table',
          profile: data[0] 
        };
      }
    }
  } catch (error) {
    console.warn('⚠️ Bio Fix: Direct users table method failed:', error);
  }

  // Method 3: Try profiles table (if it exists)
  try {
    console.log('🔄 Bio Fix: Attempting profiles table update...');
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId,
        bio: trimmedBio,
        description: trimmedBio,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select('id, bio, description, updated_at');

    if (error) {
      console.log('ℹ️ Bio Fix: Profiles table not available or failed:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Bio Fix: Profiles table update successful');
      
      // Verify the update
      const verified = await verifyBioUpdate(userId, trimmedBio);
      if (verified) {
        return { 
          success: true, 
          method: 'profiles-table',
          profile: data[0] 
        };
      }
    }
  } catch (error) {
    console.warn('⚠️ Bio Fix: Profiles table method failed:', error);
  }

  // Method 4: Try user_metadata update (last resort)
  try {
    console.log('🔄 Bio Fix: Attempting user metadata update...');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (user) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          bio: trimmedBio,
          description: trimmedBio
        }
      });

      if (!updateError) {
        console.log('✅ Bio Fix: User metadata update successful');
        return { 
          success: true, 
          method: 'user-metadata'
        };
      } else {
        console.warn('⚠️ Bio Fix: User metadata update failed:', updateError);
      }
    }
  } catch (error) {
    console.warn('⚠️ Bio Fix: User metadata method failed:', error);
  }

  return { 
    success: false, 
    error: 'All bio update methods failed. Please check your internet connection and try again.' 
  };
}

/**
 * Verify that the bio update was actually persisted
 */
async function verifyBioUpdate(userId: string, expectedBio: string): Promise<boolean> {
  try {
    console.log('🔍 Bio Fix: Verifying bio update...');
    
    // Small delay for database consistency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check users table first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('bio, description')
      .eq('id', userId)
      .single();
    
    if (!userError && userData) {
      const actualBio = userData.bio || userData.description || '';
      const matches = actualBio === expectedBio;
      
      console.log('🔍 Bio Fix: Users table verification:', {
        expected: expectedBio.substring(0, 30) + '...',
        actual: actualBio.substring(0, 30) + '...',
        matches
      });
      
      if (matches) {
        return true;
      }
    }
    
    // Check profiles table as fallback
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('bio, description')
      .eq('id', userId)
      .single();
    
    if (!profileError && profileData) {
      const actualBio = profileData.bio || profileData.description || '';
      const matches = actualBio === expectedBio;
      
      console.log('🔍 Bio Fix: Profiles table verification:', {
        expected: expectedBio.substring(0, 30) + '...',
        actual: actualBio.substring(0, 30) + '...',
        matches
      });
      
      return matches;
    }
    
    return false;
  } catch (error) {
    console.warn('⚠️ Bio Fix: Verification failed:', error);
    return false;
  }
}

/**
 * Get current bio from the database
 */
export async function getCurrentBio(userId: string): Promise<string | null> {
  try {
    // Try users table first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('bio, description')
      .eq('id', userId)
      .single();
    
    if (!userError && userData) {
      return userData.bio || userData.description || null;
    }
    
    // Try profiles table as fallback
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('bio, description')
      .eq('id', userId)
      .single();
    
    if (!profileError && profileData) {
      return profileData.bio || profileData.description || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current bio:', error);
    return null;
  }
}

/**
 * Comprehensive bio diagnostic function
 */
export async function diagnosticBioIssues(userId: string): Promise<any> {
  const results = {
    session: null as any,
    database: {
      users: null as any,
      profiles: null as any
    },
    serverEndpoint: null as any,
    errors: [] as string[]
  };

  try {
    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      results.errors.push(`Session error: ${sessionError.message}`);
    } else {
      results.session = {
        valid: !!session,
        userId: session?.user?.id,
        hasAccessToken: !!session?.access_token
      };
    }

    if (session) {
      // Check users table
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, bio, description, updated_at')
          .eq('id', userId)
          .single();
        
        if (userError) {
          results.errors.push(`Users table error: ${userError.message}`);
        } else {
          results.database.users = userData;
        }
      } catch (error) {
        results.errors.push(`Users table exception: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      // Check profiles table
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, bio, description, updated_at')
          .eq('id', userId)
          .single();
        
        if (profileError) {
          results.errors.push(`Profiles table error: ${profileError.message}`);
        } else {
          results.database.profiles = profileData;
        }
      } catch (error) {
        results.errors.push(`Profiles table exception: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      // Test server endpoint
      try {
        const response = await makeAuthenticatedRequest('/make-server-70df0d6e/users/profile', {
          method: 'GET'
        });
        
        results.serverEndpoint = {
          accessible: true,
          response: response
        };
      } catch (error) {
        results.serverEndpoint = {
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown'
        };
        results.errors.push(`Server endpoint error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  } catch (error) {
    results.errors.push(`Diagnostic error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return results;
}