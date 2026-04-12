import React, { useState } from 'react';
import { Button } from './ui/button';
import { TribeAvatar } from './Avatar';
import { AvatarUploadDialog } from './AvatarUploadDialog';
import { removeAvatar } from '../utils/supabase/avatar-helpers';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AvatarSettingsSectionProps {
  userId: string;
  username: string;
  currentAvatarUrl?: string | null;
  lastUpdated?: string | null;
  onAvatarUpdate?: (avatarUrl: string | null) => void;
}

export function AvatarSettingsSection({ 
  userId, 
  username, 
  currentAvatarUrl, 
  lastUpdated,
  onAvatarUpdate 
}: AvatarSettingsSectionProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    onAvatarUpdate?.(newAvatarUrl);
    setUploadDialogOpen(false);
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsRemoving(true);
      
      const result = await removeAvatar(userId);
      
      if (result.success) {
        onAvatarUpdate?.(null);
        toast.success('Avatar removed', {
          description: 'Your profile picture has been removed and will show your initials.'
        });
      } else {
        throw new Error(result.error || 'Failed to remove avatar');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Try again.';
      toast.error('Failed to remove avatar', {
        description: errorMessage
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const formatLastUpdated = (dateString: string | null) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return null;
    }
  };

  const hasAvatar = Boolean(currentAvatarUrl);
  const formattedDate = formatLastUpdated(lastUpdated);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar display */}
          <div className="flex items-center space-x-4">
            <TribeAvatar 
              src={currentAvatarUrl}
              username={username}
              size="xl"
              alt={username}
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{username}</h4>
              <p className="text-sm text-muted-foreground">
                Use a clear headshot. Square image recommended.
              </p>
              {formattedDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {formattedDate}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => setUploadDialogOpen(true)}
              className="flex-1 sm:flex-initial"
            >
              <Camera className="w-4 h-4 mr-2" />
              {hasAvatar ? 'Change photo' : 'Add photo'}
            </Button>

            {hasAvatar && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    disabled={isRemoving}
                    className="flex-1 sm:flex-initial"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove photo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your profile will show your initials instead of your photo. 
                      You can always add a new photo later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleRemoveAvatar}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Remove photo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Help text */}
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Tips for a great profile photo:</strong>
            </p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-1">
              <li>• Use good lighting and a clear background</li>
              <li>• Center your face in the frame</li>
              <li>• Choose a recent photo that looks like you</li>
              <li>• Square images work best (will be displayed as a circle)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <AvatarUploadDialog
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onAvatarUpdate={handleAvatarUpdate}
        userId={userId}
        currentAvatarUrl={currentAvatarUrl}
      />
    </>
  );
}