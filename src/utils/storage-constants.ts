/**
 * Storage Configuration Constants
 * 
 * Centralized configuration for Supabase storage buckets
 * to ensure consistency across the application.
 */

// Storage bucket names
export const STORAGE_BUCKETS = {
  MEDIA: 'make-70df0d6e-media',     // For posts (images, videos, audio)
  AVATARS: 'avatars'                // For user profile pictures
} as const;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  MEDIA: 5 * 1024 * 1024,   // 5MB for posts
  AVATARS: 2 * 1024 * 1024, // 2MB for avatars
  AUDIO: 10 * 1024 * 1024   // 10MB for audio files
} as const;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  VIDEOS: ['video/mp4', 'video/webm', 'video/mov'],
  AUDIO: ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'],
  AVATARS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
} as const;

// Get all allowed media types for posts
export const ALL_MEDIA_TYPES = [
  ...ALLOWED_MIME_TYPES.IMAGES,
  ...ALLOWED_MIME_TYPES.VIDEOS,
  ...ALLOWED_MIME_TYPES.AUDIO
] as const;

// Storage paths
export const STORAGE_PATHS = {
  POSTS: (userId: string, postId?: string) => 
    postId ? `posts/${userId}/${postId}` : `posts/${userId}`,
  AVATARS: (userId: string, version: number, size: string) => 
    `${userId}/${version}_${size}.webp`,
  STORIES: (userId: string) => 
    `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
} as const;

// Default export for convenience
export default STORAGE_BUCKETS;