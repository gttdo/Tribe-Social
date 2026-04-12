/**
 * Comprehensive UUID validation guards to prevent undefined values from reaching the database
 * This module provides additional safety layers beyond the existing validation middleware
 */

import { validateUUID, isValidUUID } from './validation-middleware';

/**
 * Enhanced UUID validation with detailed logging
 */
export function validateUUIDWithContext(
  value: any, 
  context: string = 'unknown'
): string | null {
  if (value === undefined) {
    console.error(`[UUID Guard] Undefined value detected in ${context}`);
    return null;
  }
  
  if (value === null) {
    console.warn(`[UUID Guard] Null value detected in ${context}`);
    return null;
  }
  
  if (typeof value !== 'string') {
    console.error(`[UUID Guard] Non-string value in ${context}:`, typeof value, value);
    return null;
  }
  
  const trimmed = value.trim();
  if (trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN' || trimmed === '') {
    console.error(`[UUID Guard] Invalid string value in ${context}:`, trimmed);
    return null;
  }
  
  const validated = validateUUID(value);
  if (!validated) {
    console.error(`[UUID Guard] UUID validation failed in ${context}:`, value);
    return null;
  }
  
  return validated;
}

/**
 * Guard function for post ID operations
 */
export function guardPostId(postId: any, operation: string = 'unknown operation'): string | null {
  const validated = validateUUIDWithContext(postId, `post ID for ${operation}`);
  if (!validated) {
    console.error(`[Post ID Guard] Blocking ${operation} due to invalid post ID:`, postId);
  }
  return validated;
}

/**
 * Guard function for user ID operations
 */
export function guardUserId(userId: any, operation: string = 'unknown operation'): string | null {
  const validated = validateUUIDWithContext(userId, `user ID for ${operation}`);
  if (!validated) {
    console.error(`[User ID Guard] Blocking ${operation} due to invalid user ID:`, userId);
  }
  return validated;
}

/**
 * Guard function for arrays of UUIDs
 */
export function guardUUIDArray(
  uuids: any[], 
  operation: string = 'unknown operation'
): string[] {
  if (!Array.isArray(uuids)) {
    console.error(`[UUID Array Guard] Expected array but got ${typeof uuids} for ${operation}`);
    return [];
  }
  
  const validUUIDs: string[] = [];
  const invalidCount = {
    undefined: 0,
    null: 0,
    nonString: 0,
    invalidFormat: 0,
    emptyString: 0
  };
  
  for (let i = 0; i < uuids.length; i++) {
    const uuid = uuids[i];
    
    if (uuid === undefined) {
      invalidCount.undefined++;
      continue;
    }
    
    if (uuid === null) {
      invalidCount.null++;
      continue;
    }
    
    if (typeof uuid !== 'string') {
      invalidCount.nonString++;
      continue;
    }
    
    const trimmed = uuid.trim();
    if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') {
      invalidCount.emptyString++;
      continue;
    }
    
    if (!isValidUUID(trimmed)) {
      invalidCount.invalidFormat++;
      continue;
    }
    
    validUUIDs.push(trimmed);
  }
  
  // Log validation results
  const totalInvalid = Object.values(invalidCount).reduce((sum, count) => sum + count, 0);
  if (totalInvalid > 0) {
    console.warn(`[UUID Array Guard] Filtered ${totalInvalid} invalid UUIDs for ${operation}:`, invalidCount);
  }
  
  console.log(`[UUID Array Guard] ${operation}: ${validUUIDs.length}/${uuids.length} valid UUIDs`);
  return validUUIDs;
}

/**
 * Safe database query wrapper that validates all UUID parameters
 */
export async function safeDBQuery<T>(
  queryFn: () => Promise<T>,
  context: string,
  uuidParams: Record<string, any> = {}
): Promise<T> {
  // Validate all UUID parameters before executing query
  for (const [paramName, value] of Object.entries(uuidParams)) {
    if (value !== null && value !== undefined) {
      const validated = validateUUIDWithContext(value, `${context}.${paramName}`);
      if (!validated) {
        throw new Error(`Invalid UUID for ${paramName} in ${context}: ${value}`);
      }
    }
  }
  
  try {
    return await queryFn();
  } catch (error) {
    // Check if the error is UUID-related
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('invalid input syntax for type uuid')) {
      console.error(`[Safe DB Query] UUID validation error in ${context}:`, error);
      console.error(`[Safe DB Query] Parameters were:`, uuidParams);
      throw new Error(`UUID validation failed in ${context}: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Validate database response UUIDs to catch any corrupted data
 */
export function validateResponseUUIDs(
  data: any[], 
  idField: string = 'id',
  context: string = 'database response'
): any[] {
  if (!Array.isArray(data)) {
    return data;
  }
  
  return data.filter(item => {
    if (!item || typeof item !== 'object') {
      console.warn(`[Response UUID Guard] Invalid item in ${context}:`, item);
      return false;
    }
    
    const id = item[idField];
    if (!validateUUIDWithContext(id, `${context}.${idField}`)) {
      console.warn(`[Response UUID Guard] Filtering out item with invalid ${idField} in ${context}:`, id);
      return false;
    }
    
    return true;
  });
}