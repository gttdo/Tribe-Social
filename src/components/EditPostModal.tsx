import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PostDetails {
  id: string;
  type: 'thought' | 'image' | 'video' | 'audio';
  post_type?: string;
  content?: string;
  caption?: string;
  text_body?: string;
  media_url?: string;
  user_id: string;
}

interface EditPostModalProps {
  post: PostDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated?: (updatedPost: PostDetails) => void;
}

export function EditPostModal({ 
  post, 
  isOpen, 
  onClose,
  onPostUpdated
}: EditPostModalProps) {
  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  
  const maxCharacters = 2000;

  // Initialize text content when post changes
  useEffect(() => {
    if (post) {
      let initialText = '';
      
      if (post.type === 'thought' || post.post_type === 'thought') {
        // For thought posts, use text_body or content
        initialText = post.text_body || post.content || '';
      } else {
        // For media posts, use caption
        initialText = post.caption || '';
      }
      
      setTextContent(initialText);
      setCharCount(initialText.length);
    } else {
      setTextContent('');
      setCharCount(0);
    }
  }, [post]);

  // Update character count when text changes
  const handleTextChange = (value: string) => {
    setTextContent(value);
    setCharCount(value.length);
  };

  // Get the appropriate field name and placeholder based on post type
  const getFieldInfo = () => {
    if (!post) return { fieldName: 'content', placeholder: 'Write something...', label: 'Content' };
    
    if (post.type === 'thought' || post.post_type === 'thought') {
      return {
        fieldName: 'text_body',
        placeholder: 'What\'s on your mind?',
        label: 'Text Content'
      };
    } else {
      return {
        fieldName: 'caption',
        placeholder: 'Add a caption...',
        label: 'Caption'
      };
    }
  };

  // Submit the updated post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!post) return;
    
    // Validate content for thought posts
    if ((post.type === 'thought' || post.post_type === 'thought') && !textContent.trim()) {
      toast.error('Text content cannot be empty');
      return;
    }

    if (textContent.length > maxCharacters) {
      toast.error(`Content must be ${maxCharacters} characters or less`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Import edge helper
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      
      // Prepare update data
      const fieldInfo = getFieldInfo();
      const updateData = {
        [fieldInfo.fieldName]: textContent.trim()
      };

      // Make the API call
      const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.success && response.post) {
        toast.success('Post updated successfully! ✨');
        
        // Create updated post object
        const updatedPost = {
          ...post,
          ...response.post,
          type: post.type, // Preserve the type from the original post
        };
        
        // Notify parent component
        onPostUpdated?.(updatedPost);
        
        // Close modal
        onClose();
      } else {
        throw new Error(response.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update post';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal closes
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!post) return null;

  const fieldInfo = getFieldInfo();
  const isOverLimit = charCount > maxCharacters;
  const isNearLimit = charCount > maxCharacters * 0.8;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full max-w-lg mx-4 bg-midnight-black/95 border border-muted-lavender/20">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-pearl-white">
            Edit {post.type === 'thought' || post.post_type === 'thought' ? 'Thought' : 'Caption'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-lavender">
            {post.type === 'thought' || post.post_type === 'thought' 
              ? 'Update your thought content'
              : 'Update the caption for your media post'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Text Content */}
          <div className="space-y-2">
            <label htmlFor="edit-content" className="text-sm font-medium text-pearl-white">
              {fieldInfo.label}
            </label>
            <Textarea
              id="edit-content"
              value={textContent}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={fieldInfo.placeholder}
              className={`min-h-[120px] bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/60 resize-none focus:border-neon-lilac/50 focus:ring-1 focus:ring-neon-lilac/30 ${
                isOverLimit ? 'border-glitch-red/50 focus:border-glitch-red/50 focus:ring-glitch-red/30' : ''
              }`}
              disabled={isSubmitting}
              maxLength={maxCharacters + 100} // Allow slight overage for UX
            />
            
            {/* Character Counter */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-lavender/60">
                {post.type === 'thought' || post.post_type === 'thought' 
                  ? 'Express your thoughts' 
                  : 'Add context to your media'
                }
              </span>
              <span className={`font-medium ${
                isOverLimit 
                  ? 'text-glitch-red' 
                  : isNearLimit 
                    ? 'text-soft-blush' 
                    : 'text-muted-lavender'
              }`}>
                {charCount.toLocaleString()}/{maxCharacters.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || isOverLimit || (post.type === 'thought' && !textContent.trim())}
              className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-medium min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}