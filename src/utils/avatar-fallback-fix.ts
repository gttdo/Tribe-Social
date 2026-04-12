// Utility to fix avatar display in database fallback posts
// This function transforms a database post result to include the missing avatar field

export function transformDatabaseFallbackPost(post: any, postUser: any, savedSet: string[] = []) {
  return {
    id: post.id,
    user_id: post.user_id,
    userId: post.user_id,
    username: postUser?.username || 'unknown_user',
    nickname: postUser?.username || 'Unknown User',
    avatar: postUser?.avatar_url || null, // FIXED: Added missing avatar field
    coreRealm: 'general', // FIXED: Added missing coreRealm field
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
    created_at: post.created_at,
    createdAt: post.created_at,
    timestamp: new Date(post.created_at).toISOString()
  };
}