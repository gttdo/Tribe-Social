import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { updateUserBio, diagnosticBioIssues } from '../utils/bio-fix-helpers';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

export function QuickBioFix() {
  const [testBio, setTestBio] = useState('Quick bio test from fix tool');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        console.log('✅ User session found:', session.user.id.substring(0, 8) + '...');
      } else {
        toast.error('No active session found');
      }
    } catch (error) {
      console.error('Session check error:', error);
      toast.error('Session check failed');
    }
  };

  const runDiagnostics = async () => {
    if (!userId) {
      toast.error('No user ID available');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Running bio diagnostics...');
      const results = await diagnosticBioIssues(userId);
      setDiagnostics(results);
      console.log('📊 Diagnostic results:', results);
      
      if (results.errors.length > 0) {
        toast.error(`Found ${results.errors.length} issues`);
      } else {
        toast.success('Diagnostics completed');
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Diagnostic failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testBioUpdate = async () => {
    if (!userId || !testBio.trim()) {
      toast.error('Need user ID and bio content');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🚀 Testing bio update...');
      const result = await updateUserBio(userId, testBio);
      
      if (result.success) {
        toast.success(`Bio update successful! Method: ${result.method}`);
        console.log('✅ Bio update result:', result);
        
        // Re-run diagnostics to see the changes
        await runDiagnostics();
      } else {
        toast.error(`Bio update failed: ${result.error}`);
        console.error('❌ Bio update failed:', result);
      }
    } catch (error) {
      console.error('Bio update error:', error);
      toast.error('Bio update failed with exception');
    } finally {
      setIsLoading(false);
    }
  };

  const quickTableTest = async () => {
    if (!userId) {
      toast.error('No user ID available');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🧪 Quick table test...');
      
      // Test direct update to users table
      const { data, error } = await supabase
        .from('users')
        .update({ 
          bio: `Direct test ${Date.now()}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, bio, description');

      if (error) {
        console.error('❌ Quick table test failed:', error);
        toast.error(`Table test failed: ${error.message}`);
      } else {
        console.log('✅ Quick table test successful:', data);
        toast.success(`Table test successful! Updated: ${data[0]?.bio}`);
      }
    } catch (error) {
      console.error('Table test error:', error);
      toast.error('Table test failed with exception');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-midnight-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-midnight-black border-muted-lavender/30">
        <CardHeader>
          <CardTitle className="text-pearl-white font-headline">Quick Bio Fix Tool</CardTitle>
          <div className="text-sm text-muted-lavender">
            User ID: {userId ? userId.substring(0, 8) + '...' : 'Not found'}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <label className="text-pearl-white text-sm font-medium mb-2 block">
              Test Bio Content
            </label>
            <Input
              value={testBio}
              onChange={(e) => setTestBio(e.target.value)}
              placeholder="Enter test bio..."
              className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white"
              maxLength={280}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={runDiagnostics}
              disabled={isLoading || !userId}
              variant="outline"
              className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
            >
              {isLoading ? 'Running...' : 'Run Diagnostics'}
            </Button>

            <Button
              onClick={testBioUpdate}
              disabled={isLoading || !userId || !testBio.trim()}
              className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
            >
              {isLoading ? 'Testing...' : 'Test Bio Update'}
            </Button>

            <Button
              onClick={quickTableTest}
              disabled={isLoading || !userId}
              className="bg-soft-blush hover:bg-soft-blush/90 text-midnight-black"
            >
              {isLoading ? 'Testing...' : 'Quick Table Test'}
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-glitch-red/30 text-glitch-red hover:bg-glitch-red/10"
            >
              Close & Reload
            </Button>
          </div>

          {diagnostics && (
            <div className="space-y-3">
              <h4 className="text-pearl-white font-medium">Diagnostic Results</h4>
              
              {/* Session Status */}
              <div className="bg-midnight-black/30 p-3 rounded border border-muted-lavender/20">
                <div className="flex items-center gap-2 mb-2">
                  {diagnostics.session?.valid ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-pearl-white font-medium">Session</span>
                </div>
                <div className="text-xs text-muted-lavender">
                  Valid: {diagnostics.session?.valid ? 'Yes' : 'No'} | 
                  User ID: {diagnostics.session?.userId?.substring(0, 8) || 'None'}...
                </div>
              </div>

              {/* Database Status */}
              <div className="bg-midnight-black/30 p-3 rounded border border-muted-lavender/20">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-pearl-white font-medium">Database State</span>
                </div>
                <div className="text-xs text-muted-lavender space-y-1">
                  <div>
                    <strong>Users Table:</strong> {diagnostics.database.users ? 
                      `bio: "${diagnostics.database.users.bio || 'null'}"` : 
                      'Not accessible'
                    }
                  </div>
                  <div>
                    <strong>Profiles Table:</strong> {diagnostics.database.profiles ? 
                      `bio: "${diagnostics.database.profiles.bio || 'null'}"` : 
                      'Not accessible'
                    }
                  </div>
                </div>
              </div>

              {/* Server Endpoint Status */}
              <div className="bg-midnight-black/30 p-3 rounded border border-muted-lavender/20">
                <div className="flex items-center gap-2 mb-2">
                  {diagnostics.serverEndpoint?.accessible ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-pearl-white font-medium">Server Endpoint</span>
                </div>
                <div className="text-xs text-muted-lavender">
                  Accessible: {diagnostics.serverEndpoint?.accessible ? 'Yes' : 'No'}
                  {diagnostics.serverEndpoint?.error && ` | Error: ${diagnostics.serverEndpoint.error}`}
                </div>
              </div>

              {/* Errors */}
              {diagnostics.errors.length > 0 && (
                <div className="bg-glitch-red/10 p-3 rounded border border-glitch-red/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-glitch-red" />
                    <span className="text-pearl-white font-medium">Errors ({diagnostics.errors.length})</span>
                  </div>
                  <div className="text-xs text-muted-lavender space-y-1">
                    {diagnostics.errors.map((error: string, index: number) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-lavender/60 bg-midnight-black/30 p-3 rounded border border-muted-lavender/20">
            <p><strong>Instructions:</strong></p>
            <p>1. Run diagnostics to check system status</p>
            <p>2. Try bio update to test the fix</p>
            <p>3. Use quick table test for direct database access</p>
            <p>4. Check browser console for detailed logs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}