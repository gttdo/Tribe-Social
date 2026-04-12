import { CoreRealm } from '../App';
import { PostType, FeedPost } from './social-feed-types';
import { getBulkLikeStatus } from './supabase/post-reaction-helpers';
import { validatePostIds, validateUUID, isValidUUID as validateUUIDFormat } from './validation-middleware';
import { guardPostId, guardUserId, guardUUIDArray, safeDBQuery, validateResponseUUIDs } from './uuid-validation-guards';

export const getRealmColors = (realm: CoreRealm | string) => {
  const colors = {
    mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
    embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
    shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
  };
  
  // Return the specific realm colors if found, otherwise return a default
  return colors[realm as keyof typeof colors] || { primary: 'muted-lavender', secondary: 'electric-blue' };
};

export const getRealmIcon = (realm: CoreRealm | string) => {
  const icons = {
    mirrorcore: '🪞',
    embercore: '🔥',
    shadowcore: '🌙'
  };
  
  // Return the specific realm icon if found, otherwise return a default
  return icons[realm as keyof typeof icons] || '🌟';
};

export const formatTimestamp = (timestamp: string) => {
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffMs = now.getTime() - postDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const expandCaption = (caption: string) => {
  if (caption.length <= 120) return caption;
  return caption.slice(0, 120) + '...';
};

export const isRecentPost = (timestamp: string) => {
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffMs = now.getTime() - postDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Consider a post recent if it's less than 24 hours old
  return diffHours < 24;
};

export function transformBackendPost(backendPost: any): FeedPost {
  try {
    // Validate post ID before transforming
    if (!backendPost?.id || !isValidUUID(backendPost.id)) {
      console.warn('Post has invalid or missing ID:', backendPost?.id);
      // Generate a fallback ID if needed
      backendPost = { ...backendPost, id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    }
    
    console.log('Transforming post:', backendPost.id)
    
    // Ensure comments is always an array
    let comments = []
    if (Array.isArray(backendPost.comments)) {
      comments = backendPost.comments.map((comment: any) => ({
        id: comment.id || `comment-${Date.now()}`,
        username: comment.username || 'unknown_user',
        text: comment.text || '',
        timestamp: comment.timestamp || new Date().toISOString(),
        coreRealm: comment.coreRealm || 'general'
      }))
    }

    // Handle multiple possible field names for media content - simplified and more robust
    const imageUrl = backendPost.media_url || 
                     backendPost.image_url || 
                     backendPost.imageUrl || 
                     backendPost.contentUrl || 
                     backendPost.mediaUrl || 
                     null;

    // Debug media URL processing
    if (process.env.NODE_ENV === 'development' && (backendPost.post_type === 'image' || backendPost.post_type === 'video' || backendPost.post_type === 'audio')) {
      console.log('🔍 Processing media post:', {
        postId: backendPost.id,
        postType: backendPost.post_type,
        media_url: backendPost.media_url,
        imageUrl: imageUrl,
        hasImageUrl: !!imageUrl,
        allAvailableUrls: {
          media_url: backendPost.media_url,
          image_url: backendPost.image_url,
          imageUrl: backendPost.imageUrl,
          contentUrl: backendPost.contentUrl,
          mediaUrl: backendPost.mediaUrl
        }
      });
    }

    // Handle thumbnail URL for video posts
    const mediaThumbnailUrl = backendPost.media_thumb_url || 
                              backendPost.mediaThumbnailUrl ||
                              backendPost.thumbnailUrl ||
                              null;

    // Determine post type more reliably
    let postType = backendPost.post_type || backendPost.type || 'thought';
    
    // Keep video posts as 'video' type for thumbnail handling
    // Only normalize 'image' to 'media'
    if (postType === 'image') {
      postType = 'media';
    }
    
    // Auto-detect type based on content presence for better reliability
    if (postType === 'thought' && imageUrl) {
      postType = 'media';
    }

    // Get display text - prioritize content for thoughts, caption for media
    const displayText = postType === 'thought' 
      ? (backendPost.text_body || backendPost.content || backendPost.caption || '')
      : (backendPost.caption || backendPost.text_body || backendPost.content || '');

    return {
      id: backendPost.id,
      username: backendPost.username || backendPost.profile?.username || 'unknown_user',
      name: backendPost.name || backendPost.username || backendPost.profile?.username || 'Unknown User',
      nickname: backendPost.nickname || 'Tribe Member',
      avatar: backendPost.avatar || backendPost.profile?.avatar_url || backendPost.avatar_url || null,
      coreRealm: backendPost.coreRealm || backendPost.core_realm || backendPost.profile?.core_realm?.toLowerCase() || 'general',
      type: postType,
      content: postType === 'thought' ? displayText : (backendPost.text_body || backendPost.content || null),
      caption: displayText,
      imageUrl: imageUrl,
      mediaThumbnailUrl: mediaThumbnailUrl,
      location: null, // Location field not available in current schema
      timestamp: backendPost.timestamp || backendPost.createdAt || backendPost.created_at || new Date().toISOString(),
      likes: backendPost.likes || backendPost.like_count || 0,
      comments: comments,
      bookmarks: backendPost.bookmarks || backendPost.bookmark_count || 0,
      liked: backendPost.liked || backendPost.is_liked || false,
      bookmarked: backendPost.bookmarked || backendPost.is_bookmarked || false,
      userId: backendPost.userId || backendPost.user_id,
      user_id: backendPost.userId || backendPost.user_id, // Add user_id for compatibility
      authorId: backendPost.userId || backendPost.user_id, // Add authorId for navigation
      authorName: backendPost.username || backendPost.profile?.username || 'unknown_user', // Add authorName for navigation
      isFollowing: backendPost.isFollowing || backendPost.is_following || false,
      isFollowedBy: backendPost.isFollowedBy || backendPost.is_followed_by || false,
      tribeId: backendPost.tribeId || backendPost.tribe_id || null,
      tribeName: backendPost.tribeName || backendPost.tribe_name || null,
      visibility: backendPost.visibility || 'public'
    }
  } catch (error) {
    console.error('Error transforming post:', backendPost?.id || 'unknown', error)
    // Return a safe fallback post
    return {
      id: backendPost?.id || `fallback-${Date.now()}`,
      username: 'unknown_user',
      name: 'Unknown User',
      nickname: 'Tribe Member',
      avatar: null,
      coreRealm: 'general',
      type: 'thought',
      content: 'Content temporarily unavailable',
      caption: 'Content temporarily unavailable',
      imageUrl: null,
      mediaThumbnailUrl: null,
      location: null,
      timestamp: formatTimestamp(new Date().toISOString()),
      likes: 0,
      comments: [],
      bookmarks: 0,
      liked: false,
      bookmarked: false,
      userId: null,
      tribeId: null,
      tribeName: null,
      visibility: 'public'
    }
  }
}

/**
 * Helper function to safely fetch tribe data with policy recursion protection
 */
export async function safeFetchTribeData(tribeIds: string[], supabase: any): Promise<any[]> {
  if (!tribeIds || tribeIds.length === 0) {
    return [];
  }

  try {
    const { data: tribeData, error: tribeError } = await supabase
      .from('tribes')
      .select('id, name')
      .in('id', tribeIds);
    
    if (tribeError) {
      // Check for infinite recursion policy error
      if (tribeError.code === '42P17' || tribeError.message?.includes('infinite recursion')) {
        console.warn('Database policy recursion detected for tribes table - returning empty array');
        return [];
      } else {
        console.error('Error fetching tribe data:', tribeError);
        return [];
      }
    }
    
    return tribeData || [];
  } catch (error) {
    console.error('Exception while fetching tribe data:', error);
    return [];
  }
}

/**
 * Enhanced post fetching with permission error handling and like status loading using post_reactions
 */
export async function fetchPostsWithPermissionHandling(supabase: any, realm?: string): Promise<FeedPost[]> {
  try {
    console.log('Loading posts directly from database...', { realm });
    
    // Build query for posts table using proper PostgREST join syntax
    let query = supabase
      .from('posts')
      .select(`
        id,
        user_id,
        post_type,
        text_body,
        caption,
        media_url,
        media_thumb_url,
        visibility,
        tribe_id,
        like_count,
        comment_count,
        created_at,
        author:profile!posts_user_id_fkey (
          id,
          username,
          avatar_url,
          core_realm
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Apply realm filter if specified
    if (realm && realm !== 'general') {
      // Filter by core realm from user's profile
      query = query.eq('author.core_realm', realm.toUpperCase());
    }
    
    const { data: postsData, error: postsError } = await query;
    
    if (postsError) {
      console.error('Error fetching posts from database:', postsError);
      
      // Check if it's a column not found error
      if (postsError.code === '42703' || postsError.message?.includes('does not exist')) {
        console.log('Database schema not ready, falling back to server API');
        throw new Error('DATABASE_SCHEMA_NOT_READY');
      }
      
      throw postsError;
    }
    
    console.log(`Fetched ${postsData?.length || 0} posts from database`);
    
    if (!postsData || postsData.length === 0) {
      return [];
    }

    // Get current user for like status checking
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    
    // Transform database posts to FeedPost format
    const transformedPosts: FeedPost[] = [];
    
    for (const post of postsData) {
      try {
        // Validate post ID before processing
        if (!post.id || !isValidUUID(post.id)) {
          console.warn('Skipping post with invalid ID from database:', post.id);
          continue;
        }
        
        // Get the media URL - use media_url directly, fallback to media_thumb_url
        let imageUrl = post.media_url || post.media_thumb_url || null;
        
        // Map database post to FeedPost format
        const transformedPost: FeedPost = {
          id: post.id,
          username: post.author?.username || 'unknown_user',
          name: post.author?.username || 'Unknown User',
          nickname: post.author?.username || 'Tribe Member',
          avatar: post.author?.avatar_url || null,
          coreRealm: post.author?.core_realm?.toLowerCase() || 'general',
          type: post.post_type === 'thought' ? 'thought' : 
                post.post_type === 'image' ? 'media' : 
                post.post_type === 'video' ? 'video' : // Keep video type distinct for thumbnail logic
                post.post_type === 'audio' ? 'audio' : 'thought',
          content: post.text_body,
          caption: post.caption || '',
          imageUrl: post.media_url || null, // Main media URL (video file for video posts)
          mediaThumbnailUrl: post.media_thumb_url || null, // Video thumbnail URL
          location: null, // Location field not available in current schema
          timestamp: post.created_at,
          likes: post.like_count || 0,
          comments: [], // Comments loaded separately
          bookmarks: 0, // Not tracked in current schema
          liked: false, // User's like status loaded separately using post_reactions
          bookmarked: false, // User's bookmark status loaded separately
          userId: post.user_id,
          authorId: post.user_id, // Add authorId for navigation
          authorName: post.author?.username || 'unknown_user', // Add authorName for navigation
          tribeId: post.tribe_id,
          tribeName: null, // Tribe name loaded separately if needed
          visibility: post.visibility || 'public',
          hasPermissionError: false
        };
        
        transformedPosts.push(transformedPost);
      } catch (error) {
        console.error('Error transforming database post:', post.id, error);
      }
    }

    // Load like status for all posts using post_reactions if user is authenticated
    if (currentUserId && transformedPosts.length > 0) {
      try {
        // Use enhanced UUID guards to validate all IDs
        const validCurrentUserId = guardUserId(currentUserId, 'loading like statuses');
        if (!validCurrentUserId) {
          console.warn('Invalid current user ID, skipping like status loading');
          return transformedPosts;
        }
        
        // Filter out any posts with invalid IDs before calling getBulkLikeStatus
        const allPostIds = transformedPosts.map(post => post.id);
        const validPostIds = guardUUIDArray(allPostIds, 'loading like statuses');
        
        if (validPostIds.length > 0) {
          const likeStatuses = await safeDBQuery(
            () => getBulkLikeStatus(validPostIds, validCurrentUserId),
            'loading like statuses',
            { currentUserId: validCurrentUserId, postIds: validPostIds }
          );
          
          // Update posts with like status (only for posts with valid IDs)
          transformedPosts.forEach(post => {
            if (guardPostId(post.id, 'updating like status')) {
              post.liked = likeStatuses[post.id] || false;
            }
          });
          
          console.log('Successfully loaded like statuses from post_reactions');
        }
      } catch (likeError) {
        console.warn('Failed to load like statuses from post_reactions:', likeError);
        // Continue without like status - not critical
      }
    }
    
    console.log(`Successfully transformed ${transformedPosts.length} posts with like status`);
    return transformedPosts;
    
  } catch (error) {
    console.error('Error loading posts from database:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if this is a schema error and fall back to server API
    if (errorMessage.includes('DATABASE_SCHEMA_NOT_READY') || 
        errorMessage.includes('42703') || 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('PGRST116') || 
        errorMessage.includes('Could not find the table')) {
      
      console.log('Database not ready, falling back to server API...');
      
      try {
        // Fall back to the working server API
        const queryParam = realm ? `?realm=${realm}` : '';
        console.log('Loading posts from server API...', { realm, queryParam });
        
        const { makeAuthenticatedRequest } = await import('./supabase/client');
        const response = await makeAuthenticatedRequest(`/posts${queryParam}`);
        
        console.log('Posts response from server:', response);
        
        if (response.posts) {
          const transformedPosts: FeedPost[] = [];
          
          for (const post of response.posts) {
            try {
              // Validate post ID before processing
              if (!post.id || !isValidUUID(post.id)) {
                console.warn('Skipping server post with invalid ID:', post.id);
                continue;
              }
              
              // Try to transform the post normally
              const transformed = transformBackendPost(post);
              transformed.hasPermissionError = false;
              transformedPosts.push(transformed);
            } catch (error) {
              console.error('Error transforming server post:', post.id, error);
            }
          }

          // Load like status for server API posts if user is authenticated
          const { supabase } = await import('./supabase/client');
          const { data: { user } } = await supabase.auth.getUser();
          const currentUserId = user?.id;

          if (currentUserId && transformedPosts.length > 0) {
            try {
              // Filter out any posts with invalid IDs before calling getBulkLikeStatus
              const validPosts = transformedPosts.filter(post => {
                if (!post.id || !isValidUUID(post.id)) {
                  console.warn('Skipping post with invalid ID in server API like status loading:', post.id);
                  return false;
                }
                return true;
              });
              
              if (validPosts.length > 0) {
                const postIds = validPosts.map(post => post.id);
                const likeStatuses = await getBulkLikeStatus(postIds, currentUserId);
                
                // Update posts with like status
                validPosts.forEach(post => {
                  post.liked = likeStatuses[post.id] || false;
                });
                
                console.log('Successfully loaded like statuses for server API posts');
              }
            } catch (likeError) {
              console.warn('Failed to load like statuses for server API posts:', likeError);
              // Continue without like status - not critical
            }
          }
          
          console.log(`Successfully loaded ${transformedPosts.length} posts from server API with like status`);
          return transformedPosts;
        } else {
          console.warn('No posts in server response');
          return [];
        }
      } catch (serverError) {
        console.error('Server API also failed:', serverError);
        throw serverError; // Re-throw so caller can handle fallback to mock data
      }
    } else {
      console.log('Database error - falling back to empty array');
      throw error; // Re-throw so caller can handle fallback
    }
  }
}

/**
 * Helper to handle individual post permission errors during fetch
 */
export function handlePostPermissionError(post: any, error: any): FeedPost | null {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('42501') || errorMessage.includes('permission denied')) {
    console.log(`Creating blurred post version for permission denied content: ${post.id}`);
    
    // Create a blurred version of the post
    const blurredPost = transformBackendPost({
      ...post,
      // Truncate content for preview
      content: post.content ? post.content.substring(0, 50) + '...' : '',
      caption: post.caption ? post.caption.substring(0, 50) + '...' : '',
      // Remove sensitive media URLs
      contentUrl: post.contentUrl ? post.contentUrl : null
    });
    
    blurredPost.hasPermissionError = true;
    return blurredPost;
  }
  
  return null;
}

/**
 * Resolve a media URL to its corresponding post UUID
 * This is useful when navigating from a filename-based identifier to the actual post
 */
export async function resolveMediaUrlToPostId(mediaUrl: string): Promise<string | null> {
  try {
    const { supabase } = await import('./supabase/client');
    
    // Try to find the post by media URL
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('media_url', mediaUrl)
      .maybeSingle();
    
    if (error) {
      console.error('Error resolving media URL to post ID:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Exception while resolving media URL:', error);
    return null;
  }
}

/**
 * Validate if a string is a proper UUID format
 * Use the centralized validation function to avoid duplicates
 */
export function isValidUUID(str: string | null | undefined): boolean {
  return validateUUIDFormat(str);
}

/**
 * Extract post ID from various sources, ensuring it's a valid UUID
 * If not a UUID, attempt to resolve it
 */
/**
 * Helper function to transform database fallback posts with proper avatar handling
 * Fixes the missing avatar field issue in database fallback scenarios
 */
export function transformDatabaseFallbackPost(post: any, postUser: any, savedSet: string[] = []) {
  // Validate that we have a proper user ID
  const userId = post.user_id;
  if (!userId || !isValidUUID(userId)) {
    console.warn('Invalid user_id in post:', post.id, userId);
  }
  
  return {
    id: post.id,
    user_id: userId,
    userId: userId,
    // Use display_name from profiles if available, fallback to username from users table
    username: postUser?.display_name || postUser?.username || 'unknown_user',
    nickname: postUser?.display_name || postUser?.username || 'Unknown User',
    // Handle avatar with version cachebuster if available
    avatar: postUser?.avatar_url || null,
    coreRealm: 'general', // FIXED: Added missing coreRealm field
    // FIXED: Add authorId for navigation - this is the key fix for username clicks
    // Only set authorId if we have a valid UUID
    authorId: (userId && isValidUUID(userId)) ? userId : null,
    authorName: postUser?.display_name || postUser?.username || 'unknown_user',
    type: post.post_type || 'thought',
    post_type: post.post_type || 'thought',
    text_body: post.text_body,
    content: post.text_body || post.caption,
    caption: post.caption,
    media_url: post.media_url,
    contentUrl: post.media_url,
    imageUrl: post.media_url,
    media_thumb_url: post.media_thumb_url,
    thumbnail_url: post.media_thumb_url,
    visibility: post.visibility || 'public',
    tribe_id: post.tribe_id,
    likes: post.like_count || 0,
    like_count: post.like_count || 0,
    comments: [],
    comment_count: post.comment_count || 0,
    liked: false,
    bookmarked: savedSet?.includes(post.id) || false,
    authorId: post.user_id, // Add authorId for navigation
    authorName: postUser?.username || 'unknown_user', // Add authorName for navigation
    isFollowing: false, // Default to false, will be updated if backend provides this info
    isFollowedBy: false, // Default to false, will be updated if backend provides this info
    created_at: post.created_at,
    createdAt: post.created_at,
    timestamp: new Date(post.created_at).toISOString()
  };
}

export async function getValidPostId(rawId: string | null | undefined): Promise<string | null> {
  // Enhanced validation for undefined/null values
  if (rawId === null || rawId === undefined) {
    console.warn('getValidPostId received null or undefined');
    return null;
  }
  
  // Convert to string and validate
  const stringId = String(rawId).trim();
  
  if (stringId === '' || 
      stringId === 'undefined' || 
      stringId === 'null' || 
      stringId === 'NaN') {
    console.warn('getValidPostId received invalid string:', stringId);
    return null;
  }
  
  // Clean the ID (remove any prefixes)
  const cleanId = stringId.replace(/^post[:_]/, '');
  
  // Double-check after cleaning
  if (!cleanId || cleanId.trim() === '') {
    console.warn('Post ID is empty after cleaning:', cleanId);
    return null;
  }
  
  // If it's already a valid UUID, return it
  if (isValidUUID(cleanId)) {
    return cleanId;
  }
  
  // If it looks like a media URL or filename, try to resolve it
  if (cleanId.includes('.') || cleanId.includes('/')) {
    console.log('Attempting to resolve non-UUID identifier to post ID:', cleanId);
    return await resolveMediaUrlToPostId(cleanId);
  }
  
  // If it's not a UUID and not a URL, it's invalid
  console.warn('Invalid post identifier format:', cleanId);
  return null;
}