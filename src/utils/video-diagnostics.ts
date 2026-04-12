// Video loading diagnostics and troubleshooting utilities

export interface VideoLoadingIssue {
  type: 'cors' | 'format' | 'network' | 'permissions' | 'unknown';
  severity: 'error' | 'warning' | 'info';
  message: string;
  recommendation: string;
}

export interface VideoLoadingReport {
  url: string;
  isLoadable: boolean;
  issues: VideoLoadingIssue[];
  metadata?: {
    canPlay: boolean;
    hasAudio: boolean;
    hasVideo: boolean;
    duration: number;
    dimensions: { width: number; height: number };
  };
}

/**
 * Diagnose video loading issues
 */
export async function diagnoseVideoUrl(url: string): Promise<VideoLoadingReport> {
  const issues: VideoLoadingIssue[] = [];
  let isLoadable = false;
  let metadata: VideoLoadingReport['metadata'];

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    issues.push({
      type: 'format',
      severity: 'error',
      message: 'Invalid URL format',
      recommendation: 'Check that the video URL is properly formatted'
    });
    return { url, isLoadable: false, issues };
  }

  // Check file extension
  const extension = url.toLowerCase().split('.').pop();
  const supportedExtensions = ['mp4', 'webm', 'mov', 'avi'];
  
  if (!extension || !supportedExtensions.includes(extension)) {
    issues.push({
      type: 'format',
      severity: 'warning',
      message: `Potentially unsupported video format: ${extension || 'unknown'}`,
      recommendation: 'Consider using MP4, WebM, or MOV formats for better compatibility'
    });
  }

  // Test loading with a video element
  try {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    
    const loadPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video loading timeout'));
      }, 10000); // 10 second timeout

      video.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout);
        
        metadata = {
          canPlay: video.readyState >= 3,
          hasAudio: video.audioTracks?.length > 0 || false,
          hasVideo: video.videoTracks?.length > 0 || video.videoWidth > 0,
          duration: video.duration || 0,
          dimensions: {
            width: video.videoWidth || 0,
            height: video.videoHeight || 0
          }
        };
        
        isLoadable = true;
        resolve();
      });

      video.addEventListener('error', (e) => {
        clearTimeout(timeout);
        const error = video.error;
        
        let issueType: VideoLoadingIssue['type'] = 'unknown';
        let message = 'Unknown video loading error';
        let recommendation = 'Try a different video source';

        if (error) {
          switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              issueType = 'network';
              message = 'Video loading was aborted';
              recommendation = 'Check network connection and try again';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              issueType = 'network';
              message = 'Network error while loading video';
              recommendation = 'Check internet connection and server availability';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              issueType = 'format';
              message = 'Video format cannot be decoded';
              recommendation = 'Use a standard video format like MP4 or WebM';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              issueType = 'format';
              message = 'Video source not supported by browser';
              recommendation = 'Convert video to a web-compatible format';
              break;
          }
        }

        reject(new Error(message));
      });

      video.src = url;
      video.load();
    });

    await loadPromise;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Detect CORS issues
    if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
      issues.push({
        type: 'cors',
        severity: 'error',
        message: 'CORS (Cross-Origin Resource Sharing) error',
        recommendation: 'Ensure video server has proper CORS headers configured'
      });
    } else if (errorMessage.includes('timeout')) {
      issues.push({
        type: 'network',
        severity: 'error',
        message: 'Video loading timed out',
        recommendation: 'Check network connection and server response time'
      });
    } else {
      issues.push({
        type: 'unknown',
        severity: 'error',
        message: errorMessage,
        recommendation: 'Check video URL and format compatibility'
      });
    }
  }

  return {
    url,
    isLoadable,
    issues,
    metadata
  };
}

/**
 * Test if browser supports video format
 */
export function testVideoFormatSupport(): Record<string, boolean> {
  const video = document.createElement('video');
  
  return {
    mp4: video.canPlayType('video/mp4') !== '',
    webm: video.canPlayType('video/webm') !== '',
    mov: video.canPlayType('video/mov') !== '',
    avi: video.canPlayType('video/avi') !== '',
    h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '',
    vp8: video.canPlayType('video/webm; codecs="vp8"') !== '',
    vp9: video.canPlayType('video/webm; codecs="vp9"') !== ''
  };
}

/**
 * Generate fallback video sources
 */
export function generateVideoFallbacks(originalUrl: string): string[] {
  const fallbacks: string[] = [originalUrl];
  
  // If it's a Google Cloud Storage URL, try different formats
  if (originalUrl.includes('googleapis.com') || originalUrl.includes('storage.cloud.google.com')) {
    const base = originalUrl.replace(/\.[^/.]+$/, '');
    fallbacks.push(
      `${base}.mp4`,
      `${base}.webm`,
      originalUrl.replace('https://', 'http://') // Try HTTP if HTTPS fails
    );
  }
  
  // Remove duplicates
  return [...new Set(fallbacks)];
}

/**
 * Log comprehensive video diagnostics
 */
export async function logVideoDebugInfo(url: string, context: string = ''): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group(`🎬 Video Debug Info ${context ? `(${context})` : ''}`);
  
  try {
    const formatSupport = testVideoFormatSupport();
    console.log('Browser format support:', formatSupport);
    
    const report = await diagnoseVideoUrl(url);
    console.log('Video loading report:', report);
    
    if (report.issues.length > 0) {
      console.warn('Issues found:');
      report.issues.forEach((issue, index) => {
        console.warn(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
        console.log(`   Recommendation: ${issue.recommendation}`);
      });
    }
    
    if (report.metadata) {
      console.log('Video metadata:', report.metadata);
    }
    
  } catch (error) {
    console.error('Error running video diagnostics:', error);
  }
  
  console.groupEnd();
}