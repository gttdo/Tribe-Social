import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Wifi, WifiOff, Server, Check, X, AlertTriangle, RefreshCw } from 'lucide-react';

interface ConnectivityTestProps {
  onClose?: () => void;
}

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function ConnectivityTest({ onClose }: ConnectivityTestProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runConnectivityTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    const tests: TestResult[] = [
      { name: 'Network Connectivity', status: 'pending', message: 'Testing basic internet connection...' },
      { name: 'Supabase Edge Functions', status: 'pending', message: 'Testing Supabase functions endpoint...' },
      { name: 'Server Health', status: 'pending', message: 'Testing server health endpoint...' },
      { name: 'Auth Signup Endpoint', status: 'pending', message: 'Testing auth signup endpoint...' }
    ];

    setResults([...tests]);

    try {
      // Import necessary functions
      const { checkNetworkConnectivity, checkServerHealth, makePublicRequest } = await import('../utils/supabase/client');
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');

      // Test 1: Basic network connectivity
      try {
        const networkResult = await checkNetworkConnectivity();
        tests[0] = {
          name: 'Network Connectivity',
          status: networkResult.connected ? 'success' : 'error',
          message: networkResult.connected 
            ? 'Internet connection is working' 
            : 'No internet connection detected',
          details: networkResult.details ? JSON.stringify(networkResult.details, null, 2) : undefined
        };
      } catch (error) {
        tests[0] = {
          name: 'Network Connectivity',
          status: 'error',
          message: 'Network test failed',
          details: error instanceof Error ? error.message : String(error)
        };
      }
      setResults([...tests]);

      // Test 2: Supabase Edge Functions base URL
      try {
        const baseUrl = `https://${projectId}.supabase.co/functions/v1`;
        const response = await fetch(baseUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        tests[1] = {
          name: 'Supabase Edge Functions',
          status: response.status < 500 ? 'success' : 'warning',
          message: `Edge Functions endpoint responded with status ${response.status}`,
          details: `URL: ${baseUrl}\nStatus: ${response.status} ${response.statusText}`
        };
      } catch (error) {
        tests[1] = {
          name: 'Supabase Edge Functions',
          status: 'error',
          message: 'Cannot reach Supabase Edge Functions',
          details: error instanceof Error ? error.message : String(error)
        };
      }
      setResults([...tests]);

      // Test 3: Server health endpoint
      try {
        const healthResult = await checkServerHealth();
        tests[2] = {
          name: 'Server Health',
          status: healthResult.healthy ? 'success' : 'error',
          message: healthResult.healthy 
            ? 'Server is healthy and responding' 
            : 'Server health check failed',
          details: healthResult.details ? JSON.stringify(healthResult.details, null, 2) : undefined
        };
      } catch (error) {
        tests[2] = {
          name: 'Server Health',
          status: 'error',
          message: 'Server health check failed',
          details: error instanceof Error ? error.message : String(error)
        };
      }
      setResults([...tests]);

      // Test 4: Auth signup endpoint (availability check)
      try {
        const signupTestResult = await makePublicRequest('/make-server-70df0d6e/auth/check-availability', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com'
          })
        });
        
        tests[3] = {
          name: 'Auth Signup Endpoint',
          status: 'success',
          message: 'Auth endpoints are reachable',
          details: `Availability check response: ${JSON.stringify(signupTestResult, null, 2)}`
        };
      } catch (error) {
        tests[3] = {
          name: 'Auth Signup Endpoint',
          status: 'error',
          message: 'Auth endpoint test failed',
          details: error instanceof Error ? error.message : String(error)
        };
      }
      setResults([...tests]);

    } catch (importError) {
      console.error('Failed to import connectivity functions:', importError);
      const errorResult: TestResult = {
        name: 'Import Error',
        status: 'error',
        message: 'Failed to import required functions',
        details: importError instanceof Error ? importError.message : String(importError)
      };
      setResults([errorResult]);
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runConnectivityTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <RefreshCw className="w-4 h-4 animate-spin text-electric-blue" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <X className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'text-electric-blue';
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
    }
  };

  const overallStatus = results.length > 0 ? (
    results.some(r => r.status === 'error') ? 'error' :
    results.some(r => r.status === 'warning') ? 'warning' :
    results.every(r => r.status === 'success') ? 'success' : 'pending'
  ) : 'pending';

  return (
    <div className="min-h-screen bg-midnight-black p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-midnight-black/90 border-muted-lavender/20 soft-blur">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {overallStatus === 'error' ? (
                  <WifiOff className="w-6 h-6 text-red-400" />
                ) : (
                  <Wifi className="w-6 h-6 text-electric-blue" />
                )}
                <h2 className="text-xl font-headline text-pearl-white">
                  Connectivity Diagnostic
                </h2>
              </div>
            </div>
            {onClose && (
              <Button
                onClick={onClose}
                className="px-4 py-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-white rounded-lg transition-all duration-300"
              >
                Close
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted-lavender/5 border border-muted-lavender/10">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-body font-medium text-pearl-white">
                        {result.name}
                      </h3>
                      <span className={`text-sm font-body ${getStatusColor(result.status)}`}>
                        {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-lavender/80 mt-1">
                      {result.message}
                    </p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-electric-blue cursor-pointer hover:underline">
                          Show details
                        </summary>
                        <pre className="text-xs text-muted-lavender/60 mt-2 p-2 bg-midnight-black/50 rounded border overflow-auto">
                          {result.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {results.length === 0 && (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-electric-blue mx-auto mb-4" />
                <p className="text-muted-lavender/60 font-body">Running connectivity tests...</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center space-x-4">
            <Button
              onClick={runConnectivityTests}
              disabled={isRunning}
              className="px-6 py-2 bg-electric-blue/20 text-electric-blue hover:bg-electric-blue/30 border border-electric-blue/30 rounded-lg transition-all duration-300 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>Run Tests Again</span>
            </Button>
          </div>

          {overallStatus === 'error' && (
            <div className="mt-6 p-4 rounded-lg bg-red-400/10 border border-red-400/20">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-body font-medium text-red-400">Connection Issues Detected</h4>
                  <p className="text-sm text-red-400/80 mt-1">
                    There are connectivity issues that may prevent signup and login from working. 
                    Check your internet connection and try again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {overallStatus === 'success' && (
            <div className="mt-6 p-4 rounded-lg bg-green-400/10 border border-green-400/20">
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-body font-medium text-green-400">All Tests Passed</h4>
                  <p className="text-sm text-green-400/80 mt-1">
                    Connectivity looks good! If you're still experiencing issues, try refreshing the page.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}