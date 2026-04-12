import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface LogoutButtonProps {
  onLogout: () => Promise<void>;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  className?: string;
}

export function LogoutButton({ 
  onLogout, 
  variant = 'ghost', 
  size = 'default',
  showText = true,
  className = ''
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Keep the loading state off after error
      setIsLoggingOut(false);
    }
    // Note: We don't set isLoggingOut to false on success because the component will unmount
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`gap-2 hover:text-glitch-red hover:border-glitch-red/30 transition-colors ${className}`}
    >
      {isLoggingOut ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      {showText && (
        <span className="font-body">
          {isLoggingOut ? 'Signing out...' : 'Sign out'}
        </span>
      )}
    </Button>
  );
}