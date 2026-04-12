import { supabase } from './client';
import { Tables, TablesInsert, TablesUpdate } from './database-types';

export type PostBookmark = Tables<'post_bookmarks'>;
export type PostBookmarkInsert = TablesInsert<'post_bookmarks'>;
export type PostBookmarkUpdate = TablesUpdate<'post_bookmarks'>;

/**
 * Check if a post is bookmarked by the current user
 * Uses auth.uid() for RLS context
 */
export async function isPostBookmarked(postId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user for bookmark check');
      return false;
    }

    const { data, error } = await supabase
      .from('post_bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Exception checking bookmark status:', error);
    return false;
  }
}

/**
 * Add a bookmark for the current user
 * Uses auth.uid() for RLS context
 */
export async function bookmarkPost(postId: string): Promise<{ success: boolean; bookmark?: PostBookmark; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if already bookmarked
    const alreadyBookmarked = await isPostBookmarked(postId);
    if (alreadyBookmarked) {
      return { success: false, error: 'Post already bookmarked' };
    }

    const bookmarkData: PostBookmarkInsert = {
      user_id: user.id,
      post_id: postId
    };

    const { data, error } = await supabase
      .from('post_bookmarks')
      .insert(bookmarkData)
      .select()
      .single();

    if (error) {
      console.error('Error creating bookmark:', error);
      return { success: false, error: error.message };
    }

    console.log('Post bookmarked successfully:', postId);
    return { success: true, bookmark: data };
  } catch (error) {
    console.error('Exception creating bookmark:', error);
    return { success: false, error: 'Failed to bookmark post' };
  }
}

/**
 * Remove a bookmark for the current user
 * Uses auth.uid() for RLS context
 */
export async function unbookmarkPost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing bookmark:', error);
      return { success: false, error: error.message };
    }

    console.log('Post bookmark removed successfully:', postId);
    return { success: true };
  } catch (error) {
    console.error('Exception removing bookmark:', error);
    return { success: false, error: 'Failed to remove bookmark' };
  }
}

/**
 * Toggle bookmark status for a post
 * Uses auth.uid() for RLS context
 */
export async function togglePostBookmark(postId: string): Promise<{ 
  success: boolean; 
  bookmarked: boolean; 
  bookmark?: PostBookmark; 
  error?: string 
}> {
  try {
    const isBookmarked = await isPostBookmarked(postId);

    if (isBookmarked) {
      const result = await unbookmarkPost(postId);
      return {
        success: result.success,
        bookmarked: false,
        error: result.error
      };
    } else {
      const result = await bookmarkPost(postId);
      return {
        success: result.success,
        bookmarked: true,
        bookmark: result.bookmark,
        error: result.error
      };
    }
  } catch (error) {
    console.error('Exception toggling bookmark:', error);
    return { success: false, bookmarked: false, error: 'Failed to toggle bookmark' };
  }
}

/**
 * Get all bookmarked posts for the current user
 * Uses auth.uid() for RLS context
 */
export async function getUserBookmarks(limit?: number, offset?: number): Promise<{
  success: boolean;
  bookmarks?: PostBookmark[];
  total?: number;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    let query = supabase
      .from('post_bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching user bookmarks:', error);
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      bookmarks: data || [],
      total: count || undefined
    };
  } catch (error) {
    console.error('Exception fetching user bookmarks:', error);
    return { success: false, error: 'Failed to fetch bookmarks' };
  }
}

/**
 * Get bookmarked posts with full post details for the current user
 * Uses auth.uid() for RLS context and posts_with_reaction_count view for accurate counts
 */
export async function getUserBookmarkedPosts(limit?: number, offset?: number): Promise<{
  success: boolean;
  posts?: any[];
  total?: number;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    let query = supabase
      .from('post_bookmarks')
      .select(`
        id,
        created_at,
        posts_with_reaction_count (
          id,
          created_at,
          user_id,
          tribe_id,
          post_type,
          text_body,
          caption,
          media_url,
          media_thumb_url,
          visibility,
          like_count,
          comment_count,
          share_count,
          reaction_count
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching bookmarked posts:', error);
      return { success: false, error: error.message };
    }

    // Transform the data to include bookmark timestamps with posts
    const posts = data?.map(bookmark => ({
      ...bookmark.posts_with_reaction_count,
      bookmarked_at: bookmark.created_at,
      bookmark_id: bookmark.id
    })) || [];

    return { 
      success: true, 
      posts,
      total: count || undefined
    };
  } catch (error) {
    console.error('Exception fetching bookmarked posts:', error);
    return { success: false, error: 'Failed to fetch bookmarked posts' };
  }
}

/**
 * Get bookmark count for a specific post
 */
export async function getPostBookmarkCount(postId: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from('post_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('Error fetching bookmark count:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Exception fetching bookmark count:', error);
    return { success: false, error: 'Failed to fetch bookmark count' };
  }
}

/**
 * Get bookmark counts for multiple posts
 */
export async function getPostsBookmarkCounts(postIds: string[]): Promise<{ 
  success: boolean; 
  counts?: Record<string, number>; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase
      .from('post_bookmarks')
      .select('post_id')
      .in('post_id', postIds);

    if (error) {
      console.error('Error fetching bookmark counts:', error);
      return { success: false, error: error.message };
    }

    // Count bookmarks per post
    const counts: Record<string, number> = {};
    postIds.forEach(id => counts[id] = 0);
    
    data?.forEach(bookmark => {
      counts[bookmark.post_id] = (counts[bookmark.post_id] || 0) + 1;
    });

    return { success: true, counts };
  } catch (error) {
    console.error('Exception fetching bookmark counts:', error);
    return { success: false, error: 'Failed to fetch bookmark counts' };
  }
}

/**
 * Check bookmark status for multiple posts for the current user
 * Uses auth.uid() for RLS context
 */
export async function getUserBookmarkStatuses(postIds: string[]): Promise<{
  success: boolean;
  statuses?: Record<string, boolean>;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('post_bookmarks')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    if (error) {
      console.error('Error fetching bookmark statuses:', error);
      return { success: false, error: error.message };
    }

    // Create status map
    const statuses: Record<string, boolean> = {};
    postIds.forEach(id => statuses[id] = false);
    
    data?.forEach(bookmark => {
      statuses[bookmark.post_id] = true;
    });

    return { success: true, statuses };
  } catch (error) {
    console.error('Exception fetching bookmark statuses:', error);
    return { success: false, error: 'Failed to fetch bookmark statuses' };
  }
}

/**
 * Delete bookmark by ID (admin/cleanup function)
 */
export async function deleteBookmarkById(bookmarkId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('id', bookmarkId);

    if (error) {
      console.error('Error deleting bookmark by ID:', error);
      return { success: false, error: error.message };
    }

    console.log('Bookmark deleted successfully:', bookmarkId);
    return { success: true };
  } catch (error) {
    console.error('Exception deleting bookmark by ID:', error);
    return { success: false, error: 'Failed to delete bookmark' };
  }
}