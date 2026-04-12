// This file has been consolidated into client.tsx to prevent multiple Supabase instances
// All request helper functions are now exported from ./client.tsx
export {
  makeAuthenticatedRequest,
  makePublicRequest,
  makeRequestWithRetry,
  serverUrl
} from './client';