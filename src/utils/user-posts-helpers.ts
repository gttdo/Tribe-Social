/**
 * User posts utility functions with comprehensive UUID validation and auth guards
 */

import { supabase } from './supabase/client';
import { isUuid } from './uuid';
import { withUserGuard, fetchUserPostsSafely } from './auth-guards';

// UUID validation pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates a user ID to ensure it's a proper UUID
 * @param userId - The user ID to validate
 * @param context - Optional context for logging
 * @returns Validated UUID string or null if invalid
 */
export function validateUserId(userId: unknown, context = 'User ID validation'): string | null {
  // Check for undefined, null, or falsy values first
  if (!userId) {
    console.warn(`[${context}] User ID is falsy:`, userId);
    return null;
  }
  
  // Must be a string
  if (typeof userId !== 'string') {
    console.warn(`[${context}] User ID is not a string:`, typeof userId, userId);
    return null;
  }
  
  // Check for literal string values that would cause database errors
  const problematicValues = ['undefined', 'null', 'NaN', '', 'false', '0'];
  if (problematicValues.includes(userId)) {
    console.warn(`[${context}] User ID is problematic value:`, userId);
    return null;
  }
  
  const trimmedId = userId.trim();
  
  // Check empty string after trim or still problematic
  if (!trimmedId || problematicValues.includes(trimmedId)) {
    console.warn(`[${context}] User ID is invalid after trim:`, userId, 'trimmed:', trimmedId);
    return null;
  }
  
  // Validate UUID format using more strict pattern
  if (!UUID_PATTERN.test(trimmedId)) {
    console.warn(`[${context}] User ID has invalid UUID format:`, trimmedId);
    return null;
  }
  
  // Additional check - ensure it's not a common invalid UUID
  const invalidUUIDs = [
    '00000000-0000-0000-0000-000000000000',
    'undefined-undefined-undefined-undefined',
    'null-null-null-null'
  ];
  
  if (invalidUUIDs.includes(trimmedId.toLowerCase())) {
    console.warn(`[${context}] User ID is invalid UUID:`, trimmedId);
    return null;
  }
  
  console.log(`[${context}] User ID validated successfully:`, trimmedId);
  return trimmedId;
}

/**
 * Resolves user ID from username if needed
 * @param params - Either userId or username
 * @returns Promise<string | null>
 */
export async function resolveUserId(params: { userId?: string; username?: string }): Promise<string | null> {
  const { userId, username } = params;
  
  // First try to validate the provided userId
  if (userId) {
    const validatedId = validateUserId(userId, 'Resolve user ID from userId');
    if (validatedId) {
      return validatedId;
    }
  }
  
  // If no valid userId but we have a username, resolve it
  if (username) {
    console.log('Resolving user ID from username:', username);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      
      if (error) {
        console.error('Error resolving username to ID:', error);
        return null;
      }
      
      if (!data?.id) {
        console.warn('No user found for username:', username);
        return null;
      }
      
      const resolvedId = validateUserId(data.id, 'Resolve user ID from username result');
      return resolvedId;
    } catch (error) {
      console.error('Exception resolving username to ID:', error);
      return null;
    }
  }
  
  console.warn('No valid userId or username provided for resolution');
  return null;
}

/**
 * Fetches posts for a specific user with comprehensive validation
 * @param params - User identification parameters
 * @returns Promise<any[]>
 */
export async function fetchUserPosts(params: { userId?: string; username?: string }): Promise<any[]> {
  console.log('Fetching user posts with params:', params);
  
  // Resolve and validate user ID
  const validatedUserId = await resolveUserId(params);
  
  if (!validatedUserId) {
    console.warn('Cannot fetch posts - no valid user ID resolved from params:', params);
    return [];
  }
  
  console.log('Fetching posts for validated user ID:', validatedUserId);
  
  // Use auth guard to safely fetch posts
  const posts = await fetchUserPostsSafely(validatedUserId);
  
  if (!posts) {
    console.warn('Auth guard returned null for posts fetch');
    return [];
  }
  
  // Validate post IDs before returning
  const validPosts = posts.filter(post => {
    if (!post || typeof post !== 'object') {
      console.warn('Invalid post object:', post);
      return false;
      }
      
      if (!validateUserId(post.id, 'Post ID validation')) {
        console.warn('Post has invalid ID:', post.id);
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ Fetched ${validPosts.length}/${posts.length} valid posts for user:`, validatedUserId);
    return validPosts;
}

/**
 * Formats posts for frontend consumption with proper thumbnail URL logic
 * @param posts - Raw posts from database
 * @param userInfo - User information for the posts  
 * @returns Formatted posts
 */
export function formatPostsForFrontend(posts: any[], userInfo?: { username?: string; nickname?: string }): any[] {
  return posts.map(post => {
    // Implement flexible thumbnail URL logic - check multiple fields in order
    const thumbUrl = 
      post.media_thumb_url ||
      post.thumbnail_url ||
      post.contentUrl ||
      post.media_url ||
      null;

    const hasImageUrl = !!thumbUrl; // Don't rely on file extensions

    return {
      id: post.id,
      type: post.post_type || post.type || 'thought',
      content: post.text_body || post.content,
      caption: post.caption || post.text_body || post.content,
      thumbnail_url: thumbUrl,
      media_thumb_url: post.media_thumb_url,
      media_urls: post.media_url ? [post.media_url] : (post.media_urls || []),
      contentUrl: post.media_url || post.contentUrl,
      hasImageUrl, // Helper flag for components
      visibility: post.visibility || 'public',
      tribe_id: post.tribe_id,
      tribeName: post.tribeName,
      created_at: post.created_at || post.createdAt,
      createdAt: post.created_at || post.createdAt,
      user_id: post.user_id || post.userId,
      username: userInfo?.username || post.username || 'unknown',
      nickname: userInfo?.nickname || userInfo?.username || post.nickname || post.username || 'User',
      likes: post.like_count || post.likes || 0,
      comments: post.comment_count || post.comments || 0,
      liked: post.liked || false,
      bookmarked: post.bookmarked || false,
      location: post.location
    };
  });
}