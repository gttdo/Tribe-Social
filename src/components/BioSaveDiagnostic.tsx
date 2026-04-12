import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { diagnosticBioIssues } from '../utils/bio-fix-helpers';

export function BioSaveDiagnostic() {
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testSaveResult, setTestSaveResult] = useState<any>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      console.log('🔍 Running bio save diagnostic...');
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setDiagnosticResults({
          error: 'No valid session found',
          sessionError: sessionError?.message
        });
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      console.log('👤 User ID:', userId.substring(0, 8) + '...');

      // Run comprehensive diagnostic
      const results = await diagnosticBioIssues(userId);
      
      setDiagnosticResults({
        userId: userId.substring(0, 8) + '...',
        ...results
      });
      
    } catch (error) {
      console.error('Diagnostic error:', error);
      setDiagnosticResults({
        error: 'Diagnostic failed',
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const testBioSave = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTestSaveResult({ error: 'No session' });
        return;
      }

      const userId = session.user.id;
      const testBio = `Test bio ${Date.now()}`;
      
      console.log('🧪 Testing bio save with:', testBio);

      // Test direct profiles table update
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId,
          bio: testBio,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select('id, bio');

      if (error) {
        console.error('❌ Profiles table error:', error);
        
        // Try users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .update({ 
            bio: testBio,
            description: testBio,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select('id, bio, description');

        if (userError) {
          setTestSaveResult({
            success: false,
            profilesError: error.message,
            usersError: userError.message
          });
        } else {
          setTestSaveResult({
            success: true,
            method: 'users_table',
            data: userData
          });
        }
      } else {
        setTestSaveResult({
          success: true,
          method: 'profiles_table',
          data: data
        });
      }
      
    } catch (error) {
      console.error('Test save error:', error);
      setTestSaveResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <div className="min-h-screen bg-midnight-black text-pearl-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-headline text-electric-blue mb-2">Bio Save Diagnostic Tool</h1>
          <p className="text-muted-lavender">Troubleshoot bio saving issues</p>
        </div>

        {/* Diagnostic Results */}
        <Card className="bg-midnight-black/50 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-electric-blue" />
              System Diagnostic
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !diagnosticResults ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running diagnostic...
              </div>
            ) : diagnosticResults ? (
              <div className="space-y-4">
                {diagnosticResults.error ? (
                  <div className="text-glitch-red">
                    <strong>Error:</strong> {diagnosticResults.error}
                    {diagnosticResults.details && <div className="text-sm mt-1">{diagnosticResults.details}</div>}
                  </div>
                ) : (
                  <>
                    {/* Session Status */}
                    <div className="border border-muted-lavender/20 rounded p-3">
                      <h3 className="font-medium mb-2">Session Status</h3>
                      {diagnosticResults.session ? (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            {diagnosticResults.session.valid ? (
                              <CheckCircle className="w-4 h-4 text-electric-blue" />
                            ) : (
                              <XCircle className="w-4 h-4 text-glitch-red" />
                            )}
                            <span>Session: {diagnosticResults.session.valid ? 'Valid' : 'Invalid'}</span>
                          </div>
                          <div>User ID: {diagnosticResults.userId}</div>
                          <div>Has Access Token: {diagnosticResults.session.hasAccessToken ? 'Yes' : 'No'}</div>
                        </div>
                      ) : (
                        <div className="text-glitch-red">No session data</div>
                      )}
                    </div>

                    {/* Database Access */}
                    <div className="border border-muted-lavender/20 rounded p-3">
                      <h3 className="font-medium mb-2">Database Access</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          {diagnosticResults.database.users ? (
                            <CheckCircle className="w-4 h-4 text-electric-blue" />
                          ) : (
                            <XCircle className="w-4 h-4 text-glitch-red" />
                          )}
                          <span>Users Table: {diagnosticResults.database.users ? 'Accessible' : 'Not accessible'}</span>
                        </div>
                        {diagnosticResults.database.users && (
                          <div className="ml-6 text-muted-lavender">
                            Bio: "{diagnosticResults.database.users.bio || 'None'}"
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {diagnosticResults.database.profiles ? (
                            <CheckCircle className="w-4 h-4 text-electric-blue" />
                          ) : (
                            <XCircle className="w-4 h-4 text-glitch-red" />
                          )}
                          <span>Profiles Table: {diagnosticResults.database.profiles ? 'Accessible' : 'Not accessible'}</span>
                        </div>
                        {diagnosticResults.database.profiles && (
                          <div className="ml-6 text-muted-lavender">
                            Bio: "{diagnosticResults.database.profiles.bio || 'None'}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Server Endpoint */}
                    <div className="border border-muted-lavender/20 rounded p-3">
                      <h3 className="font-medium mb-2">Server Endpoint</h3>
                      <div className="flex items-center gap-2 text-sm">
                        {diagnosticResults.serverEndpoint?.accessible ? (
                          <CheckCircle className="w-4 h-4 text-electric-blue" />
                        ) : (
                          <XCircle className="w-4 h-4 text-glitch-red" />
                        )}
                        <span>Edge Function: {diagnosticResults.serverEndpoint?.accessible ? 'Accessible' : 'Not accessible'}</span>
                      </div>
                      {diagnosticResults.serverEndpoint?.error && (
                        <div className="ml-6 text-glitch-red text-sm mt-1">
                          Error: {diagnosticResults.serverEndpoint.error}
                        </div>
                      )}
                    </div>

                    {/* Errors */}
                    {diagnosticResults.errors && diagnosticResults.errors.length > 0 && (
                      <div className="border border-glitch-red/30 rounded p-3">
                        <h3 className="font-medium mb-2 text-glitch-red">Errors Found</h3>
                        <ul className="text-sm space-y-1">
                          {diagnosticResults.errors.map((error: string, index: number) => (
                            <li key={index} className="text-glitch-red">• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Test Save */}
        <Card className="bg-midnight-black/50 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-soft-blush" />
              Bio Save Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={testBioSave}
                disabled={loading}
                className="bg-soft-blush hover:bg-soft-blush/90 text-midnight-black"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Testing...
                  </>
                ) : (
                  'Test Bio Save'
                )}
              </Button>

              {testSaveResult && (
                <div className="border border-muted-lavender/20 rounded p-3">
                  <h3 className="font-medium mb-2">Test Result</h3>
                  {testSaveResult.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-electric-blue">
                        <CheckCircle className="w-4 h-4" />
                        <span>Bio save successful!</span>
                      </div>
                      <div className="text-sm text-muted-lavender">
                        Method: {testSaveResult.method}
                      </div>
                      {testSaveResult.data && (
                        <div className="text-sm text-muted-lavender">
                          Saved bio: "{testSaveResult.data[0]?.bio || 'N/A'}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-glitch-red">
                        <XCircle className="w-4 h-4" />
                        <span>Bio save failed</span>
                      </div>
                      {testSaveResult.profilesError && (
                        <div className="text-sm text-glitch-red">
                          Profiles table error: {testSaveResult.profilesError}
                        </div>
                      )}
                      {testSaveResult.usersError && (
                        <div className="text-sm text-glitch-red">
                          Users table error: {testSaveResult.usersError}
                        </div>
                      )}
                      {testSaveResult.error && (
                        <div className="text-sm text-glitch-red">
                          Error: {testSaveResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={runDiagnostic}
            disabled={loading}
            variant="outline"
            className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Diagnostic
          </Button>
          
          <Button
            onClick={() => window.location.href = '/?simple-bio-test'}
            className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
          >
            Try Simple Bio Editor
          </Button>
        </div>
      </div>
    </div>
  );
}