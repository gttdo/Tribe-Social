import GraphemeSplitter from 'grapheme-splitter';

/**
 * Normalizes thought text by cleaning it and ensuring proper character limits
 * @param input Raw text input from user
 * @returns Normalized text safe for submission
 */
export function normalizeThought(input: string): string {
  if (!input || typeof input !== 'string') {
    console.log('❌ normalizeThought: input is not a valid string');
    return '';
  }
  
  // Very conservative cleaning - only strip truly problematic characters
  const cleaned = input
    .replace(/[\u200B-\u200D\uFEFF]/g, '')       // zero-width chars only
    .replace(/\s+/g, ' ');                       // collapse multiple spaces to single space (but don't trim yet)
  
  // Only remove obvious HTML tags (be very conservative)
  const noHtml = cleaned.replace(/<script[^>]*>.*?<\/script>/gi, '')  // Remove script tags
                        .replace(/<[^>]{1,50}>/g, '');                // Only remove short tags to avoid false positives
  
  // Trim only at the end
  const trimmed = noHtml.trim();
  
  // Return early if empty after cleaning
  if (!trimmed) {
    return '';
  }
  
  // Try GraphemeSplitter with better error handling
  try {
    const splitter = new GraphemeSplitter();
    const parts = splitter.splitGraphemes(trimmed);
    const result = parts.slice(0, 250).join('');
    return result;
  } catch (error) {
    // Robust fallback to regular slice if GraphemeSplitter fails
    console.warn('⚠️ GraphemeSplitter failed, using character-based fallback:', error);
    const fallbackResult = trimmed.slice(0, 250);
    return fallbackResult;
  }
}

/**
 * Gets the grapheme count for display purposes
 * @param text Text to count
 * @returns Number of graphemes (emoji-safe count)
 */
export function getGraphemeCount(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  try {
    const splitter = new GraphemeSplitter();
    const count = splitter.countGraphemes(text);
    return count;
  } catch (error) {
    // Fallback to regular length if GraphemeSplitter fails
    console.warn('⚠️ GraphemeSplitter failed for counting, using character fallback:', error);
    const fallbackCount = text.length;
    return fallbackCount;
  }
}

/**
 * Validates thought text by first normalizing it (for consistent validation)
 * @param text Text to validate
 * @returns Validation result with error message if invalid
 */
export function validateThoughtText(text: string): { isValid: boolean; error?: string; graphemeCount: number } {
  // Fallback validation for safety - check raw input first
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      isValid: false,
      error: "Thought can't be empty. Add a few words.",
      graphemeCount: 0
    };
  }
  
  // Normalize the text to see what it will look like after processing
  const normalizedText = normalizeThought(text);
  
  // Double-check: if normalization failed but raw input has content, use raw input
  let textToValidate = normalizedText;
  if (!normalizedText && text.trim()) {
    console.log('⚠️ Normalization failed, using raw input for validation');
    textToValidate = text.trim().slice(0, 250); // Basic fallback
  }
  
  if (!textToValidate || !textToValidate.trim()) {
    return {
      isValid: false,
      error: "Thought can't be empty. Add a few words.",
      graphemeCount: 0
    };
  }
  
  const graphemeCount = getGraphemeCount(textToValidate);
  
  if (graphemeCount > 250) {
    return {
      isValid: false,
      error: 'Keep thoughts under 250 characters.',
      graphemeCount
    };
  }
  
  return {
    isValid: true,
    graphemeCount
  };
}