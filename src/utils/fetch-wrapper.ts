// Fetch wrapper that handles edge function failures gracefully

export async function safeFetch(url: string, options?: RequestInit): Promise<Response | null> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    // In development, don't log fetch errors for edge functions as errors
    if (process.env.NODE_ENV === 'development') {
      const isEdgeFunction = url.includes('supabase.co/functions/v1');
      if (isEdgeFunction) {
        console.log('🚧 Edge function not available:', url);
        return null;
      }
    }
    
    // Re-throw other fetch errors
    throw error;
  }
}

export function createSafeFetch() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // Store original fetch
  const originalFetch = window.fetch;

  // Replace fetch with safe version for edge function URLs
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Check if this is an edge function call
    const isEdgeFunction = url.includes('supabase.co/functions/v1');
    
    if (isEdgeFunction) {
      try {
        return await originalFetch(input, init);
      } catch (error) {
        // Don't log edge function fetch errors as errors
        console.log('🚧 Development: Edge function call failed (expected during setup)');
        throw error;
      }
    }
    
    // Use original fetch for non-edge function URLs
    return originalFetch(input, init);
  };
}

export function restoreOriginalFetch() {
  // This would restore the original fetch if needed
  // For now, we'll keep it simple
}