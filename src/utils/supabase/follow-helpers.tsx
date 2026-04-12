// This file has been consolidated into client.tsx to prevent multiple Supabase instances
// All follow helper functions are now exported from ./client.tsx
export {
  followUser,
  unfollowUser,
  isFollowing,
  getUserFollowCounts,
  getFollowing,
  getFollowers,
  getUserProfileWithFollowStatus,
  getSuggestedUsers,
  searchUsers
} from './client';