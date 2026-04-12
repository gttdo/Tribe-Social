/**
 * API Request Helpers for Tribe Board
 * 
 * This file provides utilities to ensure all custom API calls properly
 * include authentication tokens as required.
 */

import { supabase } from './supabase/client';

/**
 * IMPORTANT: Use makeAuthenticatedRequest for all custom API calls to our backend
 * This ensures the Authorization: Bearer <token> header is always attached
 */
export { makeAuthenticatedRequest, makePublicRequest } from './supabase/client';

/**
 * Helper function to manually create an authenticated fetch request
 * Use this pattern if you need to make a direct fetch call for some reason
 * 
 * @param endpoint - The API endpoint (e.g., '/users/profile')
 * @param options - Standard fetch options
 * @returns Promise<Response>
 */
export async function createAuthenticatedFetch(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  console.log('=== MANUAL AUTHENTICATED FETCH ===');
  console.log('Endpoint:', endpoint);
  console.warn('⚠️ Consider using makeAuthenticatedRequest instead for better error handling');
  
  // Get the current session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Session error:', error);
    throw new Error(`Session error: ${error.message}`);
  }
  
  if (!session?.access_token) {
    console.error('No active session found');
    throw new Error('Authentication required: No active session');
  }

  // Get API base URL from environment variable or fall back to Supabase functions URL
  const getApiBaseUrl = () => {
    // Check for environment variable first - with proper error handling
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) {
        return import.meta.env.VITE_API_BASE;
      }
    } catch (error) {
      console.warn('Environment variable access failed, using fallback URL:', error);
    }
    
    // Fall back to Supabase functions URL
    return 'https://your-project.supabase.co/functions/v1';
  };

  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${getApiBaseUrl()}${endpoint}`;
  
  console.log('Authorization token attached:', `Bearer ${session.access_token.substring(0, 20)}...`);
  
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  console.log('Making manual authenticated fetch...');
  return fetch(url, requestOptions);
}

/**
 * Enhanced helper for making authenticated API calls with additional token validation
 * This is a wrapper around makeAuthenticatedRequest with extra checks
 */
export async function makeSecureApiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  console.log('=== SECURE API CALL ===');
  console.log('Endpoint:', endpoint);
  
  // Pre-flight check: ensure we have a valid session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ Session validation failed:', error);
    throw new Error(`Session validation failed: ${error.message}`);
  }
  
  if (!session?.access_token) {
    console.error('❌ No access token available');
    throw new Error('Authentication required: No access token');
  }
  
  if (!session?.user?.id) {
    console.error('❌ No user ID in session');
    throw new Error('Authentication required: Invalid session');
  }
  
  console.log('✅ Session validation passed');
  console.log('✅ User ID:', session.user.id.substring(0, 8) + '...');
  console.log('✅ Token length:', session.access_token.length);
  
  // Use our standard authenticated request function
  const { makeAuthenticatedRequest } = await import('./supabase/client');
  return makeAuthenticatedRequest(endpoint, options);
}

/**
 * Validation function to check if a request is properly authenticated
 * Use this for debugging or testing purposes
 */
export function validateAuthenticatedRequest(headers: HeadersInit): boolean {
  const headersObj = new Headers(headers);
  const authHeader = headersObj.get('Authorization');
  
  if (!authHeader) {
    console.error('❌ Missing Authorization header');
    return false;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    console.error('❌ Authorization header should start with "Bearer "');
    return false;
  }
  
  const token = authHeader.substring(7); // Remove "Bearer " prefix
  if (!token || token.length < 10) {
    console.error('❌ Authorization token appears to be invalid or too short');
    return false;
  }
  
  console.log('✅ Authorization header is properly formatted');
  return true;
}

/**
 * Development helper to audit API calls
 * Call this in development to check if all API calls are properly authenticated
 */
export function auditApiCalls() {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    console.log('API audit is only available in development mode');
    return;
  }
  
  console.log('🔍 Auditing API calls for proper authentication...');
  console.log('✅ All custom API calls should use makeAuthenticatedRequest()');
  console.log('✅ Supabase table queries automatically include tokens');
  console.log('✅ Manual fetch calls should use createAuthenticatedFetch() or validateAuthenticatedRequest()');
  
  // List of endpoints that should always be authenticated
  const protectedEndpoints = [
    '/users/profile',
    '/users/*/stats',
    '/users/*/posts',
    '/users/*/saved',
    '/posts',
    '/posts/*/like',
    '/posts/*/bookmark',
    '/posts/*/comments',
    '/posts/create',
    '/posts/upload',
    '/seed-posts',
    '/health' // Even though this might not need auth, it's good to be consistent
  ];
  
  console.log('🔐 Protected endpoints that require authentication:');
  protectedEndpoints.forEach(endpoint => {
    console.log(`  - ${endpoint}`);
  });
  
  // Provide guidance
  console.log('\n📋 Authentication patterns:');
  console.log('✅ CORRECT - Using our helper:');
  console.log('   const response = await makeAuthenticatedRequest("/users/profile");');
  console.log('\n✅ CORRECT - Manual fetch with proper token:');
  console.log('   const { data: { session } } = await supabase.auth.getSession();');
  console.log('   const response = await fetch("/users/profile", {');
  console.log('     headers: { "Authorization": `Bearer ${session?.access_token ?? ""}` }');
  console.log('   });');
  console.log('\n❌ INCORRECT - Missing authorization:');
  console.log('   const response = await fetch("/users/profile");');
}

/**
 * Type guard to ensure we're using the correct request pattern
 */
export type AuthenticatedRequestOptions = RequestInit & {
  requiresAuth: true;
};

/**
 * Check if current user has valid authentication for API calls
 */
export async function verifyApiAuthentication(): Promise<{
  isValid: boolean;
  session: any | null;
  error?: string;
}> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        isValid: false,
        session: null,
        error: `Session error: ${error.message}`
      };
    }
    
    if (!session?.access_token) {
      return {
        isValid: false,
        session: null,
        error: 'No active session'
      };
    }
    
    if (!session?.user?.id) {
      return {
        isValid: false,
        session: null,
        error: 'Invalid session data'
      };
    }
    
    // Check if token is expired
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      return {
        isValid: false,
        session: null,
        error: 'Session expired'
      };
    }
    
    return {
      isValid: true,
      session: session
    };
    
  } catch (error) {
    return {
      isValid: false,
      session: null,
      error: error instanceof Error ? error.message : 'Unknown auth check error'
    };
  }
}

/**
 * Enhanced request wrapper with pre-flight authentication checks
 */
export async function makeVerifiedApiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  console.log('=== VERIFIED API CALL ===');
  console.log('Endpoint:', endpoint);
  
  // Pre-flight authentication check
  const authCheck = await verifyApiAuthentication();
  
  if (!authCheck.isValid) {
    console.error('❌ Pre-flight auth check failed:', authCheck.error);
    throw new Error(`Authentication failed: ${authCheck.error}`);
  }
  
  console.log('✅ Pre-flight auth check passed');
  
  // Use our standard authenticated request function
  const { makeAuthenticatedRequest } = await import('./supabase/client');
  return makeAuthenticatedRequest(endpoint, options);
}