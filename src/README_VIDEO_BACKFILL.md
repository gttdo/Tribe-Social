# Video Thumbnail Backfill Guide

This guide explains how to backfill missing thumbnails for existing video posts in Tribe Board.

## Overview

When video posts are uploaded without thumbnails (due to `media_thumb_url` being NULL), you can use the built-in backfill utility to automatically generate and upload thumbnails for these posts.

## Accessing the Backfill Utility

### Method 1: Through the App Interface (Recommended)

1. **Open the App**: Navigate to your Tribe Board application
2. **Access Developer Menu**: 
   - Click the hamburger menu (☰) in the top right
   - Look for "Developer Utilities" or similar option
3. **Open Video Backfill**:
   - Click "Video Thumbnail Backfill" in the dev utilities menu
   - This opens a comprehensive interface for managing the backfill process

### Method 2: Browser Console (Advanced Users)

For direct console access, you can paste this script:

```javascript
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
  
  console.log(`Found ${rows?.length || 0} videos without thumbnails`);
  
  // 2. Process each video
  const bucket = 'make-70df0d6e-media';
  let processed = 0, successful = 0, failed = 0;
  
  for (const p of rows || []) {
    try {
      console.log(`Processing ${++processed}/${rows.length}: ${p.id}`);
      
      const resp = await fetch(p.media_url);
      const blob = await resp.blob();
      const thumb = await generateVideoThumbnail(new File([blob], 'v.mp4', { type: blob.type }), 1);
      const key = `posts/${p.user_id}/${p.id}/thumb.webp`;
      
      await supabase.storage.from(bucket).upload(key, thumb, { upsert: true });
      const pub = supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
      await supabase.from('posts').update({ media_thumb_url: pub }).eq('id', p.id);
      
      console.log(`✅ Successfully processed ${p.id}`);
      successful++;
      
    } catch (error) {
      console.error(`❌ Failed to process ${p.id}:`, error);
      failed++;
    }
  }
  
  console.log(`🎬 Backfill complete! ${successful} successful, ${failed} failed`);
})();
```

## Using the Interface

### Step 1: Scan for Videos
1. Click **"Scan Database"** to find video posts without thumbnails
2. Review the count of videos that need processing
3. Check for any scanning errors

### Step 2: Process Videos
1. Click **"Start Backfill"** to begin processing
2. Monitor the progress bar and current video being processed
3. Use **"Pause"** and **"Resume"** to control the process as needed
4. Watch for success/failure counts in real-time

### Step 3: Handle Errors
- View detailed error messages in the errors section
- Common issues include:
  - CORS restrictions when fetching video files
  - Storage quota limits
  - Network connectivity problems
  - Invalid video file formats

### Step 4: Reset if Needed
- Click **"Reset"** to clear all data and start over
- This is useful if you need to change parameters or restart the process

## Technical Details

### What the Backfill Does

1. **Scans Database**: Queries for posts where `post_type = 'video'` and `media_thumb_url IS NULL`
2. **Downloads Videos**: Fetches original video files from their storage URLs
3. **Generates Thumbnails**: Creates WebP thumbnails at 1-second mark of each video
4. **Uploads Thumbnails**: Stores thumbnails in the same bucket with organized paths
5. **Updates Database**: Sets `media_thumb_url` with the new thumbnail URL

### Storage Structure

Thumbnails are stored using this pattern:
```
posts/{user_id}/{post_id}/thumb.webp
```

### Safety Features

- **Batch Limiting**: Processes maximum 50 videos per run to prevent system overload
- **Progress Tracking**: Real-time monitoring of success/failure rates
- **Error Isolation**: Individual video failures don't stop the entire process
- **Pause/Resume**: Can be interrupted and continued as needed
- **Detailed Logging**: Comprehensive error reporting for troubleshooting

## Troubleshooting

### Common Issues

**"Failed to fetch video"**
- Video file may be corrupted or moved
- CORS policy may be blocking cross-origin requests
- Network connectivity issues

**"Upload failed"**
- Storage quota may be exceeded
- Permissions issues with the storage bucket
- File size limits exceeded

**"Database update failed"**
- RLS (Row Level Security) policies may be preventing updates
- Database connection issues
- Invalid post ID references

### Best Practices

1. **Run During Low Traffic**: Backfill can be resource-intensive
2. **Monitor Progress**: Watch for patterns in failures
3. **Check Storage Space**: Ensure adequate storage quota
4. **Test with Small Batches**: Use the 50-video limit effectively
5. **Backup First**: Consider backing up your database before large operations

## API Integration

For programmatic access, you can use the `backfillMissingThumbs` function:

```javascript
import { backfillMissingThumbs } from './utils/video-thumbnail-helpers';

// Backfill for a specific user
const results = await backfillMissingThumbs('user-id-here');

// Backfill for all users (admin only)
const results = await backfillMissingThumbs();

console.log('Backfill Results:', {
  total: results.total,
  successful: results.successful,
  failed: results.failed,
  errors: results.errors
});
```

## Security Notes

⚠️ **Important**: This utility should only be used in development or by administrators. It downloads video files and uploads thumbnails, which can consume significant bandwidth and storage.

The interface includes a "DEV ONLY" badge to remind users of this limitation.