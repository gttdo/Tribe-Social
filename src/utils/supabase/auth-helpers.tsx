// This file has been consolidated into client.tsx to prevent multiple Supabase instances
// All auth helper functions are now exported from ./client.tsx
export {
  checkAuthStatus,
  refreshSession,
  getCurrentSession,
  signOutUser
} from './client';