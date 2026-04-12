/**
 * Validation middleware for preventing invalid UUID values from reaching the database
 */

/**
 * Validates if a string is a proper UUID format
 */
export function isValidUUID(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') {
    console.warn('[UUID Validation] Received non-string value:', typeof str, str);
    return false;
  }
  
  const cleanStr = str.trim();
  if (cleanStr === '' || cleanStr === 'undefined' || cleanStr === 'null' || cleanStr === 'NaN') {
    console.warn('[UUID Validation] Received invalid string value:', cleanStr);
    return false;
  }
  
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValid = uuidPattern.test(cleanStr);
  
  if (!isValid) {
    console.warn('[UUID Validation] Invalid UUID format:', cleanStr);
  }
  
  return isValid;
}

/**
 * Validates and sanitizes a single UUID
 * Returns null if invalid, preventing database errors
 */
export function validateUUID(uuid: any): string | null {
  if (uuid === null || uuid === undefined) {
    console.warn('[UUID Validation] Received null or undefined value');
    return null;
  }
  
  const stringUuid = String(uuid).trim();
  
  if (stringUuid === '' || 
      stringUuid === 'undefined' || 
      stringUuid === 'null' || 
      stringUuid === 'NaN') {
    console.warn('[UUID Validation] Received invalid string value:', stringUuid);
    return null;
  }
  
  if (!isValidUUID(stringUuid)) {
    console.warn('[UUID Validation] Invalid UUID format:', stringUuid);
    return null;
  }
  
  return stringUuid;
}

/**
 * Validates and filters an array of UUIDs
 * Returns only valid UUIDs, preventing database errors
 */
export function validateUUIDs(uuids: any[]): string[] {
  if (!Array.isArray(uuids)) {
    console.warn('[UUID Validation] Expected array but received:', typeof uuids);
    return [];
  }
  
  const validUuids: string[] = [];
  
  for (const uuid of uuids) {
    const validUuid = validateUUID(uuid);
    if (validUuid) {
      validUuids.push(validUuid);
    }
  }
  
  console.log(`[UUID Validation] Filtered ${uuids.length} UUIDs to ${validUuids.length} valid ones`);
  return validUuids;
}

/**
 * Middleware function to validate query parameters that should be UUIDs
 */
export function validateQueryUUIDs<T extends Record<string, any>>(
  params: T
): T & { __validated: boolean } {
  const validated = { ...params, __validated: true };
  
  // Common UUID parameter names to validate
  const uuidParams = ['id', 'postId', 'userId', 'tribeId', 'post_id', 'user_id', 'tribe_id'];
  
  for (const param of uuidParams) {
    if (param in validated) {
      const validatedUuid = validateUUID(validated[param]);
      if (validatedUuid === null && validated[param] !== null) {
        // If validation failed but original wasn't null, log it
        console.warn(`[UUID Validation] Removing invalid UUID parameter: ${param}=${validated[param]}`);
        delete validated[param];
      } else if (validatedUuid) {
        validated[param] = validatedUuid;
      }
    }
  }
  
  return validated;
}

/**
 * Validates post IDs specifically for the social feed context
 */
export function validatePostIds(postIds: any[]): string[] {
  console.log('[Post ID Validation] Validating post IDs:', postIds);
  
  if (!Array.isArray(postIds)) {
    console.warn('[Post ID Validation] Expected array but received:', typeof postIds);
    return [];
  }
  
  const validIds = validateUUIDs(postIds);
  
  if (validIds.length === 0 && postIds.length > 0) {
    console.warn('[Post ID Validation] All post IDs were invalid, this might indicate a data issue:', postIds);
  }
  
  console.log('[Post ID Validation] Valid IDs after filtering:', validIds);
  return validIds;
}

/**
 * Safe database query wrapper that validates UUIDs before querying
 */
export function safeQuery<T>(
  queryFn: () => Promise<T>,
  context: string,
  uuidsToValidate: Record<string, any> = {}
): Promise<T> {
  // Validate all UUID parameters before running the query
  for (const [name, value] of Object.entries(uuidsToValidate)) {
    if (value !== null && !validateUUID(value)) {
      console.error(`[Safe Query] Invalid UUID for ${name} in ${context}:`, value);
      throw new Error(`Invalid UUID format for ${name}`);
    }
  }
  
  return queryFn();
}