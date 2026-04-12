// Error suppression utilities for development mode
// This helps reduce console noise during development when edge functions aren't deployed

export function setupDevelopmentErrorSuppression() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // Override console.error to suppress edge function errors
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Suppress specific error patterns from edge functions
    if (message.includes('💥 callFn error: TypeError: Failed to fetch') ||
        message.includes('❌ getFeed failed: TypeError: Failed to fetch') ||
        message.includes('💥 edgeGet error: TypeError: Failed to fetch') ||
        message.includes('Error fetching posts via Edge API: TypeError: Failed to fetch') ||
        message.includes('Failed to get unread count: TypeError: Failed to fetch') ||
        message.includes('Server API failed: TypeError: Failed to fetch')) {
      // Don't log these expected errors
      return;
    }
    
    // Log other errors normally
    originalError.apply(console, args);
  };

  // Handle global unhandled rejections that might be from fetch
  const originalUnhandledRejection = window.onunhandledrejection;
  
  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;
    const message = error?.message || error?.toString() || '';
    
    // Check if this is a fetch error from edge functions
    const isFetchError = /Failed to fetch|fetch.*error|network.*error|ERR_FAILED|ERR_NETWORK|TypeError: Failed to fetch/i.test(message);
    const isEdgeContext = /edge|supabase|function|api|callFn|getFeed|getUnreadCount|edgeGet/i.test(error?.stack || '');
    
    if (isFetchError) {
      // Prevent the error from being logged as unhandled
      event.preventDefault();
      return;
    }
    
    // Let other rejections be handled normally
    if (originalUnhandledRejection) {
      originalUnhandledRejection.call(window, event);
    }
  };

  // Log that suppression is active (only once)
  console.log('🔇 Development mode: Suppressing edge function errors');
}

export function removeDevelopmentErrorSuppression() {
  // This would restore original console methods if needed
  // For now, we'll keep it simple and not implement restoration
}