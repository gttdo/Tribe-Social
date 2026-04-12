/**
 * Enhanced Media Upload and Processing Helpers
 * 
 * Provides comprehensive media handling with validation, compression, and upload
 */

import { supabase } from './supabase/client';

export interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio';
  dataUrl?: string;
  compressed?: File;
  thumbnail?: string;
  duration?: number;
  dimensions?: { width: number; height: number };
}

export interface MediaUploadResult {
  success: boolean;
  mediaUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  metadata?: {
    type: string;
    size: number;
    duration?: number;
    dimensions?: { width: number; height: number };
  };
}

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validate media file before processing
 */
export function validateMediaFile(file: File): MediaValidationResult {
  const result: MediaValidationResult = { valid: true, warnings: [] };

  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    result.valid = false;
    result.error = `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 50MB limit`;
    return result;
  }

  // Check file type
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'],
    audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mpeg']
  };

  const allAllowedTypes = [...allowedTypes.image, ...allowedTypes.video, ...allowedTypes.audio];
  
  if (!allAllowedTypes.includes(file.type)) {
    result.valid = false;
    result.error = `File type "${file.type}" is not supported`;
    return result;
  }

  // Add warnings for large files
  const warningSize = 10 * 1024 * 1024; // 10MB
  if (file.size > warningSize) {
    result.warnings?.push(`Large file size (${(file.size / 1024 / 1024).toFixed(1)}MB) may take longer to upload`);
  }

  return result;
}

/**
 * Determine media type from file
 */
export function getMediaType(file: File): 'image' | 'video' | 'audio' | 'unknown' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'unknown';
}

/**
 * Create data URL from file
 */
export function createDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to create data URL'));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    const url = URL.createObjectURL(file);
    img.src = url;
  });
}

/**
 * Get video metadata
 */
export function getVideoMetadata(file: File): Promise<{ duration: number; dimensions: { width: number; height: number } }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        dimensions: { width: video.videoWidth, height: video.videoHeight }
      });
      
      URL.revokeObjectURL(video.src);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Get audio duration
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(audio.src);
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error('Failed to load audio metadata'));
    };
    
    audio.src = URL.createObjectURL(file);
  });
}

/**
 * Compress image file
 */
export function compressImage(file: File, quality: number = 0.8, maxWidth: number = 1920): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Cannot get canvas context'));
      return;
    }
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
      
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create video thumbnail
 */
export function createVideoThumbnail(file: File, timeOffset: number = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Cannot get canvas context'));
      return;
    }
    
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      video.currentTime = Math.min(timeOffset, video.duration - 0.1);
    };
    
    video.onseeked = () => {
      ctx.drawImage(video, 0, 0);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      resolve(thumbnail);
      URL.revokeObjectURL(video.src);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to create video thumbnail'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Process media file with metadata extraction
 */
export async function processMediaFile(file: File): Promise<MediaFile> {
  console.log('📁 Processing media file:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)}MB`);
  
  // Validate file
  const validation = validateMediaFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const mediaType = getMediaType(file);
  const mediaFile: MediaFile = { file, type: mediaType };
  
  try {
    // Create data URL
    mediaFile.dataUrl = await createDataUrl(file);
    
    // Process based on type
    if (mediaType === 'image') {
      mediaFile.dimensions = await getImageDimensions(file);
      
      // Compress if large
      if (file.size > 2 * 1024 * 1024) { // 2MB
        console.log('🗜️ Compressing large image...');
        mediaFile.compressed = await compressImage(file);
      }
    } else if (mediaType === 'video') {
      const metadata = await getVideoMetadata(file);
      mediaFile.duration = metadata.duration;
      mediaFile.dimensions = metadata.dimensions;
      
      // Create thumbnail
      console.log('🎬 Creating video thumbnail...');
      mediaFile.thumbnail = await createVideoThumbnail(file);
    } else if (mediaType === 'audio') {
      mediaFile.duration = await getAudioDuration(file);
    }
    
    console.log('✅ Media file processed successfully:', {
      type: mediaFile.type,
      dimensions: mediaFile.dimensions,
      duration: mediaFile.duration,
      hasCompressed: !!mediaFile.compressed,
      hasThumbnail: !!mediaFile.thumbnail
    });
    
    return mediaFile;
  } catch (error) {
    console.error('❌ Error processing media file:', error);
    throw error;
  }
}

/**
 * Upload media file to Supabase Storage
 */
export async function uploadMediaFile(mediaFile: MediaFile): Promise<MediaUploadResult> {
  console.log('☁️ Uploading media file to storage...');
  
  try {
    const fileToUpload = mediaFile.compressed || mediaFile.file;
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${getFileExtension(fileToUpload)}`;
    const bucketName = 'make-70df0d6e-media';
    
    // Upload main file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    const result: MediaUploadResult = {
      success: true,
      mediaUrl: urlData.publicUrl,
      metadata: {
        type: mediaFile.type,
        size: fileToUpload.size,
        duration: mediaFile.duration,
        dimensions: mediaFile.dimensions
      }
    };
    
    // Upload thumbnail if exists
    if (mediaFile.thumbnail) {
      const thumbnailBlob = dataUrlToBlob(mediaFile.thumbnail);
      const thumbnailFileName = `thumb-${fileName}`;
      
      const { error: thumbError } = await supabase.storage
        .from(bucketName)
        .upload(thumbnailFileName, thumbnailBlob, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (!thumbError) {
        const { data: thumbUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(thumbnailFileName);
        
        result.thumbnailUrl = thumbUrlData.publicUrl;
      }
    }
    
    console.log('✅ Media upload successful:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Media upload failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

/**
 * Helper functions
 */
function getFileExtension(file: File): string {
  const name = file.name;
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.substring(lastDot + 1) : 'bin';
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  
  return new Blob([array], { type: mime });
}

/**
 * Check media upload state
 */
export function validateMediaState(mediaFile?: MediaFile | null): {
  hasMediaFile: boolean;
  mediaFileSize: number;
  hasMediaPreview: boolean;
  canPublish: boolean;
  error?: string;
} {
  const state = {
    hasMediaFile: !!mediaFile,
    mediaFileSize: mediaFile?.file.size || 0,
    hasMediaPreview: !!(mediaFile?.dataUrl || mediaFile?.thumbnail),
    canPublish: false,
    error: undefined as string | undefined
  };
  
  if (!mediaFile) {
    state.error = 'No media file selected';
    return state;
  }
  
  const validation = validateMediaFile(mediaFile.file);
  if (!validation.valid) {
    state.error = validation.error;
    return state;
  }
  
  state.canPublish = true;
  return state;
}

export default {
  validateMediaFile,
  getMediaType,
  processMediaFile,
  uploadMediaFile,
  validateMediaState,
  createDataUrl,
  getImageDimensions,
  getVideoMetadata,
  getAudioDuration,
  compressImage,
  createVideoThumbnail
};