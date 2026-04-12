import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { FollowButton, useFollowActions } from './FollowButton';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function FollowButtonDemo() {
  const [testUserId, setTestUserId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  // Example of using the hook directly
  const { isFollowing, counts, loading, err, actions } = useFollowActions(targetUserId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="font-headline text-3xl text-pearl-white">
            Follow Button Demo
          </h1>
          <p className="text-muted-lavender font-body">
            Test the follow/unfollow functionality with different user IDs
          </p>
        </div>

        {/* Input Section */}
        <Card className="bg-gradient-to-br from-midnight-black to-midnight-black/80 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="font-headline text-pearl-white">Test User ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-muted-lavender font-body">
                Enter a user ID to test following:
              </Label>
              <Input
                id="userId"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                className="bg-input-background border-muted-lavender/30 text-pearl-white font-body"
              />
            </div>
            
            <Button
              onClick={() => setTargetUserId(testUserId)}
              disabled={!testUserId.trim()}
              className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black font-body"
            >
              Load User
            </Button>
          </CardContent>
        </Card>

        {/* Follow Button Component Demo */}
        {targetUserId && (
          <Card className="bg-gradient-to-br from-midnight-black to-midnight-black/80 border-muted-lavender/30">
            <CardHeader>
              <CardTitle className="font-headline text-pearl-white">
                FollowButton Component
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="text-muted-lavender font-body text-sm">
                Target User ID: <span className="text-electric-blue font-mono">{targetUserId}</span>
              </div>
              
              <FollowButton 
                userId={targetUserId}
                variant="default"
                size="default"
              />
              
              {/* Different sizes demo */}
              <div className="flex flex-wrap gap-4 items-center justify-center">
                <FollowButton 
                  userId={targetUserId}
                  variant="outline"
                  size="sm"
                />
                <FollowButton 
                  userId={targetUserId}
                  variant="ghost"
                  size="lg"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hook Usage Demo */}
        {targetUserId && (
          <Card className="bg-gradient-to-br from-midnight-black to-midnight-black/80 border-muted-lavender/30">
            <CardHeader>
              <CardTitle className="font-headline text-pearl-white">
                useFollowActions Hook Demo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Current State Display */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="text-muted-lavender font-body">
                    <span className="font-medium">Following:</span> {isFollowing ? 'Yes' : 'No'}
                  </div>
                  <div className="text-muted-lavender font-body">
                    <span className="font-medium">Loading:</span> {loading ? 'Yes' : 'No'}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-muted-lavender font-body">
                    <span className="font-medium">Followers:</span> {counts.followers}
                  </div>
                  <div className="text-muted-lavender font-body">
                    <span className="font-medium">Following:</span> {counts.following}
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {err && (
                <div className="p-3 bg-glitch-red/10 border border-glitch-red/30 rounded-lg">
                  <p className="text-glitch-red font-body text-sm">{err}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={actions.Load}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="border-electric-blue/50 text-electric-blue hover:bg-electric-blue/10"
                >
                  Reload Data
                </Button>
                
                <Button
                  onClick={actions.Follow}
                  disabled={loading || isFollowing}
                  variant="default"
                  size="sm"
                  className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
                >
                  Follow
                </Button>
                
                <Button
                  onClick={actions.Unfollow}
                  disabled={loading || !isFollowing}
                  variant="outline"
                  size="sm"
                  className="border-glitch-red/50 text-glitch-red hover:bg-glitch-red/10"
                >
                  Unfollow
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Instructions */}
        <Card className="bg-gradient-to-br from-midnight-black to-midnight-black/80 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="font-headline text-pearl-white">Usage Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-lavender font-body space-y-2">
              <p>
                <strong>Component Usage:</strong> Simply import and use the FollowButton component with a userId prop.
              </p>
              <pre className="bg-midnight-black/50 p-3 rounded-lg text-electric-blue text-xs overflow-x-auto">
{`<FollowButton 
  userId="user-id-here"
  variant="default" // or "outline" or "ghost"
  size="default"    // or "sm" or "lg"
/>`}
              </pre>
              
              <p>
                <strong>Hook Usage:</strong> Use the useFollowActions hook for custom implementations.
              </p>
              <pre className="bg-midnight-black/50 p-3 rounded-lg text-electric-blue text-xs overflow-x-auto">
{`const { isFollowing, counts, loading, err, actions } = useFollowActions(userId);
// Then use actions.Load(), actions.Follow(), actions.Unfollow()`}
              </pre>
              
              <p>
                <strong>Requirements:</strong> Assumes you have the following database tables:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><code>v_profile_counts</code> view with followers_count, following_count</li>
                <li><code>follows</code> table with follower_id, following_id columns</li>
                <li>Proper authentication with Supabase</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}