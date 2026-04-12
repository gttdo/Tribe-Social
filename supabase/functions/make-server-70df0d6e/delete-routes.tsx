import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js';
import { authenticateUser } from './helpers.tsx';
import { resolvePostIdSafe } from './post-id-helpers.tsx';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export function setupDeleteRoutes(app: Hono) {
  console.log('=== SETTING UP DELETE ROUTES ===');

  // Delete post endpoint - allows users to delete their own posts
  app.delete('/make-server-70df0d6e/posts/:postId/force-delete', async (c) => {
    try {
      console.log('=== FORCE DELETE POST REQUEST ===');
      
      const { user, error } = await authenticateUser(c.req.raw);
      if (error) {
        console.log('Authentication error:', error);
        return c.json({ error }, 401);
      }

      const postId = c.req.param('postId');
      console.log('Force deleting post:', postId, 'user:', user!.id);

      // Get request body to check for additional parameters
      let requestBody: any = {};
      try {
        requestBody = await c.req.json();
      } catch {
        // Request body is optional
      }

      // Validate and resolve post ID
      const resolvedPostId = await resolvePostIdSafe(postId);
      
      if (!resolvedPostId) {
        return c.json({ error: 'Invalid or missing postId' }, 400);
      }

      // Check if post exists and verify ownership
      const { data: postData, error: postError } = await supabaseAdmin
        .from('posts')
        .select('id, user_id, media_url, media_thumb_url')
        .eq('id', resolvedPostId)
        .maybeSingle();

      if (postError) {
        console.error('Error checking post existence:', postError);
        return c.json({ error: 'Failed to find post' }, 500);
      }

      if (!postData) {
        return c.json({ error: 'Post not found' }, 404);
      }

      // Verify user owns the post
      if (postData.user_id !== user!.id) {
        console.log('User does not own this post:', {
          postUserId: postData.user_id,
          currentUserId: user!.id
        });
        return c.json({ error: 'You can only delete your own posts' }, 403);
      }

      console.log('Post ownership verified, proceeding with deletion');

      // Delete related data first (comments, reactions, bookmarks)
      try {
        // Delete comments
        const { error: commentsError } = await supabaseAdmin
          .from('comment')
          .delete()
          .eq('post_id', resolvedPostId);

        if (commentsError) {
          console.warn('Failed to delete comments (non-critical):', commentsError);
        } else {
          console.log('Post comments deleted successfully');
        }

        // Delete reactions
        const { error: reactionsError } = await supabaseAdmin
          .from('post_like')
          .delete()
          .eq('post_id', resolvedPostId);

        if (reactionsError) {
          console.warn('Failed to delete reactions (non-critical):', reactionsError);
        } else {
          console.log('Post reactions deleted successfully');
        }

        // Delete bookmarks
        const { error: bookmarksError } = await supabaseAdmin
          .from('bookmark')
          .delete()
          .eq('post_id', resolvedPostId);

        if (bookmarksError) {
          console.warn('Failed to delete bookmarks (non-critical):', bookmarksError);
        } else {
          console.log('Post bookmarks deleted successfully');
        }
      } catch (relatedDataError) {
        console.warn('Error deleting related data (continuing with post deletion):', relatedDataError);
      }

      // Delete the post itself
      const { error: deleteError } = await supabaseAdmin
        .from('posts')
        .delete()
        .eq('id', resolvedPostId)
        .eq('user_id', user!.id); // Double-check ownership

      if (deleteError) {
        console.error('Error deleting post from database:', deleteError);
        return c.json({ error: 'Failed to delete post from database' }, 500);
      }

      console.log('Post deleted from database successfully');

      // Clean up storage files (best-effort)
      try {
        const paths: string[] = [];
        [postData.media_url, postData.media_thumb_url]
          .filter(Boolean)
          .forEach((url) => {
            // Convert public URL to storage path
            const match = String(url).match(/\/object\/public\/[^/]+\/(.+)$/);
            if (match) paths.push(match[1]);
          });

        if (paths.length > 0) {
          console.log('Cleaning up storage files:', paths);
          const { error: storageError } = await supabaseAdmin
            .storage
            .from('make-70df0d6e-media')
            .remove(paths);
          
          if (storageError) {
            console.warn('Storage cleanup warning (non-fatal):', storageError);
          } else {
            console.log('Storage files cleaned up successfully');
          }
        }
      } catch (storageError) {
        console.warn('Storage cleanup failed (non-fatal):', storageError);
      }

      console.log('Post force-deleted successfully:', resolvedPostId);
      
      return c.json({ 
        success: true,
        message: 'Post deleted successfully',
        deletedPostId: resolvedPostId
      });
      
    } catch (error) {
      console.error('Error force-deleting post:', error);
      return c.json({ 
        error: 'Internal server error while deleting post',
        details: error.message 
      }, 500);
    }
  });
}