import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Camera, Mic, Settings, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsGranted: (camera: boolean, mic: boolean) => void;
}

export function PermissionsDialog({ isOpen, onClose, onPermissionsGranted }: PermissionsDialogProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const requestPermissions = async () => {
    setIsRequesting(true);
    let cameraGranted = false;
    let micGranted = false;

    try {
      // Request camera permission
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
        cameraGranted = true;
        // Stop the stream immediately after getting permission
        cameraStream.getTracks().forEach(track => track.stop());
        toast.success('Camera access granted!');
      } catch (cameraError) {
        console.log('Camera permission denied:', cameraError);
        toast.error('Camera access denied');
      }

      // Request microphone permission
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: false 
        });
        micGranted = true;
        // Stop the stream immediately after getting permission
        micStream.getTracks().forEach(track => track.stop());
        toast.success('Microphone access granted!');
      } catch (micError) {
        console.log('Microphone permission denied:', micError);
        toast.error('Microphone access denied');
      }

      onPermissionsGranted(cameraGranted, micGranted);
      
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast.error('Error requesting permissions');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    onPermissionsGranted(false, false);
    toast.info('You can enable permissions later in Settings');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-neon-lilac/10 to-electric-blue/10 border-neon-lilac/30">
        <DialogHeader>
          <DialogTitle className="font-headline text-pearl-white text-xl font-medium text-center">
            Welcome to Tribe Board!
          </DialogTitle>
          <DialogDescription className="text-muted-lavender font-body text-sm text-center">
            To get the most out of your experience, we'd like to request access to your camera and microphone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Permission Icons */}
          <div className="flex justify-center space-x-4">
            <div className="p-3 rounded-full bg-neon-lilac/20 border border-neon-lilac/30">
              <Camera className="w-6 h-6 text-neon-lilac" />
            </div>
            <div className="p-3 rounded-full bg-electric-blue/20 border border-electric-blue/30">
              <Mic className="w-6 h-6 text-electric-blue" />
            </div>
          </div>
          
          {/* Permission Items */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-neon-lilac/10 border border-neon-lilac/20 mt-1">
                <Camera className="w-4 h-4 text-neon-lilac" />
              </div>
              <div>
                <p className="font-body text-pearl-white font-medium text-sm">Camera Access</p>
                <p className="font-body text-muted-lavender text-xs">
                  Take photos and videos for your posts and stories
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-electric-blue/10 border border-electric-blue/20 mt-1">
                <Mic className="w-4 h-4 text-electric-blue" />
              </div>
              <div>
                <p className="font-body text-pearl-white font-medium text-sm">Microphone Access</p>
                <p className="font-body text-muted-lavender text-xs">
                  Record audio notes and add sound to your content
                </p>
              </div>
            </div>
          </div>
          
          {/* Settings Note */}
          <div className="flex items-center space-x-2 p-3 bg-muted-lavender/5 border border-muted-lavender/20 rounded-lg">
            <Settings className="w-4 h-4 text-muted-lavender" />
            <p className="font-body text-muted-lavender text-xs">
              You can change these permissions anytime in your Settings
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            <Button
              onClick={requestPermissions}
              disabled={isRequesting}
              className="w-full bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-midnight-black font-medium py-3 rounded-xl transition-all duration-300"
            >
              {isRequesting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-midnight-black/20 border-t-midnight-black rounded-full animate-spin" />
                  <span>Requesting Permissions...</span>
                </div>
              ) : (
                'Allow Camera & Microphone'
              )}
            </Button>
            
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="w-full text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 font-medium py-3 rounded-xl transition-all duration-300"
            >
              Skip for Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}