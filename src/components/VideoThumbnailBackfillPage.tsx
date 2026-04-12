import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Video, Play, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface VideoPost {
  id: string;
  user_id: string;
  media_url: string;
  media_thumb_url: string | null;
  text_body: string | null;
  created_at: string;
}

interface BackfillResult {
  postId: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
}

export function VideoThumbnailBackfillPage() {
  const [videoPosts, setVideoPosts] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<BackfillResult[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Load video posts without thumbnails
  const loadVideoPosts = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('Please sign in to continue');
        return;
      }

      setCurrentUserId(session.user.id);
      
      // Get all video posts, showing which ones have/don't have thumbnails
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, user_id, media_url, media_thumb_url, text_body, created_at')
        .eq('post_type', 'video')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      setVideoPosts(posts || []);
      toast.success(`Found ${posts?.length || 0} video posts`);
      
    } catch (error) {
      console.error('Error loading video posts:', error);
      toast.error('Failed to load video posts');
    } finally {
      setLoading(false);
    }
  };

  // Generate thumbnail for a single video
  const generateThumbnailForVideo = async (post: VideoPost): Promise<BackfillResult> => {
    try {
      console.log(`🎬 Generating thumbnail for post ${post.id}...`);
      
      // Fetch the video file
      const response = await fetch(post.media_url, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status}`);
      }

      const videoBlob = await response.blob();
      const videoFile = new File([videoBlob], 'video.mp4', { type: videoBlob.type || 'video/mp4' });

      // Generate thumbnail using the existing helper
      const { generateVideoThumbnail } = await import('../utils/video-thumbnail-helpers');
      const thumbnailBlob = await generateVideoThumbnail(videoFile, 1);

      // Upload thumbnail to storage
      const { STORAGE_BUCKETS } = await import('../utils/storage-constants');
      const bucket = STORAGE_BUCKETS.MEDIA;
      const thumbnailPath = `posts/${post.user_id}/${post.id}/thumb.webp`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(thumbnailPath, thumbnailBlob, { upsert: true });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(thumbnailPath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Update database
      const { error: updateError } = await supabase
        .from('posts')
        .update({ media_thumb_url: urlData.publicUrl })
        .eq('id', post.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      return {
        postId: post.id,
        status: 'success',
        message: 'Thumbnail generated successfully'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to generate thumbnail for post ${post.id}:`, errorMessage);
      
      return {
        postId: post.id,
        status: 'failed',
        message: errorMessage
      };
    }
  };

  // Run backfill for all videos missing thumbnails
  const runBackfill = async (onlyMissing = true) => {
    if (videoPosts.length === 0) {
      toast.error('Please load video posts first');
      return;
    }

    setProcessing(true);
    setResults([]);

    try {
      let postsToProcess = videoPosts;
      
      if (onlyMissing) {
        postsToProcess = videoPosts.filter(post => !post.media_thumb_url);
      }

      if (postsToProcess.length === 0) {
        toast.info('No video posts need thumbnail generation');
        return;
      }

      toast.info(`Processing ${postsToProcess.length} video posts...`);
      
      const results: BackfillResult[] = [];
      
      for (let i = 0; i < postsToProcess.length; i++) {
        const post = postsToProcess[i];
        
        toast.loading(`Processing ${i + 1}/${postsToProcess.length}: ${post.id}`, {
          id: 'backfill-progress'
        });

        const result = await generateThumbnailForVideo(post);
        results.push(result);

        // Update the local state
        if (result.status === 'success') {
          setVideoPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, media_thumb_url: 'generated' } // Placeholder to show it's been processed
              : p
          ));
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast.dismiss('backfill-progress');
      setResults(results);

      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;

      toast.success(`Backfill complete! ${successful} successful, ${failed} failed`);

    } catch (error) {
      console.error('Backfill process error:', error);
      toast.error('Backfill process failed');
    } finally {
      setProcessing(false);
    }
  };

  const postsWithoutThumbnails = videoPosts.filter(post => !post.media_thumb_url);
  const postsWithThumbnails = videoPosts.filter(post => post.media_thumb_url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-headline text-pearl-white flex items-center justify-center gap-2">
            <Video className="w-6 h-6 text-electric-blue" />
            Video Thumbnail Backfill
          </h1>
          <p className="text-muted-lavender">
            Generate missing thumbnails for video posts
          </p>
        </div>

        {/* Stats Card */}
        <Card className="bg-midnight-black/80 border-muted-lavender/20">
          <CardHeader>
            <CardTitle className="text-pearl-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-electric-blue" />
              Video Posts Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-midnight-black/50 border border-muted-lavender/10">
                <div className="text-2xl font-headline text-pearl-white">{videoPosts.length}</div>
                <div className="text-sm text-muted-lavender">Total Videos</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-midnight-black/50 border border-glitch-red/20">
                <div className="text-2xl font-headline text-glitch-red">{postsWithoutThumbnails.length}</div>
                <div className="text-sm text-muted-lavender">Missing Thumbnails</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-midnight-black/50 border border-electric-blue/20">
                <div className="text-2xl font-headline text-electric-blue">{postsWithThumbnails.length}</div>
                <div className="text-sm text-muted-lavender">Have Thumbnails</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={loadVideoPosts}
                disabled={loading}
                className="bg-neon-lilac text-midnight-black hover:bg-neon-lilac/80 flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {loading ? 'Loading...' : 'Load Video Posts'}
              </Button>

              {videoPosts.length > 0 && (
                <>
                  <Button
                    onClick={() => runBackfill(true)}
                    disabled={processing || postsWithoutThumbnails.length === 0}
                    className="bg-electric-blue text-midnight-black hover:bg-electric-blue/80 flex items-center gap-2"
                  >
                    {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Generate Missing Thumbnails ({postsWithoutThumbnails.length})
                  </Button>

                  <Button
                    onClick={() => runBackfill(false)}
                    disabled={processing}
                    variant="outline"
                    className="border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10 flex items-center gap-2"
                  >
                    Regenerate All Thumbnails
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card className="bg-midnight-black/80 border-muted-lavender/20">
            <CardHeader>
              <CardTitle className="text-pearl-white">Backfill Results</CardTitle>
              <CardDescription>
                Results from the thumbnail generation process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-midnight-black/50 border border-muted-lavender/10"
                  >
                    <div className="flex items-center gap-3">
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-electric-blue" />
                      ) : (
                        <XCircle className="w-5 h-5 text-glitch-red" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-pearl-white">
                          {result.postId}
                        </div>
                        <div className="text-xs text-muted-lavender">
                          {result.message}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={result.status === 'success' ? 'default' : 'destructive'}
                      className={
                        result.status === 'success'
                          ? 'bg-electric-blue/20 text-electric-blue border-electric-blue/30'
                          : 'bg-glitch-red/20 text-glitch-red border-glitch-red/30'
                      }
                    >
                      {result.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Posts List */}
        {videoPosts.length > 0 && (
          <Card className="bg-midnight-black/80 border-muted-lavender/20">
            <CardHeader>
              <CardTitle className="text-pearl-white">Video Posts</CardTitle>
              <CardDescription>
                Your video posts and their thumbnail status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {videoPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-midnight-black/50 border border-muted-lavender/10"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Video className="w-5 h-5 text-electric-blue flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-pearl-white truncate">
                          {post.text_body || 'Video post'}
                        </div>
                        <div className="text-xs text-muted-lavender">
                          {post.id} • {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={post.media_thumb_url ? 'default' : 'destructive'}
                      className={
                        post.media_thumb_url
                          ? 'bg-electric-blue/20 text-electric-blue border-electric-blue/30'
                          : 'bg-glitch-red/20 text-glitch-red border-glitch-red/30'
                      }
                    >
                      {post.media_thumb_url ? 'Has Thumbnail' : 'Missing'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}