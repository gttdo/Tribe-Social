import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface TestPost {
  id: string;
  user_id: string;
  username: string;
  authorId?: string;
  userId?: string;
}

export function UsernameClickTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testUsernameLookup = async () => {
    setLoading(true);
    setTestResults([]);
    addResult('🧪 Starting username click test...');

    try {
      // Test 1: Fetch some posts from the database
      addResult('📊 Fetching posts with profile data...');
      
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          text_body,
          profiles (
            id,
            display_name,
            avatar_url,
            avatar_version
          )
        `)
        .limit(5);

      if (postsError) {
        addResult(`❌ Error fetching posts: ${postsError.message}`);
        return;
      }

      if (!postsData || postsData.length === 0) {
        addResult('⚠️ No posts found');
        return;
      }

      addResult(`✅ Found ${postsData.length} posts`);

      // Test 2: Check profile data for each post
      for (const post of postsData) {
        const hasProfile = !!post.profiles;
        const profileData = post.profiles;
        
        addResult(`📝 Post ${post.id.substring(0, 8)}... - Has Profile: ${hasProfile}`);
        
        if (hasProfile && profileData) {
          addResult(`   User: ${profileData.display_name || 'No display name'}`);
          addResult(`   ID: ${profileData.id?.substring(0, 8)}...`);
        } else {
          addResult(`   ⚠️ Missing profile data for user ${post.user_id?.substring(0, 8)}...`);
        }
      }

      // Test 3: Test UUID validation
      const testUUIDs = [
        postsData[0]?.user_id,
        'invalid-uuid',
        '1b08f9d9-1234-5678-9abc-123456789abc'
      ];

      addResult('🔍 Testing UUID validation...');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      for (const uuid of testUUIDs) {
        if (uuid) {
          const isValid = uuidRegex.test(uuid);
          addResult(`   ${uuid.substring(0, 16)}... - Valid: ${isValid}`);
        }
      }

      // Test 4: Try to fetch profile by display_name
      if (postsData[0]?.profiles?.display_name) {
        const displayName = postsData[0].profiles.display_name;
        addResult(`🔍 Testing profile lookup by display_name: ${displayName}`);
        
        const { data: profileLookup, error: lookupError } = await supabase
          .from('profiles')
          .select('id')
          .eq('display_name', displayName)
          .single();

        if (lookupError) {
          addResult(`   ❌ Lookup failed: ${lookupError.message}`);
        } else if (profileLookup) {
          addResult(`   ✅ Found ID: ${profileLookup.id?.substring(0, 8)}...`);
        } else {
          addResult(`   ⚠️ No profile found for display_name`);
        }
      }

      addResult('✅ Username click test completed');
      toast.success('Test completed successfully');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addResult(`💥 Test failed: ${errorMsg}`);
      toast.error('Test failed');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 p-4">
      <Card className="max-w-4xl mx-auto soft-blur border-muted-lavender/30">
        <CardHeader>
          <CardTitle className="font-headline text-pearl-white">
            Username Click Debug Test
          </CardTitle>
          <Badge variant="secondary" className="w-fit">
            Profile Data & Navigation Test
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={testUsernameLookup}
              disabled={loading}
              className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black font-body"
            >
              {loading ? 'Running Test...' : 'Run Username Click Test'}
            </Button>
            
            <Button
              onClick={clearResults}
              variant="outline"
              className="border-muted-lavender/30 text-pearl-white font-body"
            >
              Clear Results
            </Button>
          </div>

          {testResults.length > 0 && (
            <Card className="bg-midnight-black/50 border-electric-blue/30">
              <CardHeader>
                <CardTitle className="font-body text-sm text-electric-blue">
                  Test Results ({testResults.length} entries)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
                  {testResults.map((result, index) => (
                    <div 
                      key={index} 
                      className={`p-2 rounded ${
                        result.includes('❌') || result.includes('💥') 
                          ? 'bg-glitch-red/10 text-glitch-red' 
                          : result.includes('✅') 
                          ? 'bg-electric-blue/10 text-electric-blue'
                          : result.includes('⚠️')
                          ? 'bg-soft-blush/10 text-soft-blush'
                          : 'text-muted-lavender'
                      }`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-soft-blush/5 border-soft-blush/30">
            <CardContent className="pt-6">
              <h3 className="font-headline text-soft-blush mb-2">Test Coverage</h3>
              <ul className="text-sm text-muted-lavender space-y-1 font-body">
                <li>• Database query with profile joins</li>
                <li>• Profile data validation</li>
                <li>• UUID format checking</li>
                <li>• Display name to ID lookup</li>
                <li>• Error handling for missing profiles</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}