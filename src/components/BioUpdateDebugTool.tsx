import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { updateBio, updateBioDirectFetch, updateBioSimple } from '../utils/supabase/user-helpers';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

export function BioUpdateDebugTool() {
  const [testBio, setTestBio] = useState('Test bio from debug tool');
  const [isTesting, setIsTesting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('Unknown');

  // Check current session
  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setSessionStatus(`Error: ${error.message}`);
        return;
      }

      if (!session) {
        setSessionStatus('No session found');
        return;
      }

      setCurrentUserId(session.user.id);
      setSessionStatus(`Valid session for user: ${session.user.id.substring(0, 8)}...`);
      console.log('🔍 Session details:', {
        hasSession: !!session,
        hasAccessToken: !!session.access_token,
        userId: session.user.id,
        email: session.user.email
      });
    } catch (error) {
      console.error('Session check error:', error);
      setSessionStatus(`Session check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test regular bio update function
  const testRegularUpdate = async () => {
    if (!currentUserId) {
      toast.error('No user ID available');
      return;
    }

    setIsTesting(true);
    try {
      console.log('🧪 Testing regular bio update...');
      await updateBio(currentUserId, testBio);
      console.log('✅ Regular bio update successful');
      toast.success('Regular bio update successful!');
    } catch (error) {
      console.error('❌ Regular bio update failed:', error);
      toast.error(`Regular update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Test direct fetch bio update function  
  const testDirectFetchUpdate = async () => {
    if (!currentUserId) {
      toast.error('No user ID available');
      return;
    }

    setIsTesting(true);
    try {
      console.log('🧪 Testing direct fetch bio update...');
      await updateBioDirectFetch(currentUserId, testBio);
      console.log('✅ Direct fetch bio update successful');
      toast.success('Direct fetch bio update successful!');
    } catch (error) {
      console.error('❌ Direct fetch bio update failed:', error);
      toast.error(`Direct fetch update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Test simple bio update function
  const testSimpleUpdate = async () => {
    if (!currentUserId) {
      toast.error('No user ID available');
      return;
    }

    setIsTesting(true);
    try {
      console.log('🧪 Testing simple bio update...');
      await updateBioSimple(currentUserId, testBio);
      console.log('✅ Simple bio update successful');
      toast.success('Simple bio update successful!');
    } catch (error) {
      console.error('❌ Simple bio update failed:', error);
      toast.error(`Simple update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Check current bio in database
  const checkCurrentBio = async () => {
    if (!currentUserId) {
      toast.error('No user ID available');
      return;
    }

    try {
      console.log('🔍 Checking current bio in database...');
      const { data, error } = await supabase
        .from('profiles')
        .select('bio, description, updated_at')
        .eq('id', currentUserId)
        .single();

      if (error) {
        console.error('Error reading bio:', error);
        toast.error(`Failed to read bio: ${error.message}`);
        return;
      }

      console.log('📊 Current bio data:', data);
      toast.info(`Current bio: "${data.bio || 'null'}" | Description: "${data.description || 'null'}"`);
    } catch (error) {
      console.error('Exception reading bio:', error);
      toast.error('Exception while reading bio');
    }
  };

  React.useEffect(() => {
    checkSession();
  }, []);

  return (
    <div className="fixed inset-0 bg-midnight-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-midnight-black border-muted-lavender/30 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-pearl-white font-headline">Bio Update Debug Tool</CardTitle>
          <div className="text-sm text-muted-lavender font-body">
            Session Status: {sessionStatus}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={checkSession}
              disabled={isTesting}
              variant="outline"
              className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
            >
              Check Session
            </Button>

            <Button
              onClick={checkCurrentBio}
              disabled={isTesting || !currentUserId}
              variant="outline"
              className="border-soft-blush/30 text-soft-blush hover:bg-soft-blush/10"
            >
              Check Current Bio
            </Button>

            <Button
              onClick={testRegularUpdate}
              disabled={isTesting || !currentUserId}
              className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
            >
              {isTesting ? 'Testing...' : 'Test Regular Update'}
            </Button>

            <Button
              onClick={testDirectFetchUpdate}
              disabled={isTesting || !currentUserId}
              className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black"
            >
              {isTesting ? 'Testing...' : 'Test Direct Fetch'}
            </Button>

            <Button
              onClick={testSimpleUpdate}
              disabled={isTesting || !currentUserId}
              className="bg-soft-blush hover:bg-soft-blush/90 text-midnight-black"
            >
              {isTesting ? 'Testing...' : 'Test Simple Update'}
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-glitch-red/30 text-glitch-red hover:bg-glitch-red/10"
            >
              Close & Reload
            </Button>
          </div>

          <div className="text-xs text-muted-lavender/60 font-body bg-midnight-black/30 p-3 rounded border border-muted-lavender/20">
            <p className="mb-2"><strong>Debug Tips:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Check browser console for detailed logs</li>
              <li>Try each update method to see which works</li>
              <li>Check current bio before and after updates</li>
              <li>Verify session is valid before testing</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}