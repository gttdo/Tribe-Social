import React, { useState } from 'react';
import { Button } from './ui/button';
import { validateImageFile, uploadAvatar } from '../utils/supabase/avatar-helpers';
import { toast } from 'sonner@2.0.3';

interface AvatarUploadDebugProps {
  userId: string;
}

export function AvatarUploadDebug({ userId }: AvatarUploadDebugProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testUpload = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      
      // Create a simple test image (1x1 red pixel)
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Draw a simple pattern
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(100, 100, 312, 312);
      ctx.fillStyle = '#0000FF';
      ctx.fillRect(200, 200, 112, 112);
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      });
      
      // Create file from blob
      const file = new File([blob], 'test-avatar.png', { type: 'image/png' });
      
      console.log('🧪 Created test file:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Validate file
      const validation = validateImageFile(file);
      console.log('🔍 File validation result:', validation);
      
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      
      // Create simple crop data (full image)
      const cropData = {
        x: 0,
        y: 0,
        width: 512,
        height: 512
      };
      
      console.log('📤 Starting upload test with crop data:', cropData);
      
      // Test upload
      const uploadResult = await uploadAvatar(userId, file, cropData);
      
      console.log('📝 Upload result:', uploadResult);
      setResult(uploadResult);
      
      if (uploadResult.success) {
        toast.success('Test upload successful!', {
          description: `Avatar URL: ${uploadResult.url}`
        });
      } else {
        toast.error('Test upload failed', {
          description: uploadResult.error
        });
      }
      
    } catch (error) {
      console.error('🚨 Test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult({ success: false, error: errorMessage });
      toast.error('Test failed', {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border border-muted-lavender/30 rounded-lg bg-midnight-black/50">
      <h3 className="text-pearl-white font-headline mb-4">Avatar Upload Debug</h3>
      
      <div className="space-y-4">
        <Button
          onClick={testUpload}
          disabled={isLoading}
          className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-midnight-black"
        >
          {isLoading ? 'Testing...' : 'Test Avatar Upload'}
        </Button>
        
        {result && (
          <div className="mt-4 p-3 bg-muted-lavender/5 rounded border border-muted-lavender/20">
            <p className="text-xs text-muted-lavender font-medium mb-2">Upload Result:</p>
            <pre className="text-xs text-pearl-white whitespace-pre-wrap overflow-auto max-h-40">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="text-xs text-muted-lavender">
          <p>This will create a test 512x512 colored square image and attempt to upload it as an avatar.</p>
          <p>Check the browser console for detailed logs.</p>
        </div>
      </div>
    </div>
  );
}