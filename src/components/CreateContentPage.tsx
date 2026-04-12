import React from 'react';
import { UserResult } from '../App';
import { CreatePostPage } from './CreatePostPage';

interface CreateContentPageProps {
  onBack: () => void;
  userResult?: UserResult | null; // Made optional since we no longer require quiz results
  onContentCreated?: () => void;
  directToPostCreation?: boolean; // Legacy prop - now ignored since we always go direct
  preSelectedTribe?: string; // Legacy prop - for future use
  initialPostType?: string; // Legacy prop - for future use
}

export function CreateContentPage({ onBack, userResult, onContentCreated }: CreateContentPageProps) {

  const handlePostCreated = () => {
    try {
      console.log('🔄 CreateContentPage: Post created, handling callbacks...');
      
      // Call the content created callback first (this handles feed refresh)
      if (onContentCreated) {
        console.log('🔄 CreateContentPage: Calling onContentCreated callback...');
        onContentCreated();
      } else {
        console.warn('⚠️ CreateContentPage: No onContentCreated callback provided');
      }
    } catch (error) {
      console.error('Error in onContentCreated callback:', error);
    }
    
    // Always redirect back to feed
    console.log('🔙 CreateContentPage: Calling onBack to return to feed...');
    onBack();
  };

  // Always render the CreatePostPage for a streamlined experience
  return (
    <CreatePostPage
      onBack={onBack}
      userInfo={userResult ? {
        username: userResult.nickname || 'user',
        email: '', 
        id: '',
        method: 'email' as const,
        contact: '',
        verified: true,
        joinDate: new Date(),
        xpPoints: 0,
        notificationsEnabled: true,
        privacyMode: 'medium' as const
      } : null}
      onPostCreated={handlePostCreated}
    />
  );
}