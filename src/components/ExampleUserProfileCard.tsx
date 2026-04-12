import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { UserAvatarRow, ProfileUserAvatarRow } from './UserAvatarRow';
import { SafeBio, SafeUsername, SafeInlineText } from './SafeText';
import { safeUserProfileCard, safeUserDescriptionPreview } from '../utils/user-profile-helpers';

// Example interface showing proper typing for user data that might have null fields
interface ExampleUser {
  id: string;
  username?: string | null;
  nickname?: string | null;
  description?: string | null;
  profile_image_url?: string | null;
  coreRealm?: string | null;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
}

interface ExampleUserProfileCardProps {
  user: ExampleUser;
  variant?: 'compact' | 'detailed' | 'list' | 'header';
  onUserClick?: (user: ExampleUser) => void;
}

/**
 * Example component showing proper null guards for user descriptions
 * This demonstrates the comprehensive approach to handling null/undefined user data
 */
export function ExampleUserProfileCard({ 
  user, 
  variant = 'detailed', 
  onUserClick 
}: ExampleUserProfileCardProps) {
  // Use our safe profile helpers to handle all null/undefined values
  const safeProfile = safeUserProfileCard(user);
  
  // Example: Render different variants with proper null guards
  
  if (variant === 'compact') {
    return (
      <Card className="bg-midnight-black/30 border border-muted-lavender/20 p-3 hover:bg-midnight-black/50 transition-all duration-300">
        <CardContent className="p-0">
          <UserAvatarRow
            user={user}
            avatarSize="sm"
            showDescription={true}
            showRealm={true}
            onClick={() => onUserClick?.(user)}
          />
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'list') {
    return (
      <div className="flex items-center justify-between p-4 border-b border-muted-lavender/20">
        <UserAvatarRow
          user={user}
          avatarSize="md"
          showDescription={true}
          showRealm={false}
          onClick={() => onUserClick?.(user)}
          className="flex-1"
        />
        
        <div className="flex items-center space-x-4 text-xs text-muted-lavender ml-4">
          <span>{user.followerCount || 0} followers</span>
          <span>{user.postCount || 0} posts</span>
        </div>
      </div>
    );
  }
  
  if (variant === 'header') {
    return (
      <div className="flex items-center space-x-3 p-4">
        <ProfileUserAvatarRow
          user={user}
          onClick={() => onUserClick?.(user)}
        />
      </div>
    );
  }
  
  // Default: detailed variant with comprehensive null guards
  return (
    <Card className="bg-gradient-to-br from-midnight-black/80 to-midnight-black/60 border-muted-lavender/30">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4 mb-4">
          <UserAvatarRow
            user={user}
            avatarSize="lg"
            showDescription={false}
            showRealm={true}
            onClick={() => onUserClick?.(user)}
          />
          
          <div className="flex-1 space-y-2">
            {/* Stats row with safe number formatting */}
            <div className="flex items-center space-x-6 text-sm text-muted-lavender">
              <span>
                <span className="text-pearl-white font-medium">{user.postCount || 0}</span> posts
              </span>
              <span>
                <span className="text-pearl-white font-medium">{user.followerCount || 0}</span> followers
              </span>
              <span>
                <span className="text-pearl-white font-medium">{user.followingCount || 0}</span> following
              </span>
            </div>
          </div>
        </div>
        
        {/* Bio section with SafeBio component - handles null descriptions gracefully */}
        <div className="border-t border-muted-lavender/20 pt-4">
          <SafeBio
            description={user.description}
            className="text-muted-lavender font-body text-sm leading-relaxed"
            showFullOnClick={true}
          />
        </div>
        
        {/* Example of different ways to handle descriptions */}
        <div className="mt-4 space-y-2 text-xs text-muted-lavender/60">
          <div>
            <span className="font-medium">Raw description:</span>{' '}
            {user.description || 'null/undefined'}
          </div>
          <div>
            <span className="font-medium">Safe description:</span>{' '}
            {safeProfile.description}
          </div>
          <div>
            <span className="font-medium">Preview (60 chars):</span>{' '}
            {safeUserDescriptionPreview(user.description, 60)}
          </div>
          <div>
            <span className="font-medium">Has valid description:</span>{' '}
            {safeProfile.hasValidDescription ? 'Yes' : 'No'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Example usage component showing different null scenarios
export function NullGuardExamples() {
  // Test cases with different null scenarios
  const testUsers: ExampleUser[] = [
    {
      id: '1',
      username: 'complete_user',
      nickname: 'Complete User',
      description: 'This user has all fields filled out properly.',
      profile_image_url: null,
      coreRealm: 'mirrorcore',
      followerCount: 150,
      followingCount: 89,
      postCount: 24
    },
    {
      id: '2',
      username: 'minimal_user',
      nickname: null,
      description: null,
      profile_image_url: null,
      coreRealm: null,
      followerCount: 0,
      followingCount: 0,
      postCount: 0
    },
    {
      id: '3',
      username: null,
      nickname: 'Mystery User',
      description: '',
      profile_image_url: null,
      coreRealm: 'shadowcore',
      followerCount: 42,
      followingCount: 12,
      postCount: 7
    },
    {
      id: '4',
      username: 'edge_case',
      nickname: '   ',  // Whitespace only
      description: '   \n   ',  // More whitespace
      profile_image_url: null,
      coreRealm: 'embercore',
      followerCount: 5,
      followingCount: 3,
      postCount: 1
    }
  ];
  
  return (
    <div className="space-y-6 p-6">
      <h2 className="font-headline text-pearl-white text-xl mb-4">
        User Profile Null Guard Examples
      </h2>
      
      {testUsers.map((user, index) => (
        <div key={user.id} className="space-y-2">
          <h3 className="font-body text-muted-lavender text-sm">
            Test Case {index + 1}: {user.username || 'null username'}
          </h3>
          <ExampleUserProfileCard
            user={user}
            variant="detailed"
            onUserClick={(user) => console.log('Clicked user:', user)}
          />
        </div>
      ))}
      
      <div className="mt-8">
        <h3 className="font-headline text-pearl-white mb-4">Different Variants</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-muted-lavender text-sm mb-2">Compact:</h4>
            <ExampleUserProfileCard user={testUsers[0]} variant="compact" />
          </div>
          <div>
            <h4 className="text-muted-lavender text-sm mb-2">List:</h4>
            <ExampleUserProfileCard user={testUsers[1]} variant="list" />
          </div>
          <div>
            <h4 className="text-muted-lavender text-sm mb-2">Header:</h4>
            <ExampleUserProfileCard user={testUsers[2]} variant="header" />
          </div>
        </div>
      </div>
    </div>
  );
}