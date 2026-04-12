import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { CheckCircle, XCircle, AlertCircle, Loader2, Database, Server, Bell } from 'lucide-react';

interface ConnectionTestResult {
  test: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export function SupabaseConnectionTest() {
  const [tests, setTests] = useState<ConnectionTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState('Loading...');

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const { publicAnonKey } = await import('../utils/supabase/info');
        setApiKeyPreview(`${publicAnonKey.substring(0, 20)}...`);
      } catch (error) {
        setApiKeyPreview('Error loading key');
      }
    };
    loadApiKey();
  }, []);

  const updateTest = (testName: string, status: ConnectionTestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.test === testName);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.details = details;
        return [...prev];
      } else {
        return [...prev, { test: testName, status, message, details }];
      }
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setTests([]);

    try {
      // Test 1: Supabase Client Connection
      updateTest('Supabase Client', 'pending', 'Testing Supabase client initialization...');
      
      try {
        const { supabase } = await import('../utils/supabase/client');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          updateTest('Supabase Client', 'error', `Auth error: ${error.message}`);
        } else if (session) {
          updateTest('Supabase Client', 'success', `Connected successfully. User: ${session.user.id.substring(0, 8)}...`);
        } else {
          updateTest('Supabase Client', 'warning', 'Client connected but no active session found');
        }
      } catch (error) {
        updateTest('Supabase Client', 'error', `Client error: ${error.message}`);
      }

      // Test 2: Server Health Check
      updateTest('Server Health', 'pending', 'Testing server health endpoint...');
      
      try {
        const { checkServerHealth } = await import('../utils/supabase/client');
        const healthResult = await checkServerHealth();
        
        if (healthResult.healthy) {
          updateTest('Server Health', 'success', 'Server is healthy and responding', healthResult.details);
        } else {
          updateTest('Server Health', 'warning', 'Server responded but may have issues', healthResult.details);
        }
      } catch (error) {
        updateTest('Server Health', 'error', `Server health check failed: ${error.message}`);
      }

      // Test 3: Authentication Check
      updateTest('Authentication', 'pending', 'Testing authentication...');
      
      try {
        const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
        const response = await makeAuthenticatedRequest('/make-server-70df0d6e/debug/auth');
        
        if (response.authenticated) {
          updateTest('Authentication', 'success', `Authenticated as user: ${response.userId.substring(0, 8)}...`);
        } else {
          updateTest('Authentication', 'error', 'Authentication failed', response);
        }
      } catch (error) {
        updateTest('Authentication', 'error', `Auth test failed: ${error.message}`);
      }

      // Test 4: Notifications System
      updateTest('Notifications', 'pending', 'Testing notification endpoints...');
      
      try {
        const { fetchNotifications, getUnreadNotificationCount } = await import('../utils/supabase/notification-helpers');
        
        // Test unread count
        const unreadCount = await getUnreadNotificationCount();
        
        // Test fetch notifications
        const notifications = await fetchNotifications({ limit: 5 });
        
        updateTest('Notifications', 'success', `Notifications working. Unread: ${unreadCount}, Total fetched: ${notifications.items.length}`, {
          unreadCount,
          totalFetched: notifications.items.length,
          hasMore: notifications.hasMore
        });
      } catch (error) {
        updateTest('Notifications', 'warning', `Notifications using mock data: ${error.message}`);
      }

      // Test 5: Database Direct Access
      updateTest('Database', 'pending', 'Testing direct database access...');
      
      try {
        const { supabase } = await import('../utils/supabase/client');
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        
        if (error) {
          updateTest('Database', 'error', `Database error: ${error.message}`);
        } else {
          updateTest('Database', 'success', `Database accessible. Found ${data?.length || 0} users in test query`);
        }
      } catch (error) {
        updateTest('Database', 'error', `Database connection failed: ${error.message}`);
      }

    } catch (error) {
      console.error('Connection test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: ConnectionTestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-electric-blue" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-glitch-red" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: ConnectionTestResult['status']) => {
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

  const getTestIcon = (testName: string) => {
    switch (testName) {
      case 'Supabase Client':
        return <Database className="w-4 h-4" />;
      case 'Server Health':
        return <Server className="w-4 h-4" />;
      case 'Notifications':
        return <Bell className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-midnight-black/80 border-muted-lavender/30">
      <CardHeader>
        <CardTitle className="text-pearl-white font-headline flex items-center gap-2">
          <Database className="w-5 h-5 text-electric-blue" />
          Supabase Connection Test
        </CardTitle>
        <p className="text-muted-lavender font-body text-sm">
          Test your Supabase connection and backend services
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full bg-electric-blue/20 hover:bg-electric-blue/30 text-electric-blue border border-electric-blue/30"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Run Connection Tests
            </>
          )}
        </Button>

        {tests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-pearl-white font-headline text-sm">Test Results:</h3>
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted-lavender/5 border border-muted-lavender/10">
                <div className="flex items-center gap-3">
                  {getTestIcon(test.test)}
                  <div>
                    <p className="text-pearl-white font-body text-sm font-medium">{test.test}</p>
                    <p className="text-muted-lavender font-body text-xs">{test.message}</p>
                    {test.details && (
                      <details className="mt-1">
                        <summary className="text-muted-lavender/70 text-xs cursor-pointer hover:text-muted-lavender">
                          View Details
                        </summary>
                        <pre className="text-xs text-muted-lavender/60 mt-1 p-2 bg-midnight-black/50 rounded border border-muted-lavender/10 overflow-auto">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(test.status)}
                  <Badge className={`text-xs ${getStatusColor(test.status)}`}>
                    {test.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted-lavender/5 rounded-lg border border-muted-lavender/10">
          <h4 className="text-pearl-white font-headline text-sm mb-2">Connection Details:</h4>
          <div className="space-y-1 text-xs font-body">
            <p className="text-muted-lavender">
              <span className="text-pearl-white">Supabase URL:</span> https://wrukreoxdexnfufyftvs.supabase.co
            </p>
            <p className="text-muted-lavender">
              <span className="text-pearl-white">Project ID:</span> wrukreoxdexnfufyftvs
            </p>
            <p className="text-muted-lavender">
              <span className="text-pearl-white">API Key:</span> {apiKeyPreview}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}