/**
 * Optimized Server-side Post ID Resolution Utilities
 * Centralized ID resolution with caching, batch operations, and robust validation
 */

import { createClient } from 'npm:@supabase/supabase-js';

// Initialize Supabase client for database operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Small in-memory cache for resolved IDs (LRU with max 100 entries)
const idCache = new Map<string, { id: string; timestamp: number }>();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * UUID validation regex - stricter validation
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Cleans and validates raw input, removing common invalid patterns
 */
function cleanRawInput(raw: any): string | null {
  if (raw === null || raw === undefined) return null;
  
  const str = String(raw).trim();
  
  // Check for literal undefined/null/NaN/empty strings
  if (str === '' || str === 'undefined' || str === 'null' || str === 'NaN') {
    return null;
  }
  
  return str;
}

/**
 * Checks if a string is a valid UUID format
 * @param str - String to check
 * @returns boolean - True if valid UUID format
 */
export function isValidUUID(str: string): boolean {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

/**
 * Resolves a post identifier to a proper UUID on the server
 * Accepts either a UUID or client_ref and returns the corresponding UUID
 * @param raw - Either a UUID or client_ref string
 * @returns Promise<string> - The resolved UUID
 * @throws Error if post is not found or input is invalid
 */
export async function resolvePostId(raw: string): Promise<string> {
  const cleaned = cleanRawInput(raw);
  if (!cleaned) {
    throw new Error(`Invalid post ID: received "${raw}" (${typeof raw})`);
  }
  
  // If already a valid UUID, return as-is (with existence verification)
  if (isValidUUID(cleaned)) {
    // Check cache first
    const cached = idCache.get(cleaned);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.id;
    }
    
    // Verify UUID exists in database
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('id', cleaned)
      .maybeSingle();
    
    if (error) {
      throw new Error(`Database error verifying post ID: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Post not found: "${cleaned}"`);
    }
    
    // Cache the result
    updateCache(cleaned, data.id);
    return data.id;
  }

  // Check cache for client_ref resolution
  const cacheKey = `ref:${cleaned}`;
  const cached = idCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.id;
  }

  // Query database to resolve client_ref to UUID
  const { data, error } = await supabase
    .from('posts')
    .select('id')
    .eq('client_ref', cleaned)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve post ID: ${error.message}`);
  }
  
  if (!data) {
    throw new Error(`Post not found: "${cleaned}"`);
  }

  // Cache the result
  updateCache(cacheKey, data.id);
  updateCache(data.id, data.id); // Also cache the UUID itself
  
  return data.id;
}

/**
 * Safely resolves a post ID, returning null if not found instead of throwing
 * @param raw - Either a UUID or client_ref string
 * @returns Promise<string | null> - The resolved UUID or null if not found
 */
export async function resolvePostIdSafe(raw: string | null | undefined): Promise<string | null> {
  try {
    const cleaned = cleanRawInput(raw);
    if (!cleaned) return null;
    
    return await resolvePostId(cleaned);
  } catch (error) {
    console.warn('Post ID resolution failed:', { raw, error: error.message });
    return null;
  }
}

/**
 * Resolves multiple post identifiers to UUIDs (batch operation)
 * @param rawIds - Array of either UUIDs or client_refs
 * @returns Promise<string[]> - Array of resolved UUIDs
 */
export async function resolvePostIds(rawIds: string[]): Promise<string[]> {
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return [];
  }
  
  // Filter and clean inputs
  const cleanedIds = rawIds
    .map(cleanRawInput)
    .filter(Boolean) as string[];
  
  if (cleanedIds.length === 0) return [];
  
  // Separate UUIDs from client_refs
  const uuids: string[] = [];
  const clientRefs: string[] = [];
  const results: string[] = [];
  const indexMap = new Map<string, number>();
  
  for (let i = 0; i < cleanedIds.length; i++) {
    const id = cleanedIds[i];
    indexMap.set(id, i);
    
    // Check cache first
    const cached = idCache.get(isValidUUID(id) ? id : `ref:${id}`);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      results[i] = cached.id;
      continue;
    }
    
    if (isValidUUID(id)) {
      uuids.push(id);
    } else {
      clientRefs.push(id);
    }
  }
  
  // Batch query for UUIDs (verify existence)
  if (uuids.length > 0) {
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .in('id', uuids);
    
    if (!error && data) {
      for (const post of data) {
        const index = indexMap.get(post.id);
        if (index !== undefined) {
          results[index] = post.id;
          updateCache(post.id, post.id);
        }
      }
    }
  }
  
  // Batch query for client_refs
  if (clientRefs.length > 0) {
    const { data, error } = await supabase
      .from('posts')
      .select('id, client_ref')
      .in('client_ref', clientRefs);
    
    if (!error && data) {
      for (const post of data) {
        if (post.client_ref) {
          const index = indexMap.get(post.client_ref);
          if (index !== undefined) {
            results[index] = post.id;
            updateCache(`ref:${post.client_ref}`, post.id);
            updateCache(post.id, post.id);
          }
        }
      }
    }
  }
  
  // Filter out any undefined results
  return results.filter(Boolean);
}

/**
 * Updates the in-memory cache with LRU eviction
 */
function updateCache(key: string, id: string): void {
  // Implement simple LRU: if at capacity, remove oldest entry
  if (idCache.size >= CACHE_MAX_SIZE) {
    let oldestKey: string = '';
    let oldestTimestamp = Date.now();
    
    for (const [k, v] of idCache.entries()) {
      if (v.timestamp < oldestTimestamp) {
        oldestTimestamp = v.timestamp;
        oldestKey = k;
      }
    }
    
    if (oldestKey) {
      idCache.delete(oldestKey);
    }
  }
  
  idCache.set(key, { id, timestamp: Date.now() });
}

/**
 * Clears the ID resolution cache (useful for testing)
 */
export function clearCache(): void {
  idCache.clear();
}