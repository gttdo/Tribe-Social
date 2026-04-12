import React from 'react';
import { Button } from './ui/button';
import { Users, Sparkles, User } from 'lucide-react';

interface NavigationProps {
  currentView: 'quiz' | 'results' | 'social';
  onNavigate: (view: 'landing' | 'quiz' | 'results' | 'social') => void;
  hasResult: boolean;
}

export function Navigation({ currentView, onNavigate, hasResult }: NavigationProps) {
  const getButtonStyles = (isActive: boolean, color: string) => {
    const baseClasses = "flex flex-col items-center justify-center space-y-1 sm:space-y-2 py-3 sm:py-4 px-2 sm:px-3 touch-nav-button transition-all duration-500 border relative";
    
    if (isActive) {
      switch (color) {
        case 'electric-blue':
          return `${baseClasses} text-electric-blue-nav bg-electric-blue-nav dreamy-glow nav-button-active`;
        case 'soft-blush':
          return `${baseClasses} text-soft-blush-nav bg-soft-blush-nav dreamy-glow nav-button-active`;
        case 'neon-lilac':
          return `${baseClasses} text-neon-lilac-nav bg-neon-lilac-nav dreamy-glow nav-button-active`;
        default:
          return `${baseClasses} text-neon-lilac bg-neon-lilac/15 border-neon-lilac/30 dreamy-glow nav-button-active`;
      }
    } else {
      switch (color) {
        case 'electric-blue':
          return `${baseClasses} text-muted-lavender hover-electric-blue border-transparent nav-button-inactive`;
        case 'soft-blush':
          return `${baseClasses} text-muted-lavender hover-soft-blush border-transparent nav-button-inactive`;
        case 'neon-lilac':
          return `${baseClasses} text-muted-lavender hover-neon-lilac border-transparent nav-button-inactive`;
        default:
          return `${baseClasses} text-muted-lavender hover:text-neon-lilac hover:bg-neon-lilac/10 hover:border-neon-lilac/20 border-transparent nav-button-inactive`;
      }
    }
  };

  const navItems = [
    {
      id: 'realm',
      icon: Sparkles,
      label: 'Digital Realm',
      shortLabel: 'Realm',
      action: () => onNavigate('quiz'),
      isActive: currentView === 'quiz',
      color: 'electric-blue'
    },
    ...(hasResult ? [{
      id: 'identity',
      icon: User,
      label: 'My Tribe',
      shortLabel: 'Tribe',
      action: () => onNavigate('results'),
      isActive: currentView === 'results',
      color: 'soft-blush'
    }] : []),
    {
      id: 'social',
      icon: Users,
      label: 'Local Aesthetics',
      shortLabel: 'Aesthetics',
      action: () => onNavigate('social'),
      isActive: currentView === 'social',
      color: 'neon-lilac'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 soft-blur border-t border-muted-lavender/20 z-50 pb-safe mobile-nav-container">
      {/* Navigation buttons container */}
      <div className="flex items-center justify-around py-2 sm:py-3 px-1 sm:px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className={getButtonStyles(item.isActive, item.color)}
              role="tab"
              aria-selected={item.isActive}
              aria-label={`Navigate to ${item.label}`}
              tabIndex={0}
            >
              {/* Icon container with enhanced mobile sizing */}
              <div className={`transition-all duration-300 flex-shrink-0 ${
                item.isActive ? 'transform scale-110' : ''
              }`}>
                <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              
              {/* Text label with responsive sizing */}
              <span className="nav-text-mobile sm:text-sm font-body font-medium leading-tight text-center break-words max-w-[70px] sm:max-w-none">
                <span className="hidden sm:inline text-balance">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Visual indicator */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 sm:w-12 h-0.5 bg-gradient-to-r from-transparent via-muted-lavender/40 to-transparent rounded-full" />
      
      {/* Background accent for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-midnight-black/20 to-transparent pointer-events-none" />
    </div>
  );
}