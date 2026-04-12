// Example component showing how to use the We function
import React, { useState, useEffect } from 'react';
import We from '../lib/serverApi'; // Default import

export function WeTestComponent() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // This is how you should call We() - as a default export function
      const Ct = await We();
      console.log('Posts fetched via We():', Ct);
      
      setPosts(Ct.posts || []);
    } catch (err) {
      console.error('Error fetching posts with We():', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-headline text-pearl-white">We() Function Test</h2>
      
      <button 
        onClick={fetchPosts}
        disabled={loading}
        className="px-4 py-2 bg-neon-lilac text-midnight-black rounded-lg disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Fetch Posts with We()'}
      </button>
      
      {error && (
        <div className="text-glitch-red text-sm">
          Error: {error}
        </div>
      )}
      
      <div className="text-pearl-white">
        Posts loaded: {posts.length}
      </div>
      
      {posts.length > 0 && (
        <div className="text-muted-lavender text-sm">
          ✅ We() function working correctly
        </div>
      )}
    </div>
  );
}