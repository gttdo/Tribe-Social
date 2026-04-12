import { supabase } from './client';
import { STORAGE_BUCKETS } from '../storage-constants';

export interface AvatarUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImageProcessingOptions {
  maxSize: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
}

/**
 * Validates image file before upload
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Please upload JPG, PNG, or WebP.' };
  }

  // Check file size (2MB max)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'Max file size is 2 MB.' };
  }

  return { isValid: true };
}

/**
 * Validates image dimensions
 */
export function validateImageDimensions(width: number, height: number): { isValid: boolean; error?: string } {
  const minSize = 256;
  
  if (width < minSize || height < minSize) {
    return { isValid: false, error: 'Image must be at least 256×256 px.' };
  }

  return { isValid: true };
}

/**
 * Processes and resizes image to specified dimensions
 */
export function processImage(
  file: File, 
  cropData: { x: number; y: number; width: number; height: number },
  options: ImageProcessingOptions = { maxSize: 1024, quality: 0.82, format: 'webp' }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    console.log('🖼️ Processing image:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      cropData,
      options
    });

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('❌ Could not get canvas context');
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      try {
        console.log('📐 Original image dimensions:', img.width, 'x', img.height);
        console.log('✂️ Crop area:', cropData);

        // Validate crop data
        if (cropData.width <= 0 || cropData.height <= 0) {
          console.error('❌ Invalid crop data - zero or negative dimensions');
          reject(new Error('Invalid crop area. Please adjust the crop and try again.'));
          return;
        }

        // Set canvas size to target dimensions
        canvas.width = options.maxSize;
        canvas.height = options.maxSize;

        // Calculate source dimensions based on crop data
        const sourceX = Math.max(0, cropData.x);
        const sourceY = Math.max(0, cropData.y);
        const sourceWidth = Math.min(cropData.width, img.width - sourceX);
        const sourceHeight = Math.min(cropData.height, img.height - sourceY);

        console.log('🎯 Adjusted crop area:', {
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          targetSize: options.maxSize
        });

        // Draw the cropped image to canvas
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, options.maxSize, options.maxSize
        );

        console.log('🎨 Image drawn to canvas, converting to blob...');

        // Convert to blob with specified format and quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log('✅ Image processing successful, blob size:', blob.size);
              resolve(blob);
            } else {
              console.error('❌ Failed to create blob from canvas');
              reject(new Error('Failed to process image'));
            }
          },
          `image/${options.format}`,
          options.quality
        );
      } catch (error) {
        console.error('❌ Error processing image:', error);
        reject(error);
      }
    };

    img.onerror = (error) => {
      console.error('❌ Failed to load image:', error);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
    console.log('📂 Image object URL created, waiting for load...');
  });
}

/**
 * Generates multiple avatar sizes from master image
 */
export async function generateAvatarSizes(masterBlob: Blob): Promise<{
  master: Blob;
  large: Blob;
  medium: Blob;
  small: Blob;
}> {
  const sizes = {
    master: 1024,
    large: 384,
    medium: 192,
    small: 96
  };

  const processSize = (size: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      img.onload = () => {
        canvas.width = size;
        canvas.height = size;
        
        ctx.drawImage(img, 0, 0, size, size);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error(`Failed to generate ${size}px version`));
            }
          },
          'image/webp',
          0.82
        );
      };

      img.onerror = () => reject(new Error(`Failed to load image for ${size}px version`));
      img.src = URL.createObjectURL(masterBlob);
    });
  };

  try {
    const [large, medium, small] = await Promise.all([
      processSize(sizes.large),
      processSize(sizes.medium),
      processSize(sizes.small)
    ]);

    return {
      master: masterBlob,
      large,
      medium,
      small
    };
  } catch (error) {
    throw new Error(`Failed to generate avatar sizes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Uploads avatar to Supabase storage
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  cropData: { x: number; y: number; width: number; height: number }
): Promise<AvatarUploadResult> {
  try {
    console.log('🔄 Starting avatar upload process...', {
      userId: userId?.substring(0, 8) + '...',
      fileSize: file.size,
      fileType: file.type,
      cropData
    });

    // Validate file
    const fileValidation = validateImageFile(file);
    if (!fileValidation.isValid) {
      console.error('❌ File validation failed:', fileValidation.error);
      return { success: false, error: fileValidation.error };
    }

    console.log('✅ File validation passed');

    // Process master image
    console.log('🖼️ Processing master image...');
    const masterBlob = await processImage(file, cropData);
    console.log('✅ Master image processed, size:', masterBlob.size);
    
    // Generate all sizes
    console.log('📏 Generating avatar sizes...');
    const avatarSizes = await generateAvatarSizes(masterBlob);
    console.log('✅ Avatar sizes generated:', Object.keys(avatarSizes).map(size => `${size}:${avatarSizes[size].size}b`));

    // Get current avatar version and increment by 1 (small integer counter)
    console.log('🔢 Getting current avatar version for increment...');
    let currentVersion = 0;
    
    try {
      // Avatar version no longer stored in DB - use timestamp-based versioning
      currentVersion = Math.floor(Date.now() / 1000);
    } catch (error) {
      console.warn('Could not get current avatar version, starting from 0:', error);
      currentVersion = 0;
    }
    
    const newVersion = currentVersion + 1; // Increment by 1 (small integer)
    console.log('📊 Using avatar version:', newVersion, '(incremented from', currentVersion + ')');

    // Enhanced bucket checking and creation with better error handling
    console.log('🪣 Checking avatars bucket...');
    
    let avatarsBucket;
    let buckets;
    
    try {
      const { data: bucketList, error: bucketListError } = await supabase.storage.listBuckets();
      
      if (bucketListError) {
        console.error('❌ Error listing buckets:', bucketListError);
        // Don't fail immediately - try server bucket creation
        buckets = [];
      } else {
        buckets = bucketList || [];
      }
      
      avatarsBucket = buckets?.find(bucket => bucket.name === STORAGE_BUCKETS.AVATARS);
      
    } catch (listError) {
      console.error('❌ Exception listing buckets:', listError);
      buckets = [];
    }
    
    if (!avatarsBucket) {
      console.warn('⚠️ Avatars bucket not found. Available buckets:', buckets?.map(b => b.name) || []);
      console.log('🔧 Attempting bucket creation via server endpoint...');
      
      // Try server endpoint first (more reliable with proper permissions)
      try {
        const { projectId, publicAnonKey } = await import('../supabase/info');
        
        console.log('📡 Calling server bucket creation endpoint...');
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70df0d6e/storage/ensure-buckets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey  // Also send as direct API key
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Server bucket creation result:', result);
          
          // Give the server a moment to complete bucket creation
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify the bucket was created by listing again
          const { data: updatedBuckets, error: relistError } = await supabase.storage.listBuckets();
          
          if (relistError) {
            console.warn('⚠️ Could not verify bucket creation:', relistError);
            // Proceed optimistically
            avatarsBucket = { name: STORAGE_BUCKETS.AVATARS, public: true };
          } else {
            avatarsBucket = updatedBuckets?.find(bucket => bucket.name === STORAGE_BUCKETS.AVATARS);
            
            if (!avatarsBucket) {
              console.warn('⚠️ Bucket still not found after server creation, proceeding optimistically');
              // Don't fail - the upload might still work
              avatarsBucket = { name: STORAGE_BUCKETS.AVATARS, public: true };
            } else {
              console.log('✅ Verified avatars bucket exists after server creation');
            }
          }
        } else {
          let errorText;
          try {
            const errorData = await response.json();
            errorText = errorData.error || errorData.message || response.statusText;
            console.log('📊 Server bucket creation response:', errorData);
          } catch {
            errorText = await response.text();
          }
          console.error('❌ Server bucket creation failed:', errorText);
          
          // Try client bucket creation as final fallback
          console.log('🔄 Fallback: Trying client bucket creation...');
          
          try {
            const { data: newBucket, error: createError } = await supabase.storage.createBucket(STORAGE_BUCKETS.AVATARS, {
              public: true,
              allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
              fileSizeLimit: 2 * 1024 * 1024 // 2MB
            });
            
            if (createError) {
              console.error('❌ Client bucket creation also failed:', createError);
              
              // Check for RLS error
              if (createError.message.includes('row-level security') || createError.message.includes('RLS') || createError.message.includes('policy')) {
                return { 
                  success: false, 
                  error: `🔧 Storage Setup Required

Avatar uploads need manual bucket setup due to security policies.

Quick Fix:
1. Go to your Supabase Dashboard → Storage
2. Create bucket: "${STORAGE_BUCKETS.AVATARS}" 
3. Set it to Public access
4. Try uploading again

For detailed help, add "?storage-instructions" to your URL.` 
                };
              } else {
                return { 
                  success: false, 
                  error: 'Avatar storage setup failed. The storage buckets could not be created automatically. Please contact support or try again later.' 
                };
              }
            } else {
              console.log('✅ Created avatars bucket via client fallback:', newBucket);
              avatarsBucket = { name: STORAGE_BUCKETS.AVATARS, public: true };
            }
          } catch (clientError) {
            console.error('❌ Client bucket creation exception:', clientError);
            
            // Check for RLS error
            const errorMessage = clientError instanceof Error ? clientError.message : String(clientError);
            if (errorMessage.includes('row-level security') || errorMessage.includes('RLS') || errorMessage.includes('policy')) {
              return { 
                success: false, 
                error: `🔧 Storage Manual Setup Required

Please create storage bucket manually:
1. Open Supabase Dashboard → Storage
2. Create bucket: "${STORAGE_BUCKETS.AVATARS}"
3. Enable Public access
4. Try again

Need help? Add "?storage-instructions" to your URL.` 
              };
            } else {
              return { 
                success: false, 
                error: 'Avatar storage setup failed. Unable to create storage buckets. Please contact support.' 
              };
            }
          }
        }
      } catch (serverError) {
        console.error('❌ Server endpoint error:', serverError);
        
        // Final fallback: try client creation
        console.log('🔄 Final fallback: Direct client bucket creation...');
        
        try {
          const { data: newBucket, error: createError } = await supabase.storage.createBucket(STORAGE_BUCKETS.AVATARS, {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
            fileSizeLimit: 2 * 1024 * 1024
          });
          
          if (createError) {
            console.error('❌ Final fallback failed:', createError);
            
            // Check for RLS error
            if (createError.message.includes('row-level security') || createError.message.includes('RLS') || createError.message.includes('policy')) {
              return { 
                success: false, 
                error: `🔧 Storage Manual Setup Required

Please create storage bucket manually:
1. Open Supabase Dashboard → Storage  
2. Create bucket: "${STORAGE_BUCKETS.AVATARS}"
3. Enable Public access
4. Try again

Need help? Add "?storage-instructions" to your URL.` 
              };
            } else {
              return { 
                success: false, 
                error: 'Avatar storage is not available. Please try again later or contact support.' 
              };
            }
          } else {
            console.log('✅ Created avatars bucket via final fallback:', newBucket);
            avatarsBucket = { name: STORAGE_BUCKETS.AVATARS, public: true };
          }
        } catch (finalError) {
          console.error('❌ Final fallback exception:', finalError);
          
          // Check for RLS error
          const errorMessage = finalError instanceof Error ? finalError.message : String(finalError);
          if (errorMessage.includes('row-level security') || errorMessage.includes('RLS') || errorMessage.includes('policy')) {
            return { 
              success: false, 
              error: `🔧 Storage Manual Setup Required

Please create storage bucket manually:
1. Open Supabase Dashboard → Storage
2. Create bucket: "${STORAGE_BUCKETS.AVATARS}" 
3. Enable Public access
4. Try again

Need help? Add "?storage-instructions" to your URL.` 
            };
          } else {
            return { 
              success: false, 
              error: 'Avatar storage system is currently unavailable. Please try again later.' 
            };
          }
        }
      }
    } else {
      console.log('✅ Avatars bucket found:', avatarsBucket.name);
    }

    console.log('✅ Avatars bucket confirmed, proceeding with upload...');

    // Upload all sizes to Supabase Storage
    console.log('☁️ Starting uploads to Supabase Storage...');
    const uploadResults = [];
    
    for (const [size, blob] of Object.entries(avatarSizes)) {
      const filename = `${userId}/${newVersion}_${size}.webp`;
      console.log(`📤 Uploading ${size} (${blob.size}b) to: ${filename}`);
      
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(filename, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/webp'
        });

      if (error) {
        console.error(`❌ Failed to upload ${size} avatar:`, error);
        
        // Check for RLS policy violations in upload errors
        if (error.message.includes('row-level security') || error.message.includes('RLS') || error.message.includes('policy')) {
          throw new Error(`🔧 Storage Permission Error

The upload failed due to security policies.

Quick Fix:
1. Go to Supabase Dashboard → Storage
2. Create bucket: "${STORAGE_BUCKETS.AVATARS}"
3. Set to Public access  
4. Try again

For detailed help: Add "?storage-instructions" to your URL`);
        }
        
        throw new Error(`Failed to upload ${size} avatar: ${error.message}`);
      }

      console.log(`✅ ${size} uploaded successfully:`, data);
      uploadResults.push({ size, filename, path: data.path });
    }

    console.log('✅ All avatar sizes uploaded successfully');

    // Get public URL for the medium size (main avatar)
    const mediumFilename = `${userId}/${newVersion}_medium.webp`;
    console.log('🔗 Getting public URL for:', mediumFilename);
    
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .getPublicUrl(mediumFilename);

    const avatarUrl = urlData.publicUrl;
    console.log('🔗 Avatar URL generated:', avatarUrl);

    // Update user profile with new avatar URL and version (database-first avatar system)
    console.log('💾 Updating user profile...');
    
    // Update profile table with new avatar URL and version for database-first avatar system
    console.log('💾 Updating profile table with new avatar URL...');
    
    const updateData = {
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    };
    
    try {
      const { error: updateError } = await supabase
        .from('profile')
        .update(updateData)
        .eq('id', userId);
      
      if (updateError) {
        console.error('❌ Failed to update profile table:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }
      
      console.log('✅ Profiles table updated successfully');
    } catch (error) {
      console.error('❌ Profile update exception:', error);
      throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('✅ Avatar upload completed successfully!', {
      avatarUrl,
      version: newVersion,
      uploadCount: uploadResults.length
    });

    return {
      success: true,
      url: avatarUrl
    };

  } catch (error) {
    console.error('💥 Avatar upload error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Something went wrong. Try again.';
    
    if (error instanceof Error) {
      if (error.message.includes('Storage Permission Error') || error.message.includes('Storage Manual Setup Required')) {
        // Pass through our custom storage setup messages
        errorMessage = error.message;
      } else if (error.message.includes('Failed to upload') && error.message.includes('row-level security')) {
        errorMessage = `🔧 Storage Setup Required

Avatar uploads need manual bucket setup.

Quick Fix:
1. Go to Supabase Dashboard → Storage
2. Create bucket: "${STORAGE_BUCKETS.AVATARS}"
3. Set to Public access
4. Try again

Add "?storage-instructions" to your URL for detailed help.`;
      } else if (error.message.includes('Failed to upload')) {
        errorMessage = 'Upload failed. Please check your internet connection and try again.';
      } else if (error.message.includes('Failed to update user profile')) {
        errorMessage = 'Image uploaded but failed to update profile. Please refresh and try again.';
      } else if (error.message.includes('Storage system unavailable')) {
        errorMessage = 'Storage system temporarily unavailable. Please try again in a few moments.';
      } else if (error.message.includes('Avatar storage not configured')) {
        errorMessage = 'Avatar feature is being set up. Please try again in a few minutes.';
      } else if (error.message.includes('Failed to process image')) {
        errorMessage = 'Image processing failed. Please try a different image or format.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Removes user avatar
 */
export async function removeAvatar(userId: string): Promise<AvatarUploadResult> {
  try {
    // Try to get current avatar version from profile table
    let currentVersion = 0;
    
    try {
      currentVersion = Math.floor(Date.now() / 1000);
    } catch (error: any) {
      console.warn('Could not get avatar version for cleanup:', error);
      currentVersion = 0;
    }

    // Remove avatar files from storage if we have a version
    if (currentVersion > 0) {
      const filesToRemove = ['master', 'large', 'medium', 'small'].map(
        size => `${userId}/${currentVersion}_${size}.webp`
      );

      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .remove(filesToRemove);

      if (removeError) {
        console.warn('Failed to remove avatar files:', removeError);
        // Continue anyway, as we can still clear the profile
      }
    }

    // Update profile table to remove avatar URL (database-first avatar system)
    const { error: updateError } = await supabase
      .from('profile')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update user profile: ${updateError.message}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Avatar removal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Something went wrong. Try again.'
    };
  }
}

/**
 * Gets avatar srcset for responsive images
 */
export function getAvatarSrcSet(userId: string, version: number): string {
  const baseUrl = supabase.storage.from(STORAGE_BUCKETS.AVATARS).getPublicUrl('').data.publicUrl;
  
  return [
    `${baseUrl}${userId}/${version}_small.webp 96w`,
    `${baseUrl}${userId}/${version}_medium.webp 192w`,
    `${baseUrl}${userId}/${version}_large.webp 384w`
  ].join(', ');
}

/**
 * Gets default avatar URL for a given size
 */
export function getAvatarUrl(userId: string, version: number, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKETS.AVATARS)
    .getPublicUrl(`${userId}/${version}_${size}.webp`);
  
  return data.publicUrl;
}

/**
 * Gets current avatar version for a user (with fallback for missing column)
 */
export async function getUserAvatarVersion(userId: string): Promise<number> {
  try {
    // Avatar version no longer stored - use timestamp
    return Math.floor(Date.now() / 1000);
  } catch (error) {
    console.warn('Could not get user avatar version:', error);
    return 1; // Default fallback
  }
}