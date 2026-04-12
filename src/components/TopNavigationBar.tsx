import React from 'react';
import { Button } from './ui/button';
import { Logo } from './Logo';
import { 
  Search, 
  Compass, 
  Bell, 
  Menu 
} from 'lucide-react';
import tribeLogo from 'figma:asset/bae76cae91739bc792e48a321d1a8668c4656f47.png';

interface TopNavigationBarProps {
  unreadNotificationCount?: number;
  onSearchClick: () => void;
  onDiscoverClick: () => void;
  onNotificationsClick: () => void;
  onMenuClick: () => void;
}

export function TopNavigationBar({ 
  unreadNotificationCount = 0,
  onSearchClick,
  onDiscoverClick,
  onNotificationsClick,
  onMenuClick
}: TopNavigationBarProps) {
  return (
    <div className="flex items-center justify-between p-3 sm:p-4 border-b border-muted-lavender/10 bg-midnight-black/95 backdrop-blur-md mobile-safe">
      {/* Left side - App name and logo */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Logo className="h-6 sm:h-8" />
        <img 
          src={tribeLogo} 
          alt="Tribe Board" 
          className="h-6 sm:h-8 w-auto object-contain"
        />
      </div>
      
      {/* Right side - Action icons */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Search */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchClick}
          className="text-muted-lavender md:hover:text-electric-blue md:hover:bg-electric-blue/10 p-2 sm:p-3 h-10 w-10 sm:h-11 sm:w-11 rounded-lg transition-all duration-200"
        >
          <Search className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* Discover */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDiscoverClick}
          className="text-muted-lavender md:hover:text-soft-blush md:hover:bg-soft-blush/10 p-2 sm:p-3 h-10 w-10 sm:h-11 sm:w-11 rounded-lg transition-all duration-200"
        >
          <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onNotificationsClick}
          className="relative text-muted-lavender md:hover:text-electric-blue md:hover:bg-electric-blue/10 p-2 sm:p-3 h-10 w-10 sm:h-11 sm:w-11 rounded-lg transition-all duration-200"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-glitch-red text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center min-w-[16px] sm:min-w-[20px] font-body font-medium">
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          )}
        </Button>

        {/* Hamburger Menu */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-muted-lavender md:hover:text-neon-lilac md:hover:bg-neon-lilac/10 p-2 sm:p-3 h-10 w-10 sm:h-11 sm:w-11 rounded-lg transition-all duration-200"
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
}