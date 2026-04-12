import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Edit3, Check, X, Share } from 'lucide-react';
import { SafeBio } from './SafeText';
import { updateBio } from '../utils/supabase/user-helpers';
import { updateUserBio } from '../utils/bio-fix-helpers';
import { toast } from 'sonner@2.0.3';
import { Textarea } from './ui/textarea';

interface BioEditorFixedProps {
  userId: string;
  currentBio: string | null | undefined;
  onBioUpdate: (newBio: string) => void;
  className?: string;
  username?: string;
}

export function BioEditorFixed({ userId, currentBio, onBioUpdate, className, username }: BioEditorFixedProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBio, setDraftBio] = useState(currentBio || '');
  const [isSaving, setIsSaving] = useState(false);

  const maxLength = 280;

  // Simple validation logic - more permissive than the original
  const validateBio = (value: string, original: string) => {
    const trimmedValue = value.trim();
    const originalTrimmed = (original || '').trim();
    const charCount = value.length;
    
    const isOverLimit = charCount > maxLength;
    const hasActualChanges = trimmedValue !== originalTrimmed;
    const isValidLength = !isOverLimit;
    
    // Allow saving if:
    // 1. Content is within limits AND
    // 2. (Has changes OR clearing existing bio OR setting initial bio)
    const canSave = isValidLength && (hasActualChanges || (trimmedValue === '' && originalTrimmed !== ''));
    
    console.log('🔍 BioEditorFixed: Validation details:', {
      value: `"${value}"`,
      trimmedValue: `"${trimmedValue}"`,
      original: `"${original || ''}"`,
      originalTrimmed: `"${originalTrimmed}"`,
      charCount,
      maxLength,
      isOverLimit,
      hasActualChanges,
      isValidLength,
      canSave,
      reason: !canSave ? (isOverLimit ? 'over limit' : 'no changes') : 'valid'
    });
    
    return {
      canSave,
      isOverLimit,
      hasActualChanges,
      isValidLength,
      charCount,
      trimmedValue
    };
  };

  const validation = validateBio(draftBio, currentBio || '');

  // Debug validation whenever it changes
  useEffect(() => {
    if (isEditing) {
      console.log('🔍 BioEditorFixed: Current validation state:', validation);
    }
  }, [draftBio, currentBio, isEditing]);

  const handleStartEditing = () => {
    console.log('🔧 BioEditorFixed: Starting edit mode...', {
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
    console.log('✏️ BioEditorFixed: Bio text changed...', {
      oldValue: `"${draftBio}"`,
      newValue: `"${newValue}"`,
      oldLength: draftBio.length,
      newLength: newValue.length
    });
    setDraftBio(newValue);
  };

  const handleSave = async () => {
    console.log('🚀 BioEditorFixed: SAVE BUTTON CLICKED!');
    console.log('🔍 BioEditorFixed: Pre-save validation check...', validation);

    if (!validation.canSave || isSaving) {
      console.warn('❌ BioEditorFixed: Save blocked!', {
        canSave: validation.canSave,
        isSaving,
        reason: !validation.canSave ? 'validation failed' : 'already saving'
      });
      
      if (validation.isOverLimit) {
        toast.error(`Bio is too long. Please keep it under ${maxLength} characters.`);
      } else if (!validation.hasActualChanges) {
        toast.info('No changes made to your bio.');
      }
      return;
    }

    console.log('🔄 BioEditorFixed: Starting bio save process...');

    setIsSaving(true);
    const previousBio = currentBio;
    const bioToSave = validation.trimmedValue; // Always save trimmed version
    
    // Optimistic update
    onBioUpdate(bioToSave);

    try {
      console.log('📡 BioEditorFixed: Calling enhanced bio update function...');
      console.time('BioUpdate');
      
      // Try the enhanced bio update function with multiple fallbacks
      const result = await updateUserBio(userId, bioToSave);
      
      console.timeEnd('BioUpdate');
      
      if (result.success) {
        console.log('✅ BioEditorFixed: Bio update successful via method:', result.method);
        setIsEditing(false);
        toast.success(`Bio updated successfully!`);
      } else {
        throw new Error(result.error || 'Bio update failed');
      }
      
    } catch (error) {
      console.error('❌ BioEditorFixed: Enhanced bio update failed:', error);
      
      // Try the original updateBio function as final fallback
      try {
        console.log('🔄 BioEditorFixed: Trying original updateBio as fallback...');
        await updateBio(userId, bioToSave);
        console.log('✅ BioEditorFixed: Original updateBio fallback successful');
        setIsEditing(false);
        toast.success('Bio updated successfully!');
      } catch (fallbackError) {
        console.error('❌ BioEditorFixed: All bio update methods failed:', fallbackError);
        
        // Rollback optimistic update
        onBioUpdate(previousBio || '');
        setDraftBio(previousBio || '');
        
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Failed to update bio:', errorMessage);
        toast.error(`Could not update bio: ${errorMessage}`);
      }
    } finally {
      console.log('🏁 BioEditorFixed: Save process finished');
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
      toast.error('Could not share profile. Please try again.');
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
            {/* Simple textarea */}
            <div className="relative">
              <Textarea
                value={draftBio}
                onChange={handleBioChange}
                onKeyDown={handleKeyDown}
                placeholder="Tell your tribe a bit about yourself..."
                className="min-h-[100px] bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/60 resize-none pr-16"
                maxLength={maxLength}
                autoFocus
                disabled={isSaving}
              />
              
              {/* Character counter */}
              <div className={`absolute bottom-2 right-2 text-xs font-body tabular-nums ${
                validation.isOverLimit ? 'text-glitch-red' : 
                validation.charCount > maxLength * 0.9 ? 'text-electric-blue' :
                'text-muted-lavender/60'
              } bg-midnight-black/80 px-1.5 py-0.5 rounded`}>
                {validation.charCount}<span className="text-muted-lavender/40">/{maxLength}</span>
              </div>
            </div>

            {/* Validation message */}
            {validation.isOverLimit && (
              <div className="text-xs text-glitch-red font-body">
                Your bio is {validation.charCount - maxLength} characters too long
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={(e) => {
                  console.log('🎯 BioEditorFixed: Save button CLICKED! Button state:', {
                    disabled: e.currentTarget.disabled,
                    canSave: validation.canSave,
                    isSaving,
                    isOverLimit: validation.isOverLimit,
                    hasChanges: validation.hasActualChanges
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
            
            {/* Debug info (can be removed in production) */}
            <div className="text-xs text-muted-lavender/60 font-body text-center">
              <span className="hidden sm:inline">Press Cmd/Ctrl + Enter to save, Esc to cancel</span>
              <span className="sm:hidden">Tap Save to confirm changes</span>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 p-2 bg-midnight-black/30 rounded text-left">
                  Debug: canSave={validation.canSave ? 'true' : 'false'}, 
                  changes={validation.hasActualChanges ? 'true' : 'false'}, 
                  overLimit={validation.isOverLimit ? 'true' : 'false'}
                </div>
              )}
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