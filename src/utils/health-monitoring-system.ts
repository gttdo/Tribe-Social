/**
 * Health Monitoring System for Tribe Board
 * 
 * Monitors app health, performance metrics, and user experience indicators
 */

import { ValidationService } from './enhanced-validation-system';

/**
 * Health check interfaces
 */
interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold?: { warning: number; critical: number };
  timestamp: number;
}

interface HealthCheckResult {
  overall: 'healthy' | 'warning' | 'critical';
  score: number; // 0-100
  metrics: HealthMetric[];
  recommendations: string[];
  timestamp: number;
}

/**
 * Performance monitoring
 */
class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();
  private static startTimes = new Map<string, number>();

  static startTimer(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }

  static endTimer(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.recordMetric(operation, duration);
    this.startTimes.delete(operation);
    
    return duration;
  }

  static recordMetric(name: string, value: number): void {
    const values = this.metrics.get(name) || [];
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
    
    this.metrics.set(name, values);
  }

  static getMetrics(): Map<string, number[]> {
    return new Map(this.metrics);
  }

  static getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  static getLatestMetric(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.length > 0 ? values[values.length - 1] : 0;
  }
}

/**
 * Memory usage monitoring
 */
class MemoryMonitor {
  static getCurrentUsage(): HealthMetric {
    let memoryUsage = 0;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      
      if (memoryUsage > 100) status = 'warning';
      if (memoryUsage > 200) status = 'critical';
    }

    return {
      name: 'Memory Usage',
      value: memoryUsage,
      unit: 'MB',
      status,
      threshold: { warning: 100, critical: 200 },
      timestamp: Date.now()
    };
  }
}

/**
 * Network health monitoring
 */
class NetworkMonitor {
  private static connectionQuality: 'fast' | 'slow' | 'offline' = 'fast';
  private static requestTimes: number[] = [];

  static recordRequestTime(duration: number): void {
    this.requestTimes.push(duration);
    
    // Keep only last 20 requests
    if (this.requestTimes.length > 20) {
      this.requestTimes.shift();
    }
  }

  static getAverageRequestTime(): number {
    return this.requestTimes.length > 0 
      ? this.requestTimes.reduce((sum, val) => sum + val, 0) / this.requestTimes.length 
      : 0;
  }

  static getNetworkHealth(): HealthMetric {
    const avgTime = this.getAverageRequestTime();
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (avgTime > 2000) status = 'warning';  // 2 seconds
    if (avgTime > 5000) status = 'critical'; // 5 seconds
    
    return {
      name: 'Network Response Time',
      value: avgTime,
      unit: 'ms',
      status,
      threshold: { warning: 2000, critical: 5000 },
      timestamp: Date.now()
    };
  }

  static checkOnlineStatus(): HealthMetric {
    const isOnline = navigator.onLine;
    
    return {
      name: 'Online Status',
      value: isOnline ? 1 : 0,
      unit: 'boolean',
      status: isOnline ? 'healthy' : 'critical',
      timestamp: Date.now()
    };
  }
}

/**
 * User experience monitoring
 */
class UXMonitor {
  private static errors: { message: string; timestamp: number }[] = [];
  private static userActions: { action: string; timestamp: number }[] = [];

  static recordError(error: string): void {
    this.errors.push({ message: error, timestamp: Date.now() });
    
    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors.shift();
    }
  }

  static recordUserAction(action: string): void {
    this.userActions.push({ action, timestamp: Date.now() });
    
    // Keep only last 100 actions
    if (this.userActions.length > 100) {
      this.userActions.shift();
    }
  }

  static getErrorRate(): HealthMetric {
    const recentErrors = this.errors.filter(
      error => Date.now() - error.timestamp < 300000 // Last 5 minutes
    );
    
    const errorRate = recentErrors.length / 5; // errors per minute
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (errorRate > 1) status = 'warning';
    if (errorRate > 3) status = 'critical';
    
    return {
      name: 'Error Rate',
      value: errorRate,
      unit: 'errors/min',
      status,
      threshold: { warning: 1, critical: 3 },
      timestamp: Date.now()
    };
  }

  static getUserEngagement(): HealthMetric {
    const recentActions = this.userActions.filter(
      action => Date.now() - action.timestamp < 60000 // Last minute
    );
    
    return {
      name: 'User Engagement',
      value: recentActions.length,
      unit: 'actions/min',
      status: recentActions.length > 0 ? 'healthy' : 'warning',
      timestamp: Date.now()
    };
  }
}

/**
 * Feature health monitoring
 */
class FeatureMonitor {
  private static featureUsage = new Map<string, number>();
  private static featureErrors = new Map<string, number>();

  static recordFeatureUse(feature: string): void {
    const current = this.featureUsage.get(feature) || 0;
    this.featureUsage.set(feature, current + 1);
  }

  static recordFeatureError(feature: string): void {
    const current = this.featureErrors.get(feature) || 0;
    this.featureErrors.set(feature, current + 1);
  }

  static getFeatureHealth(feature: string): HealthMetric {
    const usage = this.featureUsage.get(feature) || 0;
    const errors = this.featureErrors.get(feature) || 0;
    
    const errorRate = usage > 0 ? (errors / usage) * 100 : 0;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (errorRate > 5) status = 'warning';
    if (errorRate > 15) status = 'critical';
    
    return {
      name: `${feature} Error Rate`,
      value: errorRate,
      unit: '%',
      status,
      threshold: { warning: 5, critical: 15 },
      timestamp: Date.now()
    };
  }

  static getAllFeatureMetrics(): HealthMetric[] {
    const features = Array.from(new Set([
      ...this.featureUsage.keys(),
      ...this.featureErrors.keys()
    ]));
    
    return features.map(feature => this.getFeatureHealth(feature));
  }
}

/**
 * Main health monitoring service
 */
export class HealthMonitoringService {
  private static isMonitoring = false;
  private static monitoringInterval: NodeJS.Timeout | null = null;

  static startMonitoring(intervalMs = 30000): void {
    if (this.isMonitoring) {
      console.log('Health monitoring already running');
      return;
    }

    console.log('🏥 Starting health monitoring system...');
    this.isMonitoring = true;
    
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);

    // Initial check
    setTimeout(() => this.performHealthCheck(), 1000);
  }

  static stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Health monitoring stopped');
  }

  static async performHealthCheck(): Promise<HealthCheckResult> {
    const metrics: HealthMetric[] = [];
    
    // Collect all metrics
    metrics.push(MemoryMonitor.getCurrentUsage());
    metrics.push(NetworkMonitor.getNetworkHealth());
    metrics.push(NetworkMonitor.checkOnlineStatus());
    metrics.push(UXMonitor.getErrorRate());
    metrics.push(UXMonitor.getUserEngagement());
    metrics.push(...FeatureMonitor.getAllFeatureMetrics());
    
    // Add performance metrics
    const avgPostLoad = PerformanceMonitor.getAverageMetric('post-load');
    if (avgPostLoad > 0) {
      metrics.push({
        name: 'Average Post Load Time',
        value: avgPostLoad,
        unit: 'ms',
        status: avgPostLoad > 1000 ? 'warning' : 'healthy',
        threshold: { warning: 1000, critical: 2000 },
        timestamp: Date.now()
      });
    }

    // Calculate overall health score
    const score = this.calculateHealthScore(metrics);
    const overall = score > 80 ? 'healthy' : score > 60 ? 'warning' : 'critical';
    
    const result: HealthCheckResult = {
      overall,
      score,
      metrics,
      recommendations: this.generateRecommendations(metrics),
      timestamp: Date.now()
    };

    // Log critical issues
    if (overall === 'critical') {
      console.error('🚨 Critical health issues detected:', result);
    } else if (overall === 'warning') {
      console.warn('⚠️ Health warnings detected:', result);
    }

    return result;
  }

  private static calculateHealthScore(metrics: HealthMetric[]): number {
    if (metrics.length === 0) return 100;
    
    const weights = {
      healthy: 100,
      warning: 60,
      critical: 20
    };
    
    const totalScore = metrics.reduce((sum, metric) => {
      return sum + weights[metric.status];
    }, 0);
    
    return Math.round(totalScore / metrics.length);
  }

  private static generateRecommendations(metrics: HealthMetric[]): string[] {
    const recommendations: string[] = [];
    
    for (const metric of metrics) {
      if (metric.status === 'critical') {
        recommendations.push(`URGENT: ${metric.name} is critical (${metric.value}${metric.unit})`);
      } else if (metric.status === 'warning') {
        recommendations.push(`Consider optimizing: ${metric.name} (${metric.value}${metric.unit})`);
      }
    }

    // Add validation service recommendations
    const validationReport = ValidationService.generateReport();
    recommendations.push(...validationReport.recommendations);

    return recommendations;
  }

  // Public API methods
  static get performance() {
    return PerformanceMonitor;
  }

  static get memory() {
    return MemoryMonitor;
  }

  static get network() {
    return NetworkMonitor;
  }

  static get ux() {
    return UXMonitor;
  }

  static get features() {
    return FeatureMonitor;
  }

  static async getHealthReport(): Promise<HealthCheckResult> {
    return this.performHealthCheck();
  }
}

// Initialize monitoring in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  HealthMonitoringService.startMonitoring();
}

export default HealthMonitoringService;