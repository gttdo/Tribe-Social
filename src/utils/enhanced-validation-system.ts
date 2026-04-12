/**
 * Enhanced Validation System for Tribe Board
 * 
 * Provides comprehensive validation with error recovery,
 * performance monitoring, and centralized error handling
 */

import { supabase } from './supabase/client';
import { validateUserId } from './user-posts-helpers';

/**
 * Validation result interface
 */
interface ValidationResult<T> {
  isValid: boolean;
  value: T | null;
  error?: string;
  metadata?: {
    originalValue: unknown;
    validationType: string;
    timestamp: number;
    context?: string;
  };
}

/**
 * Enhanced UUID validation with caching and metrics
 */
class UUIDValidator {
  private static cache = new Map<string, boolean>();
  private static metrics = {
    validations: 0,
    cacheHits: 0,
    invalidCount: 0,
    commonErrors: new Map<string, number>()
  };

  // Comprehensive UUID patterns
  private static patterns = {
    standard: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    loose: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  };

  static validate(
    value: unknown, 
    context = 'UUID validation'
  ): ValidationResult<string> {
    this.metrics.validations++;
    
    const result: ValidationResult<string> = {
      isValid: false,
      value: null,
      metadata: {
        originalValue: value,
        validationType: 'uuid',
        timestamp: Date.now(),
        context
      }
    };

    // Fast path for null/undefined
    if (!value) {
      result.error = 'Value is null or undefined';
      this.incrementError(result.error);
      return result;
    }

    // Type check
    if (typeof value !== 'string') {
      result.error = `Expected string, got ${typeof value}`;
      this.incrementError(result.error);
      return result;
    }

    const stringValue = value.trim();

    // Check cache first
    if (this.cache.has(stringValue)) {
      this.metrics.cacheHits++;
      result.isValid = this.cache.get(stringValue)!;
      result.value = result.isValid ? stringValue : null;
      return result;
    }

    // Check for common invalid values
    const invalidStrings = ['undefined', 'null', 'NaN', '', 'false', '0'];
    if (invalidStrings.includes(stringValue.toLowerCase())) {
      result.error = `Invalid UUID string: "${stringValue}"`;
      this.cache.set(stringValue, false);
      this.incrementError(result.error);
      return result;
    }

    // Pattern validation (try strict first, then loose)
    const isValidStrict = this.patterns.standard.test(stringValue);
    const isValidLoose = this.patterns.loose.test(stringValue);
    
    if (isValidStrict || isValidLoose) {
      result.isValid = true;
      result.value = stringValue;
      this.cache.set(stringValue, true);
      
      if (!isValidStrict && isValidLoose) {
        console.warn(`UUID ${stringValue} passed loose validation but not strict - consider updating`);
      }
    } else {
      result.error = `Invalid UUID format: "${stringValue}"`;
      this.cache.set(stringValue, false);
      this.incrementError(result.error);
      this.metrics.invalidCount++;
    }

    return result;
  }

  private static incrementError(error: string) {
    const count = this.metrics.commonErrors.get(error) || 0;
    this.metrics.commonErrors.set(error, count + 1);
  }

  static getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate: this.metrics.cacheHits / Math.max(this.metrics.validations, 1),
      commonErrors: Array.from(this.metrics.commonErrors.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    };
  }

  static clearCache() {
    this.cache.clear();
  }

  static resetMetrics() {
    this.metrics = {
      validations: 0,
      cacheHits: 0,
      invalidCount: 0,
      commonErrors: new Map()
    };
  }
}

/**
 * Database query validation
 */
export class DatabaseQueryValidator {
  /**
   * Validates parameters before database queries
   */
  static validateQueryParams(params: Record<string, unknown>): ValidationResult<Record<string, any>> {
    const result: ValidationResult<Record<string, any>> = {
      isValid: true,
      value: {},
      metadata: {
        originalValue: params,
        validationType: 'query-params',
        timestamp: Date.now()
      }
    };

    const validated: Record<string, any> = {};
    const errors: string[] = [];

    for (const [key, value] of Object.entries(params)) {
      if (key.includes('_id') || key === 'id' || key.includes('Id')) {
        // UUID field validation
        const uuidResult = UUIDValidator.validate(value, `Query param: ${key}`);
        if (uuidResult.isValid && uuidResult.value) {
          validated[key] = uuidResult.value;
        } else {
          errors.push(`Invalid UUID for ${key}: ${uuidResult.error}`);
        }
      } else if (typeof value === 'string' && value.trim()) {
        validated[key] = value.trim();
      } else if (value !== null && value !== undefined) {
        validated[key] = value;
      }
    }

    if (errors.length > 0) {
      result.isValid = false;
      result.error = errors.join('; ');
      result.value = null;
    } else {
      result.value = validated;
    }

    return result;
  }

  /**
   * Safe database query with automatic validation
   */
  static async safeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    context = 'Database query'
  ): Promise<ValidationResult<T>> {
    const result: ValidationResult<T> = {
      isValid: false,
      value: null,
      metadata: {
        originalValue: null,
        validationType: 'database-query',
        timestamp: Date.now(),
        context
      }
    };

    try {
      const { data, error } = await queryFn();
      
      if (error) {
        result.error = `Database error: ${error.message || error}`;
        console.error(`[${context}] Database error:`, error);
        return result;
      }

      if (data === null || data === undefined) {
        result.error = 'No data returned from query';
        console.warn(`[${context}] No data returned`);
        return result;
      }

      result.isValid = true;
      result.value = data;
      return result;

    } catch (exception) {
      result.error = `Query exception: ${exception instanceof Error ? exception.message : String(exception)}`;
      console.error(`[${context}] Query exception:`, exception);
      return result;
    }
  }
}

/**
 * User input validation
 */
export class UserInputValidator {
  static validateUsername(username: unknown): ValidationResult<string> {
    const result: ValidationResult<string> = {
      isValid: false,
      value: null,
      metadata: {
        originalValue: username,
        validationType: 'username',
        timestamp: Date.now()
      }
    };

    if (typeof username !== 'string') {
      result.error = `Username must be string, got ${typeof username}`;
      return result;
    }

    const trimmed = username.trim();
    
    if (trimmed.length < 3) {
      result.error = 'Username must be at least 3 characters';
      return result;
    }

    if (trimmed.length > 30) {
      result.error = 'Username must be less than 30 characters';
      return result;
    }

    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(trimmed)) {
      result.error = 'Username can only contain letters, numbers, underscore, and dash';
      return result;
    }

    result.isValid = true;
    result.value = trimmed;
    return result;
  }

  static validatePostContent(content: unknown, maxLength = 5000): ValidationResult<string> {
    const result: ValidationResult<string> = {
      isValid: false,
      value: null,
      metadata: {
        originalValue: content,
        validationType: 'post-content',
        timestamp: Date.now()
      }
    };

    if (typeof content !== 'string') {
      result.error = `Content must be string, got ${typeof content}`;
      return result;
    }

    const trimmed = content.trim();
    
    if (trimmed.length === 0) {
      result.error = 'Content cannot be empty';
      return result;
    }

    if (trimmed.length > maxLength) {
      result.error = `Content must be less than ${maxLength} characters`;
      return result;
    }

    result.isValid = true;
    result.value = trimmed;
    return result;
  }
}

/**
 * Centralized validation service
 */
export class ValidationService {
  static uuid = UUIDValidator;
  static database = DatabaseQueryValidator;
  static userInput = UserInputValidator;

  /**
   * Comprehensive validation report
   */
  static generateReport() {
    return {
      timestamp: new Date().toISOString(),
      uuid: UUIDValidator.getMetrics(),
      recommendations: this.getRecommendations()
    };
  }

  private static getRecommendations(): string[] {
    const recommendations: string[] = [];
    const uuidMetrics = UUIDValidator.getMetrics();

    if (uuidMetrics.cacheHitRate < 0.5 && uuidMetrics.validations > 100) {
      recommendations.push('Consider increasing UUID validation cache size');
    }

    if (uuidMetrics.invalidCount > uuidMetrics.validations * 0.1) {
      recommendations.push('High rate of invalid UUIDs detected - check data sources');
    }

    const topError = uuidMetrics.commonErrors[0];
    if (topError && topError[1] > 10) {
      recommendations.push(`Most common validation error: "${topError[0]}" - consider fixing upstream`);
    }

    return recommendations;
  }

  /**
   * Emergency validation bypass (use with extreme caution)
   */
  static emergencyBypass<T>(
    value: T, 
    reason: string,
    context = 'Emergency bypass'
  ): ValidationResult<T> {
    console.warn(`🚨 VALIDATION BYPASS: ${reason} (Context: ${context})`);
    
    return {
      isValid: true,
      value,
      metadata: {
        originalValue: value,
        validationType: 'emergency-bypass',
        timestamp: Date.now(),
        context: `${context} - BYPASSED: ${reason}`
      }
    };
  }
}

// Export convenience functions
export const validateUUID = UUIDValidator.validate;
export const validateQueryParams = DatabaseQueryValidator.validateQueryParams;
export const safeQuery = DatabaseQueryValidator.safeQuery;
export const validateUsername = UserInputValidator.validateUsername;
export const validatePostContent = UserInputValidator.validatePostContent;

export default ValidationService;