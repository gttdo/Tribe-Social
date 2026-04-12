/**
 * UUID validation utilities
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => {
  return typeof v === 'string' && UUID_RE.test(v);
};

/**
 * Validates if a value is a valid UUID, with extensive logging for debugging
 */
export function isValidUUID(value: unknown, context?: string): value is string {
  const logPrefix = context ? `[UUID Validation - ${context}]` : '[UUID Validation]';
  
  if (value === undefined) {
    console.warn(`${logPrefix} Received undefined value`);
    return false;
  }
  
  if (value === null) {
    console.warn(`${logPrefix} Received null value`);
    return false;
  }
  
  if (typeof value !== 'string') {
    console.warn(`${logPrefix} Received non-string value:`, typeof value, value);
    return false;
  }
  
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') {
    console.warn(`${logPrefix} Received invalid string value:`, trimmed);
    return false;
  }
  
  const isValid = UUID_RE.test(trimmed);
  if (!isValid) {
    console.warn(`${logPrefix} Invalid UUID format:`, trimmed);
  }
  
  return isValid;
}

/**
 * Guards a UUID value and returns it only if valid
 */
export function guardUUID(value: unknown, context?: string): string | null {
  if (isValidUUID(value, context)) {
    return value;
  }
  return null;
}

/**
 * Profile data loader with proper UUID validation
 */
export async function loadProfilePosts({ 
  userId, 
  username 
}: {
  userId?: string; 
  username?: string;
}) {
  let id = userId;

  // If we got a username route like /u/:username, resolve it once:
  if (!isUuid(id) && username) {
    try {
      const { supabase } = await import('./supabase/client');
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      id = data?.id;
    } catch (error) {
      console.error('Failed to resolve username to UUID:', error);
      return [];
    }
  }

  if (!isUuid(id)) {
    console.warn('[profile] Skip posts fetch – invalid user id:', id);
    return [];
  }

  try {
    const { supabase } = await import('./supabase/client');
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        post_type,
        text_body,
        caption,
        visibility,
        tribe_id,
        created_at,
        user_id,
        media_url,
        media_thumb_url,
        users!inner(username)
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('Failed to load profile posts:', error);
    return [];
  }
}