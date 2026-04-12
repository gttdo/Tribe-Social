// Simple integration test for the We function
import React, { useState } from 'react';
import We from '../lib/serverApi';

export function WeIntegrationTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testWeFunction = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log('🧪 Starting We() function test...');
      
      // This is the pattern you mentioned: let Ct = await We();
      const Ct = await We();
      
      console.log('✅ We() test successful:', Ct);
      setResult(Ct);
      
    } catch (err) {
      console.error('❌ We() test failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-card border border-border rounded-lg">
      <h3 className="font-headline text-lg text-pearl-white">We() Function Test</h3>
      
      <button 
        onClick={testWeFunction}
        disabled={loading}
        className="px-4 py-2 bg-neon-lilac text-midnight-black rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {loading ? 'Testing...' : 'Test We() Function'}
      </button>
      
      {error && (
        <div className="p-3 bg-glitch-red/10 border border-glitch-red/30 rounded-lg">
          <p className="text-glitch-red text-sm">Error: {error}</p>
        </div>
      )}
      
      {result && (
        <div className="p-3 bg-electric-blue/10 border border-electric-blue/30 rounded-lg">
          <p className="text-electric-blue text-sm">
            ✅ Success! Fetched {result.posts?.length || 0} posts
          </p>
          {result.posts?.length > 0 && (
            <details className="mt-2">
              <summary className="text-muted-lavender text-xs cursor-pointer">
                View first post data
              </summary>
              <pre className="text-xs text-muted-lavender mt-2 overflow-auto">
                {JSON.stringify(result.posts[0], null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}