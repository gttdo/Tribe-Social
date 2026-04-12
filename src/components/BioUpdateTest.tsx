import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { supabase } from '../utils/supabase/client';
import { updateBio, updateBioSimple, updateBioDirectFetch } from '../utils/supabase/user-helpers';
import { toast } from 'sonner@2.0.3';

export function BioUpdateTest() {
  const [userId, setUserId] = useState<string>('');
  const [currentBio, setCurrentBio] = useState<string>('');
  const [newBio, setNewBio] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const initializeTest = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
          addLog(`User ID set: ${session.user.id.substring(0, 8)}...`);
          
          // Get current bio from database
          const { data: profile, error } = await supabase
            .from('users')
            .select('bio, description')
            .eq('id', session.user.id)
            .single();
          
          if (!error && profile) {
            const bio = profile.bio || profile.description || '';
            setCurrentBio(bio);
            setNewBio(bio);
            addLog(`Current bio loaded: "${bio.substring(0, 50)}..."`);
          } else {
            addLog(`Error loading profile: ${error?.message || 'Unknown error'}`);
          }
        }
      } catch (error) {
        addLog(`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    initializeTest();
  }, []);

  const testEnhancedUpdate = async () => {
    if (!userId || !newBio.trim()) return;
    
    setIsLoading(true);
    addLog('🧪 Testing enhanced bio update...');
    
    try {
      await updateBio(userId, newBio.trim());
      addLog('✅ Enhanced bio update successful');
      toast.success('Enhanced bio update successful');
      
      // Verify the update
      const { data: profile, error } = await supabase
        .from('users')
        .select('bio, description, updated_at')
        .eq('id', userId)
        .single();
      
      if (!error && profile) {
        setCurrentBio(profile.bio || profile.description || '');
        addLog(`✅ Verification: bio is now "${(profile.bio || profile.description || '').substring(0, 50)}..."`);
        addLog(`✅ Updated at: ${profile.updated_at}`);
      } else {
        addLog(`❌ Verification failed: ${error?.message}`);
      }
    } catch (error) {
      addLog(`❌ Enhanced update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Enhanced bio update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testSimpleUpdate = async () => {
    if (!userId || !newBio.trim()) return;
    
    setIsLoading(true);
    addLog('🧪 Testing simple bio update...');
    
    try {
      await updateBioSimple(userId, newBio.trim());
      addLog('✅ Simple bio update successful');
      toast.success('Simple bio update successful');
      
      // Verify the update
      const { data: profile, error } = await supabase
        .from('users')
        .select('bio, description, updated_at')
        .eq('id', userId)
        .single();
      
      if (!error && profile) {
        setCurrentBio(profile.bio || profile.description || '');
        addLog(`✅ Verification: bio is now "${(profile.bio || profile.description || '').substring(0, 50)}..."`);
        addLog(`✅ Updated at: ${profile.updated_at}`);
      } else {
        addLog(`❌ Verification failed: ${error?.message}`);
      }
    } catch (error) {
      addLog(`❌ Simple update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Simple bio update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectFetch = async () => {
    if (!userId || !newBio.trim()) return;
    
    setIsLoading(true);
    addLog('🧪 Testing direct fetch bio update...');
    
    try {
      await updateBioDirectFetch(userId, newBio.trim());
      addLog('✅ Direct fetch bio update successful');
      toast.success('Direct fetch bio update successful');
      
      // Verify the update
      const { data: profile, error } = await supabase
        .from('users')
        .select('bio, description, updated_at')
        .eq('id', userId)
        .single();
      
      if (!error && profile) {
        setCurrentBio(profile.bio || profile.description || '');
        addLog(`✅ Verification: bio is now "${(profile.bio || profile.description || '').substring(0, 50)}..."`);
        addLog(`✅ Updated at: ${profile.updated_at}`);
      } else {
        addLog(`❌ Verification failed: ${error?.message}`);
      }
    } catch (error) {
      addLog(`❌ Direct fetch update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Direct fetch bio update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const refreshCurrentBio = async () => {
    if (!userId) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('bio, description, updated_at')
        .eq('id', userId)
        .single();
      
      if (!error && profile) {
        const bio = profile.bio || profile.description || '';
        setCurrentBio(bio);
        addLog(`🔄 Current bio refreshed: "${bio.substring(0, 50)}..."`);
        addLog(`🔄 Last updated: ${profile.updated_at}`);
      } else {
        addLog(`❌ Refresh failed: ${error?.message}`);
      }
    } catch (error) {
      addLog(`❌ Refresh error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-midnight-black/80 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="text-pearl-white font-headline">
              Bio Update Testing Suite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info */}
            <div className="space-y-2">
              <p className="text-muted-lavender text-sm">
                User ID: {userId ? `${userId.substring(0, 8)}...` : 'Not loaded'}
              </p>
              <p className="text-muted-lavender text-sm">
                Current Bio: "{currentBio.substring(0, 100)}{currentBio.length > 100 ? '...' : ''}"
              </p>
            </div>

            {/* Bio Input */}
            <div className="space-y-2">
              <label className="text-pearl-white text-sm font-medium">
                New Bio to Test:
              </label>
              <textarea
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                className="w-full min-h-[100px] bg-midnight-black/50 border border-muted-lavender/30 rounded-lg p-3 text-pearl-white placeholder:text-muted-lavender/60 resize-none"
                placeholder="Enter your new bio here..."
                maxLength={280}
                disabled={isLoading}
              />
              <p className="text-muted-lavender text-xs">
                {newBio.length}/280 characters
              </p>
            </div>

            {/* Test Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                onClick={testEnhancedUpdate}
                disabled={isLoading || !userId || !newBio.trim()}
                className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
              >
                Test Enhanced Update
              </Button>
              
              <Button
                onClick={testSimpleUpdate}
                disabled={isLoading || !userId || !newBio.trim()}
                className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black"
              >
                Test Simple Update
              </Button>
              
              <Button
                onClick={testDirectFetch}
                disabled={isLoading || !userId || !newBio.trim()}
                className="bg-soft-blush hover:bg-soft-blush/90 text-midnight-black"
              >
                Test Direct Fetch
              </Button>
              
              <Button
                onClick={refreshCurrentBio}
                disabled={isLoading || !userId}
                variant="outline"
                className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
              >
                Refresh Current Bio
              </Button>
            </div>

            {/* Logs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-pearl-white text-sm font-medium">
                  Test Logs:
                </label>
                <Button
                  onClick={clearLogs}
                  variant="outline"
                  size="sm"
                  className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
                >
                  Clear Logs
                </Button>
              </div>
              <div className="bg-midnight-black/50 border border-muted-lavender/30 rounded-lg p-3 h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-muted-lavender/60 text-sm">No logs yet...</p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <p key={index} className="text-pearl-white text-xs font-mono">
                        {log}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-midnight-black/30 border border-muted-lavender/20 rounded-lg p-4">
              <h3 className="text-pearl-white font-medium mb-2">How to Use:</h3>
              <ol className="text-muted-lavender text-sm space-y-1 list-decimal list-inside">
                <li>Enter a new bio in the text area above</li>
                <li>Click one of the test buttons to try different update methods</li>
                <li>Watch the logs to see what's happening</li>
                <li>Use "Refresh Current Bio" to see the latest database state</li>
                <li>Check your profile page to see if changes are reflected</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}