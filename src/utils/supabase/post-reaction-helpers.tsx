import { supabase } from './client';
import { validateUUID, validatePostIds, isValidUUID as validateUUIDFormat } from '../validation-middleware';
import { criticalUUIDCheck, criticalUUIDArrayCheck, criticalDBQuery, validateSupabaseInQuery, validateSupabaseEqQuery } from '../database-query-guards';

/**
 * Check if a user has liked a specific post using post_reactions table
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
      .from('post_reactions')
      .select('id')
      .eq('post_id', validPostId)
      .eq('user_id', validUserId)
      .eq('reaction', 'like')
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
 * Toggle like status for a post using post_reactions table
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
      .from('post_reactions')
      .select('id')
      .eq('post_id', validPostId)
      .eq('user_id', validUserId)
      .eq('reaction', 'like')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing like:', checkError);
      return { liked: false, error: 'Failed to check like status' };
    }

    if (existingReaction) {
      // Unlike: Remove the reaction
      const { error: deleteError } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', validPostId)
        .eq('user_id', validUserId)
        .eq('reaction', 'like');

      if (deleteError) {
        console.error('Error removing like:', deleteError);
        return { liked: false, error: 'Failed to remove like' };
      }

      return { liked: false };
    } else {
      // Like: Add the reaction
      const { error: insertError } = await supabase
        .from('post_reactions')
        .insert({
          post_id: validPostId,
          user_id: validUserId,
          reaction: 'like',
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
          .from('post_reactions')
          .select('post_id')
          .eq('user_id', safeUserId)
          .eq('reaction', 'like')
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
 * Get reaction count for a specific post and reaction type
 */
export async function getReactionCount(postId: string, reactionType: string = 'like'): Promise<number> {
  try {
    // Validate post ID using the validation middleware
    const validPostId = validateUUID(postId);
    if (!validPostId) {
      console.warn('Invalid post ID provided to getReactionCount:', postId);
      return 0;
    }

    const { count, error } = await supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', validPostId)
      .eq('reaction', reactionType);

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
 * Get all reactions for a specific post
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
      .from('post_reactions')
      .select(`
        reaction,
        user_id,
        created_at,
        users:users!post_reactions_user_id_fkey (
          id,
          username,
          profile_image_url
        )
      `)
      .eq('post_id', validatedPostId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting post reactions:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Group by reaction type
    const reactionGroups: Record<string, any[]> = {};
    data.forEach(reaction => {
      if (!reactionGroups[reaction.reaction]) {
        reactionGroups[reaction.reaction] = [];
      }
      reactionGroups[reaction.reaction].push({
        userId: reaction.user_id,
        username: reaction.users?.username || 'Unknown',
        avatar: reaction.users?.profile_image_url,
        createdAt: reaction.created_at
      });
    });

    // Convert to array format
    return Object.entries(reactionGroups).map(([reaction, users]) => ({
      reaction,
      count: users.length,
      users
    }));
  } catch (error) {
    console.error('Exception getting post reactions:', error);
    return [];
  }
}