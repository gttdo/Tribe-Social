import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Edit3, Check, X, Share } from 'lucide-react';
import { SafeBio } from './SafeText';
import { updateBio } from '../utils/supabase/user-helpers';
import { updateUserBio } from '../utils/bio-fix-helpers';
import { toast } from 'sonner@2.0.3';
import { EnhancedTextArea, useFormValidation } from './EnhancedTextArea';


interface BioEditorProps {
  userId: string;
  currentBio: string | null | undefined;
  onBioUpdate: (newBio: string) => void;
  className?: string;
  username?: string;
}

export function BioEditor({ userId, currentBio, onBioUpdate, className, username }: BioEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBio, setDraftBio] = useState(currentBio || '');
  const [isSaving, setIsSaving] = useState(false);


  const maxLength = 280;
  
  // Use the form validation hook
  const validation = useFormValidation(draftBio, currentBio || '', {
    maxLength,
    preventWhitespaceOnly: true
  });

  // Debug validation state whenever it changes
  React.useEffect(() => {
    if (isEditing) {
      console.log('🔍 BioEditor: Validation state update...', {
        draftBio: `"${draftBio}"`,
        currentBio: `"${currentBio || ''}"`,
        draftBioLength: draftBio.length,
        currentBioLength: (currentBio || '').length,
        canSave: validation.canSave,
        hasChanged: validation.hasChanged,
        isValid: validation.isValid,
        trimmedDraft: `"${validation.trimmedValue}"`,
        areEqual: draftBio === currentBio,
        areTrimmedEqual: draftBio.trim() === (currentBio || '').trim(),
        validationResult: {
          isValid: validation.isValid,
          hasChanges: validation.hasChanged,
          isOnlyWhitespace: validation.isWhitespaceOnly,
          isOverLimit: validation.isOverLimit,
          isEmpty: validation.isEmpty,
          charCount: validation.charCount
        }
      });
    }
  }, [draftBio, currentBio, validation.canSave, validation.hasChanged, validation.isValid, isEditing]);

  const handleStartEditing = () => {
    console.log('🔧 BioEditor: Starting edit mode...', {
      currentBio: currentBio,
      currentBioLength: currentBio?.length || 0
    });
    setDraftBio(currentBio || '');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setDraftBio(currentBio || '');
    setIsEditing(false);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    console.log('✏️ BioEditor: Bio text changed...', {
      oldValue: `"${draftBio}"`,
      newValue: `"${newValue}"`,
      oldLength: draftBio.length,
      newLength: newValue.length,
      originalBio: `"${currentBio || ''}"`,
      isDifferentFromOriginal: newValue !== (currentBio || ''),
      isDifferentFromDraft: newValue !== draftBio,
      event: 'input_change'
    });
    
    // Force state update
    setDraftBio(newValue);
    
    // Log state change immediately
    setTimeout(() => {
      console.log('🔄 BioEditor: State should have updated:', {
        expectedNewValue: `"${newValue}"`,
        actualStateAfterUpdate: `"${draftBio}"`,
        stateUpdateWorked: newValue === draftBio
      });
    }, 10);
  };

  const handleSave = async () => {
    console.log('🚀 BioEditor: SAVE BUTTON CLICKED!');
    console.log('🔍 BioEditor: Validation check...', {
      canSave: validation.canSave,
      isSaving,
      charCount: validation.charCount,
      maxLength,
      isOverLimit: validation.isOverLimit,
      isEmpty: validation.isEmpty,
      isWhitespaceOnly: validation.isWhitespaceOnly,
      hasChanged: validation.hasChanged
    });

    if (!validation.canSave || isSaving) {
      console.warn('❌ BioEditor: Save blocked!', {
        canSave: validation.canSave,
        isSaving,
        reason: !validation.canSave ? 'validation failed' : 'already saving'
      });
      return;
    }

    console.log('🔄 BioEditor: Starting bio save process...', {
      userId: userId.substring(0, 8) + '...',
      currentBio: currentBio?.substring(0, 50) + '...',
      draftBio: draftBio.substring(0, 50) + '...',
      trimmedValue: validation.trimmedValue.substring(0, 50) + '...',
      canSave: validation.canSave
    });

    setIsSaving(true);
    const bioToSave = validation.trimmedValue; // Always save trimmed version
    
    try {
      console.log('📡 BioEditor: Calling parent onBioUpdate function...');
      
      // Let the parent component handle the actual database update
      await onBioUpdate(bioToSave);
      
      console.log('✅ BioEditor: Parent bio update completed successfully');
      setIsEditing(false);
      // Don't show toast here - let parent handle success feedback
      
    } catch (error) {
      console.error('❌ BioEditor: Parent bio update failed:', error);
      
      // Rollback draft bio on error
      setDraftBio(currentBio || '');
      
      // Let parent handle error feedback, but show a fallback message if needed
      setTimeout(() => {
        if (!document.querySelector('[data-sonner-toaster]')?.textContent?.includes('Failed')) {
          toast.error('Failed to update bio. Please try again.');
        }
      }, 100);
      
    } finally {
      console.log('🏁 BioEditor: Save process finished, setting isSaving to false');
      setIsSaving(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      const profileUrl = `${window.location.origin}/users/${username || userId}`;
      
      // Try native Web Share API first (mobile)
      if (navigator.share) {
        await navigator.share({
          title: `${username || 'Tribe Member'}'s Profile`,
          text: `Check out ${username || 'this'} profile on Tribe Board!`,
          url: profileUrl,
        });
        toast.success('Profile shared successfully!');
      } else {
        // Fallback to clipboard copy
        await navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
      // Final fallback - create temporary input for older browsers
      try {
        const profileUrl = `${window.location.origin}/users/${username || userId}`;
        const textArea = document.createElement('textarea');
        textArea.value = profileUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Profile link copied to clipboard!');
      } catch (fallbackError) {
        toast.error('Could not share profile. Please try again.');
      }
    }
  };

  const handleKeyDown = (e: React.KeyEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (validation.canSave && !isSaving) {
        handleSave();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEditing();
    }
  };

  if (isEditing) {
    return (
      <Card className={`bg-midnight-black/50 border-muted-lavender/30 ${className}`}>
        <CardContent className="p-4">
          <div className="space-y-3">

            
            {/* Enhanced textarea with built-in character counter and validation */}
            <EnhancedTextArea
              value={draftBio}
              onChange={handleBioChange}
              onKeyDown={handleKeyDown}
              placeholder="Tell your tribe a bit about yourself..."
              className="min-h-[100px] bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/60 resize-none"
              maxLength={maxLength}
              originalValue={currentBio || ''}
              autoFocus
              disabled={isSaving}
              validationMessages={{
                overLimit: `Your bio is ${validation.charCount - maxLength} characters too long`,
                whitespaceOnly: 'Bio cannot contain only spaces',
                unchanged: 'No changes made to your bio'
              }}
            />

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={(e) => {
                  console.log('🎯 BioEditor: Save button CLICKED! Event details:', {
                    event: e.type,
                    target: e.target,
                    currentTarget: e.currentTarget,
                    disabled: e.currentTarget.disabled,
                    canSave: validation.canSave,
                    isSaving,
                    validationDetails: {
                      isValid: validation.isValid,
                      hasChanged: validation.hasChanged,
                      isOnlyWhitespace: validation.isOnlyWhitespace,
                      isOverLimit: validation.isOverLimit,
                      isEmpty: validation.isEmpty,
                      trimmedValue: validation.trimmedValue,
                      charCount: validation.charCount
                    }
                  });
                  handleSave();
                }}
                disabled={!validation.canSave || isSaving}
                className={`font-body text-sm px-3 py-2 h-auto transition-all duration-200 ${
                  (!validation.canSave || isSaving)
                    ? 'bg-muted-lavender/20 text-muted-lavender/50 cursor-not-allowed' 
                    : 'bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black hover:scale-102'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-midnight-black/30 border-t-midnight-black rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 mr-2" />
                    Save Bio
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleCancelEditing}
                disabled={isSaving}
                variant="outline"
                className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 font-body text-sm px-3 py-2 h-auto transition-all duration-200"
              >
                <X className="w-3 h-3 mr-2" />
                Cancel
              </Button>
            </div>
            
            {/* Keyboard shortcuts hint */}
            <div className="text-xs text-muted-lavender/60 font-body text-center">
              <span className="hidden sm:inline">Press Cmd/Ctrl + Enter to save, Esc to cancel</span>
              <span className="sm:hidden">Tap Save to confirm changes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`group ${className}`}>
      <SafeBio 
        description={currentBio}
        className="text-muted-lavender font-body text-sm leading-relaxed mb-3"
        showFullOnClick={true}
      />
      
      <div className="flex flex-row items-center gap-2">
        <Button
          onClick={handleStartEditing}
          variant="outline"
          className="flex-1 border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 font-body text-xs px-3 py-2 h-auto transition-all duration-200"
        >
          <Edit3 className="w-3 h-3 mr-1" />
          Edit Bio
        </Button>
        
        <Button
          onClick={handleShareProfile}
          variant="outline"
          className="flex-1 border-electric-blue/30 text-electric-blue hover:text-pearl-white hover:bg-electric-blue/10 font-body text-xs px-3 py-2 h-auto transition-all duration-200"
        >
          <Share className="w-3 h-3 mr-1" />
          Share Profile
        </Button>
      </div>
    </div>
  );
}