import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { BioEditor } from './BioEditor';
import { getCurrentSession } from '../utils/supabase/client';
import { updateBio } from '../utils/supabase/user-helpers';
import { toast } from 'sonner@2.0.3';

export function BioTestPage() {
  const [currentBio, setCurrentBio] = useState('This is a test bio that can be edited');
  const [userId, setUserId] = useState<string | null>(null);
  const [testBio, setTestBio] = useState('');
  const [isTestSaving, setIsTestSaving] = useState(false);

  useEffect(() => {
    // Get current user ID
    const fetchUserId = async () => {
      try {
        const session = await getCurrentSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
        } else {
          toast.error('Please sign in to test bio functionality');
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
        toast.error('Error getting user session');
      }
    };

    fetchUserId();
  }, []);

  const handleBioUpdate = (newBio: string) => {
    setCurrentBio(newBio);
    console.log('Bio updated to:', newBio);
  };

  const testDirectBioUpdate = async () => {
    if (!userId) {
      toast.error('No user ID available');
      return;
    }

    if (!testBio.trim()) {
      toast.error('Please enter a test bio');
      return;
    }

    setIsTestSaving(true);
    try {
      await updateBio(userId, testBio);
      setCurrentBio(testBio);
      setTestBio('');
      toast.success('Direct bio update successful!');
    } catch (error) {
      console.error('Direct bio update failed:', error);
      toast.error(`Direct bio update failed: ${error.message}`);
    } finally {
      setIsTestSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-midnight-black text-pearl-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-headline font-bold text-neon-lilac">
          Bio Update Test Page
        </h1>
        
        <Card className="bg-midnight-black/50 border-muted-lavender/30">
          <CardContent className="p-6">
            <h2 className="text-lg font-headline font-semibold mb-4">
              BioEditor Component Test
            </h2>
            
            {userId ? (
              <BioEditor
                userId={userId}
                currentBio={currentBio}
                onBioUpdate={handleBioUpdate}
                username="test_user"
              />
            ) : (
              <div className="text-center text-muted-lavender">
                Loading user session...
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-midnight-black/50 border-muted-lavender/30">
          <CardContent className="p-6">
            <h2 className="text-lg font-headline font-semibold mb-4">
              Direct API Test
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-lavender mb-2">
                  Test Bio Content:
                </label>
                <textarea
                  value={testBio}
                  onChange={(e) => setTestBio(e.target.value)}
                  placeholder="Enter a test bio to save directly..."
                  className="w-full p-3 bg-midnight-black/50 border border-muted-lavender/30 rounded-lg text-pearl-white placeholder:text-muted-lavender/60 resize-none"
                  rows={3}
                  maxLength={280}
                />
                <div className="text-xs text-muted-lavender/70 mt-1">
                  {testBio.length}/280 characters
                </div>
              </div>
              
              <Button
                onClick={testDirectBioUpdate}
                disabled={!testBio.trim() || isTestSaving || !userId}
                className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black"
              >
                {isTestSaving ? 'Saving...' : 'Test Direct Bio Update'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-midnight-black/50 border-muted-lavender/30">
          <CardContent className="p-6">
            <h2 className="text-lg font-headline font-semibold mb-4">
              Current State
            </h2>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-lavender">User ID:</span>
                <div className="font-mono text-xs text-pearl-white">
                  {userId || 'Not loaded'}
                </div>
              </div>
              
              <div>
                <span className="text-sm text-muted-lavender">Current Bio:</span>
                <div className="text-pearl-white mt-1 p-2 bg-midnight-black/50 border border-muted-lavender/20 rounded">
                  {currentBio || 'No bio set'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}