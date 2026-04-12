import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Textarea } from './ui/textarea';
import { Edit3, Check, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';

interface SimpleBioEditorProps {
  userId: string;
  currentBio: string | null | undefined;
  onBioUpdate: (newBio: string) => void;
  className?: string;
  username?: string;
}

export function SimpleBioEditor({ userId, currentBio, onBioUpdate, className, username }: SimpleBioEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBio, setDraftBio] = useState(currentBio || '');
  const [isSaving, setIsSaving] = useState(false);

  const maxLength = 280;
  const charCount = draftBio.length;
  const hasChanged = draftBio.trim() !== (currentBio || '').trim();
  const isOverLimit = charCount > maxLength;
  const canSave = hasChanged && !isOverLimit && !isSaving;

  console.log('🔍 SimpleBioEditor: Validation state:', {
    draftBio,
    currentBio,
    charCount,
    hasChanged,
    isOverLimit,
    canSave,
    isSaving
  });

  const handleStartEditing = () => {
    console.log('✏️ SimpleBioEditor: Starting edit mode');
    setDraftBio(currentBio || '');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    console.log('❌ SimpleBioEditor: Canceling edit');
    setDraftBio(currentBio || '');
    setIsEditing(false);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    console.log('✏️ SimpleBioEditor: Text changed:', { newValue, length: newValue.length });
    setDraftBio(newValue);
  };

  const handleSave = async () => {
    console.log('🚀 SimpleBioEditor: SAVE CLICKED!', {
      canSave,
      isSaving,
      draftBio,
      userId: userId.substring(0, 8) + '...'
    });

    if (!canSave) {
      console.warn('❌ SimpleBioEditor: Save blocked - validation failed');
      return;
    }

    setIsSaving(true);
    const bioToSave = draftBio.trim();
    
    try {
      console.log('💾 SimpleBioEditor: Attempting to save bio...');
      
      // Method 1: Try profiles table first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId,
          bio: bioToSave,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select('id, bio');

      if (!profileError && profileData) {
        console.log('✅ SimpleBioEditor: Profiles table update successful');
        onBioUpdate(bioToSave);
        setIsEditing(false);
        toast.success('Bio updated successfully! 🎉');
        return;
      }

      console.log('⚠️ SimpleBioEditor: Profiles table failed, trying users table');
      
      // Method 2: Try users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({ 
          bio: bioToSave,
          description: bioToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, bio, description');

      if (!userError && userData) {
        console.log('✅ SimpleBioEditor: Users table update successful');
        onBioUpdate(bioToSave);
        setIsEditing(false);
        toast.success('Bio updated successfully! 🎉');
        return;
      }

      console.error('❌ SimpleBioEditor: All methods failed');
      throw new Error('Failed to update bio');
      
    } catch (error) {
      console.error('❌ SimpleBioEditor: Save error:', error);
      toast.error('Failed to save bio. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (canSave) {
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
                isOverLimit ? 'text-glitch-red' : 'text-muted-lavender/60'
              } bg-midnight-black/80 px-1.5 py-0.5 rounded`}>
                {charCount}<span className="text-muted-lavender/40">/{maxLength}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={!canSave}
                className={`font-body text-sm px-3 py-2 h-auto transition-all duration-200 ${
                  !canSave
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
            
            {/* Status messages */}
            {isOverLimit && (
              <div className="text-xs text-glitch-red">
                Bio is {charCount - maxLength} characters too long
              </div>
            )}
            
            {!hasChanged && !isSaving && (
              <div className="text-xs text-muted-lavender/60">
                No changes made
              </div>
            )}
            
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
      <div className="text-muted-lavender font-body text-sm leading-relaxed mb-3">
        {currentBio || 'No bio yet. Click Edit Bio to add one!'}
      </div>
      
      <Button
        onClick={handleStartEditing}
        variant="outline"
        className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 font-body text-xs px-3 py-2 h-auto transition-all duration-200"
      >
        <Edit3 className="w-3 h-3 mr-1" />
        Edit Bio
      </Button>
    </div>
  );
}