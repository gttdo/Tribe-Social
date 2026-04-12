import faviconImage from 'figma:asset/5e75c892c1274c11eff48795ac973413c7a7dd9c.png';
import { STORAGE_KEYS } from './app-constants';

export const setFavicon = () => {
  try {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    existingLinks.forEach(link => link.remove());
    
    // Create new favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = faviconImage;
    
    // Also add apple-touch-icon for iOS
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = faviconImage;
    
    // Add to document head
    document.head.appendChild(link);
    document.head.appendChild(appleLink);
    
    console.log('Favicon set to:', faviconImage);
  } catch (error) {
    console.warn('Failed to set favicon:', error);
    // Fallback: create a simple data URL favicon
    const fallbackFavicon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzBEMEQwRCIvPgo8cGF0aCBkPSJNMTYgOEwxMi41IDE1SDE5LjVMMTYgOFoiIGZpbGw9IiNDMDg0RkMiLz4KPHBhdGggZD0iTTE2IDI0TDE5LjUgMTdIMTIuNUwxNiAyNFoiIGZpbGw9IiM3REQzRkMiLz4KPC9zdmc+';
    
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = fallbackFavicon;
    document.head.appendChild(link);
  }
};

// Check for URL routes on initial load
export const checkForURLRoutes = (): string | null => {
  const path = window.location.pathname;
  
  // Check for backend test utility route: /debug/backend
  if (path === '/debug/backend') {
    console.log('Detected backend debug route:', path);
    return 'backend-test';
  }
  
  // Check for saved posts route: /users/:userId/saved
  const savedPostsMatch = path.match(/^\/users\/([^\/]+)\/saved\/?$/);
  
  if (savedPostsMatch) {
    console.log('Detected saved posts URL route:', path);
    return 'url-route';
  }
  
  // Add other URL routes here in the future
  
  return null;
};

// Utility functions for localStorage
export const saveToStorage = (key: string, value: any) => {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

export const loadFromStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    return JSON.parse(item);
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return null;
  }
};

export const clearAppStorage = () => {
  console.log('Clearing localStorage...');
  localStorage.removeItem(STORAGE_KEYS.USER_INFO);
  localStorage.removeItem(STORAGE_KEYS.USER_RESULT);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_VIEW);
  
  // Clear any other app-specific storage
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.startsWith('tribe_') || key.startsWith('supabase.')
  );
  keysToRemove.forEach(key => localStorage.removeItem(key));
};