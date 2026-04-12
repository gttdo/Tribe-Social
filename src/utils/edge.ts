// utils/edge.ts
import { supabase } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';

const FN_NAME = 'make-server-70df0d6e';

export async function callFn(path: string, init: RequestInit = {}, providedSession?: any) {
  try {
    let session = providedSession;
    
    // Only do session validation if no session was provided
    if (!session) {
      // Use session sync for better reliability
      const { getValidSession } = await import('./session-sync');
      session = await getValidSession();
      
      // If session sync fails, try direct supabase session check
      if (!session || !session.access_token) {
        console.log('📡 Session sync failed, trying direct supabase session...');
        try {
          const { data: { session: directSession } } = await supabase.auth.getSession();
          if (directSession && directSession.access_token) {
            session = directSession;
            console.log('📡 Direct session check successful');
          } else {
            throw new Error('Authentication required');
          }
        } catch (directError) {
          console.log('📡 Direct session check also failed:', directError);
          throw new Error('Authentication required');
        }
      }
    } else {
      console.log('📡 callFn: Using provided session');
    }

    // Check if projectId is available
    if (!projectId) {
      // Silent failure for config issues
      throw new Error('Edge functions not configured');
    }

    const url = `https://${projectId}.supabase.co/functions/v1/${FN_NAME}${path}`;

    // Add timeout to detect network issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout

    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: publicAnonKey,
        ...(init.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Edge function not deployed');
      } else if (res.status === 401) {
        throw new Error('Authentication failed');
      } else {
        throw new Error('Edge function unavailable');
      }
    }
    
    const result = await res.json();
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    // Categorize errors for silent handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('fetch')) {
      throw new Error('Network unavailable');
    }
    
    throw error;
  }
}

// convenience wrappers - using simple function declarations for better compatibility
export async function getUnreadCount() {
  // Temporarily disabled in production to avoid CORS errors from edge functions.
  // We return 0 immediately and avoid any network calls.
  return { count: 0 };
}

export async function getFeed() {
  console.log('📡 getFeed: Starting feed fetch via Edge Function');
  
  try {
    // Use the edge function with proper authentication
    const result = await callFn('/posts');
    console.log('📡 getFeed: Edge function success:', result?.posts?.length || 0, 'posts');
    return result;
  } catch (error) {
    // Better error logging for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('📡 getFeed: Edge function error:', errorMessage);
    
    if (errorMessage.includes('Authentication required') || errorMessage.includes('Authentication failed')) {
      console.log('📡 getFeed: Authentication error - rethrowing');
      throw new Error('Authentication required');
    }
    
    // If edge function fails, try the direct database method as fallback
    try {
      console.log('📡 getFeed: Falling back to direct database method');
      const serverApi = await import('../lib/serverApi');
      const result = await serverApi.default();
      console.log('📡 getFeed: Direct database fallback success:', result?.posts?.length || 0, 'posts');
      return result;
    } catch (fallbackError) {
      console.log('📡 getFeed: Both edge function and direct database failed');
      return { posts: [], message: 'Service not available', error: errorMessage };
    }
  }
}

export function getPost(id: string) {
  return callFn(`/posts/${id}`);
}
export const createPost = (body: any) =>
  callFn('/posts', { method: 'POST', body: JSON.stringify(body) });

// Additional notification wrappers
export const getNotifications = (limit = 30, cursor?: string, unreadOnly = false) => {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (cursor) params.append('cursor', cursor);
  if (unreadOnly) params.append('unreadOnly', 'true');
  return callFn(`/notifications?${params.toString()}`);
};

export const markNotificationsRead = (ids: string[]) =>
  callFn('/notifications/read', { method: 'POST', body: JSON.stringify({ ids }) });

export const markAllNotificationsRead = () =>
  callFn('/notifications/read-all', { method: 'POST' });

// Generic Edge API GET helper with optional session parameter
export async function edgeGet<T = any>(path: string, providedSession?: any): Promise<T> {
  try {
    let session = providedSession;
    
    // Only do session sync if no session was provided
    if (!session) {
      const { getValidSession } = await import('./session-sync');
      session = await getValidSession();
    }
    
    console.log('📡 edgeGet session check:', {
      hasSession: !!session,
      hasToken: !!session?.access_token,
      sessionSource: providedSession ? 'provided' : 'session-sync',
      userEmail: session?.user?.email?.substring(0, 3) + '***' || 'no email',
      tokenLength: session?.access_token?.length || 0
    });
    
    if (!session || !session.access_token) {
      console.error('📡 edgeGet: No valid session or access token available');
      throw new Error('Authentication required');
    }

    const url = `https://${projectId}.supabase.co/functions/v1/${FN_NAME}${path}`;
    
    console.log('📡 edgeGet request:', {
      url: url,
      hasAuthHeader: true,
      tokenPrefix: session.access_token.substring(0, 20) + '...'
    });

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': publicAnonKey,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 edgeGet response:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    });

    if (!res.ok) {
      // Try to get error details from response
      let errorBody = '';
      try {
        errorBody = await res.text();
        console.error('📡 edgeGet error response body:', errorBody);
      } catch (e) {
        console.warn('📡 Could not read error response body');
      }

      if (res.status === 404) {
        throw new Error('Edge function not deployed');
      } else if (res.status === 401) {
        throw new Error(`Authentication failed: ${errorBody || res.statusText}`);
      } else {
        throw new Error(`Edge function unavailable: ${res.status} ${errorBody || res.statusText}`);
      }
    }
    
    const result = await res.json();
    console.log('📡 edgeGet success:', {
      resultType: Array.isArray(result) ? 'array' : typeof result,
      resultLength: Array.isArray(result) ? result.length : 'n/a'
    });
    return result;
  } catch (error) {
    // Log the full error for debugging
    console.error('📡 edgeGet error:', error);
    
    // Categorize errors for silent handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('fetch')) {
      throw new Error('Network unavailable');
    }
    
    throw error;
  }
}

// User profile wrappers
export const getUserProfile = () => callFn('/users/profile');
export const updateUserProfile = (updates: any) =>
  callFn('/users/profile', { method: 'PATCH', body: JSON.stringify(updates) });

// Post management wrappers - using proper validation
export const getUserPosts = (userId: string) => {
  if (!userId || userId === 'undefined' || userId.trim() === '') {
    throw new Error('Invalid userId provided to getUserPosts');
  }
  return edgeGet(`/users/${userId}/posts`);
};
export const getUserStats = (userId: string) => {
  if (!userId || userId === 'undefined' || userId.trim() === '') {
    throw new Error('Invalid userId provided to getUserStats');
  }
  return edgeGet(`/users/${userId}/stats`);
};
export const togglePostBookmark = async (postId: string) => {
  try {
    return await callFn(`/posts/${postId}/bookmark`, { method: 'POST' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Network unavailable') ||
        errorMessage.includes('Edge function not deployed') || 
        errorMessage.includes('Edge functions not configured') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Request timeout')) {
      throw new Error('Feature requires server deployment');
    }
    throw error;
  }
};
export const togglePostLike = async (postId: string) => {
  try {
    return await callFn(`/posts/${postId}/like`, { method: 'POST' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Network unavailable') ||
        errorMessage.includes('Edge function not deployed') || 
        errorMessage.includes('Edge functions not configured') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Request timeout')) {
      throw new Error('Feature requires server deployment');
    }
    throw error;
  }
};

// Comments wrappers
export const getPostComments = (postId: string) => callFn(`/posts/${postId}/comments`);
export const createComment = (postId: string, content: string) =>
  callFn(`/posts/${postId}/comments`, { 
    method: 'POST', 
    body: JSON.stringify({ content }) 
  });

// Post deletion wrapper
export const deletePost = async (postId: string, userId: string) => {
  try {
    return await callFn(`/posts/${postId}/force-delete`, { 
      method: 'DELETE', 
      body: JSON.stringify({ 
        userId,
        reason: 'User_requested_deletion'
      })
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Network unavailable') ||
        errorMessage.includes('Edge function not deployed') || 
        errorMessage.includes('Edge functions not configured') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Request timeout')) {
      throw new Error('Feature requires server deployment');
    }
    throw error;
  }
};

// Health check wrapper
export const checkHealth = () => callFn('/health');

// Saved posts wrapper with optional session parameter
export const getSavedPosts = async (providedSession?: any) => {
  console.log('🔖 getSavedPosts: Starting saved posts fetch');
  
  let session = providedSession;
  if (session) {
    console.log('🔖 getSavedPosts: Using provided session');
  } else {
    // Fallback to session sync if no session provided
    const { getValidSession } = await import('./session-sync');
    session = await getValidSession();
    
    if (!session || !session.access_token) {
      console.log('🔖 getSavedPosts: No valid session, aborting request');
      throw new Error('Authentication required');
    }
    
    console.log('🔖 getSavedPosts: Session verified via session sync');
  }
  
  try {
    console.log('🔖 getSavedPosts: Calling Edge API /saved-posts');
    const result = await edgeGet('/saved-posts', session);
    
    console.log('🔖 getSavedPosts: Edge API response received:', {
      type: typeof result,
      isArray: Array.isArray(result),
      length: Array.isArray(result) ? result.length : 'not array',
      keys: result && typeof result === 'object' && !Array.isArray(result) ? Object.keys(result) : 'not object or is array'
    });
    
    return result;
  } catch (error) {
    console.error('🔖 getSavedPosts: Edge API call failed:', error);
    
    // Try to provide a more helpful error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('404') || errorMessage.includes('Edge function not deployed')) {
      console.log('🔖 getSavedPosts: Edge function not available, this might be expected in development');
      throw new Error('Saved posts API not available');
    }
    
    if (errorMessage.includes('Authentication')) {
      console.log('🔖 getSavedPosts: Authentication error');
      throw new Error('Authentication required for saved posts');
    }
    
    throw error;
  }
};

