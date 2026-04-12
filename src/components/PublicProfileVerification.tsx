import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { supabase } from '../utils/supabase/client';

/**
 * Component to verify public profile functionality
 * Tests the new profile fetching logic
 */
export function PublicProfileVerification() {
  const [testUserId, setTestUserId] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testProfileFetch = async () => {
    if (!testUserId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    setLoading(true);
    setError('');
    setProfileData(null);

    try {
      console.log('🔍 Testing profile fetch for user ID:', testUserId);

      // Test the new profile fetching logic
      // Fetch profile by id (not session): query public.profiles where id = route.userId
      // selecting id, display_name, avatar_url, avatar_version, bio, xp
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, avatar_version, bio, xp")
        .eq("id", testUserId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError("Profile not found");
          return;
        }
        setError(`Failed to load profile: ${profileError.message}`);
        return;
      }

      console.log('✅ Profile data loaded:', profileData);
      setProfileData(profileData);

      // Test avatar URL generation
      const avatarUrl = profileData.avatar_url 
        ? `${profileData.avatar_url}?v=${profileData.avatar_version ?? 0}`
        : null;
      
      console.log('🖼️ Avatar URL:', avatarUrl);

    } catch (error: any) {
      console.error('❌ Error testing profile fetch:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-midnight-black p-4">
      <div className="container mx-auto max-w-2xl space-y-6">
        <Card className="bg-midnight-black/80 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="font-headline text-pearl-white">
              Public Profile Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-muted-lavender font-body text-sm">
                Test User ID (UUID format):
              </label>
              <input
                type="text"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                className="w-full px-3 py-2 bg-midnight-black/50 border border-muted-lavender/30 rounded-lg text-pearl-white font-body"
              />
            </div>

            <Button
              onClick={testProfileFetch}
              disabled={loading}
              className="w-full bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black font-body"
            >
              {loading ? 'Testing...' : 'Test Profile Fetch'}
            </Button>

            {error && (
              <div className="p-3 bg-glitch-red/20 border border-glitch-red/30 rounded-lg">
                <p className="text-glitch-red font-body text-sm">{error}</p>
              </div>
            )}

            {profileData && (
              <div className="space-y-3">
                <h3 className="font-headline text-pearl-white">Profile Data:</h3>
                <div className="p-3 bg-midnight-black/50 border border-muted-lavender/30 rounded-lg">
                  <pre className="text-muted-lavender font-mono text-xs overflow-auto">
                    {JSON.stringify(profileData, null, 2)}
                  </pre>
                </div>

                <div className="space-y-2">
                  <p className="text-pearl-white font-body">
                    <strong>Display Name:</strong> {profileData.display_name || 'N/A'}
                  </p>
                  <p className="text-pearl-white font-body">
                    <strong>Bio:</strong> {profileData.bio || 'N/A'}
                  </p>
                  <p className="text-pearl-white font-body">
                    <strong>XP:</strong> {profileData.xp || 0}
                  </p>
                  <p className="text-pearl-white font-body">
                    <strong>Avatar URL:</strong> {
                      profileData.avatar_url 
                        ? `${profileData.avatar_url}?v=${profileData.avatar_version ?? 0}`
                        : 'N/A'
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-headline text-pearl-white text-sm">Test Navigation:</h4>
              <Button
                onClick={() => {
                  if (testUserId) {
                    window.history.pushState({}, '', `/u/${testUserId}`);
                    window.location.reload();
                  }
                }}
                variant="outline"
                className="w-full border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
                disabled={!testUserId}
              >
                Navigate to /u/{testUserId}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}