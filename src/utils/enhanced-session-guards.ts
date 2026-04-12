/**
 * Enhanced session validation and guards for components
 */

import { getSessionOrNull, supabase } from './supabase/client';
import { handleAuthError } from './auth-guards';

export interface SessionValidation {
  isValid: boolean;
  session: any | null;
  user: any | null;
  userId: string | null;
  error?: string;
}

/**
 * Comprehensive session validation
 */
export async function validateSession(): Promise<SessionValidation> {
  try {
    const session = await getSessionOrNull();
    
    if (!session) {
      return {
        isValid: false,
        session: null,
        user: null,
        userId: null,
        error: 'No session found'
      };
    }
    
    if (!session.access_token) {
      return {
        isValid: false,
        session: null,
        user: null,
        userId: null,
        error: 'Session missing access token'
      };
    }
    
    if (!session.user?.id) {
      return {
        isValid: false,
        session: null,
        user: null,
        userId: null,
        error: 'Session missing user ID'
      };
    }
    
    // Check if token is expired - only refresh if we have a refresh token
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at <= now) {
      console.warn('Session token expired');
      
      // Only attempt refresh if we have a refresh token
      if (session.refresh_token) {
        console.log('Attempting session refresh...');
        try {
          const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.warn('Session refresh failed:', error.message);
            return {
              isValid: false,
              session: null,
              user: null,
              userId: null,
              error: 'Session expired and refresh failed'
            };
          }
          
          if (!refreshedSession) {
            console.warn('Session refresh returned no session');
            return {
              isValid: false,
              session: null,
              user: null,
              userId: null,
              error: 'Session refresh returned no session'
            };
          }
          
          return {
            isValid: true,
            session: refreshedSession,
            user: refreshedSession.user,
            userId: refreshedSession.user.id
          };
        } catch (refreshError) {
          console.warn('Session refresh exception:', refreshError);
          return {
            isValid: false,
            session: null,
            user: null,
            userId: null,
            error: 'Session refresh failed'
          };
        }
      } else {
        console.warn('No refresh token available for expired session');
        return {
          isValid: false,
          session: null,
          user: null,
          userId: null,
          error: 'Session expired and no refresh token available'
        };
      }
    }
    
    return {
      isValid: true,
      session,
      user: session.user,
      userId: session.user.id
    };
    
  } catch (error) {
    console.error('Session validation error:', error);
    return {
      isValid: false,
      session: null,
      user: null,
      userId: null,
      error: 'Session validation failed'
    };
  }
}

/**
 * Component hook-like function for session validation
 */
export async function useSessionValidation(): Promise<SessionValidation> {
  return validateSession();
}

/**
 * Guard wrapper for component data loading
 */
export async function withSessionValidation<T>(
  dataLoader: (validation: SessionValidation) => Promise<T>
): Promise<T | null> {
  const validation = await validateSession();
  
  if (!validation.isValid) {
    console.warn('Session validation failed:', validation.error);
    return null;
  }
  
  try {
    return await dataLoader(validation);
  } catch (error) {
    // Handle 401 responses
    if (error instanceof Error && (
      error.message.includes('401') || 
      error.message.includes('Unauthorized') ||
      error.message.includes('Session expired')
    )) {
      console.warn('Received auth error, handling session cleanup');
      await handleAuthError();
      return null;
    }
    
    throw error;
  }
}

/**
 * Safe component state setter that checks session validity
 */
export async function safeSetState<T>(
  setState: (value: T | ((prev: T) => T)) => void,
  newValue: T | ((prev: T) => T),
  requireAuth: boolean = true
): Promise<boolean> {
  if (requireAuth) {
    const validation = await validateSession();
    if (!validation.isValid) {
      console.warn('Skipping state update due to invalid session');
      return false;
    }
  }
  
  setState(newValue);
  return true;
}

/**
 * Session-aware error boundary helper
 */
export function createSessionAwareErrorHandler(
  fallbackHandler?: (error: Error) => void
) {
  return async (error: Error) => {
    // Check if error is auth-related
    const authErrorKeywords = ['401', 'unauthorized', 'session', 'token', 'expired'];
    const isAuthError = authErrorKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
    
    if (isAuthError) {
      console.warn('Auth-related error detected, cleaning up session');
      await handleAuthError();
      return;
    }
    
    // Call fallback handler if provided
    if (fallbackHandler) {
      fallbackHandler(error);
    } else {
      console.error('Unhandled session-aware error:', error);
    }
  };
}

/**
 * Validate user ID specifically to prevent undefined queries
 */
export function validateUserId(userId: any): string | null {
  if (!userId) {
    return null;
  }
  
  if (typeof userId !== 'string') {
    return null;
  }
  
  const trimmed = userId.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return null;
  }
  
  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmed)) {
    return null;
  }
  
  return trimmed;
}

/**
 * Safe user data fetcher with session validation
 */
export async function fetchUserDataSafely<T>(
  userId: string | undefined,
  fetcher: (validUserId: string, validation: SessionValidation) => Promise<T>
): Promise<T | null> {
  const validUserId = validateUserId(userId);
  if (!validUserId) {
    console.warn('Invalid user ID provided:', userId);
    return null;
  }
  
  return withSessionValidation(async (validation) => {
    return fetcher(validUserId, validation);
  });
}