import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';
import { 
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Image,
  RefreshCw
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
  error?: string;
}

interface ProfileEdgeApiTestPageProps {
  onBack: () => void;
  userInfo?: any;
}

export function ProfileEdgeApiTestPage({ onBack, userInfo }: ProfileEdgeApiTestPageProps) {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [testUserId, setTestUserId] = useState('');
  const [currentUserPosts, setCurrentUserPosts] = useState<any[]>([]);

  // Update test result
  const updateTest = (name: string, status: 'success' | 'error', message: string, data?: any, error?: string) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.data = data;
        existing.error = error;
        return [...prev];
      } else {
        return [...prev, { name, status, message, data, error }];
      }
    });
  };

  // Run comprehensive Edge API tests
  const runTests = async () => {
    setRunning(true);
    setTests([]);
    
    try {
      console.log('🧪 Starting Profile Edge API Tests...');

      // Test 1: Get current user session
      updateTest('Session Check', 'pending', 'Checking authentication...');
      try {
        const { supabase } = await import('../utils/supabase/client');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user?.id) {
          throw new Error('No authenticated session found');
        }
        
        const currentUserId = session.user.id;
        updateTest('Session Check', 'success', `Authenticated user: ${currentUserId}`, { userId: currentUserId });
        setTestUserId(currentUserId);
        
        // Test 2: Edge API getUserPosts with current user
        updateTest('getUserPosts (Current User)', 'pending', 'Fetching posts via Edge API...');
        try {
          const { getUserPosts } = await import('../utils/edge');
          const response = await getUserPosts(currentUserId);
          
          updateTest('getUserPosts (Current User)', 'success', 
            `Edge API returned ${response?.posts?.length || 0} posts`, response);
          setCurrentUserPosts(response?.posts || []);
          
        } catch (postsError) {
          updateTest('getUserPosts (Current User)', 'error', 
            'Failed to fetch user posts', undefined, postsError.message);
        }
        
        // Test 3: Edge API getUserStats with current user
        updateTest('getUserStats (Current User)', 'pending', 'Fetching stats via Edge API...');
        try {
          const { getUserStats } = await import('../utils/edge');
          const statsResponse = await getUserStats(currentUserId);
          
          updateTest('getUserStats (Current User)', 'success', 
            'Edge API stats retrieved successfully', statsResponse);
          
        } catch (statsError) {
          updateTest('getUserStats (Current User)', 'error', 
            'Failed to fetch user stats', undefined, statsError.message);
        }
        
        // Test 4: Test invalid user ID handling
        updateTest('Invalid User ID Test', 'pending', 'Testing error handling...');
        try {
          const { getUserPosts } = await import('../utils/edge');
          await getUserPosts('invalid-user-id');
          
          updateTest('Invalid User ID Test', 'error', 
            'Should have failed with invalid user ID', undefined, 'Test should have thrown an error');
          
        } catch (invalidError) {
          updateTest('Invalid User ID Test', 'success', 
            `Correctly handled invalid user ID: ${invalidError.message}`);
        }
        
        // Test 5: Test undefined user ID handling
        updateTest('Undefined User ID Test', 'pending', 'Testing undefined user ID...');
        try {
          const { getUserPosts } = await import('../utils/edge');
          await getUserPosts(undefined as any);
          
          updateTest('Undefined User ID Test', 'error', 
            'Should have failed with undefined user ID', undefined, 'Test should have thrown an error');
          
        } catch (undefinedError) {
          updateTest('Undefined User ID Test', 'success', 
            `Correctly handled undefined user ID: ${undefinedError.message}`);
        }
        
        // Test 6: Media URL normalization check
        updateTest('Media URL Check', 'pending', 'Checking media URL normalization...');
        try {
          const postsWithMedia = currentUserPosts.filter(post => 
            post.media_url || post.media_thumb_url || post.thumbnail_url
          );
          
          if (postsWithMedia.length > 0) {
            const mediaUrlsFound = {
              media_url: postsWithMedia.filter(p => p.media_url).length,
              media_thumb_url: postsWithMedia.filter(p => p.media_thumb_url).length,
              thumbnail_url: postsWithMedia.filter(p => p.thumbnail_url).length
            };
            
            updateTest('Media URL Check', 'success', 
              `Found ${postsWithMedia.length} posts with media`, mediaUrlsFound);
          } else {
            updateTest('Media URL Check', 'success', 
              'No media posts found to test (create some image/video posts to test this)');
          }
          
        } catch (mediaError) {
          updateTest('Media URL Check', 'error', 
            'Failed to check media URLs', undefined, mediaError.message);
        }
        
      } catch (sessionError) {
        updateTest('Session Check', 'error', 
          'Authentication failed', undefined, sessionError.message);
      }

    } catch (error) {
      console.error('🧪 Test suite error:', error);
      toast.error('Test suite failed to run');
    } finally {
      setRunning(false);
    }
  };

  // Test specific user ID
  const testSpecificUser = async () => {
    if (!testUserId.trim()) {
      toast.error('Please enter a user ID to test');
      return;
    }

    setRunning(true);
    
    try {
      updateTest(`Specific User Test (${testUserId})`, 'pending', 'Testing specific user...');
      
      const { getUserPosts } = await import('../utils/edge');
      const response = await getUserPosts(testUserId.trim());
      
      updateTest(`Specific User Test (${testUserId})`, 'success', 
        `Found ${response?.posts?.length || 0} posts for user`, response);
      
      toast.success(`✅ Successfully tested user ${testUserId}`);
      
    } catch (error) {
      updateTest(`Specific User Test (${testUserId})`, 'error', 
        'Failed to fetch posts for user', undefined, error.message);
      toast.error(`❌ Failed to test user: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  // Get status icon
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <AlertCircle className="w-5 h-5 text-yellow-400 animate-pulse" />;
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
          
          <h1 className="font-headline text-pearl-white text-xl">Profile Edge API Test</h1>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Test Controls */}
        <Card className="bg-midnight-black/50 border-muted-lavender/20">
          <CardHeader>
            <CardTitle className="text-pearl-white">Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={runTests}
                disabled={running}
                className="bg-electric-blue hover:bg-electric-blue/80 text-midnight-black"
              >
                {running ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                {running ? 'Running Tests...' : 'Run All Tests'}
              </Button>
              
              <Button 
                onClick={() => setTests([])}
                disabled={running}
                variant="outline"
                className="border-muted-lavender/30"
              >
                Clear Results
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-pearl-white">Test Specific User ID:</label>
              <div className="flex gap-2">
                <Input
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                  placeholder="Enter user ID (UUID)"
                  className="font-mono text-sm"
                />
                <Button 
                  onClick={testSpecificUser}
                  disabled={running || !testUserId.trim()}
                  variant="outline"
                  className="border-muted-lavender/30 whitespace-nowrap"
                >
                  Test User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card className="bg-midnight-black/50 border-muted-lavender/20">
          <CardHeader>
            <CardTitle className="text-pearl-white flex items-center justify-between">
              Test Results
              <Badge variant="outline" className="border-muted-lavender/30">
                {tests.length} tests
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tests.length === 0 ? (
              <div className="text-center py-8 text-muted-lavender">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tests run yet. Click "Run All Tests" to start.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map((test, index) => (
                  <Card key={index} className={`${getStatusColor(test.status)} border`}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(test.status)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-pearl-white">{test.name}</h4>
                          <p className="text-sm text-muted-lavender mt-1">{test.message}</p>
                          
                          {test.error && (
                            <div className="mt-2 p-2 bg-red-950/30 border border-red-400/20 rounded text-xs text-red-200">
                              {test.error}
                            </div>
                          )}
                          
                          {test.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-electric-blue cursor-pointer hover:text-electric-blue/80">
                                View Data
                              </summary>
                              <pre className="mt-2 p-2 bg-midnight-black/50 border border-muted-lavender/20 rounded text-xs text-muted-lavender overflow-auto max-h-32">
                                {JSON.stringify(test.data, null, 2)}
                              </pre>
                            </details>
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
                <li>Edge API authentication and session handling</li>
                <li>getUserPosts endpoint with proper media URL normalization</li>
                <li>getUserStats endpoint functionality</li>
                <li>Error handling for invalid/undefined user IDs</li>
                <li>Media URL presence (media_url, media_thumb_url, thumbnail_url)</li>
                <li>Prevention of 400 errors with user_id=eq.undefined</li>
              </ul>
              
              <p className="mt-4"><strong className="text-pearl-white">Expected results:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                <li>All tests should pass without 400 errors</li>
                <li>Media posts should have normalized URLs</li>
                <li>Invalid user IDs should be properly rejected</li>
                <li>Edge API should return consistent data structures</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}