import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getCurrentSession, checkServerHealth, checkNetworkConnectivity, makeAuthenticatedRequest } from '../utils/supabase/client';
import { serverUrl } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { QuickBioTest } from './QuickBioTest';

interface DiagnosticResult {
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: any;
}

export function BioUpdateDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<Record<string, DiagnosticResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [testBio, setTestBio] = useState('Test bio update from diagnostic tool');

  const updateDiagnostic = (key: string, result: DiagnosticResult) => {
    setDiagnostics(prev => ({ ...prev, [key]: result }));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics({});

    // 1. Check session
    updateDiagnostic('session', { status: 'pending', message: 'Checking user session...' });
    try {
      const session = await getCurrentSession();
      if (session?.access_token && session?.user?.id) {
        updateDiagnostic('session', {
          status: 'success',
          message: 'Valid session found',
          details: { userId: session.user.id.substring(0, 8) + '...', hasToken: true }
        });
      } else {
        updateDiagnostic('session', {
          status: 'error',
          message: 'No valid session found',
          details: { session: !!session, hasToken: !!session?.access_token, hasUser: !!session?.user }
        });
      }
    } catch (error) {
      updateDiagnostic('session', {
        status: 'error',
        message: 'Session check failed',
        details: { error: error.message }
      });
    }

    // 2. Check network connectivity
    updateDiagnostic('network', { status: 'pending', message: 'Testing network connectivity...' });
    try {
      const networkResult = await checkNetworkConnectivity();
      updateDiagnostic('network', {
        status: networkResult.connected ? 'success' : 'error',
        message: networkResult.connected ? 'Network connectivity OK' : 'Network connectivity failed',
        details: networkResult.details
      });
    } catch (error) {
      updateDiagnostic('network', {
        status: 'error',
        message: 'Network test failed',
        details: { error: error.message }
      });
    }

    // 3. Check server configuration
    updateDiagnostic('config', { status: 'pending', message: 'Checking server configuration...' });
    try {
      const configDetails = {
        serverUrl,
        projectId: projectId?.substring(0, 8) + '...',
        hasAnonKey: !!publicAnonKey,
        fullEndpoint: `${serverUrl}/make-server-70df0d6e/users/profile`
      };
      
      updateDiagnostic('config', {
        status: 'success',
        message: 'Server configuration loaded',
        details: configDetails
      });
    } catch (error) {
      updateDiagnostic('config', {
        status: 'error',
        message: 'Configuration check failed',
        details: { error: error.message }
      });
    }

    // 4. Check server health
    updateDiagnostic('server', { status: 'pending', message: 'Testing server health...' });
    try {
      const healthResult = await checkServerHealth();
      updateDiagnostic('server', {
        status: healthResult.healthy ? 'success' : 'error',
        message: healthResult.healthy ? 'Server is healthy' : 'Server health check failed',
        details: healthResult.details
      });
    } catch (error) {
      updateDiagnostic('server', {
        status: 'error',
        message: 'Server health test failed',
        details: { error: error.message }
      });
    }

    // 5. Test direct fetch to profile endpoint
    updateDiagnostic('directFetch', { status: 'pending', message: 'Testing direct fetch to profile endpoint...' });
    try {
      const session = await getCurrentSession();
      if (!session?.access_token) {
        updateDiagnostic('directFetch', {
          status: 'error',
          message: 'Cannot test direct fetch - no session',
          details: { reason: 'No access token available' }
        });
      } else {
        const response = await fetch(`${serverUrl}/make-server-70df0d6e/users/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        updateDiagnostic('directFetch', {
          status: response.ok ? 'success' : 'error',
          message: response.ok ? 'Direct fetch successful' : `Direct fetch failed: ${response.status}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          }
        });
      }
    } catch (error) {
      updateDiagnostic('directFetch', {
        status: 'error',
        message: 'Direct fetch failed',
        details: { 
          error: error.message,
          type: error.constructor.name,
          stack: error.stack?.split('\n').slice(0, 3)
        }
      });
    }

    // 6. Test bio update with makeAuthenticatedRequest
    updateDiagnostic('bioUpdate', { status: 'pending', message: 'Testing bio update via authenticated request...' });
    try {
      const response = await makeAuthenticatedRequest('/make-server-70df0d6e/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ bio: testBio })
      });

      updateDiagnostic('bioUpdate', {
        status: 'success',
        message: 'Bio update test successful!',
        details: { response: response }
      });
      toast.success('Bio update test passed!');
    } catch (error) {
      updateDiagnostic('bioUpdate', {
        status: 'error',
        message: 'Bio update test failed',
        details: { 
          error: error.message,
          type: error.constructor.name,
          stack: error.stack?.split('\n').slice(0, 3)
        }
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-electric-blue" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-glitch-red" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-soft-blush" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 text-muted-lavender animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-electric-blue/20 border-electric-blue/30';
      case 'error':
        return 'bg-glitch-red/20 border-glitch-red/30';
      case 'warning':
        return 'bg-soft-blush/20 border-soft-blush/30';
      case 'pending':
        return 'bg-muted-lavender/20 border-muted-lavender/30';
      default:
        return 'bg-midnight-black/50 border-muted-lavender/30';
    }
  };

  return (
    <div className="min-h-screen bg-midnight-black text-pearl-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-headline font-bold text-neon-lilac mb-2">
            Bio Update Diagnostic Tool
          </h1>
          <p className="text-muted-lavender">
            Comprehensive testing for bio update functionality
          </p>
        </div>

        <Card className="bg-midnight-black/50 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Test Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-lavender mb-2">
                Test Bio Content:
              </label>
              <textarea
                value={testBio}
                onChange={(e) => setTestBio(e.target.value)}
                className="w-full p-3 bg-midnight-black/50 border border-muted-lavender/30 rounded-lg text-pearl-white placeholder:text-muted-lavender/60 resize-none"
                rows={2}
                maxLength={280}
              />
              <div className="text-xs text-muted-lavender/70 mt-1">
                {testBio.length}/280 characters
              </div>
            </div>

            <Button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="w-full bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                'Run Full Diagnostic'
              )}
            </Button>
          </CardContent>
        </Card>

        {Object.keys(diagnostics).length > 0 && (
          <div className="grid gap-4">
            <h2 className="text-xl font-headline font-semibold text-pearl-white">
              Diagnostic Results
            </h2>
            
            {Object.entries(diagnostics).map(([key, result]) => (
              <Card key={key} className={`border ${getStatusColor(result.status)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-pearl-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                        <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-lavender mb-2">
                        {result.message}
                      </p>
                      {result.details && (
                        <details className="text-xs text-muted-lavender/70">
                          <summary className="cursor-pointer hover:text-muted-lavender">
                            Show Details
                          </summary>
                          <pre className="mt-2 p-2 bg-midnight-black/50 rounded border overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(result.details, null, 2)}
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

        {/* Quick Bio Test Section */}
        <QuickBioTest userId={undefined} />

        <Card className="bg-midnight-black/50 border-muted-lavender/30">
          <CardHeader>
            <CardTitle>Quick Environment Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-lavender">Server URL:</span>
                <div className="font-mono text-xs text-pearl-white break-all">
                  {serverUrl}
                </div>
              </div>
              <div>
                <span className="text-muted-lavender">Profile Endpoint:</span>
                <div className="font-mono text-xs text-pearl-white break-all">
                  /make-server-70df0d6e/users/profile
                </div>
              </div>
              <div>
                <span className="text-muted-lavender">Project ID:</span>
                <div className="font-mono text-xs text-pearl-white">
                  {projectId?.substring(0, 12)}...
                </div>
              </div>
              <div>
                <span className="text-muted-lavender">User Agent:</span>
                <div className="font-mono text-xs text-pearl-white break-all">
                  {navigator.userAgent.substring(0, 50)}...
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}