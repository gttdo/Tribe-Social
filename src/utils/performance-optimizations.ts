/**
 * Performance Optimization Utilities for Tribe Board
 * 
 * These utilities help with code splitting, lazy loading, and performance monitoring
 */

import { lazy, ComponentType, ReactElement } from 'react';

/**
 * Enhanced lazy loading with loading states
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ReactElement
) {
  const LazyComponent = lazy(importFn);
  
  return function WrappedLazyComponent(props: React.ComponentProps<T>) {
    return (
      <React.Suspense fallback={fallback || <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-lilac"></div>
      </div>}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}

/**
 * Route-based code splitting suggestions
 */
export const LAZY_ROUTES = {
  // High priority - keep loaded
  SocialFeed: () => import('../components/SocialFeed'),
  MobileBottomNav: () => import('../components/MobileBottomNav'),
  
  // Medium priority - lazy load
  ProfilePage: () => import('../components/ProfilePage'),
  CreatePostPage: () => import('../components/CreatePostPage'),
  NotificationCenter: () => import('../components/NotificationCenter'),
  
  // Low priority - definitely lazy load
  SettingsPage: () => import('../components/SettingsPage'),
  DiscoverTribesPage: () => import('../components/DiscoverTribesPage'),
  
  // Debug components - only load in development
  ...(process.env.NODE_ENV === 'development' ? {
    BackendTestUtility: () => import('../components/BackendTestUtility'),
    DatabaseDiagnostic: () => import('../components/DatabaseDiagnostic'),
    ConnectivityTest: () => import('../components/ConnectivityTest'),
  } : {})
};

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  
  static mark(name: string) {
    if (typeof performance !== 'undefined') {
      this.marks.set(name, performance.now());
    }
  }
  
  static measure(name: string, startMark: string) {
    if (typeof performance !== 'undefined' && this.marks.has(startMark)) {
      const startTime = this.marks.get(startMark)!;
      const duration = performance.now() - startTime;
      
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
      
      // Log slow operations (> 500ms)
      if (duration > 500) {
        console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    return 0;
  }
  
  static measureComponent(componentName: string) {
    return {
      onMount: () => this.mark(`${componentName}-mount-start`),
      onReady: () => this.measure(`${componentName} mount`, `${componentName}-mount-start`)
    };
  }
}

/**
 * Memory usage monitoring
 */
export function logMemoryUsage(context: string) {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    console.log(`📊 Memory usage (${context}):`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
    });
  }
}

/**
 * Bundle size analysis helper
 */
export function analyzeComponentSize() {
  const components = [
    'SocialFeed', 'ProfilePage', 'CreatePostPage', 'NotificationCenter',
    'SettingsPage', 'CommentsSystem', 'PostCard', 'VideoPlayer'
  ];
  
  console.table(
    components.map(name => ({
      component: name,
      estimatedSize: 'Run bundle analyzer for accurate sizes',
      priority: ['SocialFeed', 'ProfilePage'].includes(name) ? 'HIGH' : 'MEDIUM'
    }))
  );
}

/**
 * Image optimization suggestions
 */
export const IMAGE_OPTIMIZATION = {
  // Suggested image sizes for different contexts
  AVATAR_SIZES: {
    thumbnail: '40x40',
    profile: '100x100', 
    large: '200x200'
  },
  
  POST_SIZES: {
    thumbnail: '300x300',
    medium: '600x600',
    large: '1200x1200'
  },
  
  // WebP fallback strategy
  getOptimizedImageUrl: (originalUrl: string, size: string) => {
    // This would integrate with your Supabase Storage transforms
    return `${originalUrl}?width=${size.split('x')[0]}&height=${size.split('x')[1]}&format=webp`;
  }
};

export default {
  createLazyComponent,
  PerformanceMonitor,
  logMemoryUsage,
  analyzeComponentSize,
  IMAGE_OPTIMIZATION
};