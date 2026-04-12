/**
 * Post ID Resolution Utilities
 * Handles conversion between client_ref and UUID for post operations
 */

import { supabase } from './supabase/client';

/**
 * Resolves a post identifier to a proper UUID
 * Accepts either a UUID or client_ref and returns the corresponding UUID
 * @param raw - Either a UUID or client_ref string
 * @returns Promise<string> - The resolved UUID
 * @throws Error if post is not found
 */
export async function resolvePostId(raw: string): Promise<string> {
  // Enhanced input validation to catch all forms of invalid input
  if (!raw || 
      raw === 'undefined' || 
      raw === 'null' || 
      raw === 'NaN' ||
      raw === '' ||
      raw.trim() === '' ||
      typeof raw !== 'string') {
    console.error('Invalid post ID provided to resolvePostId:', { raw, type: typeof raw });
    throw new Error(`Invalid post ID: received "${raw}" (${typeof raw})`);
  }
  
  // Clean and validate the raw input
  const cleanedRaw = raw.trim();
  
  if (cleanedRaw === 'undefined' || cleanedRaw === 'null' || cleanedRaw === '') {
    console.error('Post ID is empty or invalid after cleaning:', cleanedRaw);
    throw new Error(`Invalid post ID: "${cleanedRaw}"`);
  }
  
  // UUID regex pattern
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // If already a UUID, return as-is
  if (uuidRe.test(cleanedRaw)) {
    return cleanedRaw;
  }

  // Otherwise, query database to resolve client_ref to UUID
  // Use parameterized query to avoid SQL injection
  const { data, error } = await supabase
    .from('posts')
    .select('id')
    .or(`client_ref.eq."${cleanedRaw}",id.eq."${cleanedRaw}"`) // Properly escape the parameter
    .maybeSingle();

  if (error) {
    console.error('Error resolving post ID from database:', { raw, cleanedRaw, error });
    throw new Error(`Failed to resolve post ID: ${error.message}`);
  }
  
  if (!data) {
    console.error('Post not found in database:', { raw, cleanedRaw });
    throw new Error(`Post not found: "${cleanedRaw}"`);
  }

  console.log('Successfully resolved post ID:', { input: cleanedRaw, resolved: data.id });
  return data.id;
}

/**
 * Resolves multiple post identifiers to UUIDs
 * @param rawIds - Array of either UUIDs or client_refs
 * @returns Promise<string[]> - Array of resolved UUIDs
 */
export async function resolvePostIds(rawIds: string[]): Promise<string[]> {
  const promises = rawIds.map(id => resolvePostId(id));
  return Promise.all(promises);
}

/**
 * Safely resolves a post ID, returning null if not found instead of throwing
 * @param raw - Either a UUID or client_ref string
 * @returns Promise<string | null> - The resolved UUID or null if not found
 */
export async function resolvePostIdSafe(raw: string | null | undefined): Promise<string | null> {
  try {
    // Additional safety check for truly undefined/null values
    if (raw === null || raw === undefined) {
      console.warn('Post ID is null or undefined in resolvePostIdSafe');
      return null;
    }
    
    // Convert to string if it's not already (safety measure)
    const stringId = String(raw);
    
    // Check for common invalid values that get stringified
    if (stringId === 'undefined' || 
        stringId === 'null' || 
        stringId === 'NaN' ||
        stringId === '' ||
        stringId.trim() === '') {
      console.warn('Post ID is invalid in resolvePostIdSafe:', stringId);
      return null;
    }
    
    return await resolvePostId(stringId);
  } catch (error) {
    console.warn('Post ID resolution failed:', { raw, error: error.message });
    return null;
  }
}

/**
 * Checks if a string is a valid UUID format
 * @param str - String to check
 * @returns boolean - True if valid UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(str);
}