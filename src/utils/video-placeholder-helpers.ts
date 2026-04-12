/**
 * Video placeholder utilities for handling thumbnail fallbacks
 */

export const VIDEO_PLACEHOLDER_URL = '/static/video-placeholder.webp';

/**
 * Generate a data URL for a simple video placeholder
 */
export function generateVideoPlaceholderDataUrl(): string {
  // Create a simple SVG placeholder
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1a1a2e"/>
      <g transform="translate(200, 150)">
        <circle r="40" fill="rgba(192, 132, 252, 0.2)" stroke="rgba(192, 132, 252, 0.4)" stroke-width="2"/>
        <polygon points="-12,-8 -12,8 12,0" fill="rgba(192, 132, 252, 0.8)"/>
      </g>
      <text x="200" y="200" text-anchor="middle" fill="rgba(221, 214, 254, 0.6)" font-family="system-ui" font-size="14">
        Video Content
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Set up error handling for video elements
 */
export function setupVideoErrorHandling(videoElement: HTMLVideoElement, fallbackPosterUrl?: string): void {
  videoElement.addEventListener('error', () => {
    console.warn('Video failed to load:', videoElement.src);
    
    // If we have a fallback poster, use it
    if (fallbackPosterUrl && videoElement.poster !== fallbackPosterUrl) {
      videoElement.poster = fallbackPosterUrl;
      return;
    }
    
    // Otherwise use the data URL placeholder
    if (videoElement.poster !== generateVideoPlaceholderDataUrl()) {
      videoElement.poster = generateVideoPlaceholderDataUrl();
    }
  });
}

/**
 * Create a video element with proper poster fallback handling
 */
export function createVideoElementWithFallback(
  src: string, 
  poster?: string,
  options: {
    controls?: boolean;
    autoPlay?: boolean;
    muted?: boolean;
    playsInline?: boolean;
    preload?: 'none' | 'metadata' | 'auto';
    className?: string;
  } = {}
): HTMLVideoElement {
  const video = document.createElement('video');
  
  // Set basic attributes
  video.src = src;
  video.controls = options.controls ?? false;
  video.autoplay = options.autoPlay ?? false;
  video.muted = options.muted ?? true;
  video.playsInline = options.playsInline ?? true;
  video.preload = options.preload ?? 'metadata';
  
  if (options.className) {
    video.className = options.className;
  }
  
  // Set poster with fallback
  if (poster) {
    video.poster = poster;
    setupVideoErrorHandling(video, VIDEO_PLACEHOLDER_URL);
  } else {
    video.poster = generateVideoPlaceholderDataUrl();
  }
  
  return video;
}

/**
 * Check if a URL is likely a video thumbnail
 */
export function isVideoThumbnail(url: string): boolean {
  if (!url) return false;
  
  const thumbnailIndicators = [
    'thumb.webp',
    'thumbnail',
    'thumb',
    'poster',
    'preview'
  ];
  
  return thumbnailIndicators.some(indicator => 
    url.toLowerCase().includes(indicator)
  );
}

/**
 * Extract video dimensions from poster image
 */
export async function getVideoDimensionsFromPoster(posterUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      resolve(null);
    };
    
    img.src = posterUrl;
  });
}