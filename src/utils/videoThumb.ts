/**
 * Client-side video thumbnail generation utility
 * Captures a frame from a video file and returns a WebP blob
 */

export async function makeVideoThumbnail(file: File, seekToSec = 0.5): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        // Bound the seek target inside duration
        const t = Math.min(Math.max(seekToSec, 0.1), Math.max(video.duration - 0.1, 0.1));
        if (isFinite(t)) {
          video.currentTime = t;
        } else {
          // live streams or unknown duration: capture first frame on loadeddata
        }
      };
      video.onseeked = () => resolve();
      video.onloadeddata = () => {
        // Fallback if seeking didn't fire
        if (video.currentTime === 0) resolve();
      };
      video.onerror = () => reject(new Error('Failed to load video for thumbnail'));
    });

    const canvas = document.createElement('canvas');
    const maxW = 960;
    const ratio = video.videoWidth / video.videoHeight || 1;
    canvas.width = Math.min(video.videoWidth || maxW, maxW);
    canvas.height = Math.round(canvas.width / ratio);

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b || new Blob()), 'image/webp', 0.85)
    );
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Check if a file is a video that can have thumbnails generated
 */
export function isVideoFile(file: File): boolean {
  const videoTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/quicktime'];
  return videoTypes.includes(file.type) || 
         file.name.toLowerCase().match(/\.(mp4|webm|mov|avi|qt)$/);
}

/**
 * Generate a filename for a video thumbnail
 */
export function generateThumbnailFilename(originalFilename: string): string {
  const name = originalFilename.replace(/\.[^/.]+$/, ''); // Remove extension
  const timestamp = Date.now();
  return `${name}_thumb_${timestamp}.webp`;
}

/**
 * Upload video thumbnail to Supabase storage
 */
export async function uploadVideoThumbnail(thumbnailBlob: Blob, filename: string): Promise<string | null> {
  try {
    // Import supabase client dynamically to ensure proper auth context
    const { supabase } = await import('./supabase/client');
    
    console.log('Uploading video thumbnail:', filename);
    
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User not authenticated for thumbnail upload:', userError);
      return null;
    }
    
    // Verify session is valid
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('No valid session for thumbnail upload:', sessionError);
      return null;
    }
    
    const path = `thumbnails/${user.id}/${filename}`;
    
    const { data, error } = await supabase.storage
      .from('make-70df0d6e-media')
      .upload(path, thumbnailBlob, {
        contentType: 'image/webp',
        upsert: true
      });

    if (error) {
      console.error('Error uploading video thumbnail:', error);
      return null;
    }

    // Get the public URL for the thumbnail
    const { data: { publicUrl } } = supabase.storage
      .from('make-70df0d6e-media')
      .getPublicUrl(path);

    console.log('Video thumbnail uploaded successfully:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Exception while uploading video thumbnail:', error);
    return null;
  }
}

/**
 * Complete workflow: generate and upload video thumbnail
 */
export async function generateAndUploadVideoThumbnail(
  videoFile: File, 
  seekToSec = 0.5
): Promise<{ thumbnailUrl: string | null; error?: string }> {
  try {
    if (!isVideoFile(videoFile)) {
      return { thumbnailUrl: null, error: 'File is not a supported video format' };
    }

    console.log('Generating thumbnail for video:', videoFile.name);
    
    // Generate thumbnail blob
    const thumbnailBlob = await makeVideoThumbnail(videoFile, seekToSec);
    
    if (thumbnailBlob.size === 0) {
      return { thumbnailUrl: null, error: 'Failed to generate thumbnail - empty blob' };
    }

    // Generate filename
    const thumbnailFilename = generateThumbnailFilename(videoFile.name);
    
    // Upload to storage
    const thumbnailUrl = await uploadVideoThumbnail(thumbnailBlob, thumbnailFilename);
    
    if (!thumbnailUrl) {
      return { thumbnailUrl: null, error: 'Failed to upload thumbnail to storage' };
    }

    console.log('Video thumbnail generation complete:', thumbnailUrl);
    return { thumbnailUrl };
    
  } catch (error) {
    console.error('Error in video thumbnail generation workflow:', error);
    return { 
      thumbnailUrl: null, 
      error: error instanceof Error ? error.message : 'Unknown error during thumbnail generation'
    };
  }
}