import React from 'react';
import { ProfilePostsList } from './ProfilePostsList';
import { validateUserId } from '../utils/user-posts-helpers';
import { AlertCircle } from 'lucide-react';

interface GuardedProfilePostsListProps {
  userId?: string;
  username?: string;
  isOwnProfile?: boolean;
  onPostClick?: (postId: string) => void;
  onCreatePost?: () => void;
  onPostDeleted?: (postId: string) => void;
  userResult?: any;
  userInfo?: any;
}

/**
 * A guarded wrapper around ProfilePostsList that validates userId before rendering
 * Updated to use comprehensive UUID validation that prevents 22P02 database errors
 */
export function GuardedProfilePostsList(props: GuardedProfilePostsListProps) {
  const { userId, username } = props;

  // Use comprehensive UUID validation to prevent database errors
  const validatedUserId = validateUserId(userId, 'GuardedProfilePostsList');

  // If userId is invalid but we have a username, we can still proceed 
  // (the ProfilePostsList will handle username resolution)
  if (!validatedUserId && !username) {
    console.warn('[GuardedProfilePostsList] No valid userId or username provided:', { userId, username });
    
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-muted-lavender/20 to-electric-blue/20 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-muted-lavender" />
        </div>
        <div className="space-y-2">
          <h3 className="font-headline text-pearl-white">Invalid User Information</h3>
          <p className="text-muted-lavender font-body text-sm">
            Cannot load posts - no valid user identifier provided.
          </p>
          {userId && (
            <p className="text-muted-lavender/60 font-body text-xs">
              Provided userId: {String(userId)} (invalid format)
            </p>
          )}
        </div>
      </div>
    );
  }

  // Log validation result for debugging
  if (validatedUserId) {
    console.log('[GuardedProfilePostsList] Using validated userId:', validatedUserId);
  } else if (username) {
    console.log('[GuardedProfilePostsList] Using username for resolution:', username);
  }

  // Render ProfilePostsList with validated or fallback parameters
  return <ProfilePostsList {...props} userId={validatedUserId || userId} />;
}