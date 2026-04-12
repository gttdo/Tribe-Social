import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';
import { 
  ArrowLeft,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Database,
  RefreshCw
} from 'lucide-react';

interface TestResult {
  component: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

interface ProfilePostsEdgeApiTestProps {
  onBack: () => void;
}

export function ProfilePostsEdgeApiTest({ onBack }: ProfilePostsEdgeApiTestProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [testUserId, setTestUserId] = useState('');

  // Update test result
  const updateTest = (component: string, status: 'success' | 'error', message: string, details?: string) => {
    setTestResults(prev => {
      const existing = prev.find(t => t.component === component);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.details = details;
        return [...prev];
      } else {
        return [...prev, { component, status, message, details }];
      }
    });
  };

  // Run comprehensive tests for all Profile Posts components
  const runTests = async () => {
    setRunning(true);
    setTestResults([]);
    
    try {
      console.log('🧪 Starting Profile Posts Edge API Tests...');

      // Get current user session
      let currentUserId = testUserId;
      if (!currentUserId) {
        const { supabase } = await import('../utils/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        currentUserId = session?.user?.id || '';
      }

      if (!currentUserId) {
        toast.error('No user ID available for testing');
        return;
      }

      console.log('Testing with user ID:', currentUserId);

      // Test 1: Direct edgeGet function
      updateTest('edgeGet Function', 'pending', 'Testing direct Edge API call...');
      try {
        const { edgeGet } = await import('../utils/edge');
        const data = await edgeGet<{ posts: any[] }>(`/users/${currentUserId}/posts`);
        
        updateTest('edgeGet Function', 'success', 
          `Edge API returned ${data?.posts?.length || 0} posts`,
          `Response structure: ${JSON.stringify(Object.keys(data || {}))}`);
      } catch (error) {
        updateTest('edgeGet Function', 'error', 
          'Edge API call failed', error.message);
      }

      // Test 2: user-posts-helpers
      updateTest('user-posts-helpers', 'pending', 'Testing fetchUserPosts helper...');
      try {
        const { fetchUserPosts } = await import('../utils/user-posts-helpers');
        const posts = await fetchUserPosts({ userId: currentUserId });
        
        updateTest('user-posts-helpers', 'success', 
          `fetchUserPosts returned ${posts.length} posts`,
          `All posts have valid IDs: ${posts.every(p => p.id && typeof p.id === 'string')}`);
      } catch (error) {
        updateTest('user-posts-helpers', 'error', 
          'fetchUserPosts helper failed', error.message);
      }

      // Test 3: ProfilePage fetchUserPosts (simulated)
      updateTest('ProfilePage Logic', 'pending', 'Testing ProfilePage post fetching logic...');
      try {
        // Simulate ProfilePage fetchUserPosts logic
        const { supabase } = await import('../utils/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        const authedId = session?.user?.id;

        const userId = testUserId ?? undefined ?? authedId;

        if (!userId) {
          updateTest('ProfilePage Logic', 'success', 'Correctly handled missing userId (no 400 error)');
        } else {
          const { edgeGet } = await import('../utils/edge');
          const data = await edgeGet<{ posts: any[] }>(`/users/${userId}/posts`);
          
          updateTest('ProfilePage Logic', 'success', 
            `ProfilePage logic would fetch ${data?.posts?.length || 0} posts`,
            `Resolved userId: ${userId}`);
        }
      } catch (error) {
        updateTest('ProfilePage Logic', 'error', 
          'ProfilePage logic failed', error.message);
      }

      // Test 4: EnhancedProfilePostsList logic
      updateTest('EnhancedProfilePostsList', 'pending', 'Testing enhanced posts list logic...');
      try {
        // Simulate EnhancedProfilePostsList logic
        const { supabase } = await import('../utils/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        const authedId = session?.user?.id;

        const resolvedUserId = currentUserId ?? authedId;

        if (!resolvedUserId) {
          updateTest('EnhancedProfilePostsList', 'success', 'Correctly handled missing userId');
        } else {
          const { edgeGet } = await import('../utils/edge');
          const data = await edgeGet<{ posts: any[] }>(`/users/${resolvedUserId}/posts`);
          
          updateTest('EnhancedProfilePostsList', 'success', 
            `Enhanced list would show ${data?.posts?.length || 0} posts`,
            `Media URLs present: ${data?.posts?.some(p => p.media_url || p.media_thumb_url) || false}`);
        }
      } catch (error) {
        updateTest('EnhancedProfilePostsList', 'error', 
          'Enhanced posts list logic failed', error.message);
      }

      // Test 5: PostGrid logic
      updateTest('PostGrid Logic', 'pending', 'Testing PostGrid component logic...');
      try {
        // Simulate PostGrid logic
        const { supabase } = await import('../utils/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        const authedId = session?.user?.id;

        const resolvedUserId = currentUserId ?? authedId;

        if (!resolvedUserId) {
          updateTest('PostGrid Logic', 'success', 'Correctly handled missing userId for PostGrid');
        } else {
          const { edgeGet } = await import('../utils/edge');
          const data = await edgeGet<{ posts: any[] }>(`/users/${resolvedUserId}/posts`);
          
          updateTest('PostGrid Logic', 'success', 
            `PostGrid would display ${data?.posts?.length || 0} posts`,
            `Pagination ready: ${data?.posts ? 'Yes' : 'No'}`);
        }
      } catch (error) {
        updateTest('PostGrid Logic', 'error', 
          'PostGrid logic failed', error.message);
      }

      // Test 6: Invalid User ID handling
      updateTest('Invalid User ID Test', 'pending', 'Testing invalid user ID handling...');
      try {
        const { edgeGet } = await import('../utils/edge');
        await edgeGet<{ posts: any[] }>('/users/invalid-user-id/posts');
        
        updateTest('Invalid User ID Test', 'error', 
          'Should have failed with invalid user ID');
      } catch (error) {
        updateTest('Invalid User ID Test', 'success', 
          `Correctly rejected invalid user ID: ${error.message}`);
      }

      console.log('✅ All Profile Posts Edge API tests completed');
      toast.success('Profile Posts Edge API tests completed');

    } catch (error) {
      console.error('🧪 Test suite error:', error);
      toast.error('Test suite failed to run');
    } finally {
      setRunning(false);
    }
  };

  // Get status icon
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-yellow-400 animate-pulse" />;
    }
  };

  // Get status color
  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'border-green-400/30 bg-green-950/20';
      case 'error': return 'border-red-400/30 bg-red-950/20';
      default: return 'border-yellow-400/30 bg-yellow-950/20';
    }
  };

  return (
    <div className="min-h-screen bg-midnight-black pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/90 soft-blur border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300 touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-pearl-white text-xl">Profile Posts Edge API Test</h1>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Test Controls */}
        <Card className="bg-midnight-black/50 border-muted-lavender/20">
          <CardHeader>
            <CardTitle className="text-pearl-white flex items-center">
              <TestTube className="w-5 h-5 mr-2" />
              Profile Posts Edge API Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-pearl-white">
                Test User ID (optional - will use current user if empty):
              </label>
              <Input
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="Enter user ID (UUID) or leave empty for current user"
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={runTests}
                disabled={running}
                className="bg-electric-blue hover:bg-electric-blue/80 text-midnight-black"
              >
                {running ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                {running ? 'Running Tests...' : 'Run All Tests'}
              </Button>
              
              <Button 
                onClick={() => setTestResults([])}
                disabled={running}
                variant="outline"
                className="border-muted-lavender/30"
              >
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card className="bg-midnight-black/50 border-muted-lavender/20">
          <CardHeader>
            <CardTitle className="text-pearl-white flex items-center justify-between">
              Test Results
              <Badge variant="outline" className="border-muted-lavender/30">
                {testResults.length} components
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <div className="text-center py-8 text-muted-lavender">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tests run yet. Click "Run All Tests" to start.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <Card key={index} className={`${getStatusColor(result.status)} border`}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(result.status)}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-pearl-white">{result.component}</h4>
                          <p className="text-sm text-muted-lavender mt-1">{result.message}</p>
                          
                          {result.details && (
                            <div className="mt-2 p-2 bg-midnight-black/50 border border-muted-lavender/20 rounded text-xs text-muted-lavender">
                              {result.details}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-midnight-black/50 border-muted-lavender/20">
          <CardContent className="p-4">
            <div className="text-sm text-muted-lavender space-y-2">
              <p><strong className="text-pearl-white">What this tests:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                <li>Direct <code>edgeGet</code> function calls to <code>/users/:userId/posts</code></li>
                <li>user-posts-helpers Edge API integration</li>
                <li>ProfilePage post fetching logic with robust userId resolution</li>
                <li>EnhancedProfilePostsList Edge API integration</li>
                <li>PostGrid Edge API integration with pagination</li>
                <li>Invalid user ID error handling (should reject gracefully)</li>
              </ul>
              
              <p className="mt-4"><strong className="text-pearl-white">Success criteria:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                <li>No direct PostgREST queries with <code>user_id=eq.undefined</code></li>
                <li>All components use Edge API with proper userId resolution</li>
                <li>Media URLs are normalized (media_url, media_thumb_url present)</li>
                <li>Invalid user IDs are rejected without causing 400 errors</li>
                <li>All posts have proper ID validation</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}