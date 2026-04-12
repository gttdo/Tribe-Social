import React from 'react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { ProfileMediaCard } from './ProfileMediaCard';
import { Plus } from 'lucide-react';

interface UserPost {
  id: string;
  caption: string;
  timestamp: string;
  likes: number;
  comments: number;
  imageUrl?: string;
  videoUrl?: string; // Original video URL for video posts
  thumbnailUrl?: string; // Dedicated thumbnail URL
  savedAt?: string;
  bookmarkId?: string;
  type?: 'image' | 'video' | 'audio' | 'thought';
  mediaType?: string;
}

interface ProfilePostsSectionProps {
  posts: UserPost[];
  loading: boolean;
  onPostClick: (post: UserPost) => void;
  onCreatePost?: () => void;
  isOwnProfile?: boolean;
  onEditPost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
}

export function ProfilePostsSection({ 
  posts, 
  loading, 
  onPostClick, 
  onCreatePost, 
  isOwnProfile = false,
  onEditPost,
  onDeletePost
}: ProfilePostsSectionProps) {
  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 bg-midnight-black/50 rounded-2xl" />
        ))}
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 rounded-full flex items-center justify-center">
          <Plus className="w-8 h-8 text-muted-lavender/60" />
        </div>
        <h3 className="text-lg font-medium text-pearl-white mb-2">
          {isOwnProfile ? 'No posts yet' : 'No posts to show'}
        </h3>
        <p className="text-muted-lavender/70 mb-6">
          {isOwnProfile 
            ? 'Share your first post to get started!' 
            : 'This user hasn\'t shared any posts yet.'
          }
        </p>
        {isOwnProfile && onCreatePost && (
          <Button
            onClick={onCreatePost}
            className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
          >
            Create Your First Post
          </Button>
        )}
      </div>
    );
  }

  // Posts grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.map((post) => (
        <ProfileMediaCard
          key={post.id}
          post={post}
          onClick={onPostClick}
          onEdit={onEditPost}
          onDelete={onDeletePost}
          showMenu={isOwnProfile} // Only show menu for own posts
        />
      ))}
    </div>
  );
}