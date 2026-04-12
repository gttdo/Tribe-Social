/**
 * Manual Storage Setup Utility
 * 
 * This utility helps users manually create and configure storage buckets
 * when automatic creation fails due to RLS policies or permissions.
 */

import { supabase } from './supabase/client';
import { STORAGE_BUCKETS } from './storage-constants';

export interface StorageSetupResult {
  success: boolean;
  message: string;
  buckets?: {
    avatars: boolean;
    media: boolean;
  };
  error?: string;
}

/**
 * Manually ensure storage buckets exist and are properly configured
 */
export async function manualStorageSetup(): Promise<StorageSetupResult> {
  try {
    console.log('🔧 Starting manual storage setup...');
    
    // Check current buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return {
        success: false,
        message: 'Cannot access storage system',
        error: listError.message
      };
    }
    
    const existingBuckets = new Set(buckets?.map(b => b.name) || []);
    console.log('📋 Existing buckets:', Array.from(existingBuckets));
    
    const results = {
      avatars: existingBuckets.has(STORAGE_BUCKETS.AVATARS),
      media: existingBuckets.has(STORAGE_BUCKETS.MEDIA)
    };
    
    // Try to create missing buckets
    const bucketsToCreate = [];
    
    if (!results.avatars) {
      bucketsToCreate.push({
        name: STORAGE_BUCKETS.AVATARS,
        config: {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
          fileSizeLimit: 2 * 1024 * 1024 // 2MB
        }
      });
    }
    
    if (!results.media) {
      bucketsToCreate.push({
        name: STORAGE_BUCKETS.MEDIA,
        config: {
          public: true,
          allowedMimeTypes: [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/mov',
            'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'
          ],
          fileSizeLimit: 5 * 1024 * 1024 // 5MB
        }
      });
    }
    
    if (bucketsToCreate.length === 0) {
      return {
        success: true,
        message: 'All storage buckets already exist',
        buckets: results
      };
    }
    
    // Try to create buckets via server endpoint first
    try {
      const { projectId, publicAnonKey } = await import('./supabase/info');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70df0d6e/storage/ensure-buckets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'apikey': publicAnonKey
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Server bucket creation completed:', result);
        
        // Verify buckets were created
        const { data: updatedBuckets } = await supabase.storage.listBuckets();
        const updatedBucketNames = new Set(updatedBuckets?.map(b => b.name) || []);
        
        return {
          success: true,
          message: 'Storage buckets created successfully via server',
          buckets: {
            avatars: updatedBucketNames.has(STORAGE_BUCKETS.AVATARS),
            media: updatedBucketNames.has(STORAGE_BUCKETS.MEDIA)
          }
        };
      } else {
        console.warn('⚠️ Server bucket creation failed, trying client fallback...');
      }
    } catch (serverError) {
      console.warn('⚠️ Server endpoint unavailable, trying client creation...', serverError);
    }
    
    // Fallback to client-side bucket creation
    const createResults = [];
    
    for (const bucket of bucketsToCreate) {
      try {
        console.log(`🔧 Creating bucket: ${bucket.name}`);
        
        const { data, error } = await supabase.storage.createBucket(bucket.name, bucket.config);
        
        if (error) {
          console.error(`❌ Failed to create ${bucket.name}:`, error);
          createResults.push({
            bucket: bucket.name,
            success: false,
            error: error.message
          });
        } else {
          console.log(`✅ Created bucket: ${bucket.name}`);
          createResults.push({
            bucket: bucket.name,
            success: true
          });
        }
      } catch (exception) {
        console.error(`💥 Exception creating ${bucket.name}:`, exception);
        createResults.push({
          bucket: bucket.name,
          success: false,
          error: exception instanceof Error ? exception.message : 'Unknown error'
        });
      }
    }
    
    // Check final results
    const { data: finalBuckets } = await supabase.storage.listBuckets();
    const finalBucketNames = new Set(finalBuckets?.map(b => b.name) || []);
    
    const finalResults = {
      avatars: finalBucketNames.has(STORAGE_BUCKETS.AVATARS),
      media: finalBucketNames.has(STORAGE_BUCKETS.MEDIA)
    };
    
    const allSuccess = finalResults.avatars && finalResults.media;
    
    if (allSuccess) {
      return {
        success: true,
        message: 'All storage buckets are now available',
        buckets: finalResults
      };
    } else {
      const missingBuckets = [];
      if (!finalResults.avatars) missingBuckets.push('avatars');
      if (!finalResults.media) missingBuckets.push('media');
      
      return {
        success: false,
        message: `Some buckets could not be created: ${missingBuckets.join(', ')}`,
        buckets: finalResults,
        error: 'Manual bucket creation in Supabase Dashboard may be required'
      };
    }
    
  } catch (error) {
    console.error('💥 Manual storage setup failed:', error);
    return {
      success: false,
      message: 'Storage setup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test storage upload permissions
 */
export async function testStoragePermissions(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        message: 'Not authenticated - sign in to test storage permissions'
      };
    }
    
    // Try via server test endpoint
    try {
      const { projectId } = await import('./supabase/info');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70df0d6e/test-avatar-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          message: 'Storage permissions are working correctly',
          details: result
        };
      } else {
        return {
          success: false,
          message: result.error || 'Storage permission test failed',
          details: result
        };
      }
    } catch (testError) {
      return {
        success: false,
        message: 'Could not test storage permissions',
        details: { error: testError instanceof Error ? testError.message : testError }
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: 'Storage permission test error',
      details: { error: error instanceof Error ? error.message : error }
    };
  }
}