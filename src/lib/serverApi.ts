// lib/serverApi.ts
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

// Use the same base URL as the main Supabase client
const supabaseUrl = `https://${projectId}.supabase.co`;

const EDGE_BASE = `${supabaseUrl}/functions/v1/make-server-70df0d6e`;

export default async function We() {
  try {
    console.log('gv We() function called - fetching posts');
    console.log('gv Debug info:', {
      hasSupabase: !!supabase,
      hasAuth: !!supabase?.auth,
      url: `${EDGE_BASE}/posts`,
      publicKey: publicAnonKey?.slice(0, 10) + '...'
    });
    
    // Verify supabase client is properly initialized
    if (!supabase || !supabase.auth) {
      console.error('❌ Supabase client not properly initialized');
      return { posts: [] };
    }

    // OLD not functional from 401 error
    // // Use session sync for better reliability
    // const { getValidSession } = await import('../utils/session-sync');
    // const session = await getValidSession();
    
    // if (!session?.access_token) {
    //   console.log('❌ No valid session found after sync attempt');
    //   return { posts: [] };
    // }

    // ✅ use Supabase SDK session + refresh fallback
    let token: string | undefined;
    // Token check (logging removed for production)
    
    const { data: s1, error: sErr } = await supabase.auth.getSession();
    if (sErr) console.warn('getSession error:', sErr);
    
    token = s1?.session?.access_token;
    
    if (!token) {
      console.log('gv No session token; trying refresh...');
      const { data: s2, error: rErr } = await supabase.auth.refreshSession();
      if (rErr) console.warn('refreshSession error:', rErr);
      token = s2?.session?.access_token;
    }
    
    if (!token) {
      console.log('gv Still no valid session — user likely not logged in');
      return { posts: [] };
    }

    // JWT length check (token details removed for production)

    // Try edge function first with timeout, then fall back to direct database
    console.log('gv Trying edge function first...');
    
    try {
      // Add timeout for edge function call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout
      
      const res = await fetch(`${EDGE_BASE}/posts`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: publicAnonKey,
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const result = await res.json();
        console.log('gv Edge function success:', result?.posts?.length || 0, 'posts');
        return result;
      } else {
        console.log('gv Edge function failed, falling back to direct database');
        throw new Error(`Edge function failed: ${res.status}`);
      }
    } catch (edgeError) {
      if (edgeError.name === 'AbortError') {
        console.log('gv Edge function timed out, using direct database fallback');
      } else {
        console.log('gv Edge function error, using direct database fallback:', edgeError);
      }
    }
    
    // Fallback to direct database query with timeout protection
    console.log('gv Using direct database query as fallback');
    
    try {
      // Add timeout protection for database queries
      const queryTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );
      
      const postsQueryPromise = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          post_type,
          text_body,
          caption,
          media_url,
          media_thumb_url,
          visibility,
          tribe_id,
          like_count,
          comment_count,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(30); // Reduced limit for faster queries

      const { data: postsData, error: postsError } = await Promise.race([
        postsQueryPromise,
        queryTimeoutPromise
      ]);

      if (postsError) {
        console.error('gv Database query failed:', postsError);
        return { posts: [] };
      }

      if (!postsData || postsData.length === 0) {
        console.log('gv No posts found in database');
        return { posts: [] };
      }

      // Get user data for posts with timeout protection
      const userIds = [...new Set(postsData.map(post => post.user_id).filter(Boolean))];
      
      let userData = [];
      try {
        const userTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User query timeout')), 3000)
        );
        
        const userQueryPromise = supabase
          .from('profile')
          .select('id, username, avatar_url')
          .in('id', userIds);
          
        const userResult = await Promise.race([userQueryPromise, userTimeoutPromise]);
        userData = userResult.data || [];
      } catch (userError) {
        console.warn('gv User data query failed or timed out, continuing with post data only:', userError);
        userData = [];
      }

      // Create user lookup map
      const userMap = new Map();
      (userData || []).forEach(user => {
        userMap.set(user.id, user);
      });

      // Transform posts to expected format
      const transformedPosts = postsData.map((post) => {
        const postUser = userMap.get(post.user_id);
        
        return {
          id: post.id,
          user_id: post.user_id,
          userId: post.user_id,
          username: postUser?.username || 'unknown_user',
          nickname: postUser?.username || 'Unknown User',
          type: post.post_type || 'thought',
          post_type: post.post_type || 'thought',
          text_body: post.text_body,
          content: post.text_body || post.caption,
          caption: post.caption,
          media_url: post.media_url,
          contentUrl: post.media_url,
          imageUrl: post.media_url,
          media_thumb_url: post.media_thumb_url,
          thumbnail_url: post.media_thumb_url,
          visibility: post.visibility || 'public',
          tribe_id: post.tribe_id,
          likes: post.like_count || 0,
          like_count: post.like_count || 0,
          comments: post.comment_count || 0,
          comment_count: post.comment_count || 0,
          liked: false,
          bookmarked: false,
          created_at: post.created_at,
          createdAt: post.created_at
        };
      });

      console.log('gv Successfully fetched', transformedPosts.length, 'posts via direct database');
      return { posts: transformedPosts };
      
    } catch (dbError) {
      console.error('gv Direct database query failed:', dbError);
      return { posts: [] };
    }
    
  } catch (error) {
    console.error('gv We() function failed:', error);
    return { posts: [] }; // Return empty array instead of throwing
  }
}