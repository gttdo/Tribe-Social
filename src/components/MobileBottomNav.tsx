import React from 'react';
import { Home, Plus, User } from 'lucide-react';

interface MobileBottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userResult?: any;
}

export function MobileBottomNav({ currentPage, onNavigate, userResult }: MobileBottomNavProps) {
  const navItems = [
    {
      id: 'feed',
      label: 'Home',
      icon: Home,
      color: 'electric-blue',
      onClick: () => onNavigate('feed')
    },
    {
      id: 'create',
      label: 'Create',
      icon: Plus,
      color: 'soft-blush',
      onClick: () => onNavigate('create')
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      color: 'glitch-red',
      onClick: () => onNavigate('profile')
    }
  ];

  const getRealmColors = (realm: string) => {
    const colors = {
      mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
      embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
      shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    return colors[realm] || { primary: 'electric-blue', secondary: 'soft-blush' };
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        {/* Safe area spacer */}
        <div className="pb-safe" />
        
        {/* Bottom Navigation Bar - Enhanced mobile responsiveness */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-midnight-black/95 soft-blur border-t border-muted-lavender/20 pb-safe mobile-safe">
          <div className="flex items-center justify-around px-2 sm:px-4 py-2 sm:py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const realmColors = userResult ? getRealmColors(userResult.coreRealm) : { primary: 'electric-blue', secondary: 'soft-blush' };
              
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`touch-nav-button flex flex-col items-center space-y-0.5 sm:space-y-1 transition-all duration-300 min-h-[50px] sm:min-h-[60px] px-2 sm:px-3 ${
                    isActive 
                      ? `text-${item.color} bg-${item.color}/10 border border-${item.color}/30 scale-105` 
                      : 'text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? `text-${item.color}` : 'text-muted-lavender'}`} />
                  <span className={`nav-text-mobile font-body text-xs sm:text-sm ${isActive ? `text-${item.color}` : 'text-muted-lavender'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}