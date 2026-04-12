import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PostsLoaderProps {
  onPostsLoaded?: (posts: any[]) => void;
  onError?: (error: string) => void;
}

export function PostsLoader({ onPostsLoaded, onError }: PostsLoaderProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');

  const loadFeed = async () => {
    setPostsLoading(true);
    setPostsError('');
    
    try {
      // Get session with proper authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session || !session.access_token) {
        setPostsError('Please log in');
        setPostsLoading(false);
        onError?.('Please log in');
        return;
      }

      console.log('📡 Making authenticated request to posts endpoint...');
      console.log('📡 Session info:', {
        hasSession: !!session,
        hasToken: !!session.access_token,
        tokenLength: session.access_token?.length || 0,
        userEmail: session.user?.email?.substring(0, 3) + '***'
      });

      // Make the authenticated request
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-70df0d6e/posts`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': publicAnonKey,
          'Content-Type': 'application/json',
        }
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorText = `HTTP ${response.status}`;
        
        try {
          const errorBody = await response.text();
          console.error('📡 Error response body:', errorBody);
          errorText += `: ${errorBody}`;
        } catch (e) {
          console.warn('📡 Could not read error response body');
        }
        
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log('📡 Posts loaded successfully:', {
        postsCount: Array.isArray(data) ? data.length : 'not array',
        dataType: typeof data,
        hasPostsProperty: data && typeof data === 'object' && 'posts' in data
      });

      // Handle different response formats
      let postsArray: any[] = [];
      if (Array.isArray(data)) {
        postsArray = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.posts)) {
        postsArray = data.posts;
      } else {
        console.warn('📡 Unexpected response format:', data);
        postsArray = [];
      }

      setPosts(postsArray);
      onPostsLoaded?.(postsArray);
      
    } catch (error: any) {
      console.error('📡 Error loading posts:', error);
      const errorMessage = error.message || 'Failed to load posts';
      setPostsError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setPostsLoading(false);
    }
  };

  // Auto-load on mount
  useEffect(() => {
    loadFeed();
  }, []);

  if (postsLoading) {
    return (
      <Card className="bg-gradient-to-br from-midnight-black to-midnight-black/80 border-muted-lavender/30">
        <CardContent className="p-6 flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-neon-lilac animate-spin" />
          <p className="text-muted-lavender font-body">Loading posts...</p>
        </CardContent>
      </Card>
    );
  }

  if (postsError) {
    return (
      <Card className="bg-gradient-to-br from-midnight-black to-midnight-black/80 border-glitch-red/30">
        <CardContent className="p-6 flex flex-col items-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-glitch-red" />
          <p className="text-glitch-red font-body text-center">{postsError}</p>
          <Button 
            onClick={loadFeed}
            className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black font-body"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-midnight-black to-midnight-black/80 border-muted-lavender/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline text-pearl-white">Posts Feed</h3>
          <Button 
            onClick={loadFeed}
            variant="outline"
            size="sm"
            className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
          >
            Refresh
          </Button>
        </div>
        
        {posts.length === 0 ? (
          <p className="text-muted-lavender font-body text-center py-8">
            No posts found
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-pearl-white font-body">
              Loaded {posts.length} posts successfully!
            </p>
            
            {/* Display first few posts for debugging */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {posts.slice(0, 5).map((post, index) => (
                <div 
                  key={post.id || index}
                  className="bg-muted-lavender/10 rounded-lg p-3 text-sm"
                >
                  <p className="text-pearl-white font-medium">
                    Post {index + 1}: {post.id || 'No ID'}
                  </p>
                  <p className="text-muted-lavender">
                    Type: {post.post_type || post.type || 'Unknown'}
                  </p>
                  {(post.text_body || post.content || post.caption) && (
                    <p className="text-muted-lavender truncate">
                      Content: {(post.text_body || post.content || post.caption).substring(0, 50)}...
                    </p>
                  )}
                </div>
              ))}
              
              {posts.length > 5 && (
                <p className="text-muted-lavender text-xs text-center">
                  ...and {posts.length - 5} more posts
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}