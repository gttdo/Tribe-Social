import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  Plus, 
  User, 
  Compass, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { UserInfo } from '../App';

interface HamburgerMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userInfo: UserInfo | null;
  onCreatePost: () => void;
  onProfile: () => void;
  onDiscoverTribes: () => void;
  onSettings: () => void;
  onLogout: () => void;
}

export function HamburgerMenu({ 
  open, 
  onOpenChange, 
  userInfo, 
  onCreatePost, 
  onProfile, 
  onDiscoverTribes, 
  onSettings, 
  onLogout 
}: HamburgerMenuProps) {
  const handleMenuAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 bg-midnight-black/95 border-l border-muted-lavender/20 soft-blur">
        <SheetHeader className="pb-6 border-b border-muted-lavender/10">
          <SheetTitle className="sr-only">Profile & Settings</SheetTitle>
          <SheetDescription className="sr-only">Access your profile and account settings</SheetDescription>
          
          {/* Header Title */}
          <div className="text-center pt-2 pb-4">
            <h2 className="text-xl font-headline text-pearl-white font-medium">
              Profile & Settings
            </h2>
          </div>
          
          {/* User Info Section */}
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-gradient-to-r from-neon-lilac to-electric-blue text-white font-headline">
                {(userInfo?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-pearl-white font-body font-medium">
                @{userInfo?.username || 'TribeUser'}
              </p>
              <p className="text-muted-lavender text-sm font-body">
                Welcome to Tribe
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Menu Items */}
        <div className="flex flex-col space-y-3 pt-6">
          {/* Main Actions */}
          <Button
            onClick={() => handleMenuAction(onCreatePost)}
            className="group w-full justify-start items-center h-12 px-3 py-2 bg-muted-lavender/5 border border-neon-lilac/30 md:hover:border-neon-lilac/50 text-pearl-white md:hover:text-neon-lilac font-body font-medium rounded-xl transition-all duration-300 md:hover:bg-neon-lilac/10 md:hover:shadow-lg md:hover:shadow-neon-lilac/20 active:scale-[0.98]"
          >
            <div className="p-1.5 rounded-lg bg-neon-lilac/15 md:group-hover:bg-neon-lilac/25 transition-colors duration-300 mr-3">
              <Plus className="w-4 h-4 text-neon-lilac" />
            </div>
            <span className="text-sm sm:text-base">Create Post</span>
          </Button>

          <Button
            onClick={() => handleMenuAction(onProfile)}
            variant="ghost"
            className="w-full justify-start items-center h-11 px-3 py-2 text-muted-lavender md:hover:bg-muted-lavender/10 md:hover:text-electric-blue font-body rounded-xl transition-all duration-200 active:scale-[0.98]"
          >
            <User className="w-4 h-4 mr-3" />
            <span className="text-sm sm:text-base">Profile</span>
          </Button>

          <Button
            onClick={() => handleMenuAction(onDiscoverTribes)}
            variant="ghost"
            className="w-full justify-start items-center h-11 px-3 py-2 text-muted-lavender md:hover:bg-muted-lavender/10 md:hover:text-soft-blush font-body rounded-xl transition-all duration-200 active:scale-[0.98]"
          >
            <Compass className="w-4 h-4 mr-3" />
            <span className="text-sm sm:text-base">Discover Tribes</span>
          </Button>

          {/* Spacer */}
          <div className="flex-1" />
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-6 left-4 right-4 space-y-3 border-t border-muted-lavender/10 pt-4">
          <Button
            onClick={() => handleMenuAction(onSettings)}
            variant="ghost"
            className="w-full justify-start items-center h-11 px-3 py-2 text-muted-lavender md:hover:bg-muted-lavender/10 md:hover:text-pearl-white font-body rounded-xl transition-all duration-200 active:scale-[0.98]"
          >
            <Settings className="w-4 h-4 mr-3" />
            <span className="text-sm sm:text-base">Settings</span>
          </Button>

          <Button
            onClick={() => handleMenuAction(onLogout)}
            variant="ghost"
            className="w-full justify-start items-center h-11 px-3 py-2 text-glitch-red/80 md:hover:bg-glitch-red/10 md:hover:text-glitch-red font-body rounded-xl transition-all duration-200 active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4 mr-3" />
            <span className="text-sm sm:text-base">Logout</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}