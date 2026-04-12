import { DatabaseUser } from './types.tsx';

// Helper functions for user management and data transformation
export function generateNickname(realm: string): string {
  const nicknames = {
    mirrorcore: ['Reflection Seeker', 'Mirror Walker', 'Echo Dreamer', 'Glass Soul', 'Prism Wanderer', 'Liquid Light', 'Fractal Being'],
    embercore: ['Flame Keeper', 'Spark Dancer', 'Fire Whisperer', 'Ember Heart', 'Phoenix Soul', 'Solar Mystic', 'Burning Star'],
    shadowcore: ['Night Wanderer', 'Shadow Weaver', 'Void Dancer', 'Dark Star', 'Lunar Mystic', 'Obsidian Soul', 'Cosmic Drifter']
  };
  return nicknames[realm]?.[Math.floor(Math.random() * nicknames[realm].length)] || 'Tribal Wanderer';
}

export function getRealmDescription(realm: string): string {
  const descriptions = {
    mirrorcore: 'You exist in the liminal space between reflections, where truth bends like light through glass. Your essence flows like liquid mercury, adapting and shifting with the cosmic tides of digital reality.',
    embercore: 'You carry the eternal flame within, a beacon that ignites transformation in the spaces between dreams. Your spirit burns with the intensity of a thousand suns, illuminating pathways through the void.',
    shadowcore: 'You find profound beauty in the depths that others fear to traverse. Your power emanates from the velvet darkness, where mysteries unfold like midnight flowers blooming in reverse time.'
  };
  return descriptions[realm] || 'A mysterious wanderer of the digital realms.';
}

export function dbUserToFrontend(dbUser: DatabaseUser) {
  return {
    id: dbUser.id,
    username: dbUser.username || 'unknown_user',
    email: dbUser.email,
    phone: dbUser.phone,
    coreRealm: dbUser.core_realm ? dbUser.core_realm.toLowerCase() : null,
    subRealm: dbUser.sub_realm,
    profileImageUrl: dbUser.profile_image_url,
    description: dbUser.description, // Use actual description from database
    xp: dbUser.xp || dbUser.xp_points || 0, // Use 'xp' field primarily, fallback to xp_points
    level: dbUser.level || 1,
    postCount: 0, // Not stored in user table, calculated separately
    likeCount: 0, // Not stored in user table, calculated separately  
    commentCount: 0, // Not stored in user table, calculated separately
    achievements: dbUser.achievement_ids || [],
    followerCount: dbUser.follower_count || 0,
    followingCount: dbUser.following_count || 0,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    // Add computed fields (keep realm-based description as fallback)
    nickname: dbUser.core_realm ? generateNickname(dbUser.core_realm.toLowerCase() as any) : null,
    realmDescription: dbUser.core_realm ? getRealmDescription(dbUser.core_realm.toLowerCase() as any) : null,
    badges: ['First Discovery', 'Realm Walker']
  };
}

export async function authenticateUser(request: Request) {
  try {
    if (!request || !request.headers) {
      console.log('Invalid request object - missing headers')
      return { user: null, error: 'Invalid request object' }
    }

    const authHeader = request.headers.get('Authorization')
    console.log('Auth header received:', authHeader ? `Bearer ${authHeader.split(' ')[1]?.substring(0, 20)}...` : 'None')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid authorization header format')
      return { user: null, error: 'Auth session missing!' }
    }

    const accessToken = authHeader.split(' ')[1]
    if (!accessToken) {
      console.log('No access token extracted from header')
      return { user: null, error: 'Auth session missing!' }
    }

    if (accessToken === 'undefined' || accessToken === 'null') {
      console.log('Token is undefined or null string')
      return { user: null, error: 'Auth session missing!' }
    }

    console.log('Attempting to authenticate user with token:', accessToken.substring(0, 20) + '...')
    console.log('Token length:', accessToken.length)
    
    // Validate token format (JWT should have 3 parts separated by dots)
    const tokenParts = accessToken.split('.')
    if (tokenParts.length !== 3) {
      console.log('Invalid JWT token format, parts:', tokenParts.length)
      return { user: null, error: 'Invalid token format' }
    }
    
    // Import Supabase client
    const { createClient } = await import('npm:@supabase/supabase-js');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken)
    
    if (error) {
      console.log('=== SUPABASE AUTH ERROR ===')
      console.log('Error type:', typeof error)
      console.log('Error message:', error.message)
      console.log('Error details:', error)
      console.log('==========================')
      return { user: null, error: `Auth error: ${error.message}` }
    }
    
    if (!user) {
      console.log('No user returned from Supabase auth.getUser')
      return { user: null, error: 'User not found for token' }
    }

    if (!user.id) {
      console.log('User object missing ID:', user)
      return { user: null, error: 'Invalid user data' }
    }

    console.log('Successfully authenticated user:', user.id, 'email:', user.email)
    return { user, error: null }
    
  } catch (authError) {
    console.log('=== AUTHENTICATION EXCEPTION ===')
    console.log('Exception type:', typeof authError)
    console.log('Exception message:', authError?.message || 'Unknown')
    console.log('Exception details:', authError)
    console.log('Exception stack:', authError?.stack)
    console.log('Request object type:', typeof request)
    console.log('Request has headers:', !!(request?.headers))
    console.log('================================')
    
    // Provide more specific error messages
    let errorMessage = 'Unknown authentication error';
    if (authError?.message?.includes('Cannot read properties')) {
      errorMessage = 'Invalid request format - missing required headers';
    } else if (authError?.message) {
      errorMessage = authError.message;
    }
    
    return { user: null, error: `Auth exception: ${errorMessage}` }
  }
}

// Helper function to check if user can view a post based on visibility and tribe membership (full version with KV store)
export async function canUserViewPostAsync(userId: string, post: any, kv: any): Promise<boolean> {
  // Public posts are always viewable
  if (post.realm === 'public' || !post.realm) {
    return true
  }
  
  // User's own posts are always viewable
  if (post.userId === userId) {
    return true
  }
  
  // For tribe posts, check if user is member of the tribe
  if (post.realm && post.realm !== 'public') {
    try {
      // Check user's tribe memberships in KV store
      const userTribeMemberships = await kv.get(`user:${userId}:tribes`) || []
      
      // If user is member of the tribe, they can view the post
      if (userTribeMemberships.includes(post.realm)) {
        return true
      }
      
      // If not a member, check if the tribe is public (fallback)
      const tribeData = await kv.get(`tribe:${post.realm}`)
      if (tribeData && tribeData.isPublic) {
        return true
      }
      
      return false // Private tribe and user is not a member
    } catch (error) {
      console.warn('Error checking tribe membership:', error)
      return false // Err on the side of caution
    }
  }
  
  return false // Default to not viewable
}

// Simple version for post database records - used in endpoints
export function canUserViewPost(userId: string, postData: any): boolean {
  // Public posts are always viewable
  if (!postData.visibility || postData.visibility === 'public') {
    return true;
  }
  
  // User's own posts are always viewable
  if (postData.user_id === userId) {
    return true;
  }
  
  // For now, allow viewing of tribe posts (more complex logic can be added later)
  if (postData.visibility === 'tribe') {
    return true; // TODO: Add proper tribe membership checking
  }
  
  // Private posts can only be viewed by the owner
  if (postData.visibility === 'private') {
    return postData.user_id === userId;
  }
  
  return false; // Default to not viewable
}

// Helper function to get keys matching a prefix pattern
export async function getKeysByPattern(kv: any, pattern: string): Promise<string[]> {
  try {
    const results = await kv.getByPrefix(pattern)
    
    if (!Array.isArray(results)) {
      console.warn('getByPrefix did not return array:', typeof results, results)
      return []
    }
    
    return results
      .filter((item: any) => item && typeof item.key === 'string')
      .map((item: any) => item.key)
  } catch (error) {
    console.warn('Error getting keys by pattern:', pattern, error)
    return []
  }
}