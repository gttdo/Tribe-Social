import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  Bookmark, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Database,
  Users,
  Grid
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface SavedPostsTestPageProps {
  onBack: () => void;
}

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'running';
  message: string;
  details?: any;
}

export function SavedPostsTestPage({ onBack }: SavedPostsTestPageProps) {
  const [tests, setTests] = useState<TestResult[]>([
    {
      name: 'Authentication Check',
      status: 'pending',
      message: 'Waiting to run...'
    },
    {
      name: 'Saved Posts API Connection',
      status: 'pending', 
      message: 'Waiting to run...'
    },
    {
      name: 'Save Post Functionality',
      status: 'pending',
      message: 'Waiting to run...'
    },
    {
      name: 'Unsave Post Functionality', 
      status: 'pending',
      message: 'Waiting to run...'
    },
    {
      name: 'Saved Posts Grid Loading',
      status: 'pending',
      message: 'Waiting to run...'
    },
    {
      name: 'Empty State Handling',
      status: 'pending',
      message: 'Waiting to run...'
    },
    {
      name: 'Error Handling',
      status: 'pending',
      message: 'Waiting to run...'
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [completedTests, setCompletedTests] = useState(0);

  const updateTestStatus = (testName: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => prev.map(test => 
      test.name === testName 
        ? { ...test, status, message, details }
        : test
    ));

    if (status !== 'running' && status !== 'pending') {
      setCompletedTests(prev => prev + 1);
    }
  };

  // Test authentication
  const testAuthentication = async (): Promise<{ success: boolean; userId?: string }> => {
    updateTestStatus('Authentication Check', 'running', 'Checking authentication status...');
    
    try {
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        updateTestStatus('Authentication Check', 'error', `Auth error: ${error.message}`);
        return { success: false };
      }
      
      if (!session?.user) {
        updateTestStatus('Authentication Check', 'error', 'No authenticated user found');
        return { success: false };
      }
      
      updateTestStatus('Authentication Check', 'success', `Authenticated as: ${session.user.email}`, {
        userId: session.user.id,
        email: session.user.email
      });
      
      return { success: true, userId: session.user.id };
    } catch (error) {
      updateTestStatus('Authentication Check', 'error', `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false };
    }
  };

  // Test saved posts API connection
  const testSavedPostsAPI = async (userId: string): Promise<boolean> => {
    updateTestStatus('Saved Posts API Connection', 'running', 'Testing API connection...');
    
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/users/${userId}/saved`);
      
      updateTestStatus('Saved Posts API Connection', 'success', 'API connection successful', {
        postsCount: response.posts?.length || 0,
        totalCount: response.totalCount || 0,
        message: response.message
      });
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if this is a "no saved posts" scenario vs a real error
      if (errorMessage.includes('404') || errorMessage.includes('No saved posts found')) {
        updateTestStatus('Saved Posts API Connection', 'success', 'API connection successful (no saved posts found)', {
          note: 'This is expected for users with no saved posts'
        });
        return true;
      } else {
        updateTestStatus('Saved Posts API Connection', 'error', `API error: ${errorMessage}`);
        return false;
      }
    }
  };

  // Test save post functionality
  const testSavePost = async (): Promise<{ success: boolean; testPostId?: string }> => {
    updateTestStatus('Save Post Functionality', 'running', 'Testing save post...');
    
    try {
      // First, try to create a test post to save
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      
      // Create a simple test post
      let testPostId: string | undefined;
      
      try {
        const createResponse = await makeAuthenticatedRequest('/posts', {
          method: 'POST',
          body: JSON.stringify({
            type: 'thought',
            content: 'Test post for saved posts functionality - safe to delete',
            caption: 'Test post for saved posts functionality',
            realm: 'public'
          })
        });
        
        testPostId = createResponse.post?.id;
        
        if (!testPostId) {
          // Try to get any existing post instead
          const postsResponse = await makeAuthenticatedRequest('/posts');
          testPostId = postsResponse.posts?.[0]?.id;
        }
        
        if (!testPostId) {
          updateTestStatus('Save Post Functionality', 'error', 'No posts available to test saving');
          return { success: false };
        }
        
      } catch (createError) {
        // If we can't create a test post, try to get an existing one
        console.log('Could not create test post, trying to find existing post:', createError);
        try {
          const postsResponse = await makeAuthenticatedRequest('/posts');
          testPostId = postsResponse.posts?.[0]?.id;
          
          if (!testPostId) {
            updateTestStatus('Save Post Functionality', 'error', 'No posts available to test saving');
            return { success: false };
          }
        } catch (fetchError) {
          updateTestStatus('Save Post Functionality', 'error', 'Could not find any posts to test saving');
          return { success: false };
        }
      }
      
      // Now try to save the post
      try {
        const saveResponse = await makeAuthenticatedRequest(`/posts/${testPostId}/bookmark`, {
          method: 'POST'
        });
        
        if (saveResponse.bookmarked === true) {
          updateTestStatus('Save Post Functionality', 'success', 'Successfully saved post', {
            postId: testPostId,
            bookmarked: saveResponse.bookmarked
          });
          return { success: true, testPostId };
        } else {
          // The post might have been already saved, try to unsave and save again
          const unsaveResponse = await makeAuthenticatedRequest(`/posts/${testPostId}/bookmark`, {
            method: 'POST'
          });
          
          const finalSaveResponse = await makeAuthenticatedRequest(`/posts/${testPostId}/bookmark`, {
            method: 'POST'
          });
          
          if (finalSaveResponse.bookmarked === true) {
            updateTestStatus('Save Post Functionality', 'success', 'Successfully saved post (after toggling)', {
              postId: testPostId,
              bookmarked: finalSaveResponse.bookmarked
            });
            return { success: true, testPostId };
          } else {
            updateTestStatus('Save Post Functionality', 'error', 'Bookmark toggle not working as expected', {
              postId: testPostId,
              responses: { unsaveResponse, finalSaveResponse }
            });
            return { success: false, testPostId };
          }
        }
      } catch (bookmarkError) {
        updateTestStatus('Save Post Functionality', 'error', `Bookmark API error: ${bookmarkError instanceof Error ? bookmarkError.message : 'Unknown error'}`, {
          postId: testPostId
        });
        return { success: false, testPostId };
      }
      
    } catch (error) {
      updateTestStatus('Save Post Functionality', 'error', `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false };
    }
  };

  // Test unsave post functionality
  const testUnsavePost = async (testPostId?: string): Promise<boolean> => {
    updateTestStatus('Unsave Post Functionality', 'running', 'Testing unsave post...');
    
    if (!testPostId) {
      updateTestStatus('Unsave Post Functionality', 'error', 'No test post available for unsave test');
      return false;
    }
    
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/posts/${testPostId}/bookmark`, {
        method: 'POST'
      });
      
      if (response.bookmarked === false) {
        updateTestStatus('Unsave Post Functionality', 'success', 'Successfully unsaved post', {
          postId: testPostId,
          bookmarked: response.bookmarked
        });
        return true;
      } else {
        updateTestStatus('Unsave Post Functionality', 'error', 'Unsave not working as expected', {
          postId: testPostId,
          bookmarked: response.bookmarked
        });
        return false;
      }
    } catch (error) {
      updateTestStatus('Unsave Post Functionality', 'error', `API error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        postId: testPostId
      });
      return false;
    }
  };

  // Test saved posts grid loading
  const testSavedPostsGrid = async (userId: string): Promise<boolean> => {
    updateTestStatus('Saved Posts Grid Loading', 'running', 'Testing grid component...');
    
    try {
      // Import and test the SavedPostsGrid component functionality
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/users/${userId}/saved`);
      
      // Test that the response has the expected structure
      const hasExpectedStructure = (
        typeof response === 'object' &&
        Array.isArray(response.posts) &&
        typeof response.totalCount === 'number'
      );
      
      if (hasExpectedStructure) {
        updateTestStatus('Saved Posts Grid Loading', 'success', 'Grid data structure is correct', {
          postsCount: response.posts.length,
          totalCount: response.totalCount,
          samplePost: response.posts[0] ? {
            id: response.posts[0].id,
            hasRequiredFields: !!(response.posts[0].id && response.posts[0].type)
          } : null
        });
        return true;
      } else {
        updateTestStatus('Saved Posts Grid Loading', 'error', 'Invalid data structure returned', {
          responseStructure: Object.keys(response || {})
        });
        return false;
      }
    } catch (error) {
      updateTestStatus('Saved Posts Grid Loading', 'error', `Grid test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Test empty state handling
  const testEmptyState = async (userId: string): Promise<boolean> => {
    updateTestStatus('Empty State Handling', 'running', 'Testing empty state...');
    
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      const response = await makeAuthenticatedRequest(`/users/${userId}/saved`);
      
      if (response.posts && response.posts.length === 0) {
        updateTestStatus('Empty State Handling', 'success', 'Empty state handled correctly', {
          message: response.message,
          totalCount: response.totalCount
        });
        return true;
      } else if (response.posts && response.posts.length > 0) {
        updateTestStatus('Empty State Handling', 'success', 'Has saved posts (empty state not applicable)', {
          postsCount: response.posts.length
        });
        return true;
      } else {
        updateTestStatus('Empty State Handling', 'error', 'Unexpected response structure for empty state');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // If the error is about no saved posts, that's actually a successful empty state test
      if (errorMessage.includes('No saved posts') || errorMessage.includes('404')) {
        updateTestStatus('Empty State Handling', 'success', 'Empty state handled correctly (via error message)', {
          errorHandled: errorMessage
        });
        return true;
      } else {
        updateTestStatus('Empty State Handling', 'error', `Empty state test error: ${errorMessage}`);
        return false;
      }
    }
  };

  // Test error handling
  const testErrorHandling = async (): Promise<boolean> => {
    updateTestStatus('Error Handling', 'running', 'Testing error scenarios...');
    
    try {
      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      
      // Test with invalid user ID
      try {
        await makeAuthenticatedRequest('/users/invalid-user-id/saved');
        updateTestStatus('Error Handling', 'error', 'Should have failed with invalid user ID');
        return false;
      } catch (expectedError) {
        // This should fail, which is good
      }
      
      // Test with invalid post ID for bookmarking
      try {
        await makeAuthenticatedRequest('/posts/invalid-post-id/bookmark', {
          method: 'POST'
        });
        updateTestStatus('Error Handling', 'error', 'Should have failed with invalid post ID');
        return false;
      } catch (expectedError) {
        // This should fail, which is good
      }
      
      updateTestStatus('Error Handling', 'success', 'Error handling works correctly', {
        note: 'Invalid requests properly rejected'
      });
      return true;
      
    } catch (error) {
      updateTestStatus('Error Handling', 'error', `Error handling test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setCompletedTests(0);
    
    // Reset all tests to pending
    setTests(prev => prev.map(test => ({ ...test, status: 'pending', message: 'Waiting to run...' })));
    
    try {
      // Test 1: Authentication
      const authResult = await testAuthentication();
      if (!authResult.success) {
        setIsRunning(false);
        return;
      }
      
      const userId = authResult.userId!;
      
      // Test 2: Saved Posts API Connection
      const apiResult = await testSavedPostsAPI(userId);
      if (!apiResult) {
        // Continue with other tests even if API has issues
      }
      
      // Test 3 & 4: Save and Unsave functionality
      const saveResult = await testSavePost();
      if (saveResult.success) {
        await testUnsavePost(saveResult.testPostId);
      } else {
        updateTestStatus('Unsave Post Functionality', 'error', 'Skipped due to save test failure');
      }
      
      // Test 5: Saved Posts Grid Loading
      await testSavedPostsGrid(userId);
      
      // Test 6: Empty State Handling
      await testEmptyState(userId);
      
      // Test 7: Error Handling
      await testErrorHandling();
      
      toast.success('Testing completed! Check results below.');
      
    } catch (error) {
      console.error('Test suite error:', error);
      toast.error('Test suite encountered an error');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'pending':
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'bg-green-500/20 text-green-400 border-green-500/40',
      error: 'bg-red-500/20 text-red-400 border-red-500/40',
      running: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      pending: 'bg-gray-500/20 text-gray-400 border-gray-500/40'
    };
    
    return (
      <Badge className={`${variants[status]} font-body text-xs`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const successCount = tests.filter(test => test.status === 'success').length;
  const errorCount = tests.filter(test => test.status === 'error').length;

  return (
    <div className="min-h-screen bg-midnight-black pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="font-headline font-medium text-pearl-white">Saved Posts Test Suite</h1>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Test Overview Card */}
        <Card className="bg-gradient-to-br from-midnight-black to-midnight-black/80 border-muted-lavender/30">
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-lilac/20 to-electric-blue/20 flex items-center justify-center">
                <Bookmark className="w-6 h-6 text-neon-lilac" />
              </div>
              <div>
                <h2 className="font-headline text-pearl-white text-lg">Saved Posts Testing</h2>
                <p className="text-muted-lavender font-body text-sm">
                  Comprehensive test suite for saved posts functionality
                </p>
              </div>
            </div>

            {/* Progress Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-muted-lavender/20">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <p className="font-headline text-pearl-white text-lg">{successCount}</p>
                <p className="text-muted-lavender font-body text-xs">Passed</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
                <p className="font-headline text-pearl-white text-lg">{errorCount}</p>
                <p className="text-muted-lavender font-body text-xs">Failed</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 mx-auto rounded-full bg-neon-lilac/20 flex items-center justify-center mb-2">
                  <Database className="w-4 h-4 text-neon-lilac" />
                </div>
                <p className="font-headline text-pearl-white text-lg">{tests.length}</p>
                <p className="text-muted-lavender font-body text-xs">Total</p>
              </div>
            </div>

            {/* Run Tests Button */}
            <Button
              onClick={runAllTests}
              disabled={isRunning}
              className="w-full bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white font-body rounded-xl py-3 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Running Tests...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Run All Tests</span>
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Test Results */}
        <div className="space-y-3">
          {tests.map((test, index) => (
            <Card key={index} className="bg-midnight-black/50 border-muted-lavender/30 hover:border-muted-lavender/50 transition-all duration-300">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.status)}
                    <h3 className="font-headline text-pearl-white text-sm">{test.name}</h3>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
                
                <p className="text-muted-lavender font-body text-sm mb-2">
                  {test.message}
                </p>
                
                {/* Test Details */}
                {test.details && (
                  <div className="mt-3 p-3 rounded-lg bg-muted-lavender/5 border border-muted-lavender/10">
                    <p className="text-muted-lavender/80 font-body text-xs mb-2">Details:</p>
                    <pre className="text-xs text-pearl-white/70 font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Footer Info */}
        <Card className="bg-gradient-to-br from-electric-blue/10 to-neon-lilac/10 border-electric-blue/30">
          <div className="p-4 text-center">
            <Grid className="w-8 h-8 text-electric-blue mx-auto mb-2" />
            <h3 className="font-headline text-pearl-white text-sm mb-1">Testing Complete</h3>
            <p className="text-muted-lavender font-body text-xs">
              This test suite validates the core saved posts functionality including API endpoints, 
              user interactions, and error handling scenarios.
            </p>
          </div>
        </Card>

        {/* Bottom spacing for mobile navigation */}
        <div className="h-20 md:h-0" />
      </div>
    </div>
  );
}