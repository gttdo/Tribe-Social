export const POST_TEXT_LIMIT = 500;
export const POST_CAPTION_LIMIT = 300;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;    // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;   // 50MB
export const MAX_AUDIO_SIZE = 10 * 1024 * 1024;   // 10MB

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm'];

export const STORAGE_BUCKET = 'make-70df0d6e-media';

export type PostType = 'thought' | 'image' | 'video' | 'audio';
export type Visibility = 'public' | 'tribe';

export function inferPostType(media: File | null): PostType {
  if (!media) return 'thought';
  if (media.type.startsWith('image/')) return 'image';
  if (media.type.startsWith('video/')) return 'video';
  if (media.type.startsWith('audio/')) return 'audio';
  return 'thought';
}

export function validateMedia(file: File): { valid: boolean; error?: string } {
  if (file.type.startsWith('image/')) {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) return { valid: false, error: 'Unsupported image format. Use JPEG, PNG, WebP, or GIF.' };
    if (file.size > MAX_IMAGE_SIZE) return { valid: false, error: 'Image must be under 5MB.' };
  } else if (file.type.startsWith('video/')) {
    if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) return { valid: false, error: 'Unsupported video format. Use MP4, WebM, or MOV.' };
    if (file.size > MAX_VIDEO_SIZE) return { valid: false, error: 'Video must be under 50MB.' };
  } else if (file.type.startsWith('audio/')) {
    if (file.size > MAX_AUDIO_SIZE) return { valid: false, error: 'Audio must be under 10MB.' };
  } else {
    return { valid: false, error: 'Unsupported file type.' };
  }
  return { valid: true };
}
