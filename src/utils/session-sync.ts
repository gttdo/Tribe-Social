/**
 * Session Synchronization Helper
 * 
 * Ensures all API calls have access to a valid session and handles 
 * session refresh when needed.
 */

import { supabase } from './supabase/client';

let sessionCache: any = null;
let sessionPromise: Promise<any> | null = null;

/**
 * Get or refresh the current session - returns null if no session available
 */
export async function getValidSession(): Promise<any | null> {
  try {
    // If we already have a promise in flight, wait for it
    if (sessionPromise) {
      console.log('⏳ Session sync: Waiting for existing session promise...');
      return await sessionPromise;
    }

    // If we have a cached session that's still valid, use it
    if (sessionCache && isSessionValid(sessionCache)) {
      console.log('✅ Session sync: Using cached valid session');
      return sessionCache;
    }

    console.log('🔄 Session sync: Fetching fresh session...');
    
    // Create a new session promise
    sessionPromise = refreshSession();
    
    try {
      const session = await sessionPromise;
      sessionCache = session;
      
      if (session) {
        console.log('✅ Session sync: Fresh session obtained and cached', {
          hasToken: !!session.access_token,
          hasUser: !!session.user?.id,
          userEmail: session.user?.email?.substring(0, 3) + '***' || 'no email'
        });
      } else {
        console.log('❌ Session sync: No session available from refresh');
      }
      
      return session;
    } finally {
      sessionPromise = null;
    }
    
  } catch (error) {
    console.warn('❌ Session sync: No valid session available:', error.message);
    sessionCache = null;
    sessionPromise = null;
    return null; // Return null instead of throwing
  }
}

/**
 * Refresh the session from Supabase
 */
async function refreshSession(): Promise<any | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Session fetch error:', error.message);
      return null;
    }
    
    if (!session || !session.access_token) {
      console.log('❌ Session sync: No valid session available from Supabase');
      return null;
    }
    
    console.log('✅ Session sync: Session refreshed successfully', {
      hasToken: !!session.access_token,
      hasUser: !!session.user?.id,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'no expiry'
    });
    return session;
    
  } catch (error) {
    console.warn('Session refresh failed:', error.message);
    return null;
  }
}

/**
 * Check if a session is still valid
 */
function isSessionValid(session: any): boolean {
  if (!session || !session.access_token || !session.user?.id) {
    return false;
  }
  
  // Check if token is expired (with 5 minute buffer)
  if (session.expires_at) {
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes
    
    if (now >= (expiresAt - buffer)) {
      console.log('⚠️ Session token expiring soon, needs refresh');
      return false;
    }
  }
  
  return true;
}

/**
 * Clear the session cache (call on logout)
 */
export function clearSessionCache(): void {
  console.log('🧹 Clearing session cache');
  sessionCache = null;
  sessionPromise = null;
}

/**
 * Initialize session synchronization
 */
export function initializeSessionSync(): void {
  console.log('🔗 Initializing session synchronization');
  
  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔐 Session sync - Auth state changed:', event);
    
    switch (event) {
      case 'SIGNED_IN':
        sessionCache = session;
        console.log('✅ Session cached on sign in');
        break;
        
      case 'SIGNED_OUT':
        clearSessionCache();
        console.log('🧹 Session cleared on sign out');
        break;
        
      case 'TOKEN_REFRESHED':
        sessionCache = session;
        console.log('🔄 Session updated on token refresh');
        break;
        
      default:
        // For other events, just update the cache if we have a session
        if (session) {
          sessionCache = session;
        }
        break;
    }
  });
}

/**
 * Wait for session to be available (with timeout)
 */
export async function waitForSession(timeoutMs: number = 10000): Promise<any> {
  console.log('⏳ Waiting for session...');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const session = await getValidSession();
      if (session) {
        console.log('✅ Session available');
        return session;
      }
    } catch (error) {
      // Ignore errors and continue waiting
    }
    
    // Wait 500ms before trying again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('⏰ Session wait timeout');
  throw new Error('Session wait timeout');
}

/**
 * Enhanced session validation that includes sync
 */
export async function validateSessionWithSync(): Promise<{
  isValid: boolean;
  session: any | null;
  userId: string | null;
  error?: string;
}> {
  try {
    const session = await getValidSession();
    
    if (!session) {
      return {
        isValid: false,
        session: null,
        userId: null,
        error: 'No session available'
      };
    }
    
    return {
      isValid: true,
      session: session,
      userId: session.user.id,
      error: undefined
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Session validation failed';
    
    return {
      isValid: false,
      session: null,
      userId: null,
      error: errorMessage
    };
  }
}