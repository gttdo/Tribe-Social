import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { useIsMobile } from './ui/use-mobile';
import { 
  Edit3, 
  Save, 
  X, 
  Trash2, 
  MessageCircle, 
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { FeedPost } from '../utils/social-feed-types';
import { toast } from 'sonner@2.0.3';

interface PostDetailsModalProps {
  post: FeedPost | null;
  isOpen: boolean;
  onClose: () => void;
  isOwnPost?: boolean;
  onPostUpdated?: (postId: string, updatedContent: string) => void;
  onPostDeleted?: (postId: string) => void;
  userInfo?: any;
}

interface Comment {
  id: string;
  content: string;
  username: string;
  user_id: string;
  created_at: string;
}

export function PostDetailsModal({ 
  post, 
  isOpen, 
  onClose, 
  isOwnPost = false,
  onPostUpdated,
  onPostDeleted,
  userInfo
}: PostDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const isMobile = useIsMobile();

  // Reset state when post changes
  useEffect(() => {
    if (post) {
      setEditContent(post.text_body || post.content || post.caption || '');
      setIsEditing(false);
      setShowDeleteConfirm(false);
      loadComments();
    }
  }, [post?.id]);

  // Load comments for the post
  const loadComments = async () => {
    if (!post?.id) return;

    try {
      setLoadingComments(true);
      console.log('Loading comments for post:', post.id);

      // Use the backend API endpoint for comments
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}/comments`);

      if (response.comments) {
        const formattedComments = response.comments.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          username: comment.username || 'Unknown User',
          user_id: comment.user_id,
          created_at: comment.created_at || comment.createdAt
        }));

        setComments(formattedComments);
        console.log(`Loaded ${formattedComments.length} comments`);
      } else {
        setComments([]);
      }

    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // Handle edit save
  const handleSave = async () => {
    if (!post || !editContent.trim()) {
      toast.error('Content cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error('Authentication required');
        return;
      }

      // Update post using direct database query with proper auth check
      const { error } = await supabase
        .from('posts')
        .update({ 
          text_body: editContent
        })
        .eq('id', post.id)
        .eq('user_id', session.user.id); // Ensure user owns the post

      if (error) {
        console.error('Error updating post:', error);
        toast.error('Failed to update post');
        return;
      }

      toast.success('Post updated successfully');
      setIsEditing(false);
      
      if (onPostUpdated) {
        onPostUpdated(post.id, editContent);
      }

    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!post) return;

    try {
      setIsDeleting(true);
      
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Authentication required');
        return;
      }

      // Use the centralized edge helper for delete
      const { deletePost: edgeDeletePost } = await import('../utils/edge');
      const response = await edgeDeletePost(post.id, session.user.id);

      if (response.success) {
        toast.success('Post deleted successfully');
        if (onPostDeleted) {
          onPostDeleted(post.id);
        }
        onClose();
      } else {
        toast.error(response.error || 'Failed to delete post');
      }

    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
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
    } catch {
      return 'Unknown time';
    }
  };

  if (!post) return null;

  const postContent = post.text_body || post.content || post.caption || '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-midnight-black border-muted-lavender/20 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-pearl-white font-headline">
            Post Details
          </DialogTitle>
          <DialogDescription className="text-muted-lavender font-body text-sm">
            View and edit your post details
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Post Content */}
          <Card className="bg-midnight-black/50 border-muted-lavender/20">
            <CardContent className="p-6">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-r from-neon-lilac to-electric-blue text-white font-headline">
                      {(post.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-pearl-white font-body font-medium">@{post.username}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-lavender">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(post.created_at)}</span>
                    </div>
                  </div>
                </div>

                {isOwnPost && (
                  <div className="flex items-center space-x-2">
                    {!isEditing && (
                      <Button
                        onClick={() => setIsEditing(true)}
                        size="sm"
                        variant="ghost"
                        className="text-electric-blue hover:bg-electric-blue/10"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => setShowDeleteConfirm(true)}
                      size="sm"
                      variant="ghost"
                      className="text-glitch-red hover:bg-glitch-red/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Post Content - Editable or Display */}
              {isEditing ? (
                <div className="space-y-4">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white min-h-[120px] resize-none"
                    placeholder="Share your thoughts..."
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(postContent);
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-muted-lavender"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      size="sm"
                      disabled={isSaving || !editContent.trim()}
                      className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Badge variant="secondary" className="bg-electric-blue/20 text-electric-blue">
                    {post.post_type || 'thought'}
                  </Badge>
                  <p className="text-pearl-white font-body leading-relaxed whitespace-pre-wrap">
                    {postContent || <span className="text-muted-lavender italic">No content</span>}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card className="bg-midnight-black/50 border-muted-lavender/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <MessageCircle className="w-5 h-5 text-electric-blue" />
                <h3 className="text-pearl-white font-headline">
                  Comments ({comments.length})
                </h3>
              </div>

              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-electric-blue" />
                  <span className="ml-2 text-muted-lavender">Loading comments...</span>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border-l-2 border-muted-lavender/20 pl-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-gradient-to-r from-soft-blush to-electric-blue text-white text-xs">
                            {comment.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-pearl-white font-body text-sm font-medium">
                          @{comment.username}
                        </span>
                        <span className="text-muted-lavender text-xs">
                          {formatTimestamp(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-muted-lavender font-body text-sm leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-muted-lavender/40 mx-auto mb-2" />
                  <p className="text-muted-lavender font-body text-sm">
                    No comments yet. Be the first to comment!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-midnight-black border-glitch-red/30 max-w-md w-full">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-glitch-red mx-auto mb-4" />
                <h3 className="text-pearl-white font-headline text-lg mb-2">
                  Delete Post
                </h3>
                <p className="text-muted-lavender font-body text-sm mb-6">
                  Are you sure you want to delete this post? This action cannot be undone.
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="ghost"
                    className="text-muted-lavender"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-glitch-red hover:bg-glitch-red/80 text-white"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}