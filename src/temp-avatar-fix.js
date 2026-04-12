// Temporary avatar fix for SocialFeed.tsx database fallback
// This demonstrates the fix needed on lines 408-409

// CURRENT (missing avatar):
const currentTransform = {
  id: post.id,
  user_id: post.user_id,
  userId: post.user_id,
  username: postUser?.username || 'unknown_user',
  nickname: postUser?.username || 'Unknown User',
  type: post.post_type || 'thought',
  // ... rest of fields
};

// FIXED (with avatar):
const fixedTransform = {
  id: post.id,
  user_id: post.user_id,
  userId: post.user_id,
  username: postUser?.username || 'unknown_user',
  nickname: postUser?.username || 'Unknown User',
  avatar: postUser?.profile_image_url || null,      // ADD THIS LINE
  coreRealm: 'general',                             // ADD THIS LINE
  type: post.post_type || 'thought',
  // ... rest of fields
};

console.log('Avatar fix needed in SocialFeed.tsx lines 408-409');