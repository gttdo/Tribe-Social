import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { supabase } from '../utils/supabase/client';
import { updateUserBio } from '../utils/bio-fix-helpers';
import { toast } from 'sonner@2.0.3';

export function BioButtonTest() {
  const [testBio, setTestBio] = useState('Test bio content');
  const [currentBio, setCurrentBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [validationInfo, setValidationInfo] = useState<any>({});

  React.useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        
        // Get current bio
        const { data, error } = await supabase
          .from('users')
          .select('bio, description')
          .eq('id', session.user.id)
          .single();
        
        if (!error && data) {
          const bio = data.bio || data.description || '';
          setCurrentBio(bio);
          setTestBio(bio || 'Updated bio content');
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  // Simulate the same validation logic as BioEditor
  const validateBio = (value: string, original: string) => {
    const trimmedValue = value.trim();
    const originalTrimmed = original.trim();
    const charCount = value.length;
    const maxLength = 280;
    
    const isOnlyWhitespace = trimmedValue.length === 0 && value.length > 0;
    const isOverLimit = charCount > maxLength;
    const isUnchanged = trimmedValue === originalTrimmed;
    const isEmpty = value.length === 0;
    
    const isValid = !isOnlyWhitespace && !isOverLimit;
    const hasChanges = !isUnchanged;
    const canSave = isValid && (hasChanges || (isEmpty && originalTrimmed.length > 0));
    
    return {
      isValid,
      hasChanges,
      canSave,
      isOnlyWhitespace,
      isOverLimit,
      isUnchanged,
      isEmpty,
      charCount,
      trimmedValue,
      originalTrimmed
    };
  };

  React.useEffect(() => {
    const validation = validateBio(testBio, currentBio);
    setValidationInfo(validation);
    console.log('🧪 Bio validation update:', validation);
  }, [testBio, currentBio]);

  const testSave = async () => {
    if (!userId) {
      toast.error('No user ID found');
      return;
    }

    console.log('🧪 Testing bio save with validation:', validationInfo);

    if (!validationInfo.canSave) {
      console.warn('❌ Save blocked by validation:', {
        canSave: validationInfo.canSave,
        isValid: validationInfo.isValid,
        hasChanges: validationInfo.hasChanges,
        reason: !validationInfo.isValid ? 'invalid content' : 'no changes'
      });
      toast.error(`Save blocked: ${!validationInfo.isValid ? 'Invalid content' : 'No changes made'}`);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🚀 Attempting bio save...');
      const result = await updateUserBio(userId, testBio);
      
      if (result.success) {
        console.log('✅ Bio save successful:', result);
        toast.success(`Bio saved successfully! (${result.method})`);
        setCurrentBio(testBio); // Update current bio to match
      } else {
        console.error('❌ Bio save failed:', result);
        toast.error(`Bio save failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Bio save exception:', error);
      toast.error('Bio save failed with exception');
    } finally {
      setIsLoading(false);
    }
  };

  const forceTestSave = async () => {
    if (!userId) {
      toast.error('No user ID found');
      return;
    }

    console.log('🧪 Force testing bio save (bypassing validation)...');

    setIsLoading(true);
    try {
      // Direct database update test
      const { data, error } = await supabase
        .from('users')
        .update({ 
          bio: testBio.trim(),
          description: testBio.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('❌ Force save failed:', error);
        toast.error(`Force save failed: ${error.message}`);
      } else {
        console.log('✅ Force save successful:', data);
        toast.success('Force save successful!');
        setCurrentBio(testBio);
      }
    } catch (error) {
      console.error('❌ Force save exception:', error);
      toast.error('Force save failed with exception');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-midnight-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-midnight-black border-muted-lavender/30">
        <CardHeader>
          <CardTitle className="text-pearl-white font-headline">Bio Button Test</CardTitle>
          <div className="text-sm text-muted-lavender">
            User ID: {userId ? userId.substring(0, 8) + '...' : 'Not found'}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <label className="text-pearl-white text-sm font-medium mb-2 block">
              Current Bio (from database)
            </label>
            <div className="p-3 bg-midnight-black/30 rounded border border-muted-lavender/20 text-pearl-white text-sm">
              "{currentBio || 'No bio found'}"
            </div>
          </div>

          <div>
            <label className="text-pearl-white text-sm font-medium mb-2 block">
              Test Bio Content
            </label>
            <Textarea
              value={testBio}
              onChange={(e) => setTestBio(e.target.value)}
              placeholder="Enter test bio..."
              className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white"
              maxLength={280}
            />
            <div className="text-xs text-muted-lavender/60 mt-1">
              {testBio.length}/280 characters
            </div>
          </div>

          {/* Validation Status */}
          <div className="bg-midnight-black/30 p-3 rounded border border-muted-lavender/20">
            <h4 className="text-pearl-white font-medium mb-2">Validation Status</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2 rounded ${validationInfo.canSave ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                Can Save: {validationInfo.canSave ? 'Yes' : 'No'}
              </div>
              <div className={`p-2 rounded ${validationInfo.isValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                Is Valid: {validationInfo.isValid ? 'Yes' : 'No'}
              </div>
              <div className={`p-2 rounded ${validationInfo.hasChanges ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                Has Changes: {validationInfo.hasChanges ? 'Yes' : 'No'}
              </div>
              <div className={`p-2 rounded ${validationInfo.isOnlyWhitespace ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                Whitespace Only: {validationInfo.isOnlyWhitespace ? 'Yes' : 'No'}
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-lavender">
              Original (trimmed): "{validationInfo.originalTrimmed || ''}"<br/>
              Current (trimmed): "{validationInfo.trimmedValue || ''}"<br/>
              Are Equal: {validationInfo.isUnchanged ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={testSave}
              disabled={isLoading || !userId}
              className={`${validationInfo.canSave 
                ? 'bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black' 
                : 'bg-muted-lavender/20 text-muted-lavender/50 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Testing...' : 'Test Save (With Validation)'}
            </Button>

            <Button
              onClick={forceTestSave}
              disabled={isLoading || !userId}
              className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black"
            >
              {isLoading ? 'Testing...' : 'Force Save (No Validation)'}
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-glitch-red/30 text-glitch-red hover:bg-glitch-red/10"
            >
              Close & Reload
            </Button>
          </div>

          <div className="text-xs text-muted-lavender/60 bg-midnight-black/30 p-3 rounded border border-muted-lavender/20">
            <p><strong>Debug Info:</strong></p>
            <p>1. This test mimics the exact validation logic from BioEditor</p>
            <p>2. The "Test Save" button will be disabled if validation fails</p>
            <p>3. The "Force Save" button bypasses validation entirely</p>
            <p>4. Check browser console for detailed logs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}