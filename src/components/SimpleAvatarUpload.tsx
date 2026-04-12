import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from './ui/drawer';
import { Button } from './ui/button';
import { Upload, Camera, X, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { uploadAvatar } from '../utils/supabase/avatar-helpers';
import { ensureStorageBuckets } from '../utils/storage-setup';
import { StorageSetupInstructions } from './StorageSetupInstructions';
import { StableCameraModal } from './StableCameraModal';
import { AvatarCropper } from './AvatarCropper';
import { useIsMobile } from './ui/use-mobile';

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SimpleAvatarUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarUpdate: (avatarUrl: string) => void;
  userId: string;
}

export function SimpleAvatarUpload({ 
  isOpen, 
  onClose, 
  onAvatarUpdate, 
  userId 
}: SimpleAvatarUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropData, setCropData] = useState<CropData>({ x: 0, y: 0, width: 512, height: 512 });
  const [isUploading, setIsUploading] = useState(false);
  const [isSettingUpStorage, setIsSettingUpStorage] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const handleFileSelect = (file: File) => {
    console.log('📁 File selected:', file.name, file.size, file.type);
    
    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File must be less than 2MB');
      return;
    }
    
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const setupStorage = async () => {
    setIsSettingUpStorage(true);
    setStorageError(null);
    
    try {
      console.log('🔧 Setting up storage buckets...');
      const setup = await ensureStorageBuckets();
      
      if (setup.success) {
        console.log('✅ Storage setup successful');
        setStorageError(null);
        toast.success('Storage ready for uploads!');
      } else {
        console.error('❌ Storage setup failed:', setup.errors);
        setStorageError(setup.errors.join('; '));
        toast.error('Storage setup failed. Please try again.');
      }
    } catch (error) {
      console.error('💥 Storage setup exception:', error);
      setStorageError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Storage setup failed.');
    } finally {
      setIsSettingUpStorage(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setStorageError(null);
    
    try {
      console.log('📤 Starting avatar upload with crop data:', cropData);
      const result = await uploadAvatar(userId, selectedFile, cropData);
      
      if (result.success && result.url) {
        console.log('✅ Avatar upload successful');
        onAvatarUpdate(result.url);
        toast.success('Avatar updated successfully!');
        onClose();
      } else {
        console.error('❌ Avatar upload failed:', result.error);
        
        // Check if this is a storage issue
        if (result.error?.includes('storage') || result.error?.includes('bucket') || result.error?.includes('manual setup')) {
          setStorageError(result.error);
          toast.error('Storage setup required. See instructions below.');
        } else {
          toast.error(result.error || 'Upload failed');
        }
      }
    } catch (error) {
      console.error('💥 Upload exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('storage') || errorMessage.includes('bucket') || errorMessage.includes('manual setup')) {
        setStorageError(errorMessage);
        toast.error('Storage setup required. See instructions below.');
      } else {
        toast.error('Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = (file: File, type: 'image' | 'video') => {
    console.log('📷 Camera captured file:', file.name, file.type, file.size);
    
    // Only accept images for avatars
    if (type !== 'image') {
      toast.error('Please capture a photo, not a video');
      return;
    }
    
    // Process the captured file
    handleFileSelect(file);
    setShowCameraModal(false);
  };

  const handleCameraClose = () => {
    console.log('📷 Camera modal closed');
    setShowCameraModal(false);
  };

  const reset = () => {
    setSelectedFile(null);
    setCropData({ x: 0, y: 0, width: 512, height: 512 });
    setIsUploading(false);
    setIsSettingUpStorage(false);
    setStorageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen]);

  // Show camera modal
  if (showCameraModal) {
    return (
      <StableCameraModal
        onClose={handleCameraClose}
        onCapture={handleCameraCapture}
        avatarMode={true}
      />
    );
  }

  // Shared content component
  const avatarContent = (
    <div className="space-y-6 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {!selectedFile ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-muted-lavender" />
            </div>
            <p className="text-pearl-white font-medium">
              Choose your avatar photo
            </p>
            <p className="text-sm text-muted-lavender">
              JPG, PNG • Max 2MB
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1 border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10 min-h-[44px]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
            
            <Button
              onClick={() => {
                console.log('📷 Camera button clicked - opening camera modal');
                setShowCameraModal(true);
              }}
              variant="outline"
              className="flex-1 border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10 min-h-[44px]"
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview and Cropping */}
          <div className="space-y-3">
            <div className="text-center space-y-1">
              <p className="text-pearl-white font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-lavender">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Drag to position, use slider to zoom
              </p>
            </div>
            
            <AvatarCropper
              imageFile={selectedFile}
              onCropChange={setCropData}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setSelectedFile(null)}
              variant="outline"
              className="flex-1 border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10 min-h-[44px]"
            >
              <X className="w-4 h-4 mr-2" />
              Change
            </Button>
            
            <Button
              onClick={handleUpload}
              disabled={isUploading || isSettingUpStorage}
              className="flex-1 bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black min-h-[44px]"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Storage Error Section */}
      {storageError && (
        <StorageSetupInstructions 
          compact={true}
          onDismiss={() => setStorageError(null)}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-gradient-to-br from-midnight-black/95 to-midnight-black/90 border-muted-lavender/30 border-t-2 max-h-[90vh]">
          <DrawerHeader className="text-left pb-4 shrink-0">
            <DrawerTitle className="text-pearl-white font-headline text-lg">
              Upload Avatar
            </DrawerTitle>
            <DrawerDescription className="text-muted-lavender text-sm">
              Choose a photo to use as your profile picture. You can upload from your device or take a new photo.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 min-h-0">
            {avatarContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] bg-gradient-to-br from-midnight-black/90 to-midnight-black/80 border-muted-lavender/30 overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-pearl-white font-headline">
            Upload Avatar
          </DialogTitle>
          <DialogDescription className="text-muted-lavender">
            Choose a photo to use as your profile picture. You can upload from your device or take a new photo.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0">
          {avatarContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}