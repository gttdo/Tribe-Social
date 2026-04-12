// POST /make-server-70df0d6e/posts/:postId/comments - Create comment using "body" field
app.post('/make-server-70df0d6e/posts/:postId/comments', async (c) => {
  try {
    console.log('=== CREATE COMMENT REQUEST ===');
    
    const { user, error } = await authenticateUser(c.req.raw);
    if (error) {
      console.log('Authentication error:', error);
      return c.json({ error }, 401);
    }

    const postId = c.req.param('postId');
    const body = await c.req.json();
    const { body: commentBody } = body;

    console.log('Creating comment for post:', postId, 'body length:', commentBody?.length);

    if (!commentBody || !commentBody.trim()) {
      return c.json({ error: 'Comment body is required' }, 400);
    }

    if (commentBody.trim().length > 500) {
      return c.json({ error: 'Comment must be 500 characters or less' }, 400);
    }

    // Resolve post ID (handles both short IDs and UUIDs)
    const resolvedPostId = await resolvePostIdSafe(postId);
    
    if (!resolvedPostId) {
      return c.json({ error: 'Invalid post ID' }, 400);
    }

    // Check if post exists
    const { data: postData, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id, user_id')
      .eq('id', resolvedPostId)
      .maybeSingle();

    if (postError) {
      console.error('Error checking post existence:', postError);
      return c.json({ error: 'Failed to find post' }, 500);
    }

    if (!postData) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // Insert comment using "body" field
    const { data: newComment, error: insertError } = await supabaseAdmin
      .from('post_comments')
      .insert({
        post_id: resolvedPostId,
        user_id: user!.id,
        body: commentBody.trim()
      })
      .select(`
        id,
        post_id,
        user_id,
        body,
        created_at
      `)
      .maybeSingle();

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      return c.json({ error: 'Failed to create comment' }, 500);
    }

    if (!newComment) {
      console.error('No comment returned after insertion');
      return c.json({ error: 'Failed to create comment - no data returned' }, 500);
    }

    // Get user info for response
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('id', user!.id)
      .maybeSingle();

    console.log('Comment created successfully:', newComment.id);

    // Return comment with "body" field
    const responseComment = {
      id: newComment.id,
      post_id: newComment.post_id,
      user_id: newComment.user_id,
      username: userData?.username || 'Unknown',
      body: newComment.body, // Use "body" field consistently
      content: newComment.body, // Also provide as "content" for backward compatibility
      created_at: newComment.created_at,
      createdAt: newComment.created_at
    };

    return c.json({ comment: responseComment }, 201);
    
  } catch (error) {
    console.error('Error creating comment:', error);
    return c.json({ 
      error: 'Internal server error while creating comment',
      details: error.message 
    }, 500);
  }
})

export {};