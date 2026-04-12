import { supabase } from './supabase/client';

export interface StorageSetupResult {
  success: boolean;
  buckets: string[];
  errors: string[];
  warnings: string[];
}

/**
 * Ensures all required storage buckets exist
 * This utility handles the setup of storage buckets for the application
 */
export async function ensureStorageBuckets(): Promise<StorageSetupResult> {
  const result: StorageSetupResult = {
    success: false,
    buckets: [],
    errors: [],
    warnings: []
  };

  try {
    console.log('🪣 Starting storage bucket setup...');

    // Step 1: Check current buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Cannot list buckets:', listError);
      result.errors.push(`Cannot access storage: ${listError.message}`);
      return result;
    }

    const existingBucketNames = new Set(existingBuckets?.map(b => b.name) || []);
    console.log('📋 Existing buckets:', Array.from(existingBucketNames));

    // Step 2: Define required buckets
    const requiredBuckets = [
      {
        name: 'avatars',
        config: {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
          fileSizeLimit: 2 * 1024 * 1024 // 2MB
        }
      },
      {
        name: 'make-70df0d6e-media',
        config: {
          public: true,
          allowedMimeTypes: [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/mov',
            'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'
          ],
          fileSizeLimit: 5 * 1024 * 1024 // 5MB
        }
      }
    ];

    // Step 3: Check what buckets already exist
    for (const bucket of requiredBuckets) {
      if (existingBucketNames.has(bucket.name)) {
        result.buckets.push(bucket.name);
        console.log(`✅ Bucket already exists: ${bucket.name}`);
      }
    }

    // Step 4: For missing buckets, provide clear guidance for manual setup
    const missingBuckets = requiredBuckets.filter(b => !existingBucketNames.has(b.name));
    
    if (missingBuckets.length > 0) {
      console.log('📋 Missing buckets detected:', missingBuckets.map(b => b.name));
      
      for (const bucket of missingBuckets) {
        // Store only simple strings, no complex objects
        result.errors.push(`Missing bucket: ${bucket.name}`);
        result.warnings.push(`Setup required for ${bucket.name}`);
      }
    }

    // Step 5: Final verification 
    const finalMissingBuckets = requiredBuckets.filter(b => !result.buckets.includes(b.name));
    
    if (finalMissingBuckets.length === 0) {
      result.success = true;
      console.log('✅ All required storage buckets are available');
    } else {
      result.errors.push(`Missing buckets: ${finalMissingBuckets.map(b => b.name).join(', ')}`);
      console.log('⚠️ Some buckets need manual setup');
    }

    return result;

  } catch (error) {
    console.error('💥 Critical error in storage setup:', error);
    result.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Simple check if storage buckets are available
 */
export async function checkStorageHealth(): Promise<boolean> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.warn('⚠️ Storage health check failed:', error);
      return false;
    }

    const bucketNames = buckets?.map(b => b.name) || [];
    const hasAvatars = bucketNames.includes('avatars');
    const hasMedia = bucketNames.includes('make-70df0d6e-media');

    console.log('🏥 Storage health check:', {
      totalBuckets: bucketNames.length,
      hasAvatars,
      hasMedia,
      healthy: hasAvatars && hasMedia
    });

    return hasAvatars && hasMedia;
  } catch (error) {
    console.error('❌ Storage health check exception:', error);
    return false;
  }
}

/**
 * Initialize storage during app startup
 */
export async function initializeStorage(): Promise<void> {
  console.log('🚀 Initializing storage system...');
  
  try {
    // Quick timeout for storage check to avoid blocking app startup
    const timeoutPromise = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Storage check timeout')), 3000)
    );
    
    const healthPromise = checkStorageHealth();
    
    let health = false;
    try {
      health = await Promise.race([healthPromise, timeoutPromise]);
    } catch (timeoutError) {
      console.log('⚠️ Storage health check timed out, assuming unhealthy');
      health = false;
    }
    
    if (!health) {
      console.log('🔧 Storage needs setup, ensuring buckets...');
      
      try {
        const setupTimeoutPromise = new Promise<StorageSetupResult>((_, reject) => 
          setTimeout(() => reject(new Error('Setup timeout')), 2000)
        );
        
        const setupPromise = ensureStorageBuckets();
        const setup = await Promise.race([setupPromise, setupTimeoutPromise]);
        
        if (setup.success) {
          console.log('✅ Storage initialization complete');
        } else {
          // Just log a simple message - no complex objects
          console.log('⚠️ Storage buckets need manual setup. See STORAGE_SETUP_GUIDE.md for instructions.');
        }
      } catch (setupError) {
        console.log('⚠️ Storage setup timed out, manual setup may be required');
        console.log('📖 Manual Setup: Create avatars and make-70df0d6e-media buckets in Supabase Dashboard');
      }
    } else {
      console.log('✅ Storage system is healthy');
    }
  } catch (error) {
    // Ensure we never log objects that could be rendered
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.log('❌ Storage initialization had issues:', errorMsg);
    console.log('📖 If uploads fail, create storage buckets manually in Supabase Dashboard');
  }
}