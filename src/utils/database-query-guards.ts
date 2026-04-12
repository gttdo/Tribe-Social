/**
 * Database Query Guards - Ultimate protection against invalid UUID values
 * This module provides the final layer of protection before database queries
 */

import { validateUUID, isValidUUID } from './validation-middleware';

/**
 * Critical UUID validation that throws on any invalid input
 */
export function criticalUUIDCheck(value: any, context: string): string {
  console.log(`[Critical UUID Check] ${context}:`, value, typeof value);
  
  // Check for undefined/null
  if (value === undefined) {
    const error = `CRITICAL: Undefined value passed to ${context}`;
    console.error(error);
    throw new Error(error);
  }
  
  if (value === null) {
    const error = `CRITICAL: Null value passed to ${context}`;
    console.error(error);
    throw new Error(error);
  }
  
  // Check for non-string types
  if (typeof value !== 'string') {
    const error = `CRITICAL: Non-string value (${typeof value}) passed to ${context}: ${value}`;
    console.error(error);
    throw new Error(error);
  }
  
  // Check for literal string "undefined", "null", etc.
  if (value === 'undefined' || value === 'null' || value === 'NaN' || value === '') {
    const error = `CRITICAL: Invalid string value "${value}" passed to ${context}`;
    console.error(error);
    throw new Error(error);
  }
  
  // Trim and re-check
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') {
    const error = `CRITICAL: Invalid trimmed value "${trimmed}" (was "${value}") passed to ${context}`;
    console.error(error);
    throw new Error(error);
  }
  
  // Final UUID validation
  if (!isValidUUID(trimmed)) {
    const error = `CRITICAL: Invalid UUID format "${trimmed}" passed to ${context}`;
    console.error(error);
    throw new Error(error);
  }
  
  console.log(`[Critical UUID Check] ${context} passed validation:`, trimmed);
  return trimmed;
}

/**
 * Critical array validation
 */
export function criticalUUIDArrayCheck(values: any[], context: string): string[] {
  console.log(`[Critical UUID Array Check] ${context}:`, values);
  
  if (!Array.isArray(values)) {
    const error = `CRITICAL: Non-array passed to ${context}: ${typeof values}`;
    console.error(error);
    throw new Error(error);
  }
  
  const validUUIDs: string[] = [];
  
  for (let i = 0; i < values.length; i++) {
    try {
      const validUUID = criticalUUIDCheck(values[i], `${context}[${i}]`);
      validUUIDs.push(validUUID);
    } catch (error) {
      console.error(`[Critical UUID Array Check] Skipping invalid item at index ${i}:`, error);
      // Continue processing other items instead of failing entire array
    }
  }
  
  console.log(`[Critical UUID Array Check] ${context}: ${validUUIDs.length}/${values.length} valid UUIDs`);
  return validUUIDs;
}

/**
 * Supabase query wrapper with critical validation
 */
export async function criticalDBQuery<T>(
  queryFn: () => Promise<T>,
  context: string,
  uuidParams: Record<string, any> = {}
): Promise<T> {
  console.log(`[Critical DB Query] Starting ${context} with params:`, uuidParams);
  
  // Validate all UUID parameters with critical checks
  const validatedParams: Record<string, string> = {};
  
  for (const [paramName, value] of Object.entries(uuidParams)) {
    if (value !== null && value !== undefined) {
      try {
        validatedParams[paramName] = criticalUUIDCheck(value, `${context}.${paramName}`);
      } catch (error) {
        console.error(`[Critical DB Query] Parameter validation failed for ${paramName}:`, error);
        throw error;
      }
    }
  }
  
  console.log(`[Critical DB Query] All parameters validated for ${context}:`, validatedParams);
  
  try {
    const result = await queryFn();
    console.log(`[Critical DB Query] ${context} completed successfully`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for UUID-related database errors
    if (errorMessage.includes('invalid input syntax for type uuid')) {
      console.error(`[Critical DB Query] UUID ERROR in ${context}:`, error);
      console.error(`[Critical DB Query] Parameters that were validated:`, validatedParams);
      console.error(`[Critical DB Query] Original parameters:`, uuidParams);
      
      // This is the critical error we're trying to catch
      throw new Error(`DATABASE UUID ERROR in ${context}: ${errorMessage}. Validated params: ${JSON.stringify(validatedParams)}`);
    }
    
    throw error;
  }
}

/**
 * Intercept and validate Supabase .in() queries
 */
export function validateSupabaseInQuery(values: any[], context: string): string[] {
  console.log(`[Supabase IN Query] Validating for ${context}:`, values);
  
  if (!Array.isArray(values) || values.length === 0) {
    console.warn(`[Supabase IN Query] Empty or invalid array for ${context}`);
    return [];
  }
  
  const validatedUUIDs = criticalUUIDArrayCheck(values, context);
  
  if (validatedUUIDs.length === 0) {
    console.warn(`[Supabase IN Query] No valid UUIDs found for ${context}`);
    return [];
  }
  
  console.log(`[Supabase IN Query] ${context} validated: ${validatedUUIDs.length} UUIDs`);
  return validatedUUIDs;
}

/**
 * Validate individual Supabase .eq() queries
 */
export function validateSupabaseEqQuery(value: any, context: string): string {
  console.log(`[Supabase EQ Query] Validating for ${context}:`, value, typeof value);
  
  const validated = criticalUUIDCheck(value, context);
  console.log(`[Supabase EQ Query] ${context} validated:`, validated);
  
  return validated;
}