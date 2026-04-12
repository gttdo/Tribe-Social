import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, Database, Server, User, Key } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: any;
  timing?: number;
}

export function BackendTestUtility() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, result: Partial<TestResult>) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, ...result } : t);
      } else {
        return [...prev, { name, status: 'loading', message: '', ...result }];
      }
    });
  };

  const runTest = async (name: string, testFn: () => Promise<any>) => {
    updateTest(name, { status: 'loading', message: 'Running...' });
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const timing = Date.now() - startTime;
      updateTest(name, { 
        status: 'success', 
        message: 'Success', 
        details: result,
        timing 
      });
      return result;
    } catch (error) {
      const timing = Date.now() - startTime;
      updateTest(name, { 
        status: 'error', 
        message: error instanceof Error ? error.message : String(error),
        details: error,
        timing 
      });
      throw error;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);

    try {
      // Test 1: Environment Check
      await runTest('Environment Check', async () => {
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        return {
          projectId: projectId ? projectId.substring(0, 8) + '...' : 'Missing',
          hasAnonKey: !!publicAnonKey,
          keyLength: publicAnonKey ? publicAnonKey.length : 0
        };
      });

      // Test 2: Client Creation
      await runTest('Supabase Client Creation', async () => {
        const { supabase } = await import('../utils/supabase/client');
        return {
          clientExists: !!supabase,
          url: supabase.supabaseUrl?.substring(0, 20) + '...',
          key: supabase.supabaseKey?.substring(0, 20) + '...'
        };
      });

      // Test 3: Session Check
      await runTest('Session Check', async () => {
        const { supabase } = await import('../utils/supabase/client');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw new Error(`Session error: ${error.message}`);
        }

        return {
          hasSession: !!data.session,
          hasUser: !!data.session?.user,
          hasAccessToken: !!data.session?.access_token,
          userId: data.session?.user?.id?.substring(0, 8) + '...' || null,
          tokenLength: data.session?.access_token?.length || 0
        };
      });

      // Test 4: Health Check
      await runTest('Server Health Check', async () => {
        const { makePublicRequest } = await import('../utils/supabase/client');
        const response = await makePublicRequest('/health');
        return response;
      });

      // Test 5: Database Connection (via server)
      let authResult = null;
      try {
        const { supabase } = await import('../utils/supabase/client');
        const { data } = await supabase.auth.getSession();
        authResult = data.session;
      } catch (e) {
        // Ignore auth errors for database test
      }

      if (authResult?.access_token) {
        // Test 6: Profile Fetch (requires auth)
        await runTest('Profile Fetch (Auth Required)', async () => {
          const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
          const response = await makeAuthenticatedRequest('/users/profile');
          return response;
        });

        // Test 7: Posts Fetch (requires auth)
        await runTest('Posts Fetch (Auth Required)', async () => {
          const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
          const response = await makeAuthenticatedRequest('/posts');
          return {
            postsCount: response.posts?.length || 0,
            totalCount: response.totalCount || 0,
            firstPost: response.posts?.[0] ? {
              id: response.posts[0].id,
              username: response.posts[0].username,
              type: response.posts[0].type
            } : null
          };
        });
      } else {
        updateTest('Profile Fetch (Auth Required)', {
          status: 'warning',
          message: 'Skipped - No authenticated session'
        });

        updateTest('Posts Fetch (Auth Required)', {
          status: 'warning',
          message: 'Skipped - No authenticated session'
        });
      }

      // Test 8: Sample Data Seeding (requires auth)
      if (authResult?.access_token) {
        await runTest('Sample Data Seed Test', async () => {
          const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
          const response = await makeAuthenticatedRequest('/seed-posts', {
            method: 'POST'
          });
          return response;
        });
      } else {
        updateTest('Sample Data Seed Test', {
          status: 'warning',
          message: 'Skipped - No authenticated session'
        });
      }

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Auto-run tests when component mounts
    runAllTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary',
      loading: 'outline'
    };
    return variants[status] as any;
  };

  return (
    <div className="min-h-screen bg-midnight-black p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-headline text-2xl text-pearl-white">Backend Integration Test</h1>
          <p className="text-muted-lavender font-body">
            Testing connectivity and functionality of all backend services
          </p>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="bg-electric-blue/20 hover:bg-electric-blue/30 text-electric-blue border border-electric-blue/40"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Rerun All Tests
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-4">
          {tests.map((test, index) => (
            <Card key={test.name} className="bg-pearl-white/5 border-pearl-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between font-body text-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <span className="text-pearl-white">{test.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.timing && (
                      <span className="text-xs text-muted-lavender">
                        {test.timing}ms
                      </span>
                    )}
                    <Badge variant={getStatusBadge(test.status)}>
                      {test.status}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-lavender font-body mb-3">{test.message}</p>
                
                {test.details && (
                  <div className="bg-midnight-black/50 rounded-lg p-3 border border-pearl-white/5">
                    <pre className="text-xs text-pearl-white/80 overflow-x-auto font-mono">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {tests.length === 0 && !isRunning && (
          <Card className="bg-pearl-white/5 border-pearl-white/10">
            <CardContent className="p-6 text-center">
              <p className="text-muted-lavender font-body">
                No tests have been run yet. Click the button above to start testing.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-lavender">
          <p>Backend Test Utility v1.0 • Check console for detailed logs</p>
        </div>
      </div>
    </div>
  );
}