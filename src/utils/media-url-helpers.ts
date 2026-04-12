// Media URL validation and debugging helpers

export function isValidMediaUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getMediaType(url: string | null | undefined): 'image' | 'video' | 'audio' | 'unknown' {
  if (!url) return 'unknown';
  
  const lowerUrl = url.toLowerCase();
  
  // Video extensions and known video URLs
  if (lowerUrl.match(/\.(mp4|webm|mov|avi|mkv)$/i) ||
      lowerUrl.includes('gtv-videos-bucket') ||
      lowerUrl.includes('googleapis.com') && lowerUrl.includes('video')) {
    return 'video';
  }
  
  // Audio extensions and known audio URLs
  if (lowerUrl.match(/\.(mp3|wav|m4a|ogg|aac)$/i) ||
      lowerUrl.includes('soundjay.com') ||
      lowerUrl.includes('cs.uic.edu') && lowerUrl.includes('sound')) {
    return 'audio';
  }
  
  // Image extensions and known image URLs
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
      lowerUrl.includes('unsplash.com') ||
      lowerUrl.includes('images.')) {
    return 'image';
  }
  
  return 'unknown';
}

export function debugMediaUrl(url: string | null | undefined, context: string = '') {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Media URL Debug ${context}:`, {
      url: url,
      isValid: isValidMediaUrl(url),
      type: getMediaType(url),
      length: url?.length || 0,
      starts: url ? url.substring(0, 50) + '...' : 'null'
    });
  }
}

export function generateTestMediaUrls() {
  return {
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    audio: 'https://www.soundjay.com/misc/sounds/magic-chime-02.mp3'
  };
}

export function validatePostMediaUrl(post: any): { isValid: boolean; type: string; issues: string[] } {
  const issues: string[] = [];
  const mediaUrl = post.imageUrl || post.media_url || post.contentUrl;
  
  if (!mediaUrl) {
    issues.push('No media URL found');
    return { isValid: false, type: 'none', issues };
  }
  
  if (!isValidMediaUrl(mediaUrl)) {
    issues.push('Invalid URL format');
    return { isValid: false, type: 'invalid', issues };
  }
  
  const type = getMediaType(mediaUrl);
  
  // Don't flag as issue for test posts - they often use sample URLs
  if (type === 'unknown' && !post.id?.startsWith('test-')) {
    issues.push('Unknown media type - may not display correctly');
  }
  
  return {
    isValid: true,
    type: type === 'unknown' ? 'media' : type, // Default unknown to media for test posts
    issues
  };
}