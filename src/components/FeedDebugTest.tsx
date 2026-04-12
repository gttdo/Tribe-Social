import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function FeedDebugTest() {
  const [testResults, setTestResults] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: any = {};

    // Test 1: Check session status
    try {
      console.log('=== Testing Session Status ===');
      const { checkSessionStatus } = await import('../utils/simple-session-check');
      const sessionStatus = await checkSessionStatus();
      results.session = {
        status: 'success',
        data: sessionStatus,
        message: `Session valid: ${sessionStatus.hasSession && sessionStatus.hasValidToken}`
      };
    } catch (error) {
      results.session = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Test Edge Function Call
    try {
      console.log('=== Testing Edge Function Call ===');
      const { callFn } = await import('../utils/edge');
      const edgeResult = await callFn('/posts');
      results.edgeCall = {
        status: 'success',
        data: edgeResult,
        postCount: edgeResult?.posts?.length || 0
      };
    } catch (error) {
      results.edgeCall = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Test getFeed wrapper
    try {
      console.log('=== Testing getFeed Wrapper ===');
      const { getFeed } = await import('../utils/edge');
      const feedResult = await getFeed();
      results.getFeed = {
        status: 'success',
        data: feedResult,
        postCount: feedResult?.posts?.length || 0
      };
    } catch (error) {
      results.getFeed = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 4: Test direct Supabase query
    try {
      console.log('=== Testing Direct Supabase Query ===');
      const { supabase } = await import('../utils/supabase/client');
      const { data: directPosts, error: directError } = await supabase
        .from('posts')
        .select('id, caption, text_body, created_at, user_id')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(10);

      if (directError) {
        results.directQuery = {
          status: 'error',
          error: directError.message
        };
      } else {
        results.directQuery = {
          status: 'success',
          data: directPosts,
          postCount: directPosts?.length || 0
        };
      }
    } catch (error) {
      results.directQuery = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 5: Check project info
    try {
      console.log('=== Testing Project Info ===');
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      results.projectInfo = {
        status: 'success',
        data: {
          hasProjectId: !!projectId,
          hasAnonKey: !!publicAnonKey,
          projectId: projectId?.substring(0, 8) + '...' || 'undefined'
        }
      };
    } catch (error) {
      results.projectInfo = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-midnight-black p-4">
      <Card className="max-w-4xl mx-auto bg-card border-border">
        <CardHeader>
          <CardTitle className="text-pearl-white flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-electric-blue" />
            Feed Debug Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="bg-neon-lilac text-midnight-black"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run Tests Again'
            )}
          </Button>

          {Object.keys(testResults).length > 0 && (
            <div className="space-y-3">
              {Object.entries(testResults).map(([testName, result]: [string, any]) => (
                <Card key={testName} className="bg-midnight-black/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(result.status)}
                      <h3 className="font-medium text-pearl-white capitalize">
                        {testName.replace(/([A-Z])/g, ' $1')}
                      </h3>
                    </div>
                    
                    {result.status === 'success' ? (
                      <div className="space-y-2">
                        {result.message && (
                          <p className="text-electric-blue">{result.message}</p>
                        )}
                        {result.postCount !== undefined && (
                          <p className="text-soft-blush">Posts found: {result.postCount}</p>
                        )}
                        {result.data && (
                          <details className="mt-2">
                            <summary className="text-muted-lavender cursor-pointer">
                              View Data
                            </summary>
                            <pre className="mt-2 p-2 bg-midnight-black rounded text-xs text-muted-lavender overflow-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ) : (
                      <p className="text-glitch-red">{result.error}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}