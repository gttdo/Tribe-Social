/**
 * Simple session checking utilities that never throw errors
 */

import { supabase } from './supabase/client';

export interface SimpleSessionStatus {
  hasSession: boolean;
  hasValidToken: boolean;
  hasUserId: boolean;
  userId: string | null;
  isExpired: boolean;
  session: any | null;
}

/**
 * Check session status without throwing any errors, with timeout protection
 */
export async function checkSessionStatus(): Promise<SimpleSessionStatus> {
  try {
    // Add timeout protection to session check
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout')), 2000)
    );
    
    const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
    
    // If there's an error or no session, return safe defaults
    if (error || !session) {
      return {
        hasSession: false,
        hasValidToken: false,
        hasUserId: false,
        userId: null,
        isExpired: true,
        session: null
      };
    }
    
    const hasValidToken = !!(session.access_token);
    const hasUserId = !!(session.user?.id);
    const userId = session.user?.id || null;
    
    // Check if expired (with some buffer)
    let isExpired = false;
    if (session.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      const buffer = 60; // 1 minute buffer
      isExpired = (session.expires_at - buffer) <= now;
    }
    
    return {
      hasSession: true,
      hasValidToken,
      hasUserId,
      userId,
      isExpired,
      session
    };
    
  } catch (error) {
    // Never throw, always return safe defaults
    console.warn('Session status check failed (possibly timeout):', error);
    return {
      hasSession: false,
      hasValidToken: false,
      hasUserId: false,
      userId: null,
      isExpired: true,
      session: null
    };
  }
}

/**
 * Simple check if user is authenticated (has valid session)
 */
export async function isAuthenticated(): Promise<boolean> {
  const status = await checkSessionStatus();
  return status.hasSession && status.hasValidToken && status.hasUserId && !status.isExpired;
}

/**
 * Get current user ID safely (returns null if not available)
 */
export async function getCurrentUserIdSafely(): Promise<string | null> {
  const status = await checkSessionStatus();
  return status.userId;
}

/**
 * Check if current session is valid for API calls
 */
export async function canMakeAuthenticatedCalls(): Promise<boolean> {
  const status = await checkSessionStatus();
  return status.hasSession && status.hasValidToken && !status.isExpired;
}

/**
 * Safe session getter that returns null instead of throwing
 */
export async function getSessionSafely(): Promise<any | null> {
  const status = await checkSessionStatus();
  return status.session;
}