import { 
  Story, 
  StoryGroup, 
  StoryView, 
  StoryReaction, 
  CreateStoryRequest, 
  StoryCreateResponse,
  StoryViewRequest,
  StoryReactionRequest,
  STORY_CONSTANTS 
} from './story-types';

/**
 * Upload story media file and get URL
 */
export async function uploadStoryMedia(file: File, userId: string): Promise<string> {
  try {
    // Import Supabase client
    const { supabase } = await import('./supabase/client');
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    // Upload to media bucket (matching the server bucket name)
    const { STORAGE_BUCKETS } = await import('./storage-constants');
    const bucket = supabase.storage.from(STORAGE_BUCKETS.MEDIA);
    const { data, error } = await bucket.upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
    
    if (error) {
      console.error('Story media upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = bucket.getPublicUrl(data.path);
    
    return publicUrl;
    
  } catch (error) {
    console.error('Story media upload error:', error);
    throw error;
  }
}

/**
 * Create a new story
 */
export async function createStory(request: CreateStoryRequest): Promise<StoryCreateResponse> {
  try {
    console.log('Creating story:', request);
    
    // Validate file size
    if (request.media_file.size > STORY_CONSTANTS.MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File size exceeds maximum allowed (50MB)'
      };
    }
    
    // Validate file type
    const isValidImage = STORY_CONSTANTS.SUPPORTED_IMAGE_TYPES.includes(request.media_file.type);
    const isValidVideo = STORY_CONSTANTS.SUPPORTED_VIDEO_TYPES.includes(request.media_file.type);
    
    if (!isValidImage && !isValidVideo) {
      return {
        success: false,
        error: 'Unsupported file type. Please use JPEG, PNG, WebP, MP4, or WebM files.'
      };
    }
    
    // Validate caption length
    if (request.caption && request.caption.length > STORY_CONSTANTS.MAX_CAPTION_LENGTH) {
      return {
        success: false,
        error: `Caption too long. Maximum ${STORY_CONSTANTS.MAX_CAPTION_LENGTH} characters.`
      };
    }
    
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to create stories'
      };
    }
    
    // Upload media file
    console.log('Uploading story media...');
    const mediaUrl = await uploadStoryMedia(request.media_file, session.user.id);
    
    // Get media dimensions for images/videos if possible
    let mediaWidth: number | null = null;
    let mediaHeight: number | null = null;
    let durationSeconds: number | null = null;
    
    if (request.media_type === 'image') {
      try {
        const dimensions = await getImageDimensions(request.media_file);
        mediaWidth = dimensions.width;
        mediaHeight = dimensions.height;
      } catch (error) {
        console.warn('Could not get image dimensions:', error);
      }
    }
    
    // Prepare story data for insertion
    const storyData: any = {
      user_id: session.user.id,
      tribe_id: request.tribe_id || null,
      media_url: mediaUrl,
      caption: request.caption || null,
      expires_at: new Date(Date.now() + (STORY_CONSTANTS.EXPIRY_HOURS * 60 * 60 * 1000)).toISOString()
    };
    
    // Add media_type field if the request includes it
    if (request.media_type) {
      storyData.media_type = request.media_type;
    }
    
    // Insert story into database
    console.log('Creating story record...');
    
    try {
      // First try to create the story without joins to avoid policy issues
      const { data: basicStory, error: insertError } = await supabase
        .from('stories')
        .insert(storyData)
        .select('*')
        .single();

      if (insertError) {
        console.error('Story creation error:', insertError);
        
        // Check if this is a table/column not found error
        if (insertError.code === '42703' || insertError.code === 'PGRST116' || insertError.code === 'PGRST205' ||
            insertError.message.includes('does not exist') || 
            insertError.message.includes('Could not find the table')) {
          return {
            success: false,
            error: 'Stories feature is not yet available. Database tables are being set up.'
          };
        }
        
        return {
          success: false,
          error: `Failed to create story: ${insertError.message}`
        };
      }

      console.log('Story created successfully:', basicStory);

      // Try to fetch related data separately to avoid policy recursion
      let userData = null;
      let tribeData = null;

      // Fetch user data
      try {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, username, nickname')
          .eq('id', session.user.id)
          .single();
        
        if (!userError && user) {
          userData = user;
        }
      } catch (userFetchError) {
        console.warn('Could not fetch user data for story:', userFetchError);
      }

      // Fetch tribe data if story has tribe_id
      if (basicStory.tribe_id) {
        try {
          const { data: tribe, error: tribeError } = await supabase
            .from('tribes')
            .select('id, name')
            .eq('id', basicStory.tribe_id)
            .single();
          
          if (tribeError) {
            // Check for infinite recursion policy error
            if (tribeError.code === '42P17' || tribeError.message?.includes('infinite recursion')) {
              console.warn('Database policy recursion detected for tribes table during story creation - skipping tribe data');
            } else {
              console.warn('Could not fetch tribe data for story:', tribeError);
            }
          } else if (tribe) {
            tribeData = tribe;
          }
        } catch (tribeFetchError) {
          console.warn('Exception while fetching tribe data for story:', tribeFetchError);
        }
      }

      // Map the story data to expected structure for consistency
      const storyWithMappedData = {
        ...basicStory,
        author: userData,  // Map users to author (may be null)
        tribe: tribeData   // Map tribes to tribe (may be null)
      };
      
      return {
        success: true,
        story: storyWithMappedData
      };
      
    } catch (dbError) {
      console.error('Database error during story creation:', dbError);
      
      // Check if this is a table not found error
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      if (errorMessage.includes('PGRST205') || 
          errorMessage.includes('Could not find the table') ||
          errorMessage.includes('does not exist')) {
        return {
          success: false,
          error: 'Stories feature is not yet available. Database tables are being set up.'
        };
      }
      
      return {
        success: false,
        error: `Database error: ${errorMessage}`
      };
    }
    
  } catch (error) {
    console.error('Story creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create story'
    };
  }
}

/**
 * Get image dimensions from file
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get active stories grouped by user/tribe
 */
export async function getActiveStoryGroups(): Promise<StoryGroup[]> {
  try {
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return [];
    }
    
    // First, check if the stories table exists by trying a simple query
    try {
      // Get all active stories (not expired) with basic data first
      // Try with all columns first, fall back to minimal if needed
      let stories, error;
      
      // First attempt with all expected columns
      try {
        const { data, error: initialError } = await supabase
          .from('stories')
          .select(`
            id,
            created_at,
            user_id,
            tribe_id,
            media_type,
            caption,
            media_url,
            expires_at
          `)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        
        stories = data;
        error = initialError;
      } catch (columnError) {
        console.warn('Some story columns may not exist, trying with minimal columns:', columnError);
        
        // Fallback to essential columns only
        const { data, error: fallbackError } = await supabase
          .from('stories')
          .select(`
            id,
            created_at,
            user_id,
            tribe_id,
            media_type,
            caption,
            media_url,
            expires_at
          `)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        
        stories = data;
        error = fallbackError;
      }
      
      if (error) {
        console.error('Error fetching stories:', error);
        
        // Log telemetry for debugging policy issues
        if (error.code === '42501') {
          console.error('🔒 TELEMETRY: Policy error (insufficient_privilege) on stories table:', {
            code: error.code,
            table: 'stories',
            message: error.message,
            timestamp: new Date().toISOString()
          });
        } else if (error.code === '42P17' || error.message?.includes('infinite recursion')) {
          console.error('🔄 TELEMETRY: Infinite recursion policy error on stories table:', {
            code: error.code,
            table: 'stories', 
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
        
        // Check if this is a table/column not found error
        if (error.code === '42703' || error.code === 'PGRST116' || error.code === 'PGRST205' ||
            error.message.includes('does not exist') || 
            error.message.includes('Could not find the table')) {
          console.log('Stories table or columns not found - this is normal for new databases');
          return [];
        }
        
        // For other errors, still return empty array to avoid breaking the app
        return [];
      }
      
      if (!stories || stories.length === 0) {
        return [];
      }
      
      // Client-side filtering for expired stories (additional safety check)
      const now = new Date();
      const validStories = stories.filter(story => {
        try {
          const expiresAt = new Date(story.expires_at);
          return expiresAt > now;
        } catch (dateError) {
          console.warn('Invalid expires_at date in story:', story.id, story.expires_at);
          return false; // Filter out stories with invalid dates
        }
      });
      
      if (validStories.length === 0) {
        return [];
      }
      
      // Separate stories that might have permission issues
      const accessibleStories: any[] = [];
      const permissionDeniedStories: any[] = [];
      
      // Process each story to check for permission errors
      for (const story of validStories) {
        try {
          // If story belongs to a tribe, it might have visibility restrictions
          if (story.tribe_id) {
            // Check if we can access this story based on visibility
            // For now, assume tribe stories might be restricted
            accessibleStories.push(story);
          } else {
            // Personal stories should be accessible if we can see them in the query
            accessibleStories.push(story);
          }
        } catch (storyError) {
          const errorMessage = storyError instanceof Error ? storyError.message : String(storyError);
          if (errorMessage.includes('42501') || errorMessage.includes('permission denied')) {
            // This story has permission restrictions - create a blurred version
            console.log(`Story ${story.id} has permission restrictions, creating blurred version`);
            const blurredStory = {
              ...story,
              hasPermissionError: true,
              visibility: 'tribe', // Mark as tribe-only for blur overlay
              caption: story.caption ? story.caption.substring(0, 30) + '...' : '',
              media_url: story.media_url // Keep URL for blur overlay background
            };
            permissionDeniedStories.push(blurredStory);
          } else {
            console.warn('Error processing story:', story.id, storyError);
            // Skip this story
          }
        }
      }
      
      // Combine accessible and permission-denied stories
      const allStories = [...accessibleStories, ...permissionDeniedStories];
      
      // Get unique user IDs and tribe IDs for separate queries
      const userIds = [...new Set(allStories.map(s => s.user_id))];
      const tribeIds = [...new Set(allStories.map(s => s.tribe_id).filter(Boolean))];
      
      // Fetch user data separately with error handling
      let users: any[] = [];
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, username, nickname, avatar_url')
          .in('id', userIds);
        
        if (userError) {
          console.error('Error fetching user data:', userError);
          
          // Log telemetry for policy issues
          if (userError.code === '42501') {
            console.error('🔒 TELEMETRY: Policy error (insufficient_privilege) on users table:', {
              code: userError.code,
              table: 'users',
              message: userError.message,
              timestamp: new Date().toISOString()
            });
          }
          
          // Continue without user data - we'll show fallback states
        } else if (userData) {
          users = userData;
        }
      } catch (userFetchError) {
        console.error('Exception while fetching user data:', userFetchError);
        // Continue without user data
      }
      
      // Fetch tribe data separately if there are tribes - with enhanced error handling
      let tribes: any[] = [];
      const privateTribes = new Set<string>(); // Track which tribes are private/locked
      
      if (tribeIds.length > 0) {
        try {
          const { data: tribeData, error: tribeError } = await supabase
            .from('tribes')
            .select('id, name, avatar_url')
            .in('id', tribeIds);
          
          if (tribeError) {
            // Log telemetry for debugging policy issues
            if (tribeError.code === '42501') {
              console.error('🔒 TELEMETRY: Policy error (insufficient_privilege) on tribes table:', {
                code: tribeError.code,
                table: 'tribes',
                message: tribeError.message,
                tribeIds: tribeIds,
                timestamp: new Date().toISOString()
              });
              
              // Mark all queried tribes as private since we can't access them
              tribeIds.forEach(id => privateTribes.add(id));
              
            } else if (tribeError.code === '42P17' || tribeError.message?.includes('infinite recursion')) {
              console.error('🔄 TELEMETRY: Infinite recursion policy error on tribes table:', {
                code: tribeError.code,
                table: 'tribes',
                message: tribeError.message,
                tribeIds: tribeIds,
                timestamp: new Date().toISOString()
              });
              
              // Mark all queried tribes as private due to policy error
              tribeIds.forEach(id => privateTribes.add(id));
              
            } else {
              console.error('Other tribe fetching error:', tribeError);
              // For other errors, still try to continue
            }
          } else if (tribeData) {
            tribes = tribeData;
          }
        } catch (tribeError) {
          console.error('Exception while fetching tribe data:', tribeError);
          
          // Log telemetry for debugging
          console.error('🚨 TELEMETRY: Exception on tribes table access:', {
            error: tribeError instanceof Error ? tribeError.message : String(tribeError),
            table: 'tribes',
            tribeIds: tribeIds,
            timestamp: new Date().toISOString()
          });
          
          // Mark all tribes as private due to access error
          tribeIds.forEach(id => privateTribes.add(id));
        }
      }
      
      // Fetch story views for the current user with error handling
      let views: any[] = [];
      const storyIds = allStories.map(s => s.id);
      
      try {
        const { data: viewData, error: viewError } = await supabase
          .from('story_views')
          .select('story_id, user_id')
          .in('story_id', storyIds)
          .eq('user_id', session.user.id);
        
        if (viewError) {
          console.warn('Error fetching story views:', viewError);
          
          // Log telemetry for policy issues
          if (viewError.code === '42501') {
            console.error('🔒 TELEMETRY: Policy error (insufficient_privilege) on story_views table:', {
              code: viewError.code,
              table: 'story_views',
              message: viewError.message,
              timestamp: new Date().toISOString()
            });
          }
        } else if (viewData) {
          views = viewData;
        }
      } catch (viewFetchError) {
        console.warn('Exception while fetching story views:', viewFetchError);
      }
      
      // Create lookup maps
      const userMap = new Map(users?.map(u => [u.id, u]) || []);
      const tribeMap = new Map(tribes.map(t => [t.id, t]));
      const viewMap = new Set(views?.map(v => v.story_id) || []);
      
      // Group stories by user_id and tribe_id combination
      const groupMap = new Map<string, StoryGroup>();
      
      allStories.forEach((story) => {
        try {
          const groupKey = `${story.user_id}-${story.tribe_id || 'personal'}`;
          const user = userMap.get(story.user_id);
          let tribe = story.tribe_id ? tribeMap.get(story.tribe_id) : null;
          const hasViewed = viewMap.has(story.id);
          
          // Handle private/locked tribes - show fallback state
          if (story.tribe_id && privateTribes.has(story.tribe_id)) {
            tribe = {
              id: story.tribe_id,
              name: 'Private Tribe',
              avatar_url: null,
              is_private: true // Flag to indicate this is a fallback
            };
          }
          
          // Handle missing user data - show fallback state
          let displayUser = user;
          if (!user) {
            displayUser = {
              id: story.user_id,
              username: 'Private User',
              nickname: 'Private User',
              avatar_url: null,
              is_private: true // Flag to indicate this is a fallback
            };
          }
          
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
              user_id: story.user_id,
              user: displayUser,
              tribe_id: story.tribe_id,
              tribe: tribe,
              stories: [],
              has_new_stories: !hasViewed,
              latest_story_time: story.created_at
            });
          }
          
          const group = groupMap.get(groupKey)!;
          group.stories.push({
            ...story,
            // Ensure media_type is properly mapped from the database
            media_type: (story as any).media_type || 'image',
            author: displayUser, // Map user to author for consistency
            tribe: tribe, // Map tribe to tribe for consistency
            has_viewed: hasViewed
          });
          
          // Update has_new_stories flag
          if (!hasViewed) {
            group.has_new_stories = true;
          }
          
          // Update latest story time if this is newer
          if (new Date(story.created_at) > new Date(group.latest_story_time)) {
            group.latest_story_time = story.created_at;
          }
        } catch (storyProcessError) {
          console.warn('Error processing story in group:', story.id, storyProcessError);
          // Skip this story but continue with others
        }
      });
      
      // Convert to array and sort by latest story time
      const groups = Array.from(groupMap.values()).sort((a, b) => 
        new Date(b.latest_story_time).getTime() - new Date(a.latest_story_time).getTime()
      );
      
      // Sort stories within each group by creation time and filter out any that couldn't be processed
      groups.forEach(group => {
        group.stories = group.stories.filter(story => {
          try {
            // Additional client-side validation
            if (!story.id || !story.created_at || !story.expires_at) {
              console.warn('Story missing required fields:', story.id);
              return false;
            }
            
            // Double-check expiration
            const expiresAt = new Date(story.expires_at);
            if (expiresAt <= now) {
              console.log('Filtering out expired story:', story.id);
              return false;
            }
            
            return true;
          } catch (validationError) {
            console.warn('Story validation error:', story.id, validationError);
            return false;
          }
        }).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      
      // Remove groups with no valid stories
      const validGroups = groups.filter(group => group.stories.length > 0);
      
      return validGroups;
      
    } catch (tableError) {
      console.error('Stories table access error:', tableError);
      
      // Log telemetry for debugging
      console.error('🚨 TELEMETRY: Stories table access exception:', {
        error: tableError instanceof Error ? tableError.message : String(tableError),
        table: 'stories',
        timestamp: new Date().toISOString()
      });
      
      // Check if this is a table not found error
      const errorMessage = tableError instanceof Error ? tableError.message : String(tableError);
      if (errorMessage.includes('PGRST205') || 
          errorMessage.includes('Could not find the table') ||
          errorMessage.includes('does not exist')) {
        console.log('Stories table not found - this is normal for new databases');
      }
      
      return [];
    }
    
  } catch (error) {
    console.error('Error getting story groups:', error);
    
    // Log telemetry for top-level errors
    console.error('🚨 TELEMETRY: Top-level story groups error:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    
    return [];
  }
}

/**
 * Mark story as viewed
 */
export async function markStoryAsViewed(request: StoryViewRequest): Promise<boolean> {
  try {
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return false;
    }
    
    // Insert view record (upsert in case user views same story multiple times)
    const { error } = await supabase
      .from('story_views')
      .upsert({
        story_id: request.story_id,
        user_id: session.user.id
      }, {
        onConflict: 'story_id,user_id'
      });
    
    if (error) {
      console.error('Error marking story as viewed:', error);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error marking story as viewed:', error);
    return false;
  }
}

/**
 * Add reaction to story
 */
export async function addStoryReaction(request: StoryReactionRequest): Promise<boolean> {
  try {
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return false;
    }
    
    // Insert reaction (upsert to update existing reaction)
    const { error } = await supabase
      .from('story_reactions')
      .upsert({
        story_id: request.story_id,
        user_id: session.user.id,
        reaction_type: request.reaction
      }, {
        onConflict: 'story_id,user_id'
      });
    
    if (error) {
      console.error('Error adding story reaction:', error);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error adding story reaction:', error);
    return false;
  }
}

/**
 * Remove reaction from story
 */
export async function removeStoryReaction(request: StoryReactionRequest): Promise<boolean> {
  try {
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return false;
    }
    
    const { error } = await supabase
      .from('story_reactions')
      .delete()
      .eq('story_id', request.story_id)
      .eq('user_id', session.user.id)
      .eq('reaction_type', request.reaction);
    
    if (error) {
      console.error('Error removing story reaction:', error);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error removing story reaction:', error);
    return false;
  }
}

/**
 * Get story views for a specific story
 */
export async function getStoryViews(storyId: string): Promise<StoryView[]> {
  try {
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return [];
    }
    
    // Get story views with basic data first
    const { data: views, error } = await supabase
      .from('story_views')
      .select('id, created_at, story_id, user_id, viewed_at')
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false });
    
    if (error) {
      console.error('Error getting story views:', error);
      return [];
    }
    
    if (!views || views.length === 0) {
      return [];
    }
    
    // Get user data separately
    const userIds = [...new Set(views.map(v => v.user_id))];
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, username, nickname')
      .in('id', userIds);
    
    if (userError) {
      console.error('Error fetching user data for story views:', userError);
      return [];
    }
    
    // Create user lookup map
    const userMap = new Map(users?.map(u => [u.id, u]) || []);
    
    // Map the data to expected structure
    const mappedData = views.map(view => ({
      ...view,
      viewer: userMap.get(view.user_id)  // Map user data to viewer
    }));
    
    return mappedData;
    
  } catch (error) {
    console.error('Error getting story views:', error);
    return [];
  }
}

/**
 * Get story reactions for a specific story
 */
export async function getStoryReactions(storyId: string): Promise<StoryReaction[]> {
  try {
    const { supabase } = await import('./supabase/client');
    
    // Get story reactions with basic data first
    const { data: reactions, error } = await supabase
      .from('story_reactions')
      .select('id, created_at, story_id, user_id, reaction_type')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting story reactions:', error);
      return [];
    }
    
    if (!reactions || reactions.length === 0) {
      return [];
    }
    
    // Get user data separately
    const userIds = [...new Set(reactions.map(r => r.user_id))];
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, username, nickname')
      .in('id', userIds);
    
    if (userError) {
      console.error('Error fetching user data for story reactions:', userError);
      return [];
    }
    
    // Create user lookup map
    const userMap = new Map(users?.map(u => [u.id, u]) || []);
    
    // Map the data to expected structure
    const mappedData = reactions.map(reaction => ({
      ...reaction,
      user: userMap.get(reaction.user_id)  // Map user data to user
    }));
    
    return mappedData;
    
  } catch (error) {
    console.error('Error getting story reactions:', error);
    return [];
  }
}

/**
 * Delete a story (only by author)
 */
export async function deleteStory(storyId: string): Promise<boolean> {
  try {
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return false;
    }
    
    // Delete story (RLS policy ensures only author can delete)
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', session.user.id);
    
    if (error) {
      console.error('Error deleting story:', error);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error deleting story:', error);
    return false;
  }
}

/**
 * Clean up expired stories (utility function)
 */
export async function cleanupExpiredStories(): Promise<number> {
  try {
    const { supabase } = await import('./supabase/client');
    
    const { data, error } = await supabase
      .from('stories')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');
    
    if (error) {
      console.error('Error cleaning up expired stories:', error);
      return 0;
    }
    
    return data?.length || 0;
    
  } catch (error) {
    console.error('Error cleaning up expired stories:', error);
    return 0;
  }
}

/**
 * Test database structure and log story keys (for debugging)
 */
export async function testStoryDatabaseStructure(): Promise<void> {
  try {
    const { supabase } = await import('./supabase/client');
    
    console.log('Testing story database structure...');
    
    // Try to fetch one story to check the structure
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
      console.error('Error testing story structure:', error);
      return;
    }
    
    if (data) {
      console.log('Story data keys found:', Object.keys(data));
      console.log('Sample story data:', data);
      
      // Check for media_type specifically
      if ('media_type' in data) {
        console.log('�� media_type column found with value:', data.media_type);
      } else {
        console.warn('❌ media_type column not found in story data');
      }
      
      // Check if legacy 'type' column exists
      if ('type' in data) {
        console.warn('⚠️ Legacy \"type\" column still exists:', data.type);
      }
    } else {
      console.log('No stories found in database, cannot test structure');
    }
    
  } catch (error) {
    console.error('Error testing story database structure:', error);
  }
}

// Add a global function for easy testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testStoryDatabase = testStoryDatabaseStructure;
}