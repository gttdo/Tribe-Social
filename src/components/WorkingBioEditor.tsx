import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Edit3, Check, X } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface WorkingBioEditorProps {
  userId: string;
  currentBio: string | null | undefined;
  onBioUpdate: (newBio: string) => void;
  className?: string;
  username?: string;
}

export function WorkingBioEditor({ userId, currentBio, onBioUpdate, className, username }: WorkingBioEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBio, setDraftBio] = useState(currentBio || '');
  const [isSaving, setIsSaving] = useState(false);

  const maxLength = 280;

  const handleStartEditing = () => {
    console.log('🔧 Starting bio edit mode...');
    setDraftBio(currentBio || '');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setDraftBio(currentBio || '');
    setIsEditing(false);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftBio(e.target.value);
  };

  const handleSave = async () => {
    console.log('🚀 SAVE BIO CLICKED!');
    
    if (isSaving) return;
    
    const trimmedBio = draftBio.trim();
    
    // Validation
    if (trimmedBio.length > maxLength) {
      toast.error(`Bio is ${trimmedBio.length - maxLength} characters too long`);
      return;
    }
    
    if (trimmedBio === (currentBio || '').trim()) {
      toast.info('No changes made to your bio');
      setIsEditing(false);
      return;
    }

    console.log('💾 Saving bio to database...', { userId, trimmedBio });
    setIsSaving(true);

    try {
      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ bio: trimmedBio })
        .eq('id', userId);

      if (error) {
        console.error('❌ Database update failed:', error);
        toast.error('Failed to update bio. Please try again.');
        return;
      }

      console.log('✅ Bio updated successfully in database');
      
      // Update parent component
      onBioUpdate(trimmedBio);
      
      // Success feedback
      toast.success('Bio updated successfully! 🎉');
      setIsEditing(false);
      
    } catch (error) {
      console.error('❌ Bio update error:', error);
      toast.error('Failed to update bio. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Card className={`bg-midnight-black/50 border-muted-lavender/30 ${className}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <textarea
              value={draftBio}
              onChange={handleBioChange}
              placeholder="Tell your tribe a bit about yourself..."
              className="w-full min-h-[100px] bg-midnight-black/50 border border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/60 resize-none rounded-lg p-3"
              maxLength={maxLength}
              autoFocus
              disabled={isSaving}
            />
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-lavender/60">
                {draftBio.length}/{maxLength}
              </span>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black text-sm px-4 py-2"
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
                  className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 text-sm px-4 py-2"
                >
                  <X className="w-3 h-3 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`group ${className}`}>
      {/* Mobile: Bio text + full-width edit button */}
      <div className="block md:hidden space-y-3">
        {currentBio ? (
          <p className="text-pearl-white/90 text-sm leading-relaxed">
            {currentBio}
          </p>
        ) : (
          <p className="text-muted-lavender/60 text-sm italic">
            No bio yet
          </p>
        )}
        
        <Button
          onClick={handleStartEditing}
          variant="outline"
          className="w-full border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 font-body"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Bio
        </Button>
      </div>

      {/* Desktop: Bio text + edit button */}
      <div className="hidden md:block space-y-3">
        {currentBio ? (
          <p className="text-pearl-white/90 text-sm leading-relaxed">
            {currentBio}
          </p>
        ) : (
          <p className="text-muted-lavender/60 text-sm italic">
            No bio yet
          </p>
        )}
        
        <Button
          onClick={handleStartEditing}
          variant="outline"
          size="sm"
          className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 font-body"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Bio
        </Button>
      </div>
    </div>
  );
}