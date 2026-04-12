import React, { createContext, useContext, useState, useCallback } from 'react';

interface AvatarRefreshContextType {
  refreshKey: number;
  triggerAvatarRefresh: (userId?: string) => void;
}

const AvatarRefreshContext = createContext<AvatarRefreshContextType | null>(null);

export function AvatarRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerAvatarRefresh = useCallback((userId?: string) => {
    console.log('🔄 Triggering global avatar refresh', userId ? `for user ${userId.substring(0, 8)}...` : 'for all users');
    setRefreshKey(prev => prev + 1);
    
    // Also dispatch a custom event for components that might need it
    window.dispatchEvent(new CustomEvent('avatar-updated', { 
      detail: { userId, timestamp: Date.now() } 
    }));
  }, []);

  return (
    <AvatarRefreshContext.Provider value={{ refreshKey, triggerAvatarRefresh }}>
      {children}
    </AvatarRefreshContext.Provider>
  );
}

export function useAvatarRefresh() {
  const context = useContext(AvatarRefreshContext);
  if (!context) {
    throw new Error('useAvatarRefresh must be used within an AvatarRefreshProvider');
  }
  return context;
}

export function useUserAvatarWithRefresh(userId: string | null) {
  const { refreshKey } = useAvatarRefresh();
  const [avatarData, setAvatarData] = useState<{
    src: string;
    username: string;
    loading: boolean;
    error: string;
  }>({
    src: '',
    username: 'Unknown User',
    loading: true,
    error: ''
  });

  React.useEffect(() => {
    if (!userId) {
      setAvatarData({
        src: '',
        username: 'Unknown User',
        loading: false,
        error: 'No user ID provided'
      });
      return;
    }

    let cancelled = false;

    const loadAvatar = async () => {
      if (cancelled) return;
      
      setAvatarData(prev => ({ ...prev, loading: true, error: '' }));
      
      try {
        const { fetchUserAvatar } = await import('./supabase/profile-avatar-helpers');
        const result = await fetchUserAvatar(userId);
        
        if (!cancelled) {
          setAvatarData(result);
        }
      } catch (error) {
        if (!cancelled) {
          setAvatarData({
            src: '',
            username: 'Unknown User',
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load avatar'
          });
        }
      }
    };

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]); // refreshKey dependency will trigger reload

  return avatarData;
}