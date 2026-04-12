import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { ProfileMediaCard } from './ProfileMediaCard';
import { 
  Bookmark,
  MoreHorizontal
} from 'lucide-react';

interface SavedPostsGridProps {
  userId: string;
  onPostClick?: (postId: string) => void;
  onPostClickSaved?: (postId: string) => void;
  // Accept saved posts data from parent
  savedPosts?: SavedPost[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

interface SavedPost {
  id: string;
  type?: 'thought' | 'image' | 'video' | 'audio';
  post_type?: string; // Backend might use this field name
  thumbnail_url?: string;
  media_thumb_url?: string;
  media_url?: string; // Additional media field
  media_urls?: string[];
  content?: string;
  caption?: string; // Additional content field
  text_body?: string; // Additional content field
  visibility?: 'public' | 'tribe' | 'private';
  tribe_id?: string;
  created_at: string;
  user_id: string;
  original_post_id: string; // The ID of the original post that was saved
  saved_at: string; // When the post was saved
}

const POSTS_PER_PAGE = 30;

export function SavedPostsGrid({ 
  userId, 
  onPostClick, 
  onPostClickSaved, 
  savedPosts: propSavedPosts,
  loading: propLoading,
  error: propError,
  onRefresh 
}: SavedPostsGridProps) {
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Use props data if provided, otherwise fetch data ourselves
  const usingPropsData = propSavedPosts !== undefined;
  const displayPosts = usingPropsData ? (propSavedPosts || []) : posts;
  const displayLoading = usingPropsData ? (propLoading ?? false) : loading;
  const displayError = usingPropsData ? propError : error;

  // Fetch saved posts from database
  const fetchSavedPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      console.log(`Fetching saved posts for user ${userId}, page ${pageNum}`);

      // Try to use the backend API first, fallback to direct database query
      try {
        const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
        const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/users/${userId}/saved`);
        
        if (response.posts) {
          console.log(`Fetched ${response.posts.length} saved posts from API`);
          
          const formattedPosts = response.posts.map((post: any) => {
            // Ensure we're using a proper UUID for navigation
            let postId = post.original_post_id || post.id;
            
            // UUID validation pattern
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            
            // If the ID doesn't look like a UUID, prefer the original_post_id if available
            if (!uuidPattern.test(postId) && post.original_post_id && uuidPattern.test(post.original_post_id)) {
              postId = post.original_post_id;
            }
            
            // Enhanced type detection from multiple possible field names
            const type = post.type || post.post_type || post.mediaType || 'thought';
            
            return {
              id: postId, // Use validated UUID for navigation
              original_post_id: post.original_post_id || post.id,
              type: type,
              post_type: post.post_type, // Keep original field for debugging
              thumbnail_url: post.thumbnail_url || post.media_thumb_url,
              media_thumb_url: post.media_thumb_url,
              media_url: post.media_url, // Add this field
              media_urls: post.media_urls || (post.media_url ? [post.media_url] : []),
              content: post.content || post.caption || post.text_body,
              caption: post.caption,
              text_body: post.text_body,
              visibility: post.visibility || 'public',
              tribe_id: post.tribe_id,
              created_at: post.created_at || post.createdAt,
              user_id: post.user_id || post.userId,
              saved_at: post.saved_at || post.savedAt || post.created_at
            };
          });

          if (append) {
            setPosts(prev => [...prev, ...formattedPosts]);
          } else {
            setPosts(formattedPosts);
          }

          setHasMore(formattedPosts.length === POSTS_PER_PAGE);
          setPage(pageNum);
          return;
        }
      } catch (apiError) {
        console.log('API request failed, trying direct database query:', apiError);
        
        // Check if this is a table/endpoint missing error - handle gracefully
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        if (errorMessage.includes('404') || 
            errorMessage.includes('Not Found') || 
            errorMessage.includes('PGRST205') || 
            errorMessage.includes('Could not find the table') ||
            errorMessage.includes('does not exist')) {
          // This is expected for new databases or users with no saved posts
          console.log('No saved posts found - this is normal for new users');
          if (append) {
            setPosts(prev => [...prev]);
          } else {
            setPosts([]);
          }
          setHasMore(false);
          setPage(pageNum);
          return;
        }
        
        // For other errors, still try the database fallback
      }

      // Use Edge API and bookmark helpers as fallback
      console.log('SavedPostsGrid: Fetching saved posts via Edge API and fallbacks');
      
      // Obtain userId robustly: route param OR loaded profile OR session user
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      const authedId = session?.user?.id;

      const resolvedUserId =
        userId                 // passed as prop
        ?? authedId;           // fallback to current user

      if (!resolvedUserId) {
        console.warn('SavedPostsGrid: missing userId; skip fetch to avoid 400s.');
        if (append) {
          setPosts(prev => [...prev]);
        } else {
          setPosts([]);
        }
        setHasMore(false);
        setPage(pageNum);
        return;
      }

      // Try Edge API first
      try {
        console.log('SavedPostsGrid: Attempting Edge API saved posts fetch');
        const { getSavedPosts } = await import('../utils/edge');
        const edgeResult = await getSavedPosts(session);
        
        console.log('SavedPostsGrid: Edge API result:', {
          type: typeof edgeResult,
          isArray: Array.isArray(edgeResult),
          length: Array.isArray(edgeResult) ? edgeResult.length : 'not array'
        });
        
        // Handle different response formats
        let edgePosts: any[] = [];
        if (Array.isArray(edgeResult)) {
          edgePosts = edgeResult;
        } else if (edgeResult && typeof edgeResult === 'object') {
          if (Array.isArray(edgeResult.posts)) {
            edgePosts = edgeResult.posts;
          } else if (Array.isArray(edgeResult.data)) {
            edgePosts = edgeResult.data;
          }
        }
        
        if (edgePosts.length > 0 || !append) { // Accept empty results for first page
          console.log('SavedPostsGrid: Edge API success, got', edgePosts.length, 'posts');
          
          // Map to expected format
          const formattedPosts = edgePosts.map((post: any) => ({
            id: post.id,
            original_post_id: post.id,
            type: post.post_type || post.type || 'thought',
            post_type: post.post_type,
            thumbnail_url: post.media_thumb_url,
            media_thumb_url: post.media_thumb_url,
            media_url: post.media_url,
            media_urls: post.media_url ? [post.media_url] : [],
            content: post.text_body || post.caption,
            caption: post.caption,
            text_body: post.text_body,
            visibility: post.visibility || 'public',
            tribe_id: post.tribe_id,
            created_at: post.created_at,
            user_id: post.user_id,
            saved_at: post.saved_at || post.created_at
          }));
          
          if (append) {
            setPosts(prev => [...prev, ...formattedPosts]);
          } else {
            setPosts(formattedPosts);
          }
          
          setHasMore(formattedPosts.length === POSTS_PER_PAGE);
          setPage(pageNum);
          return;
        }
      } catch (edgeError) {
        console.log('SavedPostsGrid: Edge API failed, trying bookmark helpers fallback:', edgeError);
      }

      // Fallback to direct Supabase query if Edge API fails
      console.log('SavedPostsGrid: Using direct Supabase query fallback');
      
      try {
        // Use basic post_bookmarks with posts join to avoid view dependencies
        const { data: bookmarkData, error: bookmarkError } = await supabase
          .from('bookmark')
          .select(`
            created_at,
            posts (
              id,
              created_at,
              user_id,
              tribe_id,
              post_type,
              text_body,
              caption,
              media_url,
              media_thumb_url,
              visibility
            )
          `)
          .eq('user_id', resolvedUserId)
          .order('created_at', { ascending: false })
          .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);
        
        if (bookmarkError) {
          console.error('SavedPostsGrid: Direct query failed:', bookmarkError);
          throw bookmarkError;
        }
        
        // Transform the data to match expected format
        const fetchedPosts = (bookmarkData || [])
          .filter(item => item.posts) // Filter out any null posts
          .map(item => ({
            id: item.posts.id,
            original_post_id: item.posts.id,
            type: item.posts.post_type || 'thought',
            post_type: item.posts.post_type,
            thumbnail_url: item.posts.media_thumb_url,
            media_thumb_url: item.posts.media_thumb_url,
            media_url: item.posts.media_url,
            media_urls: item.posts.media_url ? [item.posts.media_url] : [],
            content: item.posts.text_body || item.posts.caption,
            caption: item.posts.caption,
            text_body: item.posts.text_body,
            visibility: item.posts.visibility || 'public',
            tribe_id: item.posts.tribe_id,
            created_at: item.posts.created_at,
            user_id: item.posts.user_id,
            saved_at: item.created_at
          }));
        
        console.log('SavedPostsGrid: Direct query success, got', fetchedPosts.length, 'posts');
        
        if (append) {
          setPosts(prev => [...prev, ...fetchedPosts]);
        } else {
          setPosts(fetchedPosts);
        }
        
        setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
        setPage(pageNum);
        return;
      } catch (directQueryError) {
        console.log('SavedPostsGrid: Direct query also failed:', directQueryError);
        
        // Check if this is a missing table error
        const errorMessage = directQueryError?.message || '';
        if (errorMessage.includes('relation "bookmark" does not exist') ||
            errorMessage.includes('table "bookmark" does not exist')) {
          console.log('SavedPostsGrid: Bookmark table not set up yet');
          
          if (append) {
            setPosts(prev => [...prev]);
          } else {
            setPosts([]);
          }
          setHasMore(false);
          setPage(pageNum);
          return;
        }
      }
      
      // If all methods fail, return empty results gracefully
      console.log('SavedPostsGrid: All fetch methods failed, returning empty results');
      const data: any = null;
      const queryError = new Error('Unable to load saved posts');

      if (queryError) {
        console.log('Database query error, this is expected if saved_posts table does not exist:', queryError.message);
        // Since we're using KV store primarily, this fallback may not work
        // Return empty results gracefully
        if (append) {
          setPosts(prev => [...prev]);
        } else {
          setPosts([]);
        }
        setHasMore(false);
        setPage(pageNum);
        return;
      }

      // Transform the data according to the user's query pattern
      const saved = (data ?? []).map(r => r.post).filter(Boolean);
      const fetchedPosts = saved.map((post: any) => ({
        id: post.id,
        original_post_id: post.id,
        type: post.post_type || 'thought',
        thumbnail_url: post.media_thumb_url,
        media_urls: post.media_url ? [post.media_url] : [],
        content: post.text_body || post.caption,
        visibility: 'public', // Default since we don't have this field
        tribe_id: undefined,
        created_at: post.created_at,
        user_id: post.user_id,
        saved_at: data?.find(d => d.post?.id === post.id)?.created_at || post.created_at
      }));

      console.log(`Fetched ${fetchedPosts.length} saved posts for page ${pageNum} from database`);
      console.log('Sample saved post structure:', fetchedPosts[0]);

      if (append) {
        setPosts(prev => [...prev, ...fetchedPosts]);
      } else {
        setPosts(fetchedPosts);
      }

      // Check if there are more posts to load
      setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
      setPage(pageNum);

    } catch (err) {
      console.error('Error fetching saved posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load saved posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  // Initial load - only if not using props data
  useEffect(() => {
    if (!usingPropsData) {
      console.log('🔍 SavedPostsGrid: Self-fetching mode, starting initial load');
      fetchSavedPosts(0);
    } else {
      console.log('🔍 SavedPostsGrid: Using props data mode, skipping self-fetch');
    }
  }, [usingPropsData]); // Simplified dependency array

  // Set up intersection observer for infinite scroll - only if not using props data
  useEffect(() => {
    if (usingPropsData || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchSavedPosts(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, page, usingPropsData]); // Removed fetchSavedPosts from deps

  // Handle post click
  const handlePostClick = (postId: string) => {
    if (onPostClick) {
      onPostClick(postId);
    }
  };

  // Handle saved post click
  const handlePostClickSaved = (postId: string) => {
    if (onPostClickSaved) {
      onPostClickSaved(postId);
    }
  };

  // Convert saved post to format compatible with ProfileMediaCard
  const convertSavedPostToMediaCard = (savedPost: SavedPost | any) => {
    // Smart post type detection with enhanced logic
    const detectPostType = () => {
      // Check explicit type fields (multiple possible field names)
      const explicitType = savedPost.type || savedPost.post_type || savedPost.mediaType;
      
      if (explicitType) {
        // Normalize type names
        const normalizedType = explicitType.toLowerCase();
        if (normalizedType === 'image' || normalizedType === 'photo') return 'image';
        if (normalizedType === 'video') return 'video';
        if (normalizedType === 'audio' || normalizedType === 'voice') return 'audio';
        if (normalizedType === 'thought' || normalizedType === 'text') return 'thought';
      }

      // Fallback: Intelligent detection based on media URL
      const anyUrl = savedPost.media_url || savedPost.media_urls?.[0];
      if (anyUrl) {
        const url = anyUrl.toLowerCase();
        // Video detection
        if (url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') || 
            url.includes('.webm') || url.includes('.m4v') || url.includes('video')) {
          return 'video';
        }
        // Audio detection
        if (url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a') || 
            url.includes('.aac') || url.includes('.ogg') || url.includes('audio')) {
          return 'audio';
        }
        // Default to image if we have a media URL but can't detect type
        return 'image';
      }

      // If no media URL, it's a thought/text post
      return 'thought';
    };

    const detectedType = detectPostType();

    // Handle video and thumbnail URLs properly for video posts
    let videoUrl = null;
    let thumbnailUrl = null;
    let imageUrl = null;

    if (detectedType === 'video') {
      // For video posts, separate video URL and thumbnail URL
      videoUrl = savedPost.media_url || savedPost.media_urls?.[0];
      thumbnailUrl = savedPost.media_thumb_url || savedPost.thumbnail_url;
      
      // If video file is used as imageUrl, prioritize thumbnail for display
      if (thumbnailUrl) {
        imageUrl = thumbnailUrl;
      } else if (videoUrl && !videoUrl.match(/\.(mp4|webm|mov)$/i)) {
        // If it's not a video file extension, it might be a thumbnail
        imageUrl = videoUrl;
      } else {
        // Use video URL as fallback for thumbnail generation
        imageUrl = videoUrl;
      }
    } else {
      // For non-video posts, use media URL as image URL
      imageUrl = savedPost.media_thumb_url ||
                savedPost.thumbnail_url ||
                savedPost.media_urls?.[0] ||
                savedPost.media_url ||
                null;
    }

    // Format timestamp for display
    const formatSavedTimestamp = (timestamp: string) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    // Enhanced caption extraction
    const caption = savedPost.content || 
                   savedPost.caption || 
                   savedPost.text_body || 
                   savedPost.description ||
                   'Saved post';

    const result = {
      id: savedPost.id,
      caption: caption,
      timestamp: `Saved ${formatSavedTimestamp(savedPost.saved_at)}`,
      likes: 0, // Saved posts don't have like counts
      comments: 0, // Saved posts don't have comment counts
      imageUrl: imageUrl,
      videoUrl: videoUrl, // Add video URL for video posts
      thumbnailUrl: thumbnailUrl, // Add dedicated thumbnail URL
      type: detectedType,
      mediaType: detectedType,
      // Add a flag to indicate this is a saved post for special styling
      isSaved: true
    };

    // Debug log for troubleshooting video posts specifically
    if (detectedType === 'video') {
      console.log('🎬 Video post conversion:', {
        originalType: savedPost.type,
        originalPostType: savedPost.post_type,
        detectedType: detectedType,
        videoUrl: videoUrl?.substring(0, 50) + '...',
        thumbnailUrl: thumbnailUrl?.substring(0, 50) + '...',
        imageUrl: imageUrl?.substring(0, 50) + '...',
        hasVideoUrl: !!videoUrl,
        hasThumbnailUrl: !!thumbnailUrl,
        caption: caption?.substring(0, 30) + '...'
      });
    } else {
      console.log('🔍 Converted saved post:', {
        originalType: savedPost.type,
        originalPostType: savedPost.post_type,
        detectedType: detectedType,
        hasImageUrl: !!imageUrl,
        imageUrl: imageUrl?.substring(0, 50) + '...',
        caption: caption?.substring(0, 30) + '...'
      });
    }

    return result;
  };



  // Render loading skeletons to match ProfilePostsSection
  const renderSkeletons = (count: number = 6) => {
    return Array.from({ length: count }, (_, i) => (
      <Skeleton key={`skeleton-${i}`} className="h-48 bg-midnight-black/50 rounded-2xl" />
    ));
  };

  // Debug log for props (throttled to prevent spam)
  useEffect(() => {
    console.log('🔍 SavedPostsGrid render state:', {
      usingPropsData,
      displayPostsLength: displayPosts.length,
      displayLoading,
      displayError: displayError ? 'has error' : 'no error',
      propSavedPosts: propSavedPosts?.length || 0,
      propLoading,
    });
  }, [usingPropsData, displayPosts.length, displayLoading, displayError]);

  // Enhanced empty state to match ProfilePostsSection style
  if (!displayLoading && displayPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 rounded-full flex items-center justify-center">
          <Bookmark className="w-8 h-8 text-muted-lavender/60" />
        </div>
        <h3 className="text-lg font-medium text-pearl-white mb-2">
          No saved posts yet
        </h3>
        <p className="text-muted-lavender/70 mb-6 max-w-sm mx-auto">
          Posts you save will appear here for easy access. Start exploring and bookmark content you love!
        </p>
        <div className="pt-2">
          <p className="text-muted-lavender/60 font-body text-xs">
            💡 Tap the bookmark icon on any post to save it
          </p>
        </div>
      </div>
    );
  }

  // Enhanced error state with retry functionality
  if (displayError && displayPosts.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-glitch-red/20 to-soft-blush/20 flex items-center justify-center">
          <MoreHorizontal className="w-8 h-8 text-glitch-red" />
        </div>
        <div className="space-y-2">
          <h3 className="font-headline text-pearl-white">Failed to load saved posts</h3>
          <p className="text-muted-lavender font-body text-sm max-w-sm mx-auto">{displayError}</p>
        </div>
        <Button
          onClick={() => usingPropsData && onRefresh ? onRefresh() : fetchSavedPosts(0)}
          className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-body flex items-center space-x-2"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>Try again</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loading state - match ProfilePostsSection */}
      {displayLoading && displayPosts.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderSkeletons()}
        </div>
      ) : (
        <>
          {/* Posts Grid - match ProfilePostsSection layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayPosts.map((savedPost) => {
              const mediaCardPost = convertSavedPostToMediaCard(savedPost);
              
              return (
                <div key={savedPost.id} className="relative">
                  <ProfileMediaCard
                    post={mediaCardPost}
                    onClick={() => onPostClickSaved ? handlePostClickSaved(savedPost.id) : handlePostClick(savedPost.id)}
                  />
                  {/* Saved indicator overlay */}
                  <div className="absolute top-3 right-3 z-10">
                    <div className="w-8 h-8 rounded-full bg-midnight-black/80 border border-electric-blue/50 flex items-center justify-center">
                      <Bookmark className="w-4 h-4 text-electric-blue" fill="currentColor" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading skeletons for pagination */}
            {loadingMore && renderSkeletons(3)}
          </div>

          {/* Load more trigger */}
          {hasMore && !displayLoading && !usingPropsData && (
            <div ref={loadMoreRef} className="h-4" />
          )}

          {/* No more posts indicator */}
          {!hasMore && displayPosts.length > 0 && !usingPropsData && (
            <div className="text-center py-6">
              <p className="text-muted-lavender font-body text-sm">
                That's all your saved posts!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}