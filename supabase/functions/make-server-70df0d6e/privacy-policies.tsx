import { createClient } from 'npm:@supabase/supabase-js'

// Initialize Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Creates database-level RLS (Row Level Security) policies for post visibility
 * based on user profile privacy settings and content visibility settings.
 * 
 * The logic works as follows:
 * - Public posts from public profiles: visible to everyone
 * - Public posts from private profiles: visible only to followers
 * - Tribe posts: visible only to tribe members
 * - Private posts: visible only to owner
 */
export async function setupPostVisibilityPolicies() {
  try {
    console.log('Setting up post visibility RLS policies...')

    // Drop existing policies if they exist
    const dropPoliciesSQL = `
      DROP POLICY IF EXISTS "posts_select_policy" ON public.posts;
      DROP POLICY IF EXISTS "posts_insert_policy" ON public.posts;
      DROP POLICY IF EXISTS "posts_update_policy" ON public.posts;
      DROP POLICY IF EXISTS "posts_delete_policy" ON public.posts;
    `
    
    await supabaseAdmin.rpc('exec_sql', { sql: dropPoliciesSQL })
    console.log('Dropped existing post policies')

    // Enable RLS on posts table
    const enableRLSSQL = `
      ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    `
    
    await supabaseAdmin.rpc('exec_sql', { sql: enableRLSSQL })
    console.log('Enabled RLS on posts table')

    // Create comprehensive select policy that respects profile privacy
    const selectPolicySQL = `
      CREATE POLICY "posts_select_policy" ON public.posts
      FOR SELECT
      USING (
        -- Owner can always see their own posts
        user_id = auth.uid()
        OR
        -- Private posts are only visible to owner (handled above)
        (visibility = 'private' AND user_id = auth.uid())
        OR
        -- Tribe posts are visible to tribe members
        (visibility = 'tribe' AND tribe_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.tribe_members tm
          WHERE tm.tribe_id = posts.tribe_id
          AND tm.user_id = auth.uid()
        ))
        OR
        -- Public posts visibility depends on author's profile privacy
        (visibility = 'public' AND (
          -- If author has public profile, post is visible to everyone
          EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = posts.user_id
            AND (u.profile_privacy = 'public' OR u.profile_privacy IS NULL)
          )
          OR
          -- If author has private profile, post is only visible to followers
          (
            EXISTS (
              SELECT 1 FROM public.users u
              WHERE u.id = posts.user_id
              AND u.profile_privacy = 'private'
            )
            AND
            EXISTS (
              SELECT 1 FROM public.user_relationships ur
              WHERE ur.followed_id = posts.user_id
              AND ur.follower_id = auth.uid()
            )
          )
        ))
      );
    `
    
    await supabaseAdmin.rpc('exec_sql', { sql: selectPolicySQL })
    console.log('Created post select policy with profile privacy logic')

    // Create insert policy - users can insert their own posts
    const insertPolicySQL = `
      CREATE POLICY "posts_insert_policy" ON public.posts
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
    `
    
    await supabaseAdmin.rpc('exec_sql', { sql: insertPolicySQL })
    console.log('Created post insert policy')

    // Create update policy - users can update their own posts
    const updatePolicySQL = `
      CREATE POLICY "posts_update_policy" ON public.posts
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    `
    
    await supabaseAdmin.rpc('exec_sql', { sql: updatePolicySQL })
    console.log('Created post update policy')

    // Create delete policy - users can delete their own posts, or tribe moderators can delete posts in their tribes
    const deletePolicySQL = `
      CREATE POLICY "posts_delete_policy" ON public.posts
      FOR DELETE
      USING (
        user_id = auth.uid()
        OR
        (tribe_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.tribe_members tm
          WHERE tm.tribe_id = posts.tribe_id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('moderator', 'admin', 'owner')
        ))
      );
    `
    
    await supabaseAdmin.rpc('exec_sql', { sql: deletePolicySQL })
    console.log('Created post delete policy')

    console.log('Post visibility RLS policies setup complete!')
    return { success: true }

  } catch (error) {
    console.error('Error setting up post visibility policies:', error)
    throw error
  }
}

/**
 * Check if a user can view a specific post based on privacy rules
 */
export async function canUserViewPost(
  viewerId: string | null,
  postId: string
): Promise<{ canView: boolean; reason?: string }> {
  try {
    // Use the database query with RLS to check if post is visible
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select(`
        id, user_id, visibility, tribe_id,
        users!inner (
          id, profile_privacy
        )
      `)
      .eq('id', postId)
      .single()

    if (error || !post) {
      return { canView: false, reason: 'Post not found' }
    }

    // Owner can always view their own posts
    if (post.user_id === viewerId) {
      return { canView: true }
    }

    // Private posts only visible to owner
    if (post.visibility === 'private') {
      return { canView: false, reason: 'Private post' }
    }

    // Tribe posts require membership
    if (post.visibility === 'tribe' && post.tribe_id) {
      if (!viewerId) {
        return { canView: false, reason: 'Authentication required for tribe posts' }
      }

      const { data: membership } = await supabaseAdmin
        .from('tribe_members')
        .select('id')
        .eq('tribe_id', post.tribe_id)
        .eq('user_id', viewerId)
        .single()

      return { 
        canView: !!membership, 
        reason: membership ? undefined : 'Not a tribe member' 
      }
    }

    // Public posts depend on author's profile privacy
    if (post.visibility === 'public') {
      const authorPrivacy = post.users.profile_privacy

      // If author has public profile or no privacy setting, post is visible
      if (!authorPrivacy || authorPrivacy === 'public') {
        return { canView: true }
      }

      // If author has private profile, check if viewer is following
      if (authorPrivacy === 'private') {
        if (!viewerId) {
          return { canView: false, reason: 'Must follow user to see their posts' }
        }

        const { data: following } = await supabaseAdmin
          .from('user_relationships')
          .select('id')
          .eq('follower_id', viewerId)
          .eq('followed_id', post.user_id)
          .single()

        return { 
          canView: !!following, 
          reason: following ? undefined : 'Must follow user to see their posts' 
        }
      }
    }

    return { canView: false, reason: 'Unknown visibility rule' }

  } catch (error) {
    console.error('Error checking post visibility:', error)
    return { canView: false, reason: 'Error checking permissions' }
  }
}

/**
 * Get posts visible to a specific user with proper privacy filtering
 */
export async function getVisiblePosts(
  viewerId: string | null,
  options: {
    limit?: number
    offset?: number
    userId?: string
    tribeId?: string
  } = {}
) {
  try {
    let query = supabaseAdmin
      .from('posts')
      .select(`
        *,
        users!inner (
          id, username, nickname, core_realm, profile_privacy
        ),
        tribes (
          id, name, is_private
        )
      `)
      .order('created_at', { ascending: false })

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }

    if (options.userId) {
      query = query.eq('user_id', options.userId)
    }

    if (options.tribeId) {
      query = query.eq('tribe_id', options.tribeId)
    }

    // The RLS policies will automatically filter posts based on visibility rules
    const { data: posts, error } = await query

    if (error) {
      console.error('Error fetching visible posts:', error)
      return { posts: [], error: error.message }
    }

    return { posts: posts || [], error: null }

  } catch (error) {
    console.error('Error in getVisiblePosts:', error)
    return { posts: [], error: 'Failed to fetch posts' }
  }
}

/**
 * Create a post with proper visibility handling
 */
export async function createPostWithPrivacy(
  userId: string,
  postData: {
    type: 'thought' | 'image' | 'video' | 'audio'
    content?: string
    caption?: string
    media_urls?: string[]
    visibility: 'public' | 'tribe' | 'private'
    tribe_id?: string
    realm?: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE'
  }
) {
  try {
    // Insert post into database
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert({
        user_id: userId,
        ...postData,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        reaction_count: 0
      })
      .select(`
        *,
        users!inner (
          id, username, nickname, core_realm, profile_privacy
        ),
        tribes (
          id, name, is_private
        )
      `)
      .single()

    if (error) {
      console.error('Error creating post:', error)
      throw new Error(`Failed to create post: ${error.message}`)
    }

    return { post, error: null }

  } catch (error) {
    console.error('Error in createPostWithPrivacy:', error)
    return { post: null, error: error instanceof Error ? error.message : 'Failed to create post' }
  }
}

/**
 * Update user's profile privacy setting
 */
export async function updateProfilePrivacy(
  userId: string,
  privacy: 'public' | 'private'
) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ profile_privacy: privacy })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile privacy:', error)
      throw new Error(`Failed to update privacy: ${error.message}`)
    }

    console.log(`Updated profile privacy for user ${userId} to ${privacy}`)
    return { user, error: null }

  } catch (error) {
    console.error('Error in updateProfilePrivacy:', error)
    return { user: null, error: error instanceof Error ? error.message : 'Failed to update privacy' }
  }
}