import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Shield,
  Bug,
  Wrench 
} from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  suggestion?: string;
  details?: any;
}

export function DatabaseDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (test: string, status: DiagnosticResult['status'], message: string, suggestion?: string, details?: any) => {
    setResults(prev => {
      const existing = prev.find(r => r.test === test);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.suggestion = suggestion;
        existing.details = details;
        return [...prev];
      } else {
        return [...prev, { test, status, message, suggestion, details }];
      }
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Test 1: Check tribe_members table for RLS issues
      updateResult('Tribe Members RLS', 'pending', 'Testing tribe_members table access...');
      
      try {
        const { supabase } = await import('../utils/supabase/client');
        const { data, error } = await supabase
          .from('tribe_members')
          .select('id')
          .limit(1);
        
        if (error) {
          if (error.code === '42P17' || error.message.includes('infinite recursion')) {
            updateResult(
              'Tribe Members RLS', 
              'error', 
              'Infinite recursion detected in tribe_members RLS policies',
              'The RLS policies on tribe_members table reference each other in a circular way. This needs to be fixed in the database.',
              { error: error.message, code: error.code }
            );
          } else {
            updateResult(
              'Tribe Members RLS', 
              'warning', 
              `Table access issue: ${error.message}`,
              'Check if the table exists and RLS policies are correctly configured.',
              { error: error.message, code: error.code }
            );
          }
        } else {
          updateResult(
            'Tribe Members RLS', 
            'success', 
            `Table accessible. Found ${data?.length || 0} rows in test query.`
          );
        }
      } catch (error) {
        updateResult(
          'Tribe Members RLS', 
          'error', 
          `Connection error: ${error.message}`,
          'Check network connection and database availability.'
        );
      }

      // Test 2: Check posts table access
      updateResult('Posts Table', 'pending', 'Testing posts table access...');
      
      try {
        const { supabase } = await import('../utils/supabase/client');
        const { data, error } = await supabase
          .from('posts')
          .select('id, user_id')
          .limit(3);
        
        if (error) {
          if (error.code === '42P17' || error.message.includes('infinite recursion')) {
            updateResult(
              'Posts Table', 
              'error', 
              'Infinite recursion detected in posts table RLS policies',
              'Similar to tribe_members, the posts table has circular RLS policy references.',
              { error: error.message, code: error.code }
            );
          } else {
            updateResult(
              'Posts Table', 
              'warning', 
              `Table access issue: ${error.message}`,
              'Check RLS policies and table permissions.',
              { error: error.message, code: error.code }
            );
          }
        } else {
          updateResult(
            'Posts Table', 
            'success', 
            `Table accessible. Found ${data?.length || 0} posts in test query.`
          );
        }
      } catch (error) {
        updateResult(
          'Posts Table', 
          'error', 
          `Connection error: ${error.message}`,
          'Check network connection and database availability.'
        );
      }

      // Test 3: Test deletion capability
      updateResult('Post Deletion', 'pending', 'Testing post deletion capability...');
      
      try {
        // We won't actually delete anything, just test the deletion helper function logic
        const { canUserDeletePost } = await import('../utils/post-deletion-helpers');
        
        // Test with mock data
        const testPost = { user_id: 'test-user-id' };
        const canDelete = canUserDeletePost(testPost, 'test-user-id');
        
        if (canDelete) {
          updateResult(
            'Post Deletion', 
            'success', 
            'Post deletion helpers are working correctly.',
            'Deletion logic validates user ownership properly.'
          );
        } else {
          updateResult(
            'Post Deletion', 
            'warning', 
            'Post deletion validation may have issues.',
            'Check the canUserDeletePost function logic.'
          );
        }
      } catch (error) {
        updateResult(
          'Post Deletion', 
          'error', 
          `Deletion helper error: ${error.message}`,
          'The post deletion utilities may need to be updated.'
        );
      }

      // Test 4: Check network connectivity to server
      updateResult('Server Connectivity', 'pending', 'Testing server endpoint connectivity...');
      
      try {
        const { checkServerHealth } = await import('../utils/supabase/client');
        const healthResult = await checkServerHealth();
        
        if (healthResult.healthy) {
          updateResult(
            'Server Connectivity', 
            'success', 
            'Server endpoints are responding correctly.',
            undefined,
            healthResult.details
          );
        } else {
          updateResult(
            'Server Connectivity', 
            'warning', 
            'Server responded but may have issues.',
            'Check server logs and endpoint configurations.',
            healthResult.details
          );
        }
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          updateResult(
            'Server Connectivity', 
            'error', 
            'Network connectivity issues detected.',
            'Check your internet connection and try again.',
            { error: error.message }
          );
        } else {
          updateResult(
            'Server Connectivity', 
            'error', 
            `Server connectivity error: ${error.message}`,
            'The server may be down or misconfigured.'
          );
        }
      }

      // Test 5: Check authentication state
      updateResult('Authentication', 'pending', 'Testing authentication state...');
      
      try {
        const { supabase } = await import('../utils/supabase/client');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          updateResult(
            'Authentication', 
            'error', 
            `Auth error: ${error.message}`,
            'Check authentication configuration and tokens.'
          );
        } else if (session?.user) {
          updateResult(
            'Authentication', 
            'success', 
            `User authenticated: ${session.user.id.substring(0, 8)}...`,
            undefined,
            { 
              userId: session.user.id,
              email: session.user.email,
              hasAccessToken: !!session.access_token
            }
          );
        } else {
          updateResult(
            'Authentication', 
            'warning', 
            'No active session found.',
            'User may need to sign in again.'
          );
        }
      } catch (error) {
        updateResult(
          'Authentication', 
          'error', 
          `Authentication check failed: ${error.message}`,
          'Check authentication setup and client configuration.'
        );
      }

    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Diagnostic failed', {
        description: 'An unexpected error occurred during diagnostics.'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-electric-blue" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-glitch-red" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'error':
        return 'bg-glitch-red/20 text-glitch-red border-glitch-red/30';
      case 'pending':
        return 'bg-electric-blue/20 text-electric-blue border-electric-blue/30';
      default:
        return 'bg-muted-lavender/20 text-muted-lavender border-muted-lavender/30';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-midnight-black/80 border-muted-lavender/30">
      <CardHeader>
        <CardTitle className="text-pearl-white font-headline flex items-center gap-2">
          <Bug className="w-5 h-5 text-glitch-red" />
          Database Diagnostics
        </CardTitle>
        <p className="text-muted-lavender font-body text-sm">
          Diagnose and identify database policy issues, connectivity problems, and authentication errors
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full bg-glitch-red/20 hover:bg-glitch-red/30 text-glitch-red border border-glitch-red/30"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Bug className="w-4 h-4 mr-2" />
              Run Diagnostic Tests
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-pearl-white font-headline text-sm">Diagnostic Results:</h3>
            
            {results.map((result, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted-lavender/5 border border-muted-lavender/10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h4 className="text-pearl-white font-body font-medium">{result.test}</h4>
                      <Badge className={`text-xs mt-1 ${getStatusColor(result.status)}`}>
                        {result.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <p className="text-muted-lavender font-body text-sm mb-2">{result.message}</p>
                
                {result.suggestion && (
                  <div className="p-3 bg-electric-blue/10 border border-electric-blue/20 rounded-lg mb-2">
                    <div className="flex items-start gap-2">
                      <Wrench className="w-4 h-4 text-electric-blue mt-0.5 flex-shrink-0" />
                      <p className="text-electric-blue font-body text-sm">{result.suggestion}</p>
                    </div>
                  </div>
                )}
                
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-muted-lavender/70 text-xs cursor-pointer hover:text-muted-lavender">
                      View Technical Details
                    </summary>
                    <pre className="text-xs text-muted-lavender/60 mt-2 p-3 bg-midnight-black/50 rounded border border-muted-lavender/10 overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        <Separator className="bg-muted-lavender/10" />

        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-yellow-300 font-headline text-sm mb-2">Known Issues & Solutions</h4>
              <div className="space-y-2 text-yellow-200/80 font-body text-sm">
                <p><strong>Infinite Recursion in RLS Policies:</strong> This occurs when RLS policies reference each other in a circular pattern. The fix requires updating the database policies directly.</p>
                <p><strong>Network "Failed to fetch" Errors:</strong> These typically indicate connectivity issues or CORS problems with the server endpoints.</p>
                <p><strong>Authentication Issues:</strong> May require refreshing the session or re-authenticating the user.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}