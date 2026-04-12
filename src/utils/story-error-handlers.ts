/**
 * Story Error Handlers
 * 
 * Utility functions for handling story-related errors, particularly 
 * policy and infinite recursion errors from the database.
 */

export interface StoryErrorInfo {
  type: 'policy_error' | 'recursion_error' | 'table_missing' | 'network_error' | 'unknown_error';
  code?: string;
  message: string;
  table?: string;
  timestamp: string;
  recoverable: boolean;
}

/**
 * Parse and categorize story-related errors
 */
export function parseStoryError(error: any, context: string = ''): StoryErrorInfo {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error?.code;

  // Policy insufficient privilege errors
  if (errorCode === '42501') {
    return {
      type: 'policy_error',
      code: errorCode,
      message: `Access denied: ${errorMessage}`,
      table: extractTableFromError(errorMessage),
      timestamp,
      recoverable: false // User needs permission/access to recover
    };
  }

  // Infinite recursion policy errors
  if (errorCode === '42P17' || errorMessage.includes('infinite recursion')) {
    return {
      type: 'recursion_error', 
      code: errorCode || '42P17',
      message: `Database policy recursion detected: ${errorMessage}`,
      table: extractTableFromError(errorMessage),
      timestamp,
      recoverable: true // May be fixed by retry or database policy update
    };
  }

  // Table/column not found errors
  if (errorCode === '42703' || errorCode === 'PGRST116' || errorCode === 'PGRST205' ||
      errorMessage.includes('does not exist') || 
      errorMessage.includes('Could not find the table')) {
    return {
      type: 'table_missing',
      code: errorCode,
      message: `Database table/column missing: ${errorMessage}`,
      table: extractTableFromError(errorMessage),
      timestamp,
      recoverable: true // May be fixed when database is set up
    };
  }

  // Network/connectivity errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || 
      errorMessage.includes('connection') || errorCode === 'NETWORK_ERROR') {
    return {
      type: 'network_error',
      code: errorCode,
      message: `Network error: ${errorMessage}`,
      timestamp,
      recoverable: true // May be fixed by retry
    };
  }

  // Unknown/other errors
  return {
    type: 'unknown_error',
    code: errorCode,
    message: errorMessage,
    timestamp,
    recoverable: true // May be fixed by retry
  };
}

/**
 * Extract table name from error message for telemetry
 */
function extractTableFromError(errorMessage: string): string | undefined {
  // Common patterns for table names in error messages
  const patterns = [
    /table "([^"]+)"/i,
    /from '([^']+)'/i,
    /relation "([^"]+)"/i,
    /(stories|users|tribes|story_views|story_reactions|notifications)/i
  ];

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Log telemetry data for story errors
 */
export function logStoryErrorTelemetry(errorInfo: StoryErrorInfo, context: string = '') {
  const telemetryData = {
    ...errorInfo,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown'
  };

  // Log with appropriate emoji for easy scanning
  const emoji = errorInfo.type === 'policy_error' ? '🔒' : 
                errorInfo.type === 'recursion_error' ? '🔄' : 
                errorInfo.type === 'table_missing' ? '🗄️' : 
                errorInfo.type === 'network_error' ? '🌐' : '🚨';

  console.error(`${emoji} STORY ERROR TELEMETRY [${errorInfo.type.toUpperCase()}]:`, telemetryData);

  // In a production environment, you would send this to your analytics service
  // e.g., Sentry, LogRocket, etc.
}

/**
 * Get user-friendly error message based on error type
 */
export function getStoryErrorMessage(errorInfo: StoryErrorInfo): string {
  switch (errorInfo.type) {
    case 'policy_error':
      return 'This content is private or restricted. You may need permission to view it.';
    
    case 'recursion_error':
      return 'There was a temporary issue loading stories. Please try again.';
    
    case 'table_missing':
      return 'Stories feature is being set up. Please check back soon!';
    
    case 'network_error':
      return 'Connection issue. Please check your internet and try again.';
    
    default:
      return 'Something went wrong loading stories. Please try again.';
  }
}

/**
 * Determine if an error should show a retry button
 */
export function shouldShowRetry(errorInfo: StoryErrorInfo): boolean {
  return errorInfo.recoverable && errorInfo.type !== 'table_missing';
}

/**
 * Determine if an error should show a "Request Access" or similar action
 */
export function shouldShowAccessRequest(errorInfo: StoryErrorInfo): boolean {
  return errorInfo.type === 'policy_error';
}

/**
 * Create fallback story group for private/locked content
 */
export function createPrivateStoryFallback(storyId: string, userId: string, tribeId?: string): any {
  return {
    user_id: userId,
    user: {
      id: userId,
      username: 'Private User',
      nickname: 'Private User', 
      avatar_url: null,
      is_private: true
    },
    tribe_id: tribeId,
    tribe: tribeId ? {
      id: tribeId,
      name: 'Private Tribe',
      avatar_url: null,
      is_private: true
    } : null,
    stories: [{
      id: storyId,
      user_id: userId,
      tribe_id: tribeId,
      media_type: 'image',
      media_url: '',
      caption: null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      author: {
        id: userId,
        username: 'Private User',
        nickname: 'Private User',
        is_private: true
      },
      tribe: tribeId ? {
        id: tribeId,
        name: 'Private Tribe',
        is_private: true
      } : null,
      has_viewed: false
    }],
    has_new_stories: false,
    latest_story_time: new Date().toISOString()
  };
}

/**
 * Wrapper function for story operations that handles errors gracefully
 */
export async function withStoryErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackValue: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorInfo = parseStoryError(error, context);
    logStoryErrorTelemetry(errorInfo, context);
    
    // Return fallback value instead of throwing
    return fallbackValue;
  }
}

/**
 * React hook for story error state management
 */
export function useStoryErrorState() {
  const [lastError, setLastError] = React.useState<StoryErrorInfo | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleError = (error: any, context: string = '') => {
    const errorInfo = parseStoryError(error, context);
    logStoryErrorTelemetry(errorInfo, context);
    setLastError(errorInfo);
  };

  const retry = async (operation: () => Promise<void>) => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    try {
      await operation();
      setLastError(null); // Clear error on success
    } catch (error) {
      handleError(error, 'retry');
    } finally {
      setIsRetrying(false);
    }
  };

  const clearError = () => {
    setLastError(null);
  };

  return {
    lastError,
    isRetrying,
    handleError,
    retry,
    clearError,
    shouldShowRetry: lastError ? shouldShowRetry(lastError) : false,
    shouldShowAccessRequest: lastError ? shouldShowAccessRequest(lastError) : false,
    errorMessage: lastError ? getStoryErrorMessage(lastError) : null
  };
}

// React import for the hook (if React is available)
let React: any;
try {
  React = require('react');
} catch {
  // React not available, hook won't work but other functions will
}