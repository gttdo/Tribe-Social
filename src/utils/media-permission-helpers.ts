/**
 * Media Permission Management Utilities
 * Handles browser media permissions and stream cleanup
 */

interface MediaStreamTracker {
  stream: MediaStream;
  timestamp: number;
}

// Global tracker for active media streams
const activeStreams = new Map<string, MediaStreamTracker>();

/**
 * Register a media stream for tracking
 */
export function registerMediaStream(id: string, stream: MediaStream): void {
  activeStreams.set(id, {
    stream,
    timestamp: Date.now()
  });
}

/**
 * Unregister and stop a specific media stream
 */
export function unregisterMediaStream(id: string): void {
  const tracker = activeStreams.get(id);
  if (tracker) {
    tracker.stream.getTracks().forEach(track => {
      track.stop();
      console.log(`Stopped ${track.kind} track from stream ${id}`);
    });
    activeStreams.delete(id);
  }
}

/**
 * Stop all registered media streams
 */
export function stopAllMediaStreams(): void {
  console.log(`Stopping ${activeStreams.size} registered media streams`);
  
  activeStreams.forEach((tracker, id) => {
    tracker.stream.getTracks().forEach(track => {
      track.stop();
      console.log(`Stopped ${track.kind} track from stream ${id}`);
    });
  });
  
  activeStreams.clear();
}

/**
 * Check current browser permission status
 */
export async function checkPermissionStatus(name: 'camera' | 'microphone'): Promise<PermissionState | null> {
  try {
    if (!navigator.permissions) {
      return null;
    }
    
    const permission = await navigator.permissions.query({ 
      name: name as PermissionName 
    });
    
    return permission.state;
  } catch (error) {
    console.log(`Could not check ${name} permission status:`, error);
    return null;
  }
}

/**
 * Attempt to revoke browser permissions (limited browser support)
 */
export async function attemptPermissionRevocation(type: 'camera' | 'microphone'): Promise<boolean> {
  try {
    // First, stop all active streams
    stopAllMediaStreams();
    
    // Check if browser supports permission revocation (very limited)
    if (navigator.permissions && 'revoke' in navigator.permissions) {
      // This is not standard and rarely supported
      try {
        await (navigator.permissions as any).revoke({ name: type });
        console.log(`Successfully revoked ${type} permission`);
        return true;
      } catch (error) {
        console.log(`Could not revoke ${type} permission:`, error);
      }
    }
    
    return false;
  } catch (error) {
    console.log(`Error during permission revocation for ${type}:`, error);
    return false;
  }
}

/**
 * Get user-friendly instructions for manually revoking permissions
 */
export function getPermissionRevocationInstructions(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome')) {
    return 'Click the lock icon in the address bar, then click "Reset permissions" or go to Chrome Settings > Privacy & Security > Site Settings > Camera/Microphone';
  } else if (userAgent.includes('firefox')) {
    return 'Click the shield icon in the address bar, then manage permissions, or go to Firefox Settings > Privacy & Security > Permissions';
  } else if (userAgent.includes('safari')) {
    return 'Go to Safari > Settings > Websites > Camera/Microphone and remove permissions for this site';
  } else if (userAgent.includes('edge')) {
    return 'Click the lock icon in the address bar, then reset permissions, or go to Edge Settings > Cookies and site permissions > Camera/Microphone';
  }
  
  return 'Visit your browser settings > Privacy & Security > Site Settings, then remove camera and microphone permissions for this site';
}

/**
 * Clean up old/stale stream trackers (streams older than 1 hour)
 */
export function cleanupStaleStreams(): void {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  
  const staleIds: string[] = [];
  
  activeStreams.forEach((tracker, id) => {
    if (now - tracker.timestamp > maxAge) {
      staleIds.push(id);
    }
  });
  
  staleIds.forEach(id => {
    console.log(`Cleaning up stale stream: ${id}`);
    unregisterMediaStream(id);
  });
}

// Automatically clean up stale streams periodically
if (typeof window !== 'undefined') {
  setInterval(cleanupStaleStreams, 5 * 60 * 1000); // Every 5 minutes
}