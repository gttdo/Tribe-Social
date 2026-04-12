import React, { useState, useEffect } from 'react';
import { AvatarSettingsSection } from './AvatarSettingsSection';
import { TribeAvatar } from './Avatar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { initializeAvatarsStorage } from '../utils/supabase/avatar-setup';

interface AvatarUploadDemoProps {
  onBack?: () => void;
  userInfo?: {
    id: string;
    username: string;
    email: string;
  };
}

export function AvatarUploadDemo({ onBack, userInfo }: AvatarUploadDemoProps) {
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Initialize avatars storage on component mount
  useEffect(() => {
    initializeAvatarsStorage();
  }, []);

  // Mock user data for demo
  const mockUser = userInfo || {
    id: 'demo-user-123',
    username: 'TribeUser',
    email: 'user@tribe.app'
  };

  const handleAvatarUpdate = (newAvatarUrl: string | null) => {
    setCurrentAvatarUrl(newAvatarUrl);
    setLastUpdated(new Date().toISOString());
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-headline font-semibold">Avatar Upload Demo</h1>
            <p className="text-muted-foreground">
              Complete profile photo upload flow for Tribe.app
            </p>
          </div>
        </div>

        {/* Current Avatar Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Current Avatar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <TribeAvatar 
                src={currentAvatarUrl}
                username={mockUser.username}
                size="2xl"
                alt={mockUser.username}
              />
              <div>
                <h3 className="font-medium">{mockUser.username}</h3>
                <p className="text-sm text-muted-foreground">{mockUser.email}</p>
                {lastUpdated && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated: {new Date(lastUpdated).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Settings */}
        <AvatarSettingsSection
          userId={mockUser.id}
          username={mockUser.username}
          currentAvatarUrl={currentAvatarUrl}
          lastUpdated={lastUpdated}
          onAvatarUpdate={handleAvatarUpdate}
        />

        {/* Feature Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Features Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Upload Methods</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Drag and drop files</li>
                  <li>• Click to browse files</li>
                  <li>• Camera capture (mobile)</li>
                  <li>• File validation & error handling</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Image Processing</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Square crop with zoom/pan</li>
                  <li>• Live circular preview</li>
                  <li>• Auto WebP conversion</li>
                  <li>• Multiple size generation</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">User Experience</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Mobile-first responsive design</li>
                  <li>• Progress indicators</li>
                  <li>• Success/error toasts</li>
                  <li>• Keyboard navigation</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Storage & Performance</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Supabase Storage integration</li>
                  <li>• Optimized image formats</li>
                  <li>• Cache busting via versioning</li>
                  <li>• Responsive image srcsets</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Specs */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">File Requirements</h4>
                <div className="bg-muted/50 p-3 rounded-md text-sm">
                  <p><strong>Formats:</strong> JPG, PNG, WebP</p>
                  <p><strong>Min size:</strong> 256×256 px</p>
                  <p><strong>Max file size:</strong> 2 MB</p>
                  <p><strong>Auto-downscale:</strong> ≤ 1024×1024 px</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Generated Sizes</h4>
                <div className="bg-muted/50 p-3 rounded-md text-sm">
                  <p><strong>Master:</strong> 1024×1024 px (WebP)</p>
                  <p><strong>Large:</strong> 384×384 px (3x density)</p>
                  <p><strong>Medium:</strong> 192×192 px (2x density)</p>
                  <p><strong>Small:</strong> 96×96 px (1x density)</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Storage Path</h4>
                <div className="bg-muted/50 p-3 rounded-md text-sm font-mono">
                  avatars/{'{user_id}'}/{'{version}'}_{'{size}'}.webp
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}