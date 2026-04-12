/**
 * Comprehensive frontend auth/session guards to prevent "No valid session" errors
 * and bad requests with undefined user IDs.
 */

import { supabase, getSessionOrNull, fnFetch } from './supabase/client';

export interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  session: any | null;
  userId: string | null;
}

/**
 * Get current auth state without throwing errors
 */
export async function getAuthState(): Promise<AuthState> {
  const session = await getSessionOrNull();
  
  return {
    isAuthenticated: !!(session?.access_token && session?.user?.id),
    user: session?.user || null,
    session: session,
    userId: session?.user?.id || null
  };
}

/**
 * Guard for authenticated requests - returns null if no valid session
 */
export async function withAuthGuard<T>(
  requestFn: (authState: AuthState) => Promise<T>
): Promise<T | null> {
  const authState = await getAuthState();
  
  if (!authState.isAuthenticated || !authState.userId) {
    console.warn('Auth guard: No valid session, skipping request');
    return null;
  }
  
  try {
    return await requestFn(authState);
  } catch (error) {
    // Handle 401 responses by clearing auth state
    if (error instanceof Error && error.message.includes('401')) {
      console.warn('Auth guard: 401 received, clearing session');
      await handleAuthError();
      return null;
    }
    throw error;
  }
}

/**
 * Guard for user-specific data loading
 */
export async function withUserGuard<T>(
  userId: string | undefined | null,
  requestFn: (resolvedUserId: string, authState: AuthState) => Promise<T>
): Promise<T | null> {
  const authState = await getAuthState();
  
  // Resolve userId: use provided userId or fallback to current user
  const resolvedUserId = userId || authState.userId;
  
  if (!resolvedUserId) {
    console.warn('User guard: No valid user ID available');
    return null;
  }
  
  // For accessing other users' data, we still need authentication
  if (!authState.isAuthenticated) {
    console.warn('User guard: Authentication required for user data access');
    return null;
  }
  
  try {
    return await requestFn(resolvedUserId, authState);
  } catch (error) {
    if (error instanceof Error && error.message.includes('401')) {
      console.warn('User guard: 401 received, clearing session');
      await handleAuthError();
      return null;
    }
    throw error;
  }
}

/**
 * Guard for profile-specific operations (current user only)
 */
export async function withProfileGuard<T>(
  requestFn: (userId: string, authState: AuthState) => Promise<T>
): Promise<T | null> {
  const authState = await getAuthState();
  
  if (!authState.isAuthenticated || !authState.userId) {
    console.warn('Profile guard: User not authenticated');
    return null;
  }
  
  try {
    return await requestFn(authState.userId, authState);
  } catch (error) {
    if (error instanceof Error && error.message.includes('401')) {
      console.warn('Profile guard: 401 received, clearing session');
      await handleAuthError();
      return null;
    }
    throw error;
  }
}

/**
 * Handle authentication errors - sign out and clear state
 */
export async function handleAuthError(): Promise<void> {
  try {
    console.log('Handling auth error - clearing session');
    
    // Only sign out if there's actually a session to sign out from
    const session = await getSessionOrNull();
    if (session) {
      console.log('Signing out existing session');
      await supabase.auth.signOut();
    } else {
      console.log('No session to sign out from');
    }
    
    // Clear local storage
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.startsWith('tribe_')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Trigger app state update by dispatching a custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:signout'));
    }
    
  } catch (error) {
    console.warn('Error handling auth error (non-critical):', error);
    // Continue with cleanup even if signOut fails
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:signout'));
    }
  }
}

/**
 * Safe fetch wrapper for authenticated endpoints
 */
export async function safeFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const authState = await getAuthState();
    
    if (!authState.isAuthenticated) {
      return { data: null, error: 'Authentication required' };
    }
    
    const response = await fnFetch(path, init);
    
    if (!response.ok) {
      if (response.status === 401) {
        await handleAuthError();
        return { data: null, error: 'Session expired' };
      }
      
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      
      return { data: null, error: errorMessage };
    }
    
    try {
      const data = await response.json();
      return { data, error: null };
    } catch (parseError) {
      return { data: null, error: 'Invalid response format' };
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    return { data: null, error: errorMessage };
  }
}

/**
 * Check if user has valid session for UI rendering
 */
export async function hasValidSession(): Promise<boolean> {
  const { isAuthenticated } = await import('./simple-session-check');
  return isAuthenticated();
}

/**
 * Get current user ID safely
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { getCurrentUserIdSafely } = await import('./simple-session-check');
  return getCurrentUserIdSafely();
}

/**
 * Redirect to login if not authenticated
 */
export async function requireAuth(): Promise<boolean> {
  const isAuthenticated = await hasValidSession();
  
  if (!isAuthenticated && typeof window !== 'undefined') {
    // Trigger navigation to login
    window.dispatchEvent(new CustomEvent('auth:required'));
    return false;
  }
  
  return isAuthenticated;
}

/**
 * Safe wrapper for user posts that prevents undefined user_id queries
 */
export async function fetchUserPostsSafely(userId?: string) {
  return withUserGuard(userId, async (resolvedUserId, authState) => {
    const { data, error } = await safeFetch(`/users/${resolvedUserId}/posts`);
    
    if (error) {
      console.warn(`Failed to fetch posts for user ${resolvedUserId}:`, error);
      return [];
    }
    
    return data?.posts || [];
  });
}

/**
 * Safe wrapper for notifications that requires authentication
 */
export async function fetchNotificationsSafely() {
  return withProfileGuard(async (userId, authState) => {
    const { data, error } = await safeFetch('/notifications');
    
    if (error) {
      console.warn('Failed to fetch notifications:', error);
      return [];
    }
    
    return data?.notifications || [];
  });
}

/**
 * Safe wrapper for profile data
 */
export async function fetchProfileSafely(userId?: string) {
  if (userId) {
    // Fetching another user's profile
    return withUserGuard(userId, async (resolvedUserId, authState) => {
      const { data, error } = await safeFetch(`/users/${resolvedUserId}/profile`);
      
      if (error) {
        console.warn(`Failed to fetch profile for user ${resolvedUserId}:`, error);
        return null;
      }
      
      return data?.profile || null;
    });
  } else {
    // Fetching current user's profile
    return withProfileGuard(async (currentUserId, authState) => {
      const { data, error } = await safeFetch('/users/profile');
      
      if (error) {
        console.warn('Failed to fetch current user profile:', error);
        return null;
      }
      
      return data?.profile || null;
    });
  }
}