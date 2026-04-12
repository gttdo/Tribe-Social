import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { 
  ArrowLeft, 
  Camera, 
  Save, 
  User, 
  FileText, 
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { updateUserProfile } from '../utils/edge';
import { SimpleAvatarUpload } from './SimpleAvatarUpload';

interface EditProfilePageProps {
  currentUser: {
    id: string;
    username: string;
    description?: string;
    avatar_url?: string;
  } | null;
  onBack: () => void;
  onProfileUpdate?: (updatedUser: any) => void;
}

export function EditProfilePage({ currentUser, onBack, onProfileUpdate }: EditProfilePageProps) {
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [profileImageUrl, setProfileImageUrl] = useState(currentUser?.avatar_url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [errors, setErrors] = useState({
    username: '',
    bio: ''
  });

  // Initialize form only once when component mounts or when user ID actually changes
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
      setBio(currentUser.bio || '');
      setProfileImageUrl(currentUser.avatar_url || '');
    }
  }, [currentUser?.id]); // Only depend on user ID, not the entire object

  // Validate username
  const validateUsername = (value: string) => {
    if (!value.trim()) {
      return 'Username is required';
    }
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 30) {
      return 'Username must be less than 30 characters';
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
      return 'Username can only contain letters, numbers, dots, hyphens, and underscores';
    }
    return '';
  };

  // Validate bio
  const validateBio = (value: string) => {
    if (value.length > 150) {
      return 'Bio must be less than 150 characters';
    }
    return '';
  };

  // Handle username change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    
    const error = validateUsername(value);
    setErrors(prev => ({ ...prev, username: error }));
  };

  // Handle bio change
  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBio(value);
    
    const error = validateBio(value);
    setErrors(prev => ({ ...prev, bio: error }));
  };

  // Handle avatar update
  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setProfileImageUrl(newAvatarUrl);
    setIsAvatarDialogOpen(false);
    toast.success('Profile picture updated!');
  };

  // Handle form submission
  const handleSave = async () => {
    if (!currentUser?.id) {
      toast.error('User not found');
      return;
    }

    // Validate all fields
    const usernameError = validateUsername(username);
    const bioError = validateBio(bio);

    if (usernameError || bioError) {
      setErrors({
        username: usernameError,
        bio: bioError
      });
      return;
    }

    setIsLoading(true);

    try {
      const updateData = {
        username: username.trim(),
        bio: bio.trim(), // Send as 'bio' to match server expectations  
        avatar_url: profileImageUrl
      };

      const result = await updateUserProfile(updateData);

      if (result.success) {
        toast.success('Profile updated successfully!');
        
        // Call the update callback if provided
        if (onProfileUpdate) {
          onProfileUpdate({
            ...currentUser,
            ...updateData
          });
        }
        
        onBack();
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if form has changes
  const hasChanges = 
    username !== (currentUser?.username || '') ||
    bio !== (currentUser?.bio || '') ||
    profileImageUrl !== (currentUser?.avatar_url || '');

  // Check if form is valid
  const isFormValid = 
    !errors.username && 
    !errors.bio && 
    username.trim().length >= 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-pearl-white hover:bg-muted-lavender/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-medium text-pearl-white">Edit Profile</h1>
          </div>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || !isFormValid || isLoading}
            className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-midnight-black/80 to-midnight-black/60 border-muted-lavender/30">
          <CardContent className="p-6 space-y-6">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 sm:w-28 sm:h-28">
                  <AvatarImage src={profileImageUrl} />
                  <AvatarFallback className="bg-gradient-to-r from-neon-lilac to-electric-blue text-midnight-black text-xl">
                    {username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Camera overlay */}
                <div
                  className="absolute inset-0 rounded-full"
                >
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profileImageUrl} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-r from-neon-lilac to-electric-blue text-midnight-black text-xl">
                      {username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setIsAvatarDialogOpen(true)}
                className="border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10"
              >
                <Camera className="w-4 h-4 mr-2" />
                Change Photo
              </Button>
            </div>

            {/* Username Section */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-pearl-white">
                <User className="w-4 h-4" />
                <span>Username</span>
              </label>
              <Input
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter username"
                className={`bg-muted-lavender/10 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/70 ${
                  errors.username ? 'border-glitch-red' : ''
                }`}
                maxLength={30}
              />
              {errors.username && (
                <p className="text-glitch-red text-xs">{errors.username}</p>
              )}
              <p className="text-muted-lavender/70 text-xs">
                {username.length}/30 characters
              </p>
            </div>

            {/* Bio Section */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-pearl-white">
                <FileText className="w-4 h-4" />
                <span>Bio</span>
              </label>
              <Textarea
                value={bio}
                onChange={handleBioChange}
                placeholder="Tell us about yourself..."
                className={`bg-muted-lavender/10 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/70 min-h-[80px] resize-none ${
                  errors.bio ? 'border-glitch-red' : ''
                }`}
                maxLength={150}
              />
              {errors.bio && (
                <p className="text-glitch-red text-xs">{errors.bio}</p>
              )}
              <p className="text-muted-lavender/70 text-xs">
                {bio.length}/150 characters
              </p>
            </div>

            {/* Help Text */}
            <div className="bg-muted-lavender/5 border border-muted-lavender/20 rounded-lg p-4">
              <p className="text-muted-lavender/80 text-xs leading-relaxed">
                Your username must be unique and can only contain letters, numbers, dots, hyphens, and underscores. 
                Your bio is a great way to tell other tribe members about yourself!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avatar Upload Dialog */}
      {isAvatarDialogOpen && (
        <SimpleAvatarUpload
          isOpen={isAvatarDialogOpen}
          onClose={() => setIsAvatarDialogOpen(false)}
          userId={currentUser?.id || ''}
          onAvatarUpdate={handleAvatarUpdate}
        />
      )}
    </div>
  );
}