import { makeVideoThumbnail } from './videoThumb';

/**
 * Upload video file and generate thumbnail
 */
async function uploadVideoWithThumb({
  file, 
  userId, 
  postRef,
}: { 
  file: File; 
  userId: string; 
  postRef: string;
}) {
  // Get authenticated supabase client
  const { supabase } = await import('./supabase/client');
  
  const basePath = `posts/${userId}/${postRef}`;

  // 1) Upload video
  const videoKey = `${basePath}/video.mp4`;
  console.log('Uploading video to:', videoKey);
  
  const { error: upErr } = await supabase.storage
    .from('make-70df0d6e-media')
    .upload(videoKey, file, { 
      upsert: true, 
      cacheControl: '3600' 
    });
    
  if (upErr) {
    console.error('Video upload error:', upErr);
    throw upErr;
  }

  const { data: videoPublic } = supabase.storage
    .from('make-70df0d6e-media')
    .getPublicUrl(videoKey);
  const media_url = videoPublic.publicUrl;

  console.log('Video uploaded successfully:', media_url);

  // 2) Generate & upload thumbnail
  let media_thumb_url: string | null = null;
  try {
    console.log('Generating video thumbnail...');
    const thumbBlob = await makeVideoThumbnail(file);
    const thumbKey = `${basePath}/thumb.webp`;
    
    const { error: upThumbErr } = await supabase.storage
      .from('make-70df0d6e-media')
      .upload(thumbKey, thumbBlob, { 
        upsert: true, 
        cacheControl: '3600', 
        contentType: 'image/webp' 
      });
      
    if (upThumbErr) {
      console.error('Thumbnail upload error:', upThumbErr);
      throw upThumbErr;
    }

    const { data: thumbPublic } = supabase.storage
      .from('make-70df0d6e-media')
      .getPublicUrl(thumbKey);
    media_thumb_url = thumbPublic.publicUrl;
    
    console.log('Thumbnail uploaded successfully:', media_thumb_url);
  } catch (e) {
    console.warn('[thumb] generation/upload failed, proceeding without poster', e);
    // Continue without thumbnail - not a fatal error
  }

  return { media_url, media_thumb_url };
}

/**
 * Create a video post with uploaded video and thumbnail
 */
export async function createVideoPost({
  file, 
  userId, 
  visibility = 'public', 
  caption = null,
  tribeId = null,
}: { 
  file: File; 
  userId: string; 
  visibility?: 'public' | 'private' | 'tribe'; 
  caption?: string | null;
  tribeId?: string | null;
}) {
  console.log('📹 Creating video post with params:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    userId,
    visibility,
    caption,
    tribeId
  });

  // Validate video file first
  const validation = validateVideoFile(file);
  if (!validation.isValid) {
    console.error('❌ Video file validation failed:', validation.errors);
    throw new Error(`Video validation failed: ${validation.errors.join(', ')}`);
  }

  const postRef = `post_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

  try {
    // Upload video and generate thumbnail
    const { media_url, media_thumb_url } = await uploadVideoWithThumb({ 
      file, 
      userId, 
      postRef 
    });

    console.log('Media URLs ready:', { media_url, media_thumb_url });

    // Create post record using the server endpoint to ensure proper validation
    const postCreationData = {
      post_type: 'video',
      media_url,
      media_thumb_url,
      caption: caption ?? null,
      text_body: null, // Explicitly set to null for video posts
      visibility,
      tribeIds: tribeId ? [tribeId] : []
    };

    console.log('Creating video post via server:', postCreationData);

    const { makeAuthenticatedRequest } = await import('./supabase/client');
    const createResult = await makeAuthenticatedRequest('/make-server-70df0d6e/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postCreationData)
    });

    if (!createResult.success || !createResult.post?.id) {
      console.error('Video post creation failed:', createResult);
      throw new Error(createResult.error || 'Failed to create video post');
    }

    console.log('Video post created successfully:', createResult.post);
    return createResult.post;
    
  } catch (error) {
    console.error('Error creating video post:', error);
    throw error;
  }
}

/**
 * Upload video file only (without creating post record)
 * Useful for preview or draft scenarios
 */
export async function uploadVideoOnly({
  file,
  userId,
  postRef,
}: {
  file: File;
  userId: string;
  postRef?: string;
}) {
  const actualPostRef = postRef || `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  try {
    const result = await uploadVideoWithThumb({
      file,
      userId,
      postRef: actualPostRef
    });
    
    return {
      ...result,
      postRef: actualPostRef
    };
  } catch (error) {
    console.error('Error uploading video only:', error);
    throw error;
  }
}

/**
 * Check if a file is a valid video file
 */
export function isValidVideoFile(file: File): boolean {
  const validTypes = [
    'video/mp4',
    'video/webm', 
    'video/mov',
    'video/quicktime',
    'video/avi'
  ];
  
  const validExtensions = ['.mp4', '.webm', '.mov', '.avi', '.qt'];
  
  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  return hasValidType || hasValidExtension;
}

/**
 * Get video file constraints/limits
 */
export const VIDEO_CONSTRAINTS = {
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  maxDurationSeconds: 300, // 5 minutes  
  supportedFormats: ['mp4', 'webm', 'mov', 'avi'],
  supportedMimeTypes: [
    'video/mp4',
    'video/webm', 
    'video/mov',
    'video/quicktime',
    'video/avi'
  ]
} as const;

/**
 * Validate video file against constraints
 */
export function validateVideoFile(file: File): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check file size
  if (file.size > VIDEO_CONSTRAINTS.maxSizeBytes) {
    errors.push(`File size exceeds ${VIDEO_CONSTRAINTS.maxSizeBytes / (1024 * 1024)}MB limit`);
  }
  
  // Check file type
  if (!isValidVideoFile(file)) {
    errors.push(`Unsupported file format. Supported: ${VIDEO_CONSTRAINTS.supportedFormats.join(', ')}`);
  }
  
  // Note: Duration validation would require loading the video, which is expensive
  // We'll let the server handle duration validation if needed
  
  return {
    isValid: errors.length === 0,
    errors
  };
}