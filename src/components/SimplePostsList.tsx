import React from 'react';
import { Card, CardContent } from './ui/card';
import { 
  Clock,
  MessageCircle,
  Heart,
  FileText,
  Image,
  Video,
  Headphones,
  Lock,
  Globe,
  Users
} from 'lucide-react';

interface SimplePost {
  id: string;
  caption: string;
  timestamp: string;
  likes: number;
  comments: number;
  imageUrl?: string;
  type?: string;
  visibility?: string;
}

interface SimplePostsListProps {
  posts: SimplePost[];
  onPostClick?: (post: SimplePost) => void;
  loading?: boolean;
  className?: string;
}

export function SimplePostsList({ posts, onPostClick, loading, className = '' }: SimplePostsListProps) {
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
  const getPostTypeIcon = (type?: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Headphones className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Get visibility icon
  const getVisibilityIcon = (visibility?: string) => {
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

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Loading skeletons */}
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="bg-midnight-black/50 border-muted-lavender/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-muted-lavender/20 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted-lavender/20 rounded animate-pulse w-1/4" />
                  <div className="h-3 bg-muted-lavender/20 rounded animate-pulse w-1/3" />
                  <div className="h-4 bg-muted-lavender/20 rounded animate-pulse w-full" />
                  <div className="h-4 bg-muted-lavender/20 rounded animate-pulse w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {posts.map((post) => (
        <Card 
          key={post.id}
          className="bg-midnight-black/50 border-muted-lavender/20 hover:border-muted-lavender/40 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-neon-lilac/10"
          onClick={() => onPostClick?.(post)}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              {/* Post type icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-muted-lavender/10 to-electric-blue/10 border border-muted-lavender/20 flex items-center justify-center">
                {getPostTypeIcon(post.type)}
              </div>

              {/* Post content */}
              <div className="flex-1 min-w-0">
                {/* Post header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 text-xs text-muted-lavender">
                    <span className="text-electric-blue font-medium capitalize">
                      {post.type || 'thought'}
                    </span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(post.timestamp)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {getVisibilityIcon(post.visibility)}
                  </div>
                </div>

                {/* Post preview */}
                <div className="mb-3">
                  {post.imageUrl && (
                    <div className="mb-2">
                      <img 
                        src={post.imageUrl} 
                        alt="Post media"
                        className="w-full h-32 object-cover rounded-lg border border-muted-lavender/20"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <p className="text-pearl-white font-body text-sm leading-relaxed line-clamp-3">
                    {truncateText(post.caption)}
                  </p>
                </div>

                {/* Post stats */}
                <div className="flex items-center space-x-4 text-xs text-muted-lavender">
                  <span className="flex items-center space-x-1">
                    <Heart className="w-3 h-3" />
                    <span>{post.likes || 0}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{post.comments || 0}</span>
                  </span>
                  <span className="ml-auto text-electric-blue font-medium">
                    Tap to view
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}