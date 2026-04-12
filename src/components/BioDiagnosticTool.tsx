import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { updateBio, updateBioDirectFetch, updateBioSimple } from '../utils/supabase/user-helpers';
import { supabase, makeAuthenticatedRequest } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export function BioDiagnosticTool() {
  const [testBio, setTestBio] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('Checking...');
  const [diagnosticResults, setDiagnosticResults] = useState<any[]>([]);
  const [currentDbState, setCurrentDbState] = useState<any>(null);

  // Check current session and get user data
  const checkSession = async () => {
    try {
      console.log('🔍 BioDiagnostic: Checking session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setSessionStatus(`Error: ${error.message}`);
        addDiagnosticResult('Session Check', 'error', `Session error: ${error.message}`);
        return;
      }

      if (!session) {
        setSessionStatus('No session found');
        addDiagnosticResult('Session Check', 'error', 'No active session found');
        return;
      }

      setCurrentUserId(session.user.id);
      setSessionStatus(`Valid session for user: ${session.user.id.substring(0, 8)}...`);
      addDiagnosticResult('Session Check', 'success', `Valid session found for user ${session.user.id.substring(0, 8)}...`);
      
      console.log('🔍 Session details:', {
        hasSession: !!session,
        hasAccessToken: !!session.access_token,
        userId: session.user.id,
        email: session.user.email
      });
      
      // Check current database state
      await checkDatabaseState(session.user.id);
      
    } catch (error) {
      console.error('Session check error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setSessionStatus(`Session check failed: ${errorMsg}`);
      addDiagnosticResult('Session Check', 'error', `Session check failed: ${errorMsg}`);
    }
  };

  // Check current database state across multiple tables
  const checkDatabaseState = async (userId: string) => {
    try {
      console.log('🔍 BioDiagnostic: Checking database state...');
      
      // Check users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, bio, description, updated_at')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Users table error:', userError);
        addDiagnosticResult('Users Table', 'error', `Error reading users table: ${userError.message}`);
      } else {
        console.log('📊 Users table data:', userData);
        addDiagnosticResult('Users Table', 'success', `Found user data - bio: "${userData.bio || 'null'}", description: "${userData.description || 'null'}"`);
      }

      // Check profiles table (if it exists)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, bio, description, display_name, updated_at')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.log('Profiles table might not exist or user not found:', profileError.message);
        addDiagnosticResult('Profiles Table', 'warning', `Profiles table check: ${profileError.message}`);
      } else {
        console.log('📊 Profiles table data:', profileData);
        addDiagnosticResult('Profiles Table', 'success', `Found profile data - bio: "${profileData.bio || 'null'}", description: "${profileData.description || 'null'}"`);
      }

      // Set current state for display
      setCurrentDbState({
        users: userData,
        profiles: profileData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Database state check error:', error);
      addDiagnosticResult('Database Check', 'error', `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add diagnostic result
  const addDiagnosticResult = (operation: string, status: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const result = {
      id: Date.now(),
      operation,
      status,
      message,
      timestamp: new Date().toISOString()
    };
    setDiagnosticResults(prev => [result, ...prev]);
  };

  // Test server endpoint directly
  const testServerEndpoint = async () => {
    if (!currentUserId) {
      toast.error('No user ID available');
      return;
    }

    setIsTesting(true);
    try {
      console.log('🧪 Testing server endpoint directly...');
      addDiagnosticResult('Server Endpoint Test', 'info', 'Starting direct server endpoint test...');

      const response = await makeAuthenticatedRequest('/make-server-70df0d6e/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          bio: testBio.trim(),
          updated_at: new Date().toISOString()
        })
      });

      console.log('📨 Server response:', response);

      if (response && response.success) {
        addDiagnosticResult('Server Endpoint Test', 'success', `Server endpoint successful: ${JSON.stringify(response.profile)}`);
        toast.success('Server endpoint test successful!');
        
        // Refresh database state
        await checkDatabaseState(currentUserId);
      } else {
        addDiagnosticResult('Server Endpoint Test', 'error', `Server endpoint failed: ${JSON.stringify(response)}`);
        toast.error(`Server endpoint failed: ${response?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Server endpoint test failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDiagnosticResult('Server Endpoint Test', 'error', `Server endpoint exception: ${errorMsg}`);
      toast.error(`Server endpoint failed: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Test regular updateBio function
  const testRegularUpdate = async () => {
    if (!currentUserId) {
      toast.error('No user ID available');
      return;
    }

    setIsTesting(true);
    try {
      console.log('🧪 Testing regular bio update...');
      addDiagnosticResult('Regular Update Test', 'info', 'Starting regular updateBio function test...');
      
      await updateBio(currentUserId, testBio);
      
      addDiagnosticResult('Regular Update Test', 'success', 'Regular updateBio function successful');
      toast.success('Regular bio update successful!');
      
      // Refresh database state
      await checkDatabaseState(currentUserId);
    } catch (error) {
      console.error('❌ Regular bio update failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDiagnosticResult('Regular Update Test', 'error', `Regular update failed: ${errorMsg}`);
      toast.error(`Regular update failed: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Test simple Supabase update
  const testSimpleUpdate = async () => {
    if (!currentUserId) {
      toast.error('No user ID available');
      return;
    }

    setIsTesting(true);
    try {
      console.log('🧪 Testing simple Supabase update...');
      addDiagnosticResult('Simple Update Test', 'info', 'Starting simple Supabase update test...');
      
      // Try updating users table directly
      const { data, error } = await supabase
        .from('users')
        .update({ 
          bio: testBio.trim(),
          description: testBio.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUserId)
        .select();

      if (error) {
        console.error('❌ Simple update error:', error);
        addDiagnosticResult('Simple Update Test', 'error', `Simple update failed: ${error.message}`);
        toast.error(`Simple update failed: ${error.message}`);
      } else {
        console.log('✅ Simple update successful:', data);
        addDiagnosticResult('Simple Update Test', 'success', `Simple update successful: ${JSON.stringify(data[0])}`);
        toast.success('Simple update successful!');
        
        // Refresh database state
        await checkDatabaseState(currentUserId);
      }
    } catch (error) {
      console.error('❌ Simple update exception:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDiagnosticResult('Simple Update Test', 'error', `Simple update exception: ${errorMsg}`);
      toast.error(`Simple update failed: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Clear diagnostic results
  const clearResults = () => {
    setDiagnosticResults([]);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <div className="fixed inset-0 bg-midnight-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-midnight-black border-muted-lavender/30 max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-pearl-white font-headline">Bio Save Diagnostic Tool</CardTitle>
          <div className="text-sm text-muted-lavender font-body">
            Session Status: {sessionStatus}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {/* Test Bio Input */}
          <div>
            <label className="text-pearl-white font-body text-sm font-medium mb-2 block">
              Test Bio Content
            </label>
            <Textarea
              value={testBio}
              onChange={(e) => setTestBio(e.target.value)}
              placeholder="Enter test bio content..."
              className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white"
              maxLength={280}
            />
            <div className="text-xs text-muted-lavender/60 mt-1">
              {testBio.length}/280 characters
            </div>
          </div>

          {/* Current Database State */}
          {currentDbState && (
            <div className="bg-midnight-black/30 p-3 rounded border border-muted-lavender/20">
              <h4 className="text-pearl-white font-medium mb-2">Current Database State</h4>
              <div className="space-y-2 text-xs text-muted-lavender">
                <div>
                  <strong>Users Table:</strong> bio: "{currentDbState.users?.bio || 'null'}", 
                  description: "{currentDbState.users?.description || 'null'}"
                </div>
                {currentDbState.profiles && (
                  <div>
                    <strong>Profiles Table:</strong> bio: "{currentDbState.profiles?.bio || 'null'}", 
                    description: "{currentDbState.profiles?.description || 'null'}"
                  </div>
                )}
                <div>
                  <strong>Last Updated:</strong> {new Date(currentDbState.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}

          {/* Test Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              onClick={checkSession}
              disabled={isTesting}
              variant="outline"
              className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
            >
              Refresh Session
            </Button>

            <Button
              onClick={testServerEndpoint}
              disabled={isTesting || !currentUserId || !testBio.trim()}
              className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
            >
              {isTesting ? 'Testing...' : 'Test Server Endpoint'}
            </Button>

            <Button
              onClick={testRegularUpdate}
              disabled={isTesting || !currentUserId || !testBio.trim()}
              className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black"
            >
              {isTesting ? 'Testing...' : 'Test Regular Update'}
            </Button>

            <Button
              onClick={testSimpleUpdate}
              disabled={isTesting || !currentUserId || !testBio.trim()}
              className="bg-soft-blush hover:bg-soft-blush/90 text-midnight-black"
            >
              {isTesting ? 'Testing...' : 'Test Simple Update'}
            </Button>

            <Button
              onClick={clearResults}
              variant="outline"
              className="border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10"
            >
              Clear Results
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-glitch-red/30 text-glitch-red hover:bg-glitch-red/10"
            >
              Close & Reload
            </Button>
          </div>

          {/* Diagnostic Results */}
          {diagnosticResults.length > 0 && (
            <div className="bg-midnight-black/30 p-3 rounded border border-muted-lavender/20">
              <h4 className="text-pearl-white font-medium mb-3">Diagnostic Results</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {diagnosticResults.map((result) => (
                  <div 
                    key={result.id} 
                    className="flex items-start gap-2 p-2 bg-midnight-black/50 rounded text-xs"
                  >
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="font-medium text-pearl-white">
                        {result.operation}
                      </div>
                      <div className="text-muted-lavender/80 mt-1">
                        {result.message}
                      </div>
                      <div className="text-muted-lavender/50 mt-1">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debug Tips */}
          <div className="text-xs text-muted-lavender/60 font-body bg-midnight-black/30 p-3 rounded border border-muted-lavender/20">
            <p className="mb-2"><strong>Debug Tips:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Check browser console for detailed logs during each test</li>
              <li>Test each method to see which one works</li>
              <li>Compare database state before and after updates</li>
              <li>Verify session is valid before testing</li>
              <li>Check if the issue is with frontend validation or backend persistence</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}