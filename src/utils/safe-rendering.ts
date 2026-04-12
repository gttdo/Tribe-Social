// Safe rendering utilities for numbers, dates, and other data types

export function safeNumber(value: number | null | undefined, fallback: string | number = 0): string | number {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return value;
}

export function safeString(value: string | null | undefined, fallback: string = ''): string {
  if (!value || typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

export function safeArray<T>(value: T[] | null | undefined, fallback: T[] = []): T[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value;
}

export function safeBoolean(value: boolean | null | undefined, fallback: boolean = false): boolean {
  if (typeof value !== 'boolean') {
    return fallback;
  }
  return value;
}

// Safe date formatting
export function safeDate(value: string | Date | null | undefined, fallback: string = 'Unknown date'): string {
  if (!value) return fallback;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    
    // Use consistent date format across the app
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    // For older dates, show month and day
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  } catch (error) {
    console.warn('Safe date formatting error:', error);
    return fallback;
  }
}

// Safe URL formatting
export function safeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Basic URL validation
    if (url.startsWith('http://') || url.startsWith('https://')) {
      new URL(url); // Validate URL format
      return url;
    }
    
    // Handle relative URLs
    if (url.startsWith('/')) {
      return url;
    }
    
    // Handle data URLs for images
    if (url.startsWith('data:')) {
      return url;
    }
    
    // Handle blob URLs
    if (url.startsWith('blob:')) {
      return url;
    }
    
    return null;
  } catch {
    return null;
  }
}

// Safe image URL with fallback
export function safeImageUrl(url: string | null | undefined, fallback?: string): string | undefined {
  const safeUrl_ = safeUrl(url);
  if (safeUrl_) return safeUrl_;
  return fallback;
}

// Safe count formatting (e.g., 1.2K, 5.1M)
export function safeFormatCount(count: number | null | undefined, fallback: string = '0'): string {
  const safeCount = safeNumber(count, 0) as number;
  
  if (safeCount === 0) return fallback;
  if (safeCount < 1000) return safeCount.toString();
  if (safeCount < 1000000) return (safeCount / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (safeCount < 1000000000) return (safeCount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (safeCount / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
}

// Safe percentage formatting
export function safeFormatPercentage(value: number | null | undefined, fallback: string = '0%'): string {
  const safeValue = safeNumber(value, 0) as number;
  return `${Math.round(safeValue * 100)}%`;
}

// Safe duration formatting (for videos, audio)
export function safeFormatDuration(seconds: number | null | undefined, fallback: string = '0:00'): string {
  const safeSeconds = safeNumber(seconds, 0) as number;
  
  if (safeSeconds === 0) return fallback;
  
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Safe user display name with fallback
export function safeDisplayName(
  username: string | null | undefined, 
  nickname: string | null | undefined,
  fallback: string = 'Unknown user'
): string {
  const safeName = safeString(nickname || username, '').trim();
  return safeName || fallback;
}

// Safe content validation
export function isValidContent(content: string | null | undefined): boolean {
  if (!content || typeof content !== 'string') return false;
  return content.trim().length > 0;
}

// Safe HTML sanitization (basic)
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  
  // Basic HTML sanitization - remove script tags and potentially dangerous content
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

// Safe object property access
export function safeGet<T>(obj: any, path: string, fallback: T): T {
  try {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return fallback;
      }
      result = result[key];
    }
    
    return result !== null && result !== undefined ? result : fallback;
  } catch {
    return fallback;
  }
}

// Safe array access
export function safeArrayGet<T>(array: T[] | null | undefined, index: number, fallback: T): T {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return fallback;
  }
  
  const item = array[index];
  return item !== null && item !== undefined ? item : fallback;
}

// Safe JSON parsing
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json || typeof json !== 'string') return fallback;
  
  try {
    const parsed = JSON.parse(json);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch {
    return fallback;
  }
}

// Validate and format file size
export function safeFormatFileSize(bytes: number | null | undefined, fallback: string = 'Unknown size'): string {
  const safeBytes = safeNumber(bytes, 0) as number;
  
  if (safeBytes === 0) return fallback;
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(safeBytes) / Math.log(1024));
  
  if (i === 0) return `${safeBytes} ${sizes[i]}`;
  
  return `${(safeBytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

// Safe color validation
export function safeColor(color: string | null | undefined, fallback: string = '#000000'): string {
  if (!color || typeof color !== 'string') return fallback;
  
  // Basic validation for hex colors
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    return color;
  }
  
  // Basic validation for rgb/rgba
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(color)) {
    return color;
  }
  
  // Basic validation for named colors (simplified)
  const namedColors = [
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
    'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta', 'transparent'
  ];
  
  if (namedColors.includes(color.toLowerCase())) {
    return color;
  }
  
  return fallback;
}