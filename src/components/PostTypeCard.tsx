import React from 'react';
import { FeedPost } from '../utils/social-feed-types';
import { ThoughtPostCard } from './ThoughtPostCard';
import { MediaPostCard } from './MediaPostCard';
import { AudioPostCard } from './AudioPostCard';

interface PostTypeCardProps {
  post: FeedPost;
  currentUserId?: string;
  userTribeMemberships?: string[];
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onUserClick: (username: string) => void;
  onPostAction: (action: string, postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  onJoinTribe?: (tribeId: string) => void;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export function PostTypeCard(props: PostTypeCardProps) {
  const { post } = props;

  // Determine post type and render appropriate card
  const getPostType = () => {
    // Check for audio post first - can be detected by type or file extension
    if (post.type === 'audio' || (post.imageUrl && post.imageUrl.match(/\.(mp3|wav|m4a|ogg)$/i))) {
      return 'audio';
    }
    
    // Check for video post - can be detected by type or file extension
    if (post.type === 'video' || (post.imageUrl && (
      post.imageUrl.includes('.mp4') || 
      post.imageUrl.includes('.webm') || 
      post.imageUrl.includes('.mov')
    ))) {
      return 'video';
    }
    
    // Check for image/media post
    if (post.type === 'image' || post.type === 'media' || post.imageUrl) {
      return 'media';
    }
    
    // Default to thought post for text-only content
    return 'thought';
  };

  const postType = getPostType();

  console.log('PostTypeCard: Rendering post', post.id, 'as type:', postType, {
    originalType: post.type,
    hasImageUrl: !!post.imageUrl,
    imageUrl: post.imageUrl
  });

  switch (postType) {
    case 'audio':
      return <AudioPostCard {...props} />;
    
    case 'video':
    case 'media':
      return <MediaPostCard {...props} />;
    
    case 'thought':
    default:
      return <ThoughtPostCard {...props} />;
  }
}