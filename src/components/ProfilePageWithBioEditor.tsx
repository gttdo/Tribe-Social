import React, { useState } from 'react';
import { ProfilePage } from './ProfilePage';
import { BioEditor } from './BioEditor';

// This is a simple wrapper to demonstrate how BioEditor should be integrated
// Replace the bio section in ProfilePage with BioEditor

interface ProfilePageWithBioEditorProps {
  userResult?: any;
  userInfo: any;
  onBack: () => void;
  onLogout?: () => void;
  onNavigateToPage?: (page: string) => void;
  isOwnProfile?: boolean;
  savedList?: any[];
  savedLoading?: boolean;
  savedError?: string;
  onLoadSavedPosts?: () => Promise<void>;
  onFollowChange?: (targetUserId: string, isFollowing: boolean) => void;
}

export function ProfilePageWithBioEditor(props: ProfilePageWithBioEditorProps) {
  // For demonstration purposes, let's show how BioEditor should be used
  const [sampleBio, setSampleBio] = useState("This is a sample bio that can be edited!");
  const [userId] = useState("demo-user-id");

  const handleBioUpdate = (newBio: string) => {
    console.log('Bio updated to:', newBio);
    setSampleBio(newBio);
  };

  return (
    <div className="min-h-screen bg-midnight-black text-pearl-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-headline text-center mb-8">Bio Editor Demo</h1>
        
        <div className="bg-midnight-black/50 border border-muted-lavender/30 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Current Bio Editor Integration Issue:</h2>
          <p className="text-muted-lavender mb-4">
            The ProfilePage.tsx file doesn't actually use the BioEditor component. 
            It only displays the bio with SafeBio (read-only) but has no way to edit it.
          </p>
          
          <h3 className="text-lg font-medium mb-4">Working BioEditor Example:</h3>
          <BioEditor
            userId={userId}
            currentBio={sampleBio}
            onBioUpdate={handleBioUpdate}
            className="mb-4"
            username="demo-user"
          />
          
          <div className="mt-6 p-4 bg-muted-lavender/10 rounded border border-muted-lavender/20">
            <h4 className="font-medium text-neon-lilac mb-2">How to Fix:</h4>
            <ol className="text-sm space-y-2 text-muted-lavender">
              <li>1. Find where SafeBio is used in ProfilePage.tsx (for displaying the bio)</li>
              <li>2. Replace it with BioEditor component</li>
              <li>3. Pass the required props: userId, currentBio, onBioUpdate</li>
              <li>4. Make sure handleBioUpdate function updates the profile state</li>
            </ol>
          </div>
          
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => props.onNavigateToPage?.('profile')}
              className="px-4 py-2 bg-neon-lilac text-midnight-black rounded hover:bg-neon-lilac/90"
            >
              Back to Profile
            </button>
            
            <button
              onClick={() => window.location.href = '/?bio-button-test'}
              className="px-4 py-2 bg-electric-blue text-midnight-black rounded hover:bg-electric-blue/90"
            >
              Test Bio Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}