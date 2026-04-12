import { supabase } from './client';
import { validateUUID, validatePostIds, isValidUUID as validateUUIDFormat } from '../validation-middleware';
import { criticalUUIDCheck, criticalUUIDArrayCheck, criticalDBQuery, validateSupabaseInQuery, validateSupabaseEqQuery } from '../database-query-guards';

/**
 * Check if a user has liked a specific post using post_like table
 */
export async function getUserLikeStatus(postId: string, userId: string): Promise<boolean> {
  try {
    // Validate UUIDs using the validation middleware
    const validPostId = validateUUID(postId);
    const validUserId = validateUUID(userId);
    
    if (!validPostId) {
      console.warn('Invalid post ID provided to getUserLikeStatus:', postId);
      return false;
    }
    
    if (!validUserId) {
      console.warn('Invalid user ID provided to getUserLikeStatus:', userId);
      return false;
    }

    const { data, error } = await supabase
      .from('post_like')
      .select('user_id')
      .eq('post_id', validPostId)
      .eq('user_id', validUserId)
      .maybeSingle();

    if (error) {
      console.error('Error checking like status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Exception checking like status:', error);
    return false;
  }
}

/**
 * Validate if a string is a proper UUID format
 * Use the centralized validation function from validation-middleware
 */
function isValidUUID(str: string | null | undefined): boolean {
  return validateUUID(str) !== null;
}

/**
 * Toggle like status for a post using post_like table
 */
export async function togglePostLike(postId: string, userId: string): Promise<{ liked: boolean; error?: string }> {
  try {
    // Validate UUIDs using the validation middleware
    const validPostId = validateUUID(postId);
    const validUserId = validateUUID(userId);
    
    if (!validPostId) {
      console.warn('Invalid post ID provided to togglePostLike:', postId);
      return { liked: false, error: 'Invalid post ID' };
    }
    
    if (!validUserId) {
      console.warn('Invalid user ID provided to togglePostLike:', userId);
      return { liked: false, error: 'Invalid user ID' };
    }

    // Check if user already liked this post
    const { data: existingReaction, error: checkError } = await supabase
      .from('post_like')
      .select('user_id')
      .eq('post_id', validPostId)
      .eq('user_id', validUserId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing like:', checkError);
      return { liked: false, error: 'Failed to check like status' };
    }

    if (existingReaction) {
      // Unlike: Remove the like
      const { error: deleteError } = await supabase
        .from('post_like')
        .delete()
        .eq('post_id', validPostId)
        .eq('user_id', validUserId);

      if (deleteError) {
        console.error('Error removing like:', deleteError);
        return { liked: false, error: 'Failed to remove like' };
      }

      return { liked: false };
    } else {
      // Like: Add the like
      const { error: insertError } = await supabase
        .from('post_like')
        .insert({
          post_id: validPostId,
          user_id: validUserId,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error adding like:', insertError);
        return { liked: false, error: 'Failed to add like' };
      }

      return { liked: true };
    }
  } catch (error) {
    console.error('Exception toggling like:', error);
    return { liked: false, error: 'Failed to toggle like' };
  }
}

/**
 * Get like status for multiple posts for a specific user
 */
export async function getBulkLikeStatus(postIds: string[], userId: string): Promise<Record<string, boolean>> {
  try {
    if (!postIds || postIds.length === 0) {
      console.log('[getBulkLikeStatus] No post IDs provided');
      return {};
    }

    console.log('[getBulkLikeStatus] Input validation:', { postIds, userId, postIdCount: postIds.length });

    return await criticalDBQuery(
      async () => {
        // Critical validation of all inputs
        const validUserId = criticalUUIDCheck(userId, 'getBulkLikeStatus.userId');
        const validPostIds = criticalUUIDArrayCheck(postIds, 'getBulkLikeStatus.postIds');

        if (validPostIds.length === 0) {
          console.warn('[getBulkLikeStatus] No valid post IDs after critical validation');
          return {};
        }

        console.log('[getBulkLikeStatus] Critical validation passed:', { validUserId, validPostIdCount: validPostIds.length });

        // Validate parameters for Supabase query
        const safeUserId = validateSupabaseEqQuery(validUserId, 'getBulkLikeStatus.eq.user_id');
        const safePostIds = validateSupabaseInQuery(validPostIds, 'getBulkLikeStatus.in.post_id');

        if (safePostIds.length === 0) {
          console.warn('[getBulkLikeStatus] No safe post IDs for Supabase query');
          return {};
        }

        const { data, error } = await supabase
          .from('post_like')
          .select('post_id')
          .eq('user_id', safeUserId)
          .in('post_id', safePostIds);

        if (error) {
          console.error('[getBulkLikeStatus] Supabase error:', error);
          throw error;
        }

        // Convert array to object for easy lookup
        const likedPosts: Record<string, boolean> = {};
        safePostIds.forEach(postId => {
          likedPosts[postId] = false;
        });

        data?.forEach(reaction => {
          if (reaction.post_id && safePostIds.includes(reaction.post_id)) {
            likedPosts[reaction.post_id] = true;
          }
        });

        console.log('[getBulkLikeStatus] Success:', { likedCount: data?.length || 0, totalChecked: safePostIds.length });
        return likedPosts;
      },
      'getBulkLikeStatus',
      { userId, postIds }
    );
  } catch (error) {
    console.error('[getBulkLikeStatus] Critical error:', error);
    return {};
  }
}

/**
 * Get like count for a specific post
 */
export async function getReactionCount(postId: string): Promise<number> {
  try {
    // Validate post ID using the validation middleware
    const validPostId = validateUUID(postId);
    if (!validPostId) {
      console.warn('Invalid post ID provided to getReactionCount:', postId);
      return 0;
    }

    const { count, error } = await supabase
      .from('post_like')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', validPostId);

    if (error) {
      console.error('Error getting reaction count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Exception getting reaction count:', error);
    return 0;
  }
}

/**
 * Get all likes for a specific post
 */
export async function getPostReactions(postId: string): Promise<{ reaction: string; count: number; users: any[] }[]> {
  try {
    // Validate post ID using centralized validation
    const validatedPostId = validateUUID(postId);
    if (!validatedPostId) {
      console.warn('Invalid post ID provided to getPostReactions:', postId);
      return [];
    }

    const { data, error } = await supabase
      .from('post_like')
      .select(`
        user_id,
        created_at,
        users:profile!post_like_user_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('post_id', validatedPostId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting post likes:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Build users list for the single "like" reaction type
    const users = data.map(like => ({
      userId: like.user_id,
      username: like.users?.username || 'Unknown',
      avatar: like.users?.avatar_url,
      createdAt: like.created_at
    }));

    return [{
      reaction: 'like',
      count: users.length,
      users
    }];
  } catch (error) {
    console.error('Exception getting post likes:', error);
    return [];
  }
}