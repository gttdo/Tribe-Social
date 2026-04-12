import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useFormValidation } from './EnhancedTextArea';

interface BioSaveDebugProps {
  currentBio?: string;
  draftBio: string;
  isSaving: boolean;
  onTestSave?: () => void;
}

export function BioSaveDebug({ currentBio = '', draftBio, isSaving, onTestSave }: BioSaveDebugProps) {
  const validation = useFormValidation(draftBio, currentBio, {
    maxLength: 280,
    preventWhitespaceOnly: true
  });

  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    console.log('🔍 BioSaveDebug: Validation state changed:', {
      canSave: validation.canSave,
      charCount: validation.charCount,
      isOverLimit: validation.isOverLimit,
      isEmpty: validation.isEmpty,
      isWhitespaceOnly: validation.isWhitespaceOnly,
      hasChanged: validation.hasChanged,
      trimmedValue: validation.trimmedValue?.substring(0, 20) + '...'
    });
  }, [validation]);

  const handleTestClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    console.log(`🎯 BioSaveDebug: Test button clicked ${newCount} times`);
    
    if (onTestSave) {
      onTestSave();
    }
  };

  const getValidationStatus = () => {
    if (validation.canSave) return { icon: CheckCircle, color: 'text-electric-blue', bg: 'bg-electric-blue/20', status: 'Can Save' };
    if (validation.isOverLimit) return { icon: XCircle, color: 'text-glitch-red', bg: 'bg-glitch-red/20', status: 'Over Limit' };
    if (validation.isEmpty) return { icon: AlertCircle, color: 'text-soft-blush', bg: 'bg-soft-blush/20', status: 'Empty' };
    if (validation.isWhitespaceOnly) return { icon: AlertCircle, color: 'text-soft-blush', bg: 'bg-soft-blush/20', status: 'Whitespace Only' };
    if (!validation.hasChanged) return { icon: AlertCircle, color: 'text-muted-lavender', bg: 'bg-muted-lavender/20', status: 'No Changes' };
    return { icon: XCircle, color: 'text-glitch-red', bg: 'bg-glitch-red/20', status: 'Unknown Issue' };
  };

  const validationStatus = getValidationStatus();
  const StatusIcon = validationStatus.icon;

  return (
    <Card className="bg-midnight-black/50 border-muted-lavender/30 mb-4">
      <CardHeader>
        <CardTitle className="text-neon-lilac flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Bio Save Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-lavender">Current Bio Length:</span>
            <div className="font-mono text-pearl-white">{currentBio.length} chars</div>
          </div>
          <div>
            <span className="text-muted-lavender">Draft Bio Length:</span>
            <div className="font-mono text-pearl-white">{draftBio.length} chars</div>
          </div>
          <div>
            <span className="text-muted-lavender">Trimmed Length:</span>
            <div className="font-mono text-pearl-white">{validation.trimmedValue.length} chars</div>
          </div>
          <div>
            <span className="text-muted-lavender">Max Length:</span>
            <div className="font-mono text-pearl-white">280 chars</div>
          </div>
        </div>

        <div className={`p-3 rounded-lg border ${validationStatus.bg} border-opacity-30`}>
          <div className="flex items-center gap-2 mb-2">
            <StatusIcon className={`w-4 h-4 ${validationStatus.color}`} />
            <Badge variant={validation.canSave ? 'default' : 'destructive'}>
              {validationStatus.status}
            </Badge>
          </div>
          <div className="text-xs text-pearl-white space-y-1">
            <div>Can Save: <span className={validation.canSave ? 'text-electric-blue' : 'text-glitch-red'}>{validation.canSave ? 'YES' : 'NO'}</span></div>
            <div>Is Saving: <span className={isSaving ? 'text-soft-blush' : 'text-muted-lavender'}>{isSaving ? 'YES' : 'NO'}</span></div>
            <div>Has Changed: <span className={validation.hasChanged ? 'text-electric-blue' : 'text-muted-lavender'}>{validation.hasChanged ? 'YES' : 'NO'}</span></div>
            <div>Is Valid: <span className={validation.isValid ? 'text-electric-blue' : 'text-glitch-red'}>{validation.isValid ? 'YES' : 'NO'}</span></div>
            <div>Is Empty: <span className={validation.isEmpty ? 'text-muted-lavender' : 'text-electric-blue'}>{validation.isEmpty ? 'YES' : 'NO'}</span></div>
            <div>Whitespace Only: <span className={validation.isWhitespaceOnly ? 'text-glitch-red' : 'text-electric-blue'}>{validation.isWhitespaceOnly ? 'YES' : 'NO'}</span></div>
            <div>Over Limit: <span className={validation.isOverLimit ? 'text-glitch-red' : 'text-electric-blue'}>{validation.isOverLimit ? 'YES' : 'NO'}</span></div>
            <div>Is Unchanged: <span className={validation.isUnchanged ? 'text-soft-blush' : 'text-electric-blue'}>{validation.isUnchanged ? 'YES' : 'NO'}</span></div>
          </div>
          
          {!validation.canSave && (
            <div className="mt-2 p-2 bg-glitch-red/10 border border-glitch-red/30 rounded text-xs">
              <div className="font-medium text-glitch-red mb-1">Why can't I save?</div>
              {validation.isOverLimit && <div>• Text is too long ({validation.charCount}/{280} characters)</div>}
              {validation.isWhitespaceOnly && <div>• Bio contains only spaces or empty characters</div>}
              {!validation.hasChanged && <div>• No changes have been made to the bio</div>}
              {validation.isEmpty && currentBio === '' && <div>• Bio is already empty - no changes needed</div>}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-lavender">Bio Content Preview:</div>
          <div className="p-2 bg-midnight-black/50 border border-muted-lavender/20 rounded text-xs text-pearl-white font-mono break-words max-h-20 overflow-y-auto">
            "{draftBio}" → "{validation.trimmedValue}"
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleTestClick}
            className="w-full bg-electric-blue hover:bg-electric-blue/90 text-midnight-black"
          >
            Test Click Handler (Clicked {clickCount} times)
          </Button>
          
          {!validation.canSave && !validation.hasChanged && (
            <div className="p-2 bg-neon-lilac/10 border border-neon-lilac/30 rounded text-xs text-neon-lilac">
              💡 <strong>Tip:</strong> Make a small change to your bio text to enable the save button. Even adding a single space or character will allow you to save.
            </div>
          )}
        </div>

        <div className="text-xs text-muted-lavender/70 space-y-1">
          <div><strong>Button State:</strong> {(!validation.canSave || isSaving) ? 'DISABLED' : 'ENABLED'}</div>
          <div><strong>Disable Reason:</strong> {!validation.canSave ? 'Validation Failed' : isSaving ? 'Currently Saving' : 'None'}</div>
        </div>
      </CardContent>
    </Card>
  );
}