/**
 * Video Thumbnail Backfill Utility for Tribe Board
 * 
 * This component provides a UI to backfill thumbnails for existing video posts.
 * It can also be run directly in the browser console using the following script:
 * 
 * // Quick browser console version:
 * (async function backfillVideoThumbnails() {
 *   console.log('🎬 Starting video thumbnail backfill...');
 *   
 *   // Import required functions
 *   const { supabase } = await import('./utils/supabase/client');
 *   const { generateVideoThumbnail } = await import('./utils/video-thumbnail-helpers');
 *   
 *   // 1. Fetch video posts missing thumbnails
 *   const { data: rows, error } = await supabase.from('posts')
 *     .select('id, user_id, media_url')
 *     .eq('post_type', 'video')
 *     .is('media_thumb_url', null)
 *     .order('created_at', { ascending: false })
 *     .limit(50);
 *   
 *   if (error) {
 *     console.error('❌ Database error:', error);
 *     return;
 *   }
 *   
 *   console.log(`Found ${rows?.length || 0} videos without thumbnails`);
 *   
 *   // 2. Process each video
 *   const bucket = 'make-70df0d6e-media';
 *   let processed = 0, successful = 0, failed = 0;
 *   
 *   for (const p of rows || []) {
 *     try {
 *       console.log(`Processing ${++processed}/${rows.length}: ${p.id}`);
 *       
 *       const resp = await fetch(p.media_url);
 *       const blob = await resp.blob();
 *       const thumb = await generateVideoThumbnail(new File([blob], 'v.mp4', { type: blob.type }), 1);
 *       const key = `posts/${p.user_id}/${p.id}/thumb.webp`;
 *       
 *       await supabase.storage.from(bucket).upload(key, thumb, { upsert: true });
 *       const pub = supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
 *       await supabase.from('posts').update({ media_thumb_url: pub }).eq('id', p.id);
 *       
 *       console.log(`✅ Successfully processed ${p.id}`);
 *       successful++;
 *       
 *     } catch (error) {
 *       console.error(`❌ Failed to process ${p.id}:`, error);
 *       failed++;
 *     }
 *   }
 *   
 *   console.log(`🎬 Backfill complete! ${successful} successful, ${failed} failed`);
 * })();
 */

import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Database,
  Image as ImageIcon,
  Info
} from 'lucide-react';
import { generateVideoThumbnail } from '../utils/video-thumbnail-helpers';

interface BackfillProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentVideo?: {
    id: string;
    url: string;
  };
}

interface BackfillError {
  postId: string;
  error: string;
  url?: string;
}

interface VideoPost {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
}

export function VideoThumbnailBackfill() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<BackfillProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });
  const [errors, setErrors] = useState<BackfillError[]>([]);
  const [videoPosts, setVideoPosts] = useState<VideoPost[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  // Scan for video posts missing thumbnails
  const scanVideoPosts = useCallback(async () => {
    try {
      console.log('🔍 Scanning for video posts without thumbnails...');
      
      const { supabase } = await import('../utils/supabase/client');
      
      const { data: rows, error } = await supabase
        .from('posts')
        .select('id, user_id, media_url, created_at')
        .eq('post_type', 'video')
        .is('media_thumb_url', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!rows || rows.length === 0) {
        toast.success('No video posts need thumbnail backfill!');
        setVideoPosts([]);
        setProgress({
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0
        });
      } else {
        console.log(`Found ${rows.length} video posts without thumbnails`);
        setVideoPosts(rows);
        setProgress({
          total: rows.length,
          processed: 0,
          successful: 0,
          failed: 0
        });
        toast.success(`Found ${rows.length} video posts that need thumbnails`);
      }
      
      setHasScanned(true);
      setErrors([]);
      
    } catch (error) {
      console.error('❌ Error scanning video posts:', error);
      toast.error(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setErrors([{ postId: 'scan', error: error instanceof Error ? error.message : 'Unknown error' }]);
    }
  }, []);

  // Process a single video post
  const processVideoPost = useCallback(async (post: VideoPost): Promise<boolean> => {
    if (isPaused) return false;
    
    try {
      console.log(`🎬 Processing video post ${post.id}...`);
      
      setProgress(prev => ({
        ...prev,
        currentVideo: {
          id: post.id,
          url: post.media_url
        }
      }));

      const { supabase } = await import('../utils/supabase/client');
      
      // 1. Download the video
      console.log(`📥 Downloading video from: ${post.media_url}`);
      const response = await fetch(post.media_url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log(`✅ Downloaded video blob: ${blob.size} bytes`);
      
      // 2. Generate thumbnail
      console.log('🖼️ Generating thumbnail...');
      const videoFile = new File([blob], 'video.mp4', { type: blob.type });
      const thumbnailBlob = await generateVideoThumbnail(videoFile, 1);
      console.log(`✅ Generated thumbnail: ${thumbnailBlob.size} bytes`);
      
      // 3. Upload thumbnail to storage
      const { STORAGE_BUCKETS } = await import('../utils/storage-constants');
      const bucketName = STORAGE_BUCKETS.MEDIA;
      const thumbnailPath = `posts/${post.user_id}/${post.id}/thumb.webp`;
      
      console.log(`📤 Uploading thumbnail to: ${thumbnailPath}`);
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(thumbnailPath, thumbnailBlob, { upsert: true });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 4. Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(thumbnailPath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for thumbnail');
      }

      console.log(`🔗 Thumbnail URL: ${urlData.publicUrl}`);

      // 5. Update database record
      console.log(`💾 Updating database record for post ${post.id}...`);
      const { error: updateError } = await supabase
        .from('posts')
        .update({ media_thumb_url: urlData.publicUrl })
        .eq('id', post.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log(`✅ Successfully processed video post ${post.id}`);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to process video post ${post.id}:`, errorMessage);
      
      setErrors(prev => [...prev, {
        postId: post.id,
        error: errorMessage,
        url: post.media_url
      }]);
      
      return false;
    }
  }, [isPaused]);

  // Run the backfill process
  const runBackfill = useCallback(async () => {
    if (videoPosts.length === 0) {
      toast.error('No video posts to process. Run scan first.');
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setErrors([]);
    
    console.log(`🚀 Starting backfill process for ${videoPosts.length} videos...`);
    toast.success(`Starting thumbnail backfill for ${videoPosts.length} videos...`);

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < videoPosts.length; i++) {
        if (isPaused) {
          console.log('⏸️ Backfill paused');
          toast.info('Backfill paused');
          break;
        }

        const post = videoPosts[i];
        console.log(`Processing ${i + 1}/${videoPosts.length}: ${post.id}`);
        
        const success = await processVideoPost(post);
        
        if (success) {
          successCount++;
        } else {
          failCount++;
        }

        setProgress(prev => ({
          ...prev,
          processed: i + 1,
          successful: successCount,
          failed: failCount,
          currentVideo: undefined
        }));

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!isPaused) {
        const message = `Backfill complete! ${successCount} successful, ${failCount} failed`;
        console.log(`✅ ${message}`);
        toast.success(message);
      }

    } catch (error) {
      console.error('❌ Backfill process error:', error);
      toast.error(`Backfill error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
      setProgress(prev => ({ ...prev, currentVideo: undefined }));
    }
  }, [videoPosts, processVideoPost, isPaused]);

  const pauseBackfill = useCallback(() => {
    setIsPaused(true);
    toast.info('Pausing backfill after current video...');
  }, []);

  const resumeBackfill = useCallback(() => {
    if (isRunning) {
      setIsPaused(false);
      toast.info('Resuming backfill...');
    }
  }, [isRunning]);

  const resetBackfill = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setProgress({
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0
    });
    setErrors([]);
    setVideoPosts([]);
    setHasScanned(false);
    toast.success('Backfill utility reset');
  }, []);

  const progressPercentage = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Video Thumbnail Backfill Utility
          <Badge variant="destructive" className="ml-2">DEV ONLY</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This utility generates thumbnails for existing video posts that don't have them. 
            It will download videos, generate thumbnails, upload them to storage, and update the database.
            <strong> This should only be used in development or by administrators.</strong>
          </AlertDescription>
        </Alert>

        {/* Scan Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-lg">1. Scan for Videos</h3>
            <Button 
              onClick={scanVideoPosts} 
              disabled={isRunning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Scan Database
            </Button>
          </div>
          
          {hasScanned && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/10 rounded-lg">
                <div className="text-2xl font-headline text-electric-blue">{progress.total}</div>
                <div className="text-sm text-muted-foreground">Videos Found</div>
              </div>
              <div className="text-center p-4 bg-muted/10 rounded-lg">
                <div className="text-2xl font-headline text-neon-lilac">{progress.processed}</div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div className="text-center p-4 bg-muted/10 rounded-lg">
                <div className="text-2xl font-headline text-green-400">{progress.successful}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-4 bg-muted/10 rounded-lg">
                <div className="text-2xl font-headline text-glitch-red">{progress.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          )}
        </div>

        {/* Processing Section */}
        {progress.total > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg">2. Process Videos</h3>
              <div className="flex gap-2">
                {!isRunning && (
                  <Button 
                    onClick={runBackfill} 
                    disabled={progress.total === 0}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Backfill
                  </Button>
                )}
                
                {isRunning && !isPaused && (
                  <Button 
                    onClick={pauseBackfill}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                )}
                
                {isRunning && isPaused && (
                  <Button 
                    onClick={resumeBackfill}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </Button>
                )}
                
                <Button 
                  onClick={resetBackfill}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress: {progress.processed}/{progress.total}</span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>
            
            {/* Current Video */}
            {progress.currentVideo && (
              <div className="p-3 bg-muted/10 rounded-lg">
                <div className="text-sm text-muted-foreground">Currently processing:</div>
                <div className="font-mono text-xs break-all">
                  Post ID: {progress.currentVideo.id}
                </div>
                <div className="font-mono text-xs break-all truncate">
                  URL: {progress.currentVideo.url}
                </div>
              </div>
            )}
            
            {/* Status Badges */}
            <div className="flex gap-2 flex-wrap">
              {isRunning && !isPaused && (
                <Badge variant="default" className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Running
                </Badge>
              )}
              {isPaused && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Pause className="w-3 h-3" />
                  Paused
                </Badge>
              )}
              {progress.successful > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 text-green-400 border-green-400">
                  <CheckCircle className="w-3 h-3" />
                  {progress.successful} Success
                </Badge>
              )}
              {progress.failed > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 text-glitch-red border-glitch-red">
                  <XCircle className="w-3 h-3" />
                  {progress.failed} Failed
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Errors Section */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-headline text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-glitch-red" />
              Errors ({errors.length})
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="font-mono text-xs text-destructive">
                    Post ID: {error.postId}
                  </div>
                  <div className="text-sm text-destructive mt-1">
                    {error.error}
                  </div>
                  {error.url && (
                    <div className="font-mono text-xs text-muted-foreground mt-1 truncate">
                      URL: {error.url}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}