import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase } from '../utils/supabase/client';
import { Video, Image, AlertCircle } from 'lucide-react';

interface VideoPost {
  id: string;
  type: string;
  media_url?: string;
  media_thumb_url?: string;
  thumbnail_url?: string;
  imageUrl?: string;
  videoUrl?: string;
  content?: string;
  text_body?: string;
  caption?: string;
  created_at: string;
}

export function VideoThumbnailDebugger() {
  const [videoPosts, setVideoPosts] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchVideoPosts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to debug video posts');
        return;
      }

      // Fetch video posts from database
      const { data: posts, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('type', 'video')
        .limit(10)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(`Database error: ${fetchError.message}`);
        return;
      }

      console.log('🎬 Debug: Raw video posts from database:', posts);

      const formattedPosts = (posts || []).map(post => ({
        id: post.id,
        type: post.type,
        media_url: post.media_url,
        media_thumb_url: post.media_thumb_url,
        thumbnail_url: post.thumbnail_url,
        imageUrl: post.media_url, // For compatibility
        videoUrl: post.media_url,
        content: post.content,
        text_body: post.text_body,
        caption: post.caption,
        created_at: post.created_at
      }));

      setVideoPosts(formattedPosts);
      console.log('🎬 Debug: Formatted video posts:', formattedPosts);

    } catch (err) {
      console.error('Error fetching video posts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoPosts();
  }, []);

  const testThumbnailGeneration = (videoUrl: string) => {
    console.log('🎬 Testing thumbnail generation for:', videoUrl);
    
    // Create a video element to test if it can generate a thumbnail
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.preload = 'metadata';
    
    video.addEventListener('loadedmetadata', () => {
      console.log('✅ Video metadata loaded successfully');
      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      console.log('Video duration:', video.duration);
    });
    
    video.addEventListener('error', (e) => {
      console.error('❌ Video failed to load:', e);
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card className="p-6 bg-midnight-black/80 border-neon-lilac/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-headline text-pearl-white">Video Thumbnail Debugger</h2>
          <Button 
            onClick={fetchVideoPosts}
            disabled={loading}
            className="bg-neon-lilac text-midnight-black"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-glitch-red/20 border border-glitch-red/40 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-glitch-red" />
              <span className="text-glitch-red text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {videoPosts.length === 0 && !loading && !error && (
            <p className="text-muted-lavender">No video posts found</p>
          )}

          {videoPosts.map((post) => (
            <Card key={post.id} className="p-4 bg-midnight-black/50 border-muted-lavender/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Post Info */}
                <div className="space-y-2">
                  <h3 className="font-headline text-pearl-white">Post: {post.id.substring(0, 8)}...</h3>
                  <p className="text-sm text-muted-lavender">
                    {post.caption || post.text_body || post.content || 'No caption'}
                  </p>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Video className="w-3 h-3" />
                      <span className="text-electric-blue">media_url:</span>
                      <span className="text-pearl-white break-all">{post.media_url || 'null'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Image className="w-3 h-3" />
                      <span className="text-electric-blue">media_thumb_url:</span>
                      <span className="text-pearl-white break-all">{post.media_thumb_url || 'null'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Image className="w-3 h-3" />
                      <span className="text-electric-blue">thumbnail_url:</span>
                      <span className="text-pearl-white break-all">{post.thumbnail_url || 'null'}</span>
                    </div>
                  </div>

                  {post.media_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testThumbnailGeneration(post.media_url!)}
                      className="border-electric-blue/40 text-electric-blue"
                    >
                      Test Thumbnail Generation
                    </Button>
                  )}
                </div>

                {/* Thumbnail Test */}
                <div className="space-y-2">
                  <h4 className="font-headline text-pearl-white text-sm">Thumbnail Test:</h4>
                  
                  {/* Dedicated thumbnail test */}
                  {(post.media_thumb_url || post.thumbnail_url) && (
                    <div className="space-y-1">
                      <p className="text-xs text-electric-blue">Dedicated Thumbnail:</p>
                      <img
                        src={post.media_thumb_url || post.thumbnail_url}
                        alt="Dedicated thumbnail"
                        className="w-full h-24 object-cover rounded border border-muted-lavender/20"
                        onLoad={() => console.log('✅ Dedicated thumbnail loaded for:', post.id)}
                        onError={() => console.log('❌ Dedicated thumbnail failed for:', post.id)}
                      />
                    </div>
                  )}

                  {/* Video element test */}
                  {post.media_url && (
                    <div className="space-y-1">
                      <p className="text-xs text-electric-blue">Video Element Thumbnail:</p>
                      <video
                        className="w-full h-24 object-cover rounded border border-muted-lavender/20"
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={() => console.log('✅ Video metadata loaded for:', post.id)}
                        onError={() => console.log('❌ Video failed for:', post.id)}
                      >
                        <source src={post.media_url} type="video/mp4" />
                      </video>
                    </div>
                  )}

                  {/* Fallback display */}
                  {!post.media_thumb_url && !post.thumbnail_url && !post.media_url && (
                    <div className="w-full h-24 bg-gradient-to-br from-muted-lavender/20 to-electric-blue/20 rounded border border-muted-lavender/20 flex items-center justify-center">
                      <div className="text-center">
                        <Video className="w-6 h-6 text-pearl-white/60 mx-auto mb-1" />
                        <p className="text-xs text-pearl-white/60">No media sources</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}