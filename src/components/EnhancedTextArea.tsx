import React, { useState, useMemo, forwardRef } from 'react';
import { Textarea } from './ui/textarea';
import { AlertCircle } from 'lucide-react';

interface EnhancedTextAreaProps extends React.ComponentProps<typeof Textarea> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  maxLength?: number;
  label?: string;
  showCharacterCounter?: boolean;
  preventWhitespaceOnly?: boolean;
  originalValue?: string; // For tracking changes
  validationMessages?: {
    overLimit?: string;
    whitespaceOnly?: string;
    unchanged?: string;
  };
  className?: string;
}

export const EnhancedTextArea = forwardRef<HTMLTextAreaElement, EnhancedTextAreaProps>(
  ({
    value,
    onChange,
    maxLength = 280,
    label,
    showCharacterCounter = true,
    preventWhitespaceOnly = true,
    originalValue = '',
    validationMessages = {},
    className = '',
    placeholder,
    disabled,
    ...props
  }, ref) => {
    // Memoized computed values for better performance
    const charCount = useMemo(() => value.length, [value]);
    const trimmedValue = useMemo(() => value.trim(), [value]);
    const originalTrimmed = useMemo(() => originalValue.trim(), [originalValue]);
    
    // Validation states
    const isOnlyWhitespace = useMemo(() => 
      preventWhitespaceOnly && trimmedValue.length === 0 && value.length > 0, 
      [trimmedValue, value, preventWhitespaceOnly]
    );
    const isOverLimit = useMemo(() => charCount > maxLength, [charCount, maxLength]);
    const isUnchanged = useMemo(() => trimmedValue === originalTrimmed, [trimmedValue, originalTrimmed]);
    const isEmpty = useMemo(() => value.length === 0, [value]);
    
    // Character counter color based on usage
    const getCharCountColor = useMemo(() => {
      if (isOverLimit) return 'text-glitch-red';
      if (charCount > maxLength * 0.9) return 'text-electric-blue';
      if (charCount > maxLength * 0.7) return 'text-soft-blush';
      return 'text-muted-lavender/60';
    }, [charCount, maxLength, isOverLimit]);

    // Get validation message
    const getValidationMessage = () => {
      if (isOverLimit) {
        return {
          type: 'error' as const,
          message: validationMessages.overLimit || `${charCount - maxLength} characters over limit`
        };
      }
      if (isOnlyWhitespace) {
        return {
          type: 'warning' as const,
          message: validationMessages.whitespaceOnly || 'Content cannot contain only spaces'
        };
      }
      if (isUnchanged && !isEmpty) {
        return {
          type: 'info' as const,
          message: validationMessages.unchanged || 'No changes made'
        };
      }
      return null;
    };

    const validationMessage = getValidationMessage();

    return (
      <div className="space-y-3">
        {/* Label */}
        {label && (
          <label className="text-pearl-white font-body text-sm font-medium">
            {label}
          </label>
        )}
        
        {/* Textarea with counter */}
        <div className="relative">
          <Textarea
            ref={ref}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`${className} pr-16`}
            {...props}
          />
          
          {/* Character counter - positioned inside textarea */}
          {showCharacterCounter && (
            <div className={`absolute bottom-2 right-2 text-xs font-body tabular-nums ${getCharCountColor} bg-midnight-black/80 px-1.5 py-0.5 rounded`}>
              {charCount}<span className="text-muted-lavender/40">/{maxLength}</span>
            </div>
          )}
        </div>
        
        {/* Validation messages */}
        {validationMessage && (
          <div className={`flex items-center gap-2 text-xs font-body ${
            validationMessage.type === 'error' ? 'text-glitch-red' :
            validationMessage.type === 'warning' ? 'text-electric-blue' :
            'text-muted-lavender/70'
          }`}>
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{validationMessage.message}</span>
          </div>
        )}
      </div>
    );
  }
);

EnhancedTextArea.displayName = 'EnhancedTextArea';

// Helper hook for form validation
export const useFormValidation = (
  value: string, 
  originalValue: string = '', 
  options: {
    maxLength?: number;
    preventWhitespaceOnly?: boolean;
  } = {}
) => {
  const { maxLength = 280, preventWhitespaceOnly = true } = options;
  
  return useMemo(() => {
    const trimmedValue = value.trim();
    const originalTrimmed = originalValue.trim();
    const charCount = value.length;
    
    const isOnlyWhitespace = preventWhitespaceOnly && trimmedValue.length === 0 && value.length > 0;
    const isOverLimit = charCount > maxLength;
    const isUnchanged = trimmedValue === originalTrimmed;
    const isEmpty = value.length === 0;
    
    const isValid = !isOnlyWhitespace && !isOverLimit;
    const hasChanges = !isUnchanged;
    // Allow saving if valid and has changes, OR if clearing a non-empty bio
    const canSave = isValid && (hasChanges || (isEmpty && originalTrimmed.length > 0));
    
    return {
      isValid,
      hasChanges,
      hasChanged: hasChanges, // Alias for compatibility
      canSave,
      isOnlyWhitespace,
      isWhitespaceOnly: isOnlyWhitespace, // Alias for compatibility
      isOverLimit,
      isUnchanged,
      isEmpty,
      charCount,
      trimmedValue
    };
  }, [value, originalValue, maxLength, preventWhitespaceOnly]);
};