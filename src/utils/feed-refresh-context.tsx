import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FeedRefreshContextType {
  shouldRefreshFeed: boolean;
  setShouldRefreshFeed: (value: boolean) => void;
  triggerFeedRefresh: () => void;
  consumeFeedRefresh: () => boolean;
}

const FeedRefreshContext = createContext<FeedRefreshContextType | undefined>(undefined);

interface FeedRefreshProviderProps {
  children: ReactNode;
}

export function FeedRefreshProvider({ children }: FeedRefreshProviderProps) {
  const [shouldRefreshFeed, setShouldRefreshFeed] = useState(false);

  const triggerFeedRefresh = () => {
    console.log('🔄 Triggering feed refresh after post deletion');
    setShouldRefreshFeed(true);
  };

  const consumeFeedRefresh = (): boolean => {
    const shouldRefresh = shouldRefreshFeed;
    if (shouldRefresh) {
      console.log('✅ Consuming feed refresh flag, will re-fetch posts');
      setShouldRefreshFeed(false);
    } else {
      console.log('⏸️  No feed refresh needed');
    }
    return shouldRefresh;
  };

  return (
    <FeedRefreshContext.Provider
      value={{
        shouldRefreshFeed,
        setShouldRefreshFeed,
        triggerFeedRefresh,
        consumeFeedRefresh,
      }}
    >
      {children}
    </FeedRefreshContext.Provider>
  );
}

export function useFeedRefresh() {
  const context = useContext(FeedRefreshContext);
  if (context === undefined) {
    throw new Error('useFeedRefresh must be used within a FeedRefreshProvider');
  }
  return context;
}