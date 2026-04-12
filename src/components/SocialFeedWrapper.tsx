import React from 'react';
import { SocialFeed } from './SocialFeed';
import { HamburgerMenu } from './HamburgerMenu';
import { UserResult, UserInfo } from '../App';

interface SocialFeedWrapperProps {
  userResult?: UserResult | null;
  userInfo: UserInfo | null;
  isAuthenticated?: boolean;
  session?: any;
  onBack: () => void;
  onLogout?: () => void;
  cameraPermission?: boolean;
  micPermission?: boolean;
  onPermissionToggle?: (type: 'camera' | 'mic', enabled: boolean) => void;
}

export function SocialFeedWrapper(props: SocialFeedWrapperProps) {
  return (
    <div className="min-h-screen bg-midnight-black">
      <SocialFeed {...props} />
    </div>
  );
}