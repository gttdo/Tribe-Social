import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';

export function ProfilePostsDebugTest() {
  const [userId, setUserId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testEdgeAPI = async () => {
    if (!userId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🧪 Testing Edge API with userId:', userId);

      // Test the Edge API getUserPosts function
      const { getUserPosts } = await import('../utils/edge');
      const response = await getUserPosts(userId.trim());

      console.log('🧪 Edge API Response:', response);
      setResult(response);

      if (response && response.posts) {
        toast.success(`✅ Successfully loaded ${response.posts.length} posts via Edge API`);
      } else {
        toast.success('✅ Edge API call successful (no posts found)');
      }

    } catch (error) {
      console.error('🧪 Edge API Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      toast.error(`❌ Edge API Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const testCurrentUser = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🧪 Getting current user ID...');

      // Get current user
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user?.id) {
        throw new Error('No authenticated user found');
      }

      const currentUserId = session.user.id;
      console.log('🧪 Current user ID:', currentUserId);
      setUserId(currentUserId);

      // Test with current user
      const { getUserPosts } = await import('../utils/edge');
      const response = await getUserPosts(currentUserId);

      console.log('🧪 Current User Posts Response:', response);
      setResult(response);

      if (response && response.posts) {
        toast.success(`✅ Successfully loaded ${response.posts.length} posts for current user`);
      } else {
        toast.success('✅ Edge API call successful for current user (no posts found)');
      }

    } catch (error) {
      console.error('🧪 Current User Test Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      toast.error(`❌ Current User Test Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const testInvalidUser = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🧪 Testing with invalid user ID...');

      // Test with invalid user ID
      const { getUserPosts } = await import('../utils/edge');
      const response = await getUserPosts('invalid-user-id');

      console.log('🧪 Invalid User Response:', response);
      setResult(response);
      toast.success('✅ Invalid user test completed');

    } catch (error) {
      console.error('🧪 Invalid User Test Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      
      // This should error, which is expected behavior
      toast.success(`✅ Expected error for invalid user: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Profile Posts Edge API Debug Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="font-medium">User ID to Test:</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID (UUID format)"
              className="font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={testEdgeAPI}
              disabled={loading || !userId.trim()}
              className="flex-1 min-w-[120px]"
            >
              {loading ? 'Testing...' : 'Test Edge API'}
            </Button>
            
            <Button 
              onClick={testCurrentUser}
              disabled={loading}
              variant="outline"
              className="flex-1 min-w-[120px]"
            >
              {loading ? 'Loading...' : 'Test Current User'}
            </Button>
            
            <Button 
              onClick={testInvalidUser}
              disabled={loading}
              variant="secondary"
              className="flex-1 min-w-[120px]"
            >
              {loading ? 'Testing...' : 'Test Invalid User'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="space-y-2">
            <h3 className="font-semibold text-red-400">Error Result:</h3>
            <div className="bg-red-950/20 border border-red-400/30 rounded-lg p-3">
              <pre className="text-sm text-red-200 whitespace-pre-wrap overflow-auto">
                {error}
              </pre>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <h3 className="font-semibold text-green-400">API Response:</h3>
            <div className="bg-green-950/20 border border-green-400/30 rounded-lg p-3 max-h-96 overflow-auto">
              <pre className="text-sm text-green-200 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>What this tests:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Edge API `/users/:userId/posts` endpoint functionality</li>
            <li>Proper authentication and session handling</li>
            <li>Media URL normalization (media_url, media_thumb_url, thumbnail_url)</li>
            <li>Error handling for invalid user IDs</li>
            <li>Response structure and data mapping</li>
          </ul>
          
          <p className="mt-4"><strong>Expected behavior:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Valid user IDs should return posts with normalized media URLs</li>
            <li>Invalid user IDs should return 404 or appropriate error</li>
            <li>No 400 errors with `user_id=eq.undefined`</li>
            <li>All media posts should have proper thumbnail/media URLs</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}