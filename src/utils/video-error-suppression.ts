// Video error suppression and filtering utilities

interface VideoErrorContext {
  postId?: string;
  videoUrl?: string;
  errorCode?: number;
  errorMessage?: string;
  component?: string;
}

/**
 * Known non-critical video loading scenarios that don't require error logging
 */
const SUPPRESS_ERROR_PATTERNS = [
  // Network timeouts - common in mobile environments
  /timeout/i,
  /network/i,
  // CORS issues - expected for some external videos
  /cors/i,
  /cross-origin/i,
  // Common format issues that fallback gracefully
  /format not supported/i,
  /mime type/i,
  // Preview-specific errors that don't affect core functionality
  /preview/i,
  /thumbnail/i
];

/**
 * Error codes that should be suppressed in production
 */
const SUPPRESS_ERROR_CODES = [
  MediaError.MEDIA_ERR_ABORTED, // User/system aborted - not critical
  MediaError.MEDIA_ERR_NETWORK  // Network errors - common and recoverable
];

/**
 * Determine if a video error should be logged based on context
 */
export function shouldLogVideoError(
  error: MediaError | null,
  context: VideoErrorContext = {}
): boolean {
  // Always log in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Don't log if no error
  if (!error) {
    return false;
  }

  // Suppress known non-critical error codes
  if (error.code && SUPPRESS_ERROR_CODES.includes(error.code)) {
    return false;
  }

  // Suppress errors matching known patterns
  const errorText = error.message || context.errorMessage || '';
  if (SUPPRESS_ERROR_PATTERNS.some(pattern => pattern.test(errorText))) {
    return false;
  }

  // Suppress preview errors - these are non-critical
  if (context.component && context.component.includes('preview')) {
    return false;
  }

  // Log critical errors (decode issues, unsupported formats)
  return true;
}

/**
 * Log video error with appropriate level based on severity
 */
export function logVideoError(
  error: MediaError | null,
  context: VideoErrorContext = {}
): void {
  if (!shouldLogVideoError(error, context)) {
    return;
  }

  const errorInfo = {
    postId: context.postId,
    videoUrl: context.videoUrl,
    errorCode: error?.code,
    errorMessage: error?.message || context.errorMessage,
    component: context.component,
    timestamp: new Date().toISOString()
  };

  // Critical errors get console.error
  if (error?.code === MediaError.MEDIA_ERR_DECODE || 
      error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    console.error('Critical video error:', errorInfo);
  } else {
    // Other errors get console.warn
    console.warn('Video loading issue:', errorInfo);
  }
}

/**
 * Suppress React video element error events that flood the console
 */
export function createVideoErrorHandler(context: VideoErrorContext = {}) {
  return (event: Event) => {
    const target = event.target as HTMLVideoElement;
    const error = target?.error;
    
    // Use our filtering logic
    logVideoError(error, {
      ...context,
      videoUrl: context.videoUrl || target?.src,
      errorMessage: error?.message
    });
  };
}

/**
 * Global error suppression for known video loading issues
 */
export function initializeVideoErrorSuppression(): void {
  // Suppress unhandled video loading errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    const message = event.message || '';
    
    // Check if this is a video-related error
    if (message.includes('video') || message.includes('media')) {
      // Apply our filtering logic
      const shouldSuppress = SUPPRESS_ERROR_PATTERNS.some(pattern => 
        pattern.test(message)
      );
      
      if (shouldSuppress) {
        event.preventDefault();
        return false;
      }
    }
  });

  // Suppress unhandled promise rejections related to video loading
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || reason?.toString() || '';
    
    if (message.includes('video') || message.includes('media')) {
      const shouldSuppress = SUPPRESS_ERROR_PATTERNS.some(pattern => 
        pattern.test(message)
      );
      
      if (shouldSuppress) {
        event.preventDefault();
        return false;
      }
    }
  });
}

/**
 * Hook-friendly video error handler for React components
 */
export function useVideoErrorHandler(context: VideoErrorContext = {}) {
  return (event: Event | React.SyntheticEvent<HTMLVideoElement>) => {
    const target = event.currentTarget as HTMLVideoElement;
    const error = target?.error;
    
    logVideoError(error, {
      ...context,
      videoUrl: context.videoUrl || target?.src,
      component: context.component || 'unknown'
    });
  };
}