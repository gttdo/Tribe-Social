/**
 * Video thumbnail generation utilities for Tribe Board
 * Handles generating, uploading and managing video thumbnails
 */

import { supabase } from './supabase/client';

/**
 * Generate a video thumbnail from a File object
 * @param file - Video file to generate thumbnail from
 * @param seekTo - Time in seconds to seek to for thumbnail (default: 1)
 * @returns Promise<Blob> - Generated thumbnail as WebP blob
 */
export async function generateVideoThumbnail(file: File, seekTo = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);

    const clean = () => URL.revokeObjectURL(video.src);

    video.onloadeddata = () => {
      const t = Math.min(seekTo, Math.max(0, (video.duration || 2) - 0.1));
      video.currentTime = t;
      
      video.onseeked = () => {
        const ratio = video.videoWidth / video.videoHeight || 16 / 9;
        const w = 720;
        const h = Math.round(w / ratio);
        
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, w, h);
        
        canvas.toBlob((blob) => {
          clean();
          if (!blob) return reject(new Error('toBlob failed'));
          resolve(blob);
        }, 'image/webp', 0.9);
      };
    };
    
    video.onerror = () => {
      clean();
      reject(new Error('Video load failed'));
    };
  });
}

/**
 * Upload video and its thumbnail to Supabase Storage
 * @param videoFile - Video file to upload
 * @param userId - User ID for storage path
 * @param postId - Post ID for storage path
 * @returns Promise<{videoUrl: string, thumbnailUrl: string}> - URLs of uploaded files
 */
export async function uploadVideoWithThumbnail(
  videoFile: File,
  userId: string,
  postId: string
): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  console.log('🎬 Starting video and thumbnail upload process...');
  
  const { STORAGE_BUCKETS } = await import('./storage-constants');
  const bucket = STORAGE_BUCKETS.MEDIA;
  
  try {
    // 1) Upload video first
    console.log('📤 Uploading video file...');
    const videoPath = `posts/${userId}/${postId}/video.mp4`;
    const { error: videoUploadError } = await supabase.storage
      .from(bucket)
      .upload(videoPath, videoFile, { upsert: true });

    if (videoUploadError) {
      throw new Error(`Video upload failed: ${videoUploadError.message}`);
    }

    // 2) Generate and upload thumbnail
    console.log('🖼️ Generating and uploading thumbnail...');
    const thumbnailBlob = await generateVideoThumbnail(videoFile, 1);
    
    const thumbnailPath = `posts/${userId}/${postId}/thumb.webp`;
    const { error: thumbnailUploadError } = await supabase.storage
      .from(bucket)
      .upload(thumbnailPath, thumbnailBlob, { upsert: true });

    if (thumbnailUploadError) {
      throw new Error(`Thumbnail upload failed: ${thumbnailUploadError.message}`);
    }

    // 3) Get public URLs
    console.log('🔗 Getting public URLs...');
    const { data: videoUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(videoPath);
      
    const { data: thumbnailUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(thumbnailPath);

    if (!videoUrlData?.publicUrl || !thumbnailUrlData?.publicUrl) {
      throw new Error('Failed to get public URLs for uploaded files');
    }

    console.log('✅ Video and thumbnail upload successful');
    return {
      videoUrl: videoUrlData.publicUrl,
      thumbnailUrl: thumbnailUrlData.publicUrl
    };

  } catch (error) {
    console.error('❌ Video with thumbnail upload failed:', error);
    throw error;
  }
}

/**
 * Validate video file for thumbnail generation
 * @param file - Video file to validate
 * @returns {isValid: boolean, error?: string} - Validation result
 */
export function validateVideoForThumbnail(file: File): { isValid: boolean; error?: string } {
  const supportedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (!supportedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported video type: ${file.type}. Supported types: ${supportedTypes.join(', ')}`
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Video file too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum size: 50MB`
    };
  }
  
  return { isValid: true };
}

/**
 * Get video dimensions from file
 * @param file - Video file to analyze
 * @returns Promise<{width: number, height: number, duration: number}> - Video metadata
 */
export async function getVideoMetadata(file: File): Promise<{
  width: number;
  height: number;
  duration: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    const clean = () => URL.revokeObjectURL(video.src);

    video.onloadedmetadata = () => {
      const metadata = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration
      };
      clean();
      resolve(metadata);
    };

    video.onerror = () => {
      clean();
      reject(new Error('Failed to load video metadata'));
    };
  });
}

/**
 * Backfill missing thumbnails for existing video posts
 * Based on the user's suggested implementation
 * @param userId - User ID to process posts for (optional, if not provided processes all users)
 * @returns Promise with results of the backfill operation
 */
export async function backfillMissingThumbs(userId?: string): Promise<{
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ postId: string; error: string }>;
}> {
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ postId: string; error: string }>
  };

  try {
    console.log('🎬 Starting video thumbnail backfill...', userId ? `for user: ${userId}` : 'for all users');
    
    // Import required modules
    const { uploadVideoWithThumb } = await import('./video-upload-helpers');
    
    // 1. Query for video posts missing thumbnails
    let query = supabase
      .from('posts')
      .select('id, media_url, user_id')
      .eq('post_type', 'video')
      .is('media_thumb_url', null)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to prevent overwhelming the system

    // If userId is provided, filter by user
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!rows || rows.length === 0) {
      console.log('No video posts found that need thumbnails');
      return results;
    }

    console.log(`Found ${rows.length} video posts without thumbnails`);
    results.total = rows.length;

    // 2. Process each video post
    for (const row of rows) {
      try {
        console.log(`Processing post ${row.id}...`);
        
        // Fetch the original video file
        const resp = await fetch(row.media_url, { mode: 'cors' });
        
        if (!resp.ok) {
          throw new Error(`Failed to fetch video: ${resp.status} ${resp.statusText}`);
        }
        
        const buf = await resp.blob();
        const file = new File([buf], 'video.mp4', { type: buf.type || 'video/mp4' });

        // Extract post reference from the media URL for consistent naming
        const postRef = row.media_url.split('/posts/')[1]?.split('/')[1] ?? `retro_${row.id}`;
        
        // Generate thumbnail using existing upload helper
        const result = await uploadVideoWithThumb({ 
          file, 
          userId: row.user_id, 
          postRef 
        });

        if (result.media_thumb_url) {
          // Update the database with the new thumbnail URL
          const { error: updateError } = await supabase
            .from('posts')
            .update({ media_thumb_url: result.media_thumb_url })
            .eq('id', row.id);

          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`);
          }

          console.log(`✅ Successfully processed post ${row.id}`);
          results.successful++;
        } else {
          throw new Error('No thumbnail URL returned from upload helper');
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to process post ${row.id}:`, errorMessage);
        
        results.failed++;
        results.errors.push({
          postId: row.id,
          error: errorMessage
        });
      }

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`🎬 Backfill complete! ${results.successful} successful, ${results.failed} failed`);
    return results;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Backfill process failed:', errorMessage);
    
    results.errors.push({
      postId: 'process',
      error: errorMessage
    });
    
    return results;
  }
}

/**
 * Quick browser console version for manual execution
 * Copy and paste this function into the browser console to run backfill manually
 */
export const consoleBackfillScript = `
// Quick browser console version for video thumbnail backfill
(async function backfillVideoThumbnails() {
  console.log('🎬 Starting video thumbnail backfill...');
  
  // Import required functions
  const { supabase } = await import('./utils/supabase/client');
  const { generateVideoThumbnail } = await import('./utils/video-thumbnail-helpers');
  
  // 1. Fetch video posts missing thumbnails
  const { data: rows, error } = await supabase.from('posts')
    .select('id, user_id, media_url')
    .eq('post_type', 'video')
    .is('media_thumb_url', null)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('❌ Database error:', error);
    return;
  }
  
  console.log(\`Found \${rows?.length || 0} videos without thumbnails\`);
  
  // 2. Process each video
  const bucket = 'make-70df0d6e-media';
  let processed = 0, successful = 0, failed = 0;
  
  for (const p of rows || []) {
    try {
      console.log(\`Processing \${++processed}/\${rows.length}: \${p.id}\`);
      
      const resp = await fetch(p.media_url);
      const blob = await resp.blob();
      const thumb = await generateVideoThumbnail(new File([blob], 'v.mp4', { type: blob.type }), 1);
      const key = \`posts/\${p.user_id}/\${p.id}/thumb.webp\`;
      
      await supabase.storage.from(bucket).upload(key, thumb, { upsert: true });
      const pub = supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
      await supabase.from('posts').update({ media_thumb_url: pub }).eq('id', p.id);
      
      console.log(\`✅ Successfully processed \${p.id}\`);
      successful++;
      
    } catch (error) {
      console.error(\`❌ Failed to process \${p.id}:\`, error);
      failed++;
    }
  }
  
  console.log(\`🎬 Backfill complete! \${successful} successful, \${failed} failed\`);
})();
`;