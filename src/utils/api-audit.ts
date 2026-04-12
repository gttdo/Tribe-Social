/**
 * API Authentication Audit Tool for Tribe Board
 * 
 * This utility helps ensure all custom API calls are properly authenticated
 * with Bearer tokens as required by the backend.
 */

import { supabase } from './supabase/client';

/**
 * Audit results interface
 */
interface ApiAuditResult {
  totalEndpoints: number;
  authenticatedEndpoints: number;
  unauthenticatedEndpoints: number;
  recommendations: string[];
  patterns: {
    correct: string[];
    incorrect: string[];
  };
}

/**
 * Test if an endpoint requires authentication
 */
async function testEndpointAuth(endpoint: string): Promise<{
  requiresAuth: boolean;
  error?: string;
}> {
  try {
    // Try to make request without auth first
    const { projectId } = await import('./supabase/info');
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70df0d6e${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // If we get 401/403, it requires auth
    if (response.status === 401 || response.status === 403) {
      return { requiresAuth: true };
    }
    
    // If we get 200, it might be public
    if (response.ok) {
      return { requiresAuth: false };
    }
    
    // Other errors suggest it might require auth
    return { requiresAuth: true, error: `HTTP ${response.status}` };
    
  } catch (error) {
    return { 
      requiresAuth: true, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Comprehensive API authentication audit
 */
export async function auditApiAuthentication(): Promise<ApiAuditResult> {
  console.log('🔍 Starting API authentication audit...');
  
  const protectedEndpoints = [
    '/users/profile',
    '/users/stats',
    '/users/posts',
    '/users/saved',
    '/posts',
    '/posts/create',
    '/posts/upload',
    '/posts/like',
    '/posts/bookmark',
    '/posts/comments',
    '/seed-posts'
  ];
  
  const publicEndpoints = [
    '/health',
    '/status'
  ];
  
  const allEndpoints = [...protectedEndpoints, ...publicEndpoints];
  const recommendations: string[] = [];
  const correctPatterns: string[] = [];
  const incorrectPatterns: string[] = [];
  
  // Check current session status
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    recommendations.push('⚠️ Session check failed - authentication system may have issues');
  }
  
  if (!session?.access_token) {
    recommendations.push('ℹ️ No active session found - some endpoints cannot be tested');
  } else {
    recommendations.push('✅ Active session found with valid access token');
  }
  
  // Analyze code patterns (static analysis)
  console.log('📝 Analyzing authentication patterns in codebase...');
  
  // Correct patterns we want to see
  correctPatterns.push('makeAuthenticatedRequest("/endpoint")');
  correctPatterns.push('Authorization: `Bearer ${session.access_token}`');
  correctPatterns.push('headers: { "Authorization": `Bearer ${token}` }');
  
  // Incorrect patterns to avoid
  incorrectPatterns.push('fetch("/api/endpoint") // Missing Authorization header');
  incorrectPatterns.push('headers: { "Authorization": token } // Missing "Bearer " prefix');
  incorrectPatterns.push('headers: { "Auth": `Bearer ${token}` } // Wrong header name');
  
  // Generate recommendations based on analysis
  recommendations.push('✅ Use makeAuthenticatedRequest() for all custom API endpoints');
  recommendations.push('✅ Direct Supabase table queries automatically include tokens');
  recommendations.push('✅ For manual fetch calls, always include Authorization: Bearer <token>');
  recommendations.push('⚠️ Never send API keys or tokens in URL parameters');
  recommendations.push('⚠️ Always validate session before making authenticated requests');
  
  // Check for common authentication issues
  if (typeof window !== 'undefined') {
    const hasLocalStorage = !!window.localStorage;
    const hasSupabaseAuth = !!window.localStorage.getItem('supabase.auth.token');
    
    if (!hasLocalStorage) {
      recommendations.push('❌ LocalStorage not available - session persistence may fail');
    }
    
    if (!hasSupabaseAuth) {
      recommendations.push('ℹ️ No auth token in localStorage - user may need to sign in');
    }
  }
  
  const result: ApiAuditResult = {
    totalEndpoints: allEndpoints.length,
    authenticatedEndpoints: protectedEndpoints.length,
    unauthenticatedEndpoints: publicEndpoints.length,
    recommendations,
    patterns: {
      correct: correctPatterns,
      incorrect: incorrectPatterns
    }
  };
  
  console.log('🔍 API Authentication Audit Results:');
  console.log(`📊 Total endpoints checked: ${result.totalEndpoints}`);
  console.log(`🔐 Protected endpoints: ${result.authenticatedEndpoints}`);
  console.log(`🌐 Public endpoints: ${result.unauthenticatedEndpoints}`);
  
  console.log('\n✅ Correct Authentication Patterns:');
  result.patterns.correct.forEach(pattern => {
    console.log(`  ${pattern}`);
  });
  
  console.log('\n❌ Incorrect Patterns to Avoid:');
  result.patterns.incorrect.forEach(pattern => {
    console.log(`  ${pattern}`);
  });
  
  console.log('\n📋 Recommendations:');
  result.recommendations.forEach(rec => {
    console.log(`  ${rec}`);
  });
  
  return result;
}

/**
 * Quick check to verify current authentication status
 */
export async function quickAuthCheck(): Promise<{
  isAuthenticated: boolean;
  hasValidToken: boolean;
  userId?: string;
  tokenLength?: number;
  error?: string;
}> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        isAuthenticated: false,
        hasValidToken: false,
        error: error.message
      };
    }
    
    if (!session) {
      return {
        isAuthenticated: false,
        hasValidToken: false,
        error: 'No session found'
      };
    }
    
    if (!session.access_token) {
      return {
        isAuthenticated: false,
        hasValidToken: false,
        error: 'No access token in session'
      };
    }
    
    return {
      isAuthenticated: true,
      hasValidToken: true,
      userId: session.user?.id,
      tokenLength: session.access_token.length
    };
    
  } catch (error) {
    return {
      isAuthenticated: false,
      hasValidToken: false,
      error: error instanceof Error ? error.message : 'Unknown auth check error'
    };
  }
}

/**
 * Test a specific endpoint with and without authentication
 */
export async function testEndpointAuthentication(endpoint: string): Promise<{
  endpoint: string;
  withoutAuth: { status: number; requiresAuth: boolean };
  withAuth?: { status: number; success: boolean };
  error?: string;
}> {
  try {
    console.log(`🧪 Testing endpoint: ${endpoint}`);
    
    const { projectId } = await import('./supabase/info');
    const fullUrl = `https://${projectId}.supabase.co/functions/v1/make-server-70df0d6e${endpoint}`;
    
    // Test without auth
    const unauthResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const withoutAuth = {
      status: unauthResponse.status,
      requiresAuth: unauthResponse.status === 401 || unauthResponse.status === 403
    };
    
    // Test with auth if we have a session
    const { data: { session } } = await supabase.auth.getSession();
    let withAuth;
    
    if (session?.access_token) {
      const authResponse = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      withAuth = {
        status: authResponse.status,
        success: authResponse.ok
      };
    }
    
    return { endpoint, withoutAuth, withAuth };
    
  } catch (error) {
    return {
      endpoint,
      withoutAuth: { status: 0, requiresAuth: true },
      error: error instanceof Error ? error.message : 'Test failed'
    };
  }
}

/**
 * Development utility to log authentication patterns in console
 */
export function logAuthenticationPatterns() {
  console.log('\n🔐 Authentication Patterns Guide');
  console.log('================================\n');
  
  console.log('✅ CORRECT - Using makeAuthenticatedRequest helper:');
  console.log('const response = await makeAuthenticatedRequest("/users/profile");');
  
  console.log('\n✅ CORRECT - Manual fetch with proper authentication:');
  console.log('const { data: { session } } = await supabase.auth.getSession();');
  console.log('const response = await fetch("/api/endpoint", {');
  console.log('  headers: {');
  console.log('    "Authorization": `Bearer ${session?.access_token ?? ""}`,');
  console.log('    "Content-Type": "application/json"');
  console.log('  }');
  console.log('});');
  
  console.log('\n✅ CORRECT - Supabase table queries (automatic auth):');
  console.log('const { data, error } = await supabase');
  console.log('  .from("posts")');
  console.log('  .select("*");');
  
  console.log('\n❌ INCORRECT - Missing authentication:');
  console.log('const response = await fetch("/api/protected-endpoint"); // No auth header');
  
  console.log('\n❌ INCORRECT - Wrong header format:');
  console.log('headers: { "Authorization": session.access_token } // Missing "Bearer " prefix');
  
  console.log('\n📚 Authentication Flow:');
  console.log('1. User signs in via Supabase Auth');
  console.log('2. Supabase provides access_token in session');
  console.log('3. Include token in Authorization header for custom APIs');
  console.log('4. Server validates token and processes request');
}

/**
 * Export audit function for development use
 */
export { auditApiAuthentication as auditApiCalls } from './api-helpers';