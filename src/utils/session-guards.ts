/**
 * Session Guards for Data Loaders
 * 
 * This utility provides session validation functions to guard all data loading
 * operations and ensure they only execute with valid authentication.
 */

import { supabase } from './supabase/client';

/**
 * Session validation result
 */
export interface SessionValidation {
  isValid: boolean;
  session: any | null;
  userId: string | null;
  error?: string;
}

/**
 * Guard function that validates session before data loading
 * Returns session info or null if invalid
 */
export async function validateSession(): Promise<SessionValidation> {
  try {
    console.log('🛡️ Validating session for data loading...');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Session validation error:', error);
      return {
        isValid: false,
        session: null,
        userId: null,
        error: error.message
      };
    }
    
    if (!session) {
      console.log('❌ No session found - user not authenticated');
      return {
        isValid: false,
        session: null,
        userId: null,
        error: 'No active session'
      };
    }
    
    if (!session.access_token) {
      console.log('❌ Session missing access token');
      return {
        isValid: false,
        session: null,
        userId: null,
        error: 'Invalid session - no access token'
      };
    }
    
    if (!session.user?.id) {
      console.log('❌ Session missing user ID');
      return {
        isValid: false,
        session: null,
        userId: null,
        error: 'Invalid session - no user ID'
      };
    }
    
    // Check if token is expired
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      console.log('❌ Session expired');
      return {
        isValid: false,
        session: null,
        userId: null,
        error: 'Session expired'
      };
    }
    
    console.log('✅ Session validation passed');
    return {
      isValid: true,
      session: session,
      userId: session.user.id,
      error: null
    };
    
  } catch (error) {
    console.error('Session validation failed:', error);
    return {
      isValid: false,
      session: null,
      userId: null,
      error: error instanceof Error ? error.message : 'Session validation failed'
    };
  }
}

/**
 * Wrapper function for guarded data loading
 * Automatically validates session and provides fallbacks
 */
export async function guardedDataLoader<T>(
  loaderFn: (session: any, userId: string) => Promise<T>,
  fallbackValue: T,
  options: {
    name: string;
    requireAuth?: boolean;
    throwOnError?: boolean;
  }
): Promise<T> {
  try {
    console.log(`🛡️ Guarded data loading: ${options.name}`);
    
    const validation = await validateSession();
    
    if (!validation.isValid) {
      if (options.requireAuth) {
        console.log(`❌ ${options.name} requires authentication:`, validation.error);
        if (options.throwOnError) {
          throw new Error(`Authentication required for ${options.name}: ${validation.error}`);
        }
      } else {
        console.log(`ℹ️ ${options.name} proceeding without authentication`);
      }
      
      return fallbackValue;
    }
    
    console.log(`✅ ${options.name} proceeding with valid session`);
    return await loaderFn(validation.session!, validation.userId!);
    
  } catch (error) {
    console.error(`💥 Error in guarded data loader "${options.name}":`, error);
    
    if (options.throwOnError) {
      throw error;
    }
    
    return fallbackValue;
  }
}

/**
 * Quick session check for components
 */
export async function hasValidSession(): Promise<boolean> {
  const validation = await validateSession();
  return validation.isValid;
}

/**
 * Get current user ID if authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const validation = await validateSession();
  return validation.userId;
}

/**
 * Session-guarded wrapper for Supabase queries
 */
export async function guardedSupabaseQuery<T>(
  queryFn: (supabase: any) => Promise<{ data: T; error: any }>,
  fallbackValue: T,
  options: {
    name: string;
    requireAuth?: boolean;
  }
): Promise<T> {
  try {
    console.log(`🛡️ Guarded Supabase query: ${options.name}`);
    
    if (options.requireAuth) {
      const validation = await validateSession();
      if (!validation.isValid) {
        console.log(`❌ ${options.name} requires authentication:`, validation.error);
        return fallbackValue;
      }
      console.log(`✅ ${options.name} proceeding with valid session`);
    }
    
    const { data, error } = await queryFn(supabase);
    
    if (error) {
      console.error(`Error in ${options.name}:`, error);
      
      // Handle specific error types gracefully
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('PGRST205') || 
          errorMessage.includes('Could not find the table') ||
          errorMessage.includes('does not exist')) {
        console.log(`Table not found for ${options.name} - using fallback data`);
      } else if (errorMessage.includes('42501') || 
                 errorMessage.includes('permission denied')) {
        console.log(`Permission denied for ${options.name} - using fallback data`);
      }
      
      return fallbackValue;
    }
    
    // Ensure data is the expected type
    const result = Array.isArray(data) ? data : (data || fallbackValue);
    console.log(`✅ ${options.name} completed successfully`);
    return result as T;
    
  } catch (error) {
    console.error(`💥 Exception in guarded query "${options.name}":`, error);
    return fallbackValue;
  }
}

/**
 * Example usage patterns
 */

// Example 1: Guarded feed loader
export async function exampleLoadFeed(): Promise<any[]> {
  return guardedSupabaseQuery(
    async (supabase) => {
      return await supabase
        .from('posts')
        .select('id, user_id, post_type, caption, text_body, media_thumb_url, media_url, created_at')
        .order('created_at', { ascending: false });
    },
    [], // fallback to empty array
    {
      name: 'loadFeed',
      requireAuth: true
    }
  );
}

// Example 2: Guarded profile loader
export async function exampleLoadProfile(): Promise<any | null> {
  return guardedDataLoader(
    async (session, userId) => {
      const { makeAuthenticatedRequest } = await import('./supabase/client');
      const response = await makeAuthenticatedRequest('/users/profile');
      return response.profile;
    },
    null, // fallback to null
    {
      name: 'loadProfile',
      requireAuth: true
    }
  );
}

/**
 * Session guard decorator for class methods or functions
 */
export function sessionGuard(options: { requireAuth?: boolean; fallback?: any } = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const validation = await validateSession();
      
      if (options.requireAuth && !validation.isValid) {
        console.log(`❌ ${propertyName} requires authentication:`, validation.error);
        return options.fallback || null;
      }
      
      return method.apply(this, args);
    };
  };
}