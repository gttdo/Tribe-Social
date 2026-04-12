import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from './info'

// Construct Supabase URL from project ID
const supabaseUrl = `https://${projectId}.supabase.co`;

// Singleton Supabase client instance - ensures only one client exists
let _supabaseInstance: any = null;

function createSupabaseClient() {
  if (_supabaseInstance) {
    console.log('♻️  Reusing existing Supabase client singleton');
    return _supabaseInstance;
  }

  console.log('🔧 Creating new Supabase client singleton...');
  
  // Monitor client creation
  try {
    const { incrementClientCreationCount, registerClientInstance } = require('../supabase-client-monitor');
    incrementClientCreationCount();
  } catch (error) {
    // Silently continue if monitor is not available
    console.log('Client monitor not available, continuing...');
  }
  
  _supabaseInstance = createClient(
    supabaseUrl,
    publicAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,   // important for magic links / OAuth
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'tribe-supabase-auth-token', // Custom storage key for the app
        flowType: 'pkce' // Use PKCE flow for better security
      },
      global: {
        headers: {
          'X-Client-Info': 'tribe-board/1.0.0'
        }
      }
    }
  );

  console.log('✅ Created singleton Supabase client instance successfully');
  return _supabaseInstance;
}

// Main Supabase client instance - single source of truth
export const supabase = createSupabaseClient();

// Debug function to check client instance
export function getClientInfo() {
  return {
    hasInstance: !!_supabaseInstance,
    isSingleton: _supabaseInstance === supabase,
    clientId: _supabaseInstance ? 'singleton' : 'none'
  };
}

// Function to reset the singleton (for testing/debugging only)
export function resetClientSingleton() {
  console.warn('🔄 Resetting Supabase client singleton');
  _supabaseInstance = null;
}

// Initialize auth state listeners
export function initializeAuthListeners() {
  console.log('Setting up Supabase auth state listeners...');
  
  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('=== AUTH STATE CHANGE ===');
      console.log('Event:', event);
      console.log('Has session:', !!session);
      console.log('Has access token:', !!session?.access_token);
      console.log('User ID:', session?.user?.id?.substring(0, 8) + '...' || 'none');
      console.log('========================');

      switch (event) {
        case 'SIGNED_IN':
          console.log('User signed in successfully');
          break;
        case 'SIGNED_OUT':
          console.log('User signed out successfully');
          // Clear any cached data
          if (typeof window !== 'undefined') {
            // Clear Supabase localStorage entries
            Object.keys(localStorage).forEach(key => {
              if (key.includes('supabase') || key.startsWith('tribe_')) {
                localStorage.removeItem(key);
              }
            });
          }
          break;
        case 'TOKEN_REFRESHED':
          console.log('Auth token refreshed successfully');
          break;
        case 'USER_UPDATED':
          console.log('User profile updated');
          break;
        case 'PASSWORD_RECOVERY':
          console.log('Password recovery initiated');
          break;
      }
    }
  );

  console.log('Auth state listeners initialized');
  
  return subscription;
}

// Initialize auth listeners when client is imported
let authSubscription: any = null;
if (typeof window !== 'undefined') {
  authSubscription = initializeAuthListeners();
}

// Enhanced session management functions
export async function waitForInitialSession(timeoutMs: number = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Session initialization timeout'));
    }, timeoutMs);

    // First, check if we already have a session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(timeout);
      
      if (error) {
        console.warn('Initial session check error:', error);
        resolve(null);
        return;
      }
      
      if (session) {
        console.log('Initial session found immediately');
        resolve(session);
        return;
      }
      
      // No session yet, wait for auth state change
      console.log('No initial session, waiting for auth state...');
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change during wait:', event);
        clearTimeout(timeout);
        subscription.unsubscribe();
        resolve(session);
      });
    });
  });
}

export async function waitForValidSession(timeoutMs: number = 8000): Promise<any> {
  console.log('Waiting for valid session...');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log('Session wait timeout reached');
      resolve(null); // Don't reject, just resolve with null
    }, timeoutMs);

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Session check error:', error);
          clearTimeout(timeout);
          resolve(null);
          return;
        }
        
        if (session?.access_token && session?.user) {
          console.log('✓ Valid session confirmed');
          clearTimeout(timeout);
          resolve(session);
          return;
        }
        
        // Check for OAuth/magic link parameters
        const url = new URL(window.location.href);
        const hasAuthParams = url.searchParams.has('access_token') || 
                             url.searchParams.has('refresh_token') || 
                             url.searchParams.has('code');
        
        if (hasAuthParams) {
          console.log('Found auth parameters, waiting for processing...');
          // Wait a bit longer for Supabase to process
          setTimeout(async () => {
            const { data: { session: urlSession } } = await supabase.auth.getSession();
            clearTimeout(timeout);
            
            if (urlSession?.access_token && urlSession?.user) {
              console.log('✓ Session established from URL parameters');
              // Clean the URL
              const cleanUrl = url.origin + url.pathname;
              window.history.replaceState(null, '', cleanUrl);
              resolve(urlSession);
            } else {
              console.log('✗ URL parameters did not establish session');
              resolve(null);
            }
          }, 1500);
        } else {
          console.log('✗ No valid session found');
          clearTimeout(timeout);
          resolve(null);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        clearTimeout(timeout);
        resolve(null);
      }
    };

    checkSession();
  });
}

export async function handleAuthUrl(): Promise<boolean> {
  try {
    console.log('Checking URL for auth tokens...');
    
    const url = new URL(window.location.href);
    const hasAuthParams = url.searchParams.has('access_token') || 
                         url.searchParams.has('refresh_token') || 
                         url.searchParams.has('code');
    
    if (hasAuthParams) {
      console.log('Auth parameters found in URL, processing...');
      
      // Wait for Supabase to process the URL
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if session was established
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error processing auth URL:', error);
        return false;
      }
      
      if (session) {
        console.log('Session established from URL parameters');
        // Clean the URL
        const cleanUrl = url.origin + url.pathname;
        window.history.replaceState(null, '', cleanUrl);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error handling auth URL:', error);
    return false;
  }
}

export function cleanupAuthListeners() {
  if (authSubscription) {
    console.log('Cleaning up auth listeners');
    authSubscription.unsubscribe();
  }
}

// Auth helper functions
export async function checkAuthStatus() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Auth status check error:', error);
      return {
        isAuthenticated: false,
        user: null,
        session: null,
        error: error.message
      };
    }

    const isAuthenticated = !!(session?.access_token && session?.user);
    
    return {
      isAuthenticated,
      user: session?.user || null,
      session: session,
      error: null
    };
  } catch (error) {
    console.error('Auth status check failed:', error);
    return {
      isAuthenticated: false,
      user: null,
      session: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function refreshSession() {
  try {
    console.log('Refreshing Supabase session...');
    
    // First check if we even have a session to refresh
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession) {
      console.warn('No current session to refresh');
      return null;
    }
    
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.warn('Session refresh error:', error.message);
      return null;
    }

    if (!session) {
      console.warn('No session returned from refresh');
      return null;
    }

    console.log('Session refreshed successfully');
    return session;
  } catch (error) {
    console.warn('Session refresh failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Session helper - returns session or null without throwing
export async function getSessionOrNull() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Session error:', error.message);
      return null;
    }

    // Return session only if it has all required properties
    if (session?.access_token && session?.user?.id) {
      return session;
    }

    return null;
  } catch (error) {
    console.warn('Failed to get session:', error);
    return null;
  }
}

export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      throw new Error(`Failed to get session: ${error.message}`);
    }

    if (!session) {
      throw new Error('No active session found');
    }

    if (!session.access_token) {
      throw new Error('Session missing access token');
    }

    return session;
  } catch (error) {
    console.error('Failed to get current session:', error);
    throw error;
  }
}

export async function signOutUser() {
  try {
    console.log('=== STARTING ENHANCED SIGN OUT ===');
    
    // Check if user is currently signed in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('No active session found, user already signed out');
      return { success: true, message: 'User already signed out' };
    }

    console.log('Active session found, proceeding with sign out...');
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Supabase sign out error:', error);
      throw new Error(`Sign out failed: ${error.message}`);
    }

    // Verify sign out was successful
    const { data: { session: postSignOutSession } } = await supabase.auth.getSession();
    
    if (postSignOutSession) {
      console.warn('Session still exists after sign out attempt');
      throw new Error('Sign out verification failed - session still active');
    }

    console.log('=== SIGN OUT COMPLETED SUCCESSFULLY ===');
    return { success: true, message: 'Successfully signed out' };
    
  } catch (error) {
    console.error('=== SIGN OUT ERROR ===');
    console.error('Error details:', error);
    console.error('==================');
    throw error;
  }
}

// Functions fetch wrapper with conditional Authorization
const FN_BASE = `${supabaseUrl}/functions/v1/make-server-70df0d6e`;

export async function fnFetch(path: string, init: RequestInit = {}) {
  const session = await getSessionOrNull();
  const headers = new Headers(init.headers || {});
  
  // Only add Authorization header if we have a valid session
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  
  headers.set('Content-Type', 'application/json');
  
  return fetch(`${FN_BASE}${path}`, { ...init, headers });
}

// Request helper functions
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
  
  // Fall back to the existing Supabase functions URL
  return `${supabaseUrl}/functions/v1`;
};

export const serverUrl = getApiBaseUrl();

/**
 * Get a valid session with automatic refresh if needed
 * This function ensures we always have a fresh, valid token
 */
export async function getValidSessionWithRefresh(): Promise<any | null> {
  try {
    // First, try to get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('Session fetch error:', sessionError.message);
      return null;
    }
    
    if (!session || !session.access_token || !session.user) {
      console.log('No valid session found');
      return null;
    }
    
    // Check if token is expired or about to expire (5 minute buffer)
    if (session.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      const buffer = 5 * 60; // 5 minutes in seconds
      
      if (session.expires_at <= (now + buffer)) {
        console.log('Token is expired or expiring soon, attempting refresh...');
        
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.warn('Session refresh failed:', refreshError.message);
          return null;
        }
        
        if (!refreshedSession || !refreshedSession.access_token) {
          console.warn('Session refresh returned no valid session');
          return null;
        }
        
        console.log('✅ Session refreshed successfully');
        return refreshedSession;
      }
    }
    
    // Session is valid and not expiring soon
    return session;
    
  } catch (error) {
    console.warn('Error in getValidSessionWithRefresh:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Create timeout using Promise.race instead of AbortSignal for better compatibility
function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

// Check if server is healthy
export async function checkServerHealth(): Promise<{ healthy: boolean; details?: any }> {
  try {
    console.log('🏥 Checking server health...');
    console.log('🔗 Health endpoint URL:', `${serverUrl}/make-server-70df0d6e/health`);
    
    const healthPromise = fetch(`${serverUrl}/make-server-70df0d6e/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Use Promise.race for timeout instead of AbortSignal
    const response = await Promise.race([
      healthPromise,
      createTimeoutPromise(8000)
    ]);
    
    console.log('🏥 Health check response status:', response.status);
    
    if (!response.ok) {
      console.log('❌ Server health check failed:', response.status, response.statusText);
      return { healthy: false, details: { status: response.status, statusText: response.statusText } };
    }
    
    const healthData = await response.json();
    console.log('✅ Server health check successful:', healthData);
    return { healthy: true, details: healthData };
    
  } catch (error) {
    console.log('❌ Server health check error:', error);
    return { 
      healthy: false, 
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        serverUrl: serverUrl,
        fullEndpoint: `${serverUrl}/make-server-70df0d6e/health`
      }
    };
  }
}

// Check general network connectivity
export async function checkNetworkConnectivity(): Promise<{ connected: boolean; details?: any }> {
  try {
    console.log('Checking network connectivity...');
    
    // Try to fetch a simple URL with a short timeout
    const connectivityPromise = fetch('https://httpbin.org/get', {
      method: 'GET',
      mode: 'cors'
    });
    
    const response = await Promise.race([
      connectivityPromise,
      createTimeoutPromise(5000)
    ]);
    
    if (response.ok) {
      console.log('Network connectivity confirmed');
      return { connected: true };
    } else {
      console.log('Network connectivity issue:', response.status);
      return { connected: false, details: { status: response.status, statusText: response.statusText } };
    }
    
  } catch (error) {
    console.log('Network connectivity check failed:', error);
    return { 
      connected: false, 
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    };
  }
}

export async function makeAuthenticatedRequest(
  endpoint: string, 
  options: RequestInit = {},
  retryCount = 0
): Promise<any> {
  const maxRetries = 2;
  
  try {
    // Don't log verbose details for profile enhancement requests to avoid spam
    const isProfileRequest = endpoint.includes('/users/profile');
    
    if (!isProfileRequest) {
      console.log('=== AUTHENTICATED REQUEST ===');
      console.log('Endpoint:', endpoint);
      console.log('Retry count:', retryCount);
    }
    
    // Get session with automatic refresh if needed
    let session = await getValidSessionWithRefresh();
    
    if (!session) {
      if (!isProfileRequest) console.error('No valid session available after refresh attempts');
      throw new Error('Authentication required: No valid session available');
    }

    const url = `${serverUrl}${endpoint}`;
    if (!isProfileRequest) {
      console.log('Request URL:', url);
      console.log('Authorization token attached:', `Bearer ${session.access_token.substring(0, 20)}...`);
    }
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      }
    };
    
    if (!isProfileRequest) console.log('Making authenticated request with valid session...');
    
    // Detailed logging for bio update debugging
    if (!isProfileRequest) {
      console.log('🔗 Full request details:', {
        url,
        method: requestOptions.method,
        hasAuth: !!requestOptions.headers?.Authorization,
        hasContentType: !!requestOptions.headers?.['Content-Type'],
        bodyLength: requestOptions.body?.length || 0
      });
    }

    // Use Promise.race for timeout
    const fetchPromise = fetch(url, requestOptions);
    const response = await Promise.race([
      fetchPromise,
      createTimeoutPromise(25000)
    ]);
    
    if (!isProfileRequest) {
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorBody = '';
      
      try {
        // Try to get response text first
        const responseText = await response.text();
        if (!isProfileRequest) console.log('Raw response text:', responseText);
        
        if (responseText) {
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorData.message || errorMessage;
            errorBody = responseText;
          } catch (jsonError) {
            // If not JSON, use the text as the error message
            errorMessage = responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText;
            errorBody = responseText;
          }
        }
      } catch (readError) {
        if (!isProfileRequest) console.error('Could not read response body:', readError);
        errorMessage = `HTTP ${response.status}: Could not read response`;
      }
      
      if (!isProfileRequest) {
        console.error('Request failed:', {
          status: response.status,
          message: errorMessage,
          body: errorBody
        });
      }
      
      throw new Error(errorMessage);
    }
    
    let responseData;
    try {
      const responseText = await response.text();
      if (!isProfileRequest) console.log('Response text length:', responseText.length);
      
      if (!responseText) {
        if (!isProfileRequest) console.log('Empty response body, returning empty object');
        return {};
      }
      
      try {
        responseData = JSON.parse(responseText);
        if (!isProfileRequest) console.log('Successfully parsed JSON response');
      } catch (jsonError) {
        if (!isProfileRequest) {
          console.error('JSON parse error:', jsonError);
          console.error('Response text that failed to parse:', responseText.substring(0, 500));
        }
        throw new Error(`Could not parse response as JSON: ${jsonError.message}`);
      }
    } catch (readError) {
      if (!isProfileRequest) console.error('Could not read response:', readError);
      throw new Error('Could not read server response');
    }
    
    if (!isProfileRequest) console.log('Authenticated request completed successfully');
    return responseData;
    
  } catch (error) {
    // Only log verbose errors for non-profile requests
    const isProfileRequest = endpoint.includes('/users/profile');
    
    if (!isProfileRequest) {
      console.error('=== AUTHENTICATION REQUEST ERROR ===');
      console.error('Endpoint:', endpoint);
      console.error('Retry count:', retryCount);
      console.error('Error:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('=====================================');
    }
    
    // Check if we should retry
    if (retryCount < maxRetries) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Don't retry schema initialization errors - let the caller handle them
      if (errorMessage.includes('Database schema initializing') || 
          errorMessage.includes('schema_incomplete') ||
          errorMessage.includes('PGRST205')) {
        throw error;
      }
      
      // Retry on specific error conditions
      if (errorMessage.includes('fetch') || 
          errorMessage.includes('network') || 
          errorMessage.includes('timeout') ||
          errorMessage.includes('Could not parse response') ||
          errorMessage.includes('Could not read') ||
          (error instanceof TypeError && errorMessage.includes('Failed to fetch'))) {
        if (!isProfileRequest) console.log(`Retrying request (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return makeAuthenticatedRequest(endpoint, options, retryCount + 1);
      }
    }
    
    throw error;
  }
}

export async function makePublicRequest(
  endpoint: string, 
  options: RequestInit = {}
) {
  try {
    const fullUrl = `${serverUrl}${endpoint}`;
    console.log('Making public request to:', fullUrl);
    console.log('Server URL base:', serverUrl);
    console.log('Endpoint:', endpoint);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options.headers
    };

    console.log('Request headers:', headers);

    const fetchPromise = fetch(fullUrl, {
      ...options,
      headers
    });

    // Use Promise.race for timeout
    const response = await Promise.race([
      fetchPromise,
      createTimeoutPromise(12000)
    ]);

    console.log('Public request response status:', response.status);
    console.log('Public request response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorDetails;
      let responseText = '';
      
      try {
        responseText = await response.text();
        console.log('Error response text:', responseText);
        
        if (responseText) {
          try {
            errorDetails = JSON.parse(responseText);
          } catch (parseError) {
            errorDetails = { error: responseText };
          }
        } else {
          errorDetails = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
      } catch (parseError) {
        console.error('Could not read error response:', parseError);
        errorDetails = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      const errorMessage = errorDetails.error || errorDetails.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('Public request failed with error:', errorMessage);
      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    console.log('Success response text length:', responseText.length);
    
    if (!responseText) {
      return {};
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Could not parse successful response as JSON:', parseError);
      console.error('Response text:', responseText);
      throw new Error('Invalid JSON response from server');
    }

  } catch (error) {
    console.error('Public request error details:', {
      endpoint,
      serverUrl,
      fullUrl: `${serverUrl}${endpoint}`,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    throw error;
  }
}

export async function makeRequestWithRetry(
  requestFn: () => Promise<any>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      console.warn(`Request attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries) {
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

// User helper functions - defined here to avoid circular imports
interface FrontendUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  coreRealm: 'mirrorcore' | 'embercore' | 'shadowcore' | null;
  subRealm: string | null;
  profileImageUrl: string | null;
  xp: number;
  level: number;
  postCount: number;
  likeCount: number;
  commentCount: number;
  // Removed achievement_ids since the column doesn't exist in the database
  createdAt: string;
  updatedAt: string;
  display_name?: string;
  bio?: string;
  badges?: string[];
  profile?: any;
}

export async function getUserProfile(): Promise<FrontendUser> {
  try {
    const response = await makeAuthenticatedRequest('/make-server-70df0d6e/users/profile');
    
    if (!response.profile) {
      throw new Error('No profile data received from server');
    }

    return response.profile;

  } catch (error) {
    console.log('Error getting user profile (this is normal during initial setup):', error);
    throw error;
  }
}

export async function checkProfileCompletion() {
  try {
    console.log('=== CHECKING PROFILE COMPLETION ===');
    const profile = await getUserProfile();
    console.log('Retrieved profile for completion check:', profile);
    
    const hasBasicInfo = !!(profile.username && profile.username !== 'unknown_user');
    const hasQuizData = !!(profile.coreRealm);
    const hasProfileSetup = !!(profile.profile || (profile.coreRealm && profile.display_name));
    
    const result = {
      hasBasicInfo,
      hasQuizData,
      hasProfileSetup,
      isComplete: hasBasicInfo && hasQuizData && hasProfileSetup,
      profile
    };
    
    console.log('Profile completion status:', result);
    return result;
    
  } catch (error) {
    console.error('=== PROFILE COMPLETION CHECK ERROR ===');
    console.error('Error details:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    
    // Check if this is a database table error - if so, log it appropriately
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('PGRST205') || 
        errorMessage.includes('Could not find the table') ||
        errorMessage.includes('does not exist')) {
      console.log('Database tables not found during profile check - this is normal for new databases.');
    }
    
    console.error('=====================================');
    
    return {
      hasBasicInfo: false,
      hasQuizData: false,
      hasProfileSetup: false,
      isComplete: false,
      profile: null
    };
  }
}

export async function updateUserProfile(updates: Partial<FrontendUser>): Promise<FrontendUser> {
  try {
    console.log('=== UPDATING USER PROFILE ===');
    console.log('Updates to send:', JSON.stringify(updates, null, 2));
    
    const response = await makeAuthenticatedRequest('/make-server-70df0d6e/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    if (!response.profile) {
      console.error('No profile data in response:', response);
      throw new Error('No updated profile data received from server');
    }

    console.log('User profile updated successfully');
    console.log('Updated profile:', response.profile);
    return response.profile;

  } catch (error) {
    console.error('=== USER PROFILE UPDATE ERROR ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Updates that failed:', updates);
    console.error('===================================');
    throw error;
  }
}

export async function updateUserMetadata(updates: any): Promise<FrontendUser> {
  console.warn('updateUserMetadata is deprecated, use updateUserProfile instead');
  return updateUserProfile(updates);
}

// Follow helper functions
export async function followUser(followedUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Following user:', followedUserId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (user.id === followedUserId) {
      return { success: false, error: 'Cannot follow yourself' };
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follow')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('followed_id', followedUserId)
      .maybeSingle();

    if (existingFollow) {
      return { success: false, error: 'Already following this user' };
    }

    // Create follow relationship
    const { error } = await supabase
      .from('follow')
      .insert({
        follower_id: user.id,
        followed_id: followedUserId
      });

    if (error) {
      console.error('Follow error:', error);
      return { success: false, error: error.message };
    }

    console.log('Successfully followed user');
    return { success: true };

  } catch (error) {
    console.error('Follow user error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to follow user' 
    };
  }
}

export async function unfollowUser(followedUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Unfollowing user:', followedUserId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Delete follow relationship
    const { error } = await supabase
      .from('follow')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', followedUserId);

    if (error) {
      console.error('Unfollow error:', error);
      return { success: false, error: error.message };
    }

    console.log('Successfully unfollowed user');
    return { success: true };

  } catch (error) {
    console.error('Unfollow user error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to unfollow user' 
    };
  }
}

export async function isFollowing(userId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('follow')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('followed_id', userId)
      .single();

    return !!data;

  } catch (error) {
    console.error('Check following status error:', error);
    return false;
  }
}

export async function getUserFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  try {
    const { data: user } = await supabase
      .from('profile')
      .select('follower_count, following_count')
      .eq('id', userId)
      .single();

    return {
      followers: user?.follower_count || 0,
      following: user?.following_count || 0
    };

  } catch (error) {
    console.error('Get follow counts error:', error);
    return { followers: 0, following: 0 };
  }
}

export async function getFollowing(userId: string, limit = 50): Promise<any[]> {
  try {
    const { data: relationships } = await supabase
      .from('follow')
      .select(`
        followed_id,
        profile:followed_id (
          id,
          username,
          display_name,
          core_realm,
          follower_count,
          following_count,
          created_at
        )
      `)
      .eq('follower_id', userId)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (!relationships) return [];

    return relationships
      .filter(rel => rel.profile)
      .map(rel => rel.profile);

  } catch (error) {
    console.error('Get following error:', error);
    return [];
  }
}

export async function getFollowers(userId: string, limit = 50): Promise<any[]> {
  try {
    const { data: relationships } = await supabase
      .from('follow')
      .select(`
        follower_id,
        profile:follower_id (
          id,
          username,
          display_name,
          core_realm,
          follower_count,
          following_count,
          created_at
        )
      `)
      .eq('followed_id', userId)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (!relationships) return [];

    return relationships
      .filter(rel => rel.profile)
      .map(rel => rel.profile);

  } catch (error) {
    console.error('Get followers error:', error);
    return [];
  }
}

export async function getUserProfileWithFollowStatus(userId: string): Promise<any | null> {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    const { data: profile } = await supabase
      .from('profile')
      .select(`
        id,
        username,
        display_name,
        core_realm,
        follower_count,
        following_count,
        created_at,
        avatar_url
      `)
      .eq('id', userId)
      .single();

    if (!profile) return null;

    // Check if current user is following this profile
    let isFollowing = false;
    if (currentUser && currentUser.id !== userId) {
      const { data: followData } = await supabase
        .from('follow')
        .select('follower_id')
        .eq('follower_id', currentUser.id)
        .eq('followed_id', userId)
        .single();
      
      isFollowing = !!followData;
    }

    return {
      ...profile,
      isFollowing,
      isOwnProfile: currentUser?.id === userId
    };

  } catch (error) {
    console.error('Get user profile with follow status error:', error);
    return null;
  }
}