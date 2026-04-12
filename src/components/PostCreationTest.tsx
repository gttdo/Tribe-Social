import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner@2.0.3';

export function PostCreationTest() {
  const [testText, setTestText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const testCreatePost = async () => {
    if (!testText.trim()) {
      toast.error('Please enter some test text');
      return;
    }

    setIsCreating(true);
    setLastResult(null);

    try {
      // Test the payload structure
      const payload = {
        type: 'thought',
        text_body: testText.trim(),
        visibility: 'public'
      };

      console.log('🧪 Testing post creation with payload:', payload);

      // Use the same method as CreatePostPage
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('User not authenticated - please sign in again');
      }

      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const result = await makeAuthenticatedRequest('/make-server-70df0d6e/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('🧪 Post creation result:', result);
      setLastResult(result);

      if (result && result.post?.id) {
        toast.success('✅ Test post created successfully!', {
          description: `Post ID: ${result.post.id}`
        });
        setTestText(''); // Clear the input
      } else {
        toast.error('❌ Test failed', {
          description: result.error || 'Unknown error'
        });
      }

    } catch (error) {
      console.error('🧪 Test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult({ error: errorMessage });
      toast.error('❌ Test failed', {
        description: errorMessage
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Post Creation API Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="font-medium">Test Text Content:</label>
          <Textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter test post content..."
            className="min-h-[100px]"
          />
        </div>

        <Button 
          onClick={testCreatePost}
          disabled={isCreating || !testText.trim()}
          className="w-full"
        >
          {isCreating ? 'Creating Test Post...' : 'Test Create Post'}
        </Button>

        {lastResult && (
          <div className="space-y-2">
            <h3 className="font-semibold">Last Test Result:</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-sm overflow-auto">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>What this tests:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Correct payload structure with `type` field (not `post_type`)</li>
            <li>Authentication flow</li>
            <li>Server endpoint response</li>
            <li>Error handling</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}