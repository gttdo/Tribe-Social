import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { PostDetailsModal } from './PostDetailsModal';
import { useIsMobile } from './ui/use-mobile';
import { 
  Plus,
  Clock,
  MessageCircle,
  Heart,
  Bookmark,
  Sparkles,
  FileText,
  Image,
  Video,
  Headphones,
  Lock,
  Globe,
  Users,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { FeedPost } from '../utils/social-feed-types';
import { toast } from 'sonner@2.0.3';

interface EnhancedProfilePostsListProps {
  userId: string;
  username?: string;
  isOwnProfile?: boolean;
  onCreatePost?: () => void;
  userResult?: any;
  userInfo?: any;
}

interface UserPost {
  id: string;
  post_type: 'thought' | 'image' | 'video' | 'audio';
  text_body: string;
  caption?: string;
  content?: string;
  visibility: 'public' | 'tribe' | 'private';
  tribe_id?: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  username?: string;
  likes_count?: number;
  comments_count?: number;
  thumbnail_url?: string;
  media_url?: string;
}

export function EnhancedProfilePostsList({ 
  userId, 
  username,
  isOwnProfile = false, 
  onCreatePost,
  userResult,
  userInfo 
}: EnhancedProfilePostsListProps) {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [showPostDetails, setShowPostDetails] = useState(false);
  
  const isMobile = useIsMobile();

  // Fetch user posts using Edge API - prevents PostgREST 400 errors
  const fetchUserPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== EnhancedProfilePostsList: Fetching posts via Edge API ===');

      // Obtain userId robustly: route param OR loaded profile OR session user
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      const authedId = session?.user?.id;

      const resolvedUserId =
        userId                 // passed as prop
        ?? authedId;           // fallback to current user

      if (!resolvedUserId) {
        console.warn('EnhancedProfilePostsList: missing userId; skip fetch to avoid 400s.');
        setPosts([]);
        return;
      }

      console.log('Resolved userId for posts fetch:', resolvedUserId);

      // Use Edge API to fetch posts with proper media URLs
      const { edgeGet } = await import('../utils/edge');
      const data = await edgeGet<{ posts: any[] }>(`/users/${resolvedUserId}/posts`);
      
      console.log('Posts Edge API response:', data);

      if (data && data.posts && Array.isArray(data.posts)) {
        const formattedPosts = data.posts.map((post: any) => ({
          id: post.id,
          post_type: post.post_type || post.type || 'thought',
          text_body: post.text_body || post.content || '',
          caption: post.caption,
          content: post.text_body || post.content,
          visibility: post.visibility || 'public',
          tribe_id: post.tribe_id,
          created_at: post.created_at || post.createdAt,
          user_id: post.user_id,
          username: post.username || username || 'Unknown',
          likes_count: post.like_count || post.likes || 0,
          comments_count: post.comment_count || post.comments || 0,
          // Use normalized media URLs from Edge API
          thumbnail_url: post.media_thumb_url || post.thumbnail_url,
          media_url: post.media_url
        }));

        setPosts(formattedPosts);
        console.log(`✅ Loaded ${formattedPosts.length} posts via Edge API`);
      } else {
        console.log('No posts found for user or invalid response format');
        setPosts([]);
      }

    } catch (error) {
      console.error('Error fetching user posts via Edge API:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        console.log('Posts not found for user');
        setError('No posts found');
      } else if (errorMessage.includes('401') || errorMessage.includes('Not signed in')) {
        console.log('Authentication error');
        setError('Authentication required');
      } else {
        console.log('Posts fetch error via Edge API:', errorMessage);
        setError('Failed to load posts');
      }
      
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId, username]);

  // Load posts on mount
  useEffect(() => {
    fetchUserPosts();
  }, [fetchUserPosts]);

  // Handle post click
  const handlePostClick = (post: UserPost) => {
    // Convert UserPost to FeedPost format for the modal
    const feedPost: FeedPost = {
      id: post.id,
      username: post.username || username || 'Unknown',
      nickname: post.username || username || 'Unknown',
      coreRealm: 'MIRRORCORE',
      timestamp: post.created_at,
      caption: post.caption || '',
      content: post.text_body,
      imageUrl: post.media_url || null,
      mediaThumbnailUrl: post.thumbnail_url || null,
      liked: false,
      bookmarked: false,
      likes: post.likes_count || 0,
      comments: [], // Will be loaded separately
      xpEarned: 0,
      type: post.post_type,
      location: undefined,
      visibility: post.visibility,
      tribeId: post.tribe_id,
      tribeName: null,
      hasPermissionError: false,
      // Add the new fields for compatibility with the extended FeedPost type
      post_type: post.post_type,
      text_body: post.text_body,
      user_id: post.user_id,
      created_at: post.created_at,
      tribe_id: post.tribe_id,
      thumbnail_url: post.thumbnail_url,
      media_url: post.media_url
    } as any;

    setSelectedPost(feedPost);
    setShowPostDetails(true);
  };

  // Handle post updated
  const handlePostUpdated = (postId: string, updatedContent: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, text_body: updatedContent, content: updatedContent }
        : post
    ));
    toast.success('Post updated successfully');
  };

  // Handle post deleted
  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
    setShowPostDetails(false);
    setSelectedPost(null);
    toast.success('Post deleted successfully');
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
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

  // Get post type icon
  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Headphones className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Get visibility icon
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'private': return <Lock className="w-3 h-3" />;
      case 'tribe': return <Users className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  // Truncate text for preview
  const truncateText = (text: string, maxLength: number = 120) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="bg-midnight-black/50 border-muted-lavender/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Skeleton className="w-12 h-12 rounded-lg bg-muted-lavender/20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4 bg-muted-lavender/20" />
                  <Skeleton className="h-3 w-1/3 bg-muted-lavender/20" />
                  <Skeleton className="h-4 w-full bg-muted-lavender/20" />
                  <Skeleton className="h-4 w-2/3 bg-muted-lavender/20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error && posts.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertCircle className="w-16 h-16 mx-auto text-glitch-red" />
        <div className="space-y-2">
          <h3 className="text-pearl-white font-headline">Unable to load posts</h3>
          <p className="text-muted-lavender font-body text-sm">{error}</p>
        </div>
        <Button
          onClick={fetchUserPosts}
          className="bg-electric-blue hover:bg-electric-blue/80 text-midnight-black"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-muted-lavender/20 to-electric-blue/20 flex items-center justify-center">
          <Plus className="w-8 h-8 text-muted-lavender" />
        </div>
        <div className="space-y-2">
          <h3 className="text-pearl-white font-headline">No posts yet</h3>
          <p className="text-muted-lavender font-body text-sm">
            {isOwnProfile 
              ? "Share your first thought with the tribe" 
              : "This user hasn't shared any posts yet"
            }
          </p>
        </div>
        {isOwnProfile && onCreatePost && (
          <Button
            onClick={onCreatePost}
            className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create your first post
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => (
          <Card 
            key={post.id}
            className="bg-midnight-black/50 border-muted-lavender/20 hover:border-muted-lavender/40 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-neon-lilac/10"
            onClick={() => handlePostClick(post)}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                {/* Post type icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-muted-lavender/10 to-electric-blue/10 border border-muted-lavender/20 flex items-center justify-center">
                  {getPostTypeIcon(post.post_type)}
                </div>

                {/* Post content */}
                <div className="flex-1 min-w-0">
                  {/* Post header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 text-xs text-muted-lavender">
                      <span className="text-electric-blue font-medium capitalize">
                        {post.post_type}
                      </span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(post.created_at)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {getVisibilityIcon(post.visibility)}
                    </div>
                  </div>

                  {/* Post preview */}
                  <div className="mb-3">
                    <p className="text-pearl-white font-body text-sm leading-relaxed line-clamp-3">
                      {truncateText(post.text_body || post.caption || '')}
                    </p>
                  </div>

                  {/* Post stats */}
                  <div className="flex items-center space-x-4 text-xs text-muted-lavender">
                    <span className="flex items-center space-x-1">
                      <Heart className="w-3 h-3" />
                      <span>{post.likes_count || 0}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{post.comments_count || 0}</span>
                    </span>
                    {isOwnProfile && (
                      <span className="ml-auto text-electric-blue font-medium">
                        Tap to manage
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Post Details Modal */}
      <PostDetailsModal
        post={selectedPost}
        isOpen={showPostDetails}
        onClose={() => {
          setShowPostDetails(false);
          setSelectedPost(null);
        }}
        isOwnPost={isOwnProfile}
        onPostUpdated={handlePostUpdated}
        onPostDeleted={handlePostDeleted}
        userInfo={userInfo}
      />
    </>
  );
}