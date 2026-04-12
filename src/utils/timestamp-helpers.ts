/**
 * Helper functions for formatting timestamps in the Tribe Board app
 */

/**
 * Safe wrapper to extract primary line from formatPostTimestamp result
 */
export function getPostTimestampPrimary(username: string, timestamp: string | Date, location?: string): string {
  try {
    const result = formatPostTimestamp(username, timestamp, location);
    return result?.primaryLine || `${username || 'Unknown User'} • now`;
  } catch (error) {
    console.error('Error getting timestamp primary line:', error);
    return `${username || 'Unknown User'} • now`;
  }
}

/**
 * Safe wrapper to extract secondary line from formatPostTimestamp result
 */
export function getPostTimestampSecondary(username: string, timestamp: string | Date, location?: string): string | undefined {
  try {
    const result = formatPostTimestamp(username, timestamp, location);
    return result?.secondaryLine;
  } catch (error) {
    console.error('Error getting timestamp secondary line:', error);
    return undefined;
  }
}

export function formatTimeAgo(timestamp: string | Date): string {
  try {
    const now = new Date();
    const time = new Date(timestamp);
    
    // Check if time is valid
    if (isNaN(time.getTime())) {
      return 'now';
    }
    
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    // Handle future dates or invalid dates
    if (diffInSeconds < 0 || isNaN(diffInSeconds)) {
      return 'now';
    }

    // Less than 1 minute
    if (diffInSeconds < 60) {
      return 'now';
    }

    // Less than 1 hour
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m`;
    }

    // Less than 1 day
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h`;
    }

    // Less than 1 week
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d`;
    }

    // Less than 4 weeks (roughly 1 month)
    if (diffInSeconds < 2419200) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks}w`;
    }

    // Less than 1 year
    if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2419200);
      return `${months}mo`;
    }

    // 1 year or more
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years}y`;
  } catch (error) {
    console.error('Error in formatTimeAgo:', error, 'timestamp:', timestamp);
    return 'now';
  }
}

/**
 * Format a timestamp into the Tribe Board style: "username • time"
 * with location on a separate line if available
 */
export function formatPostTimestamp(
  username: string,
  timestamp: string | Date,
  location?: string
): { primaryLine: string; secondaryLine?: string } {
  try {
    // Validate inputs
    if (!username || typeof username !== 'string') {
      username = 'Unknown User';
    }
    
    if (!timestamp) {
      timestamp = new Date();
    }

    const timeAgo = formatTimeAgo(timestamp);
    const primaryLine = `${username} • ${timeAgo}`;
    const secondaryLine = location || undefined;

    return {
      primaryLine,
      secondaryLine
    };
  } catch (error) {
    console.error('Error in formatPostTimestamp:', error);
    return {
      primaryLine: `${username || 'Unknown User'} • now`,
      secondaryLine: location || undefined
    };
  }
}