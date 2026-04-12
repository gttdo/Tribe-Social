/**
 * Navigation helpers for Tribe Board routing with UUID support and reference resolution
 */

/**
 * Resolve a client reference or media URL to a proper post UUID
 * @param identifier - Can be a client_ref, media_url, filename, or already a UUID
 * @returns Promise<string | null> - The resolved UUID or null if not found
 */
export async function resolvePostReference(identifier: string): Promise<string | null> {
  if (!identifier) return null;
  
  // Clean any prefixes first
  const cleanId = identifier.replace(/^post[:_]/, '');
  
  // Check if it's already a valid UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (uuidPattern.test(cleanId)) {
    console.log('Already a valid UUID:', cleanId);
    return cleanId;
  }
  
  console.log('Resolving reference to UUID:', identifier);
  
  try {
    const { supabase } = await import('./supabase/client');
    
    // Option A: Try to resolve by client_ref
    console.log('Attempting to resolve by client_ref...');
    const { data: postByClientRef, error: clientRefError } = await supabase
      .from('posts')
      .select('id')
      .eq('client_ref', identifier)
      .maybeSingle();
    
    if (!clientRefError && postByClientRef?.id) {
      console.log('Resolved by client_ref:', postByClientRef.id);
      return postByClientRef.id;
    }
    
    // Option B: Try to resolve by media_url (for filenames or URLs)
    console.log('Attempting to resolve by media_url...');
    const { data: postByMediaUrl, error: mediaUrlError } = await supabase
      .from('posts')
      .select('id')
      .eq('media_url', identifier)
      .maybeSingle();
    
    if (!mediaUrlError && postByMediaUrl?.id) {
      console.log('Resolved by media_url:', postByMediaUrl.id);
      return postByMediaUrl.id;
    }
    
    // Option C: Try to resolve by partial media URL match (for filenames)
    console.log('Attempting to resolve by partial media_url match...');
    const { data: postsByPartialUrl, error: partialUrlError } = await supabase
      .from('posts')
      .select('id, media_url')
      .ilike('media_url', `%${identifier}%`)
      .limit(1);
    
    if (!partialUrlError && postsByPartialUrl && postsByPartialUrl.length > 0) {
      console.log('Resolved by partial media_url match:', postsByPartialUrl[0].id);
      return postsByPartialUrl[0].id;
    }
    
    // Option D: Try to resolve by thumbnail URL
    console.log('Attempting to resolve by media_thumb_url...');
    const { data: postByThumbUrl, error: thumbUrlError } = await supabase
      .from('posts')
      .select('id')
      .eq('media_thumb_url', identifier)
      .maybeSingle();
    
    if (!thumbUrlError && postByThumbUrl?.id) {
      console.log('Resolved by media_thumb_url:', postByThumbUrl.id);
      return postByThumbUrl.id;
    }
    
    console.log('Could not resolve reference to UUID:', identifier);
    return null;
    
  } catch (error) {
    console.error('Error resolving post reference:', error);
    return null;
  }
}

/**
 * Navigate to post comments using UUID or reference that gets resolved
 * Supports UUIDs, client_ref, media_url, and filenames
 */
export async function openComments(rawId: string): Promise<boolean> {
  if (!rawId) {
    console.error('No post identifier provided for navigation');
    return false;
  }
  
  console.log('Opening comments for identifier:', rawId);
  
  // First, try to resolve the reference to a UUID
  const resolvedUuid = await resolvePostReference(rawId);
  
  if (!resolvedUuid) {
    console.error('Could not resolve post identifier to UUID:', rawId);
    return false;
  }
  
  console.log('Navigating to post comments:', resolvedUuid);
  
  // Navigate to the post comments route with the resolved UUID
  window.history.pushState({}, '', `/post/${resolvedUuid}/comments`);
  
  // Trigger a popstate event to notify the URLRouter
  window.dispatchEvent(new PopStateEvent('popstate'));
  
  return true;
}

/**
 * Navigate to a user's saved posts
 */
export function openSavedPosts(userId: string) {
  console.log('Navigating to saved posts for user:', userId);
  window.history.pushState({}, '', `/users/${userId}/saved`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Navigate back to the main social feed
 */
export function navigateToSocialFeed() {
  console.log('Navigating back to social feed');
  window.history.pushState({}, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Extract post ID from DOM element data attributes
 */
export function getPostIdFromElement(element: HTMLElement | null): string | null {
  if (!element) return null;
  
  // Check for data-post-id attribute (preferred)
  const postId = element.dataset.postId;
  if (postId) {
    return postId.replace(/^post[:_]/, '');
  }
  
  // Fallback: check parent elements
  let parent = element.parentElement;
  while (parent) {
    const parentPostId = parent.dataset.postId;
    if (parentPostId) {
      return parentPostId.replace(/^post[:_]/, '');
    }
    parent = parent.parentElement;
  }
  
  return null;
}

/**
 * Handle comment button clicks from DOM events
 * Extracts post ID from data attributes and navigates appropriately
 */
export function handleCommentClick(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
  
  const postId = getPostIdFromElement(event.currentTarget);
  if (postId) {
    openComments(postId);
  } else {
    console.error('Could not extract post ID from comment button click');
  }
}

/**
 * Generate a shareable URL for a post (resolves references if needed)
 * @param postIdentifier - Can be UUID, client_ref, media_url, or filename
 * @param includeComments - Whether to include /comments in the URL
 * @returns Promise<string | null> - The shareable URL or null if post not found
 */
export async function getPostShareUrl(postIdentifier: string, includeComments: boolean = false): Promise<string | null> {
  const resolvedUuid = await resolvePostReference(postIdentifier);
  
  if (!resolvedUuid) {
    console.error('Could not resolve post identifier for sharing:', postIdentifier);
    return null;
  }
  
  const baseUrl = window.location.origin;
  
  if (includeComments) {
    return `${baseUrl}/post/${resolvedUuid}/comments`;
  } else {
    return `${baseUrl}/post/${resolvedUuid}`;
  }
}

/**
 * Legacy sync version of getPostShareUrl (only works with UUIDs)
 * @deprecated Use the async version instead for better reference resolution
 */
export function getPostShareUrlSync(postId: string, includeComments: boolean = false): string {
  const cleanId = postId.replace(/^post[:_]/, '');
  const baseUrl = window.location.origin;
  
  if (includeComments) {
    return `${baseUrl}/post/${cleanId}/comments`;
  } else {
    return `${baseUrl}/post/${cleanId}`;
  }
}

/**
 * Check if current URL is a post route
 */
export function isPostRoute(): boolean {
  const path = window.location.pathname;
  return path.startsWith('/post/');
}

/**
 * Check if current URL is a user route
 */
export function isUserRoute(): boolean {
  const path = window.location.pathname;
  return path.startsWith('/users/');
}

/**
 * Check if current URL should be handled by URLRouter
 */
export function isURLRoute(): boolean {
  return isPostRoute() || isUserRoute();
}

/**
 * Create a navigation shortcut after post creation
 * @param clientRef - The client reference or filename used during post creation
 * @param postUuid - The actual database UUID (if available)
 * @returns Promise<boolean> - Success of navigation
 */
export async function openCommentsAfterCreation(clientRef?: string, postUuid?: string): Promise<boolean> {
  // Prefer the UUID if provided
  if (postUuid) {
    console.log('Using provided UUID for post navigation:', postUuid);
    return await openComments(postUuid);
  }
  
  // Fallback to resolving the client reference
  if (clientRef) {
    console.log('Resolving client reference for post navigation:', clientRef);
    return await openComments(clientRef);
  }
  
  console.error('No post identifier provided for navigation after creation');
  return false;
}

/**
 * Batch resolve multiple post references to UUIDs
 * Useful for updating UI components that display multiple posts
 * @param identifiers - Array of client_refs, media_urls, filenames, or UUIDs
 * @returns Promise<Map<string, string | null>> - Map of original identifier to resolved UUID
 */
export async function batchResolvePostReferences(identifiers: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  
  // Process in parallel for better performance
  const promises = identifiers.map(async (identifier) => {
    const uuid = await resolvePostReference(identifier);
    return { identifier, uuid };
  });
  
  const resolvedResults = await Promise.all(promises);
  
  resolvedResults.forEach(({ identifier, uuid }) => {
    results.set(identifier, uuid);
  });
  
  console.log(`Batch resolved ${resolvedResults.length} post references:`, results);
  return results;
}