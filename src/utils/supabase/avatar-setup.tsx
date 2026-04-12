import { supabase } from './client';
import { STORAGE_BUCKETS } from '../storage-constants';

/**
 * Creates the avatars bucket if it doesn't exist
 */
export async function createAvatarsBucket(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Setting up avatars storage bucket...');

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return { success: false, error: listError.message };
    }

    const avatarsBucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKETS.AVATARS);

    if (!avatarsBucketExists) {
      // Create the avatars bucket as public
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKETS.AVATARS, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        fileSizeLimit: 2 * 1024 * 1024, // 2MB
      });

      if (createError) {
        console.error('Error creating avatars bucket:', createError);
        return { success: false, error: createError.message };
      }

      console.log('✅ Avatars bucket created successfully');
    } else {
      console.log('✅ Avatars bucket already exists');
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to set up avatars bucket:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Checks if avatars bucket is properly configured
 */
export async function checkAvatarsStorage(): Promise<{ configured: boolean; error?: string }> {
  try {
    // Try to list files in the avatars bucket
    const { data, error } = await supabase.storage.from(STORAGE_BUCKETS.AVATARS).list('', {
      limit: 1
    });

    if (error) {
      // If bucket doesn't exist, try to create it
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        console.log('Avatars bucket not found, attempting to create...');
        const setupResult = await createAvatarsBucket();
        return { configured: setupResult.success, error: setupResult.error };
      }
      
      return { configured: false, error: error.message };
    }

    return { configured: true };
  } catch (error) {
    console.error('Error checking avatars storage:', error);
    return { 
      configured: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Initialize avatars storage on app startup
 */
export async function initializeAvatarsStorage(): Promise<void> {
  try {
    const { configured, error } = await checkAvatarsStorage();
    
    if (!configured) {
      console.log('Avatars storage not configured, setting up...');
      const setupResult = await createAvatarsBucket();
      
      if (!setupResult.success) {
        console.warn('Failed to setup avatars storage:', setupResult.error);
      }
    } else {
      console.log('✅ Avatars storage is properly configured');
    }
  } catch (error) {
    console.warn('Error initializing avatars storage:', error);
  }
}