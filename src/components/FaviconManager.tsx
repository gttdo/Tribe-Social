import { useEffect } from 'react';
import faviconImage from 'figma:asset/5e75c892c1274c11eff48795ac973413c7a7dd9c.png';

interface FaviconManagerProps {
  title?: string;
}

export function FaviconManager({ title = 'Tribe Board - Connect with Your Tribe' }: FaviconManagerProps) {
  useEffect(() => {
    // Set favicon and document title
    const setFavicon = () => {
      try {
        // Set document title
        document.title = title;
        
        // Handle standard favicon
        let faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!faviconLink) {
          faviconLink = document.createElement('link');
          faviconLink.rel = 'icon';
          faviconLink.type = 'image/png';
          document.head.appendChild(faviconLink);
        }
        faviconLink.href = faviconImage;
        
        // Handle shortcut icon for older browsers
        let shortcutLink = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
        if (!shortcutLink) {
          shortcutLink = document.createElement('link');
          shortcutLink.rel = 'shortcut icon';
          shortcutLink.type = 'image/png';
          document.head.appendChild(shortcutLink);
        }
        shortcutLink.href = faviconImage;
        
        // Handle Apple touch icon for iOS devices
        let appleTouchLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
        if (!appleTouchLink) {
          appleTouchLink = document.createElement('link');
          appleTouchLink.rel = 'apple-touch-icon';
          document.head.appendChild(appleTouchLink);
        }
        appleTouchLink.href = faviconImage;
        
        // Handle Apple touch icon precomposed for older iOS
        let applePrecomposedLink = document.querySelector("link[rel='apple-touch-icon-precomposed']") as HTMLLinkElement;
        if (!applePrecomposedLink) {
          applePrecomposedLink = document.createElement('link');
          applePrecomposedLink.rel = 'apple-touch-icon-precomposed';
          document.head.appendChild(applePrecomposedLink);
        }
        applePrecomposedLink.href = faviconImage;
        
        // Set meta tags for better mobile experience
        let viewportMeta = document.querySelector("meta[name='viewport']") as HTMLMetaElement;
        if (!viewportMeta) {
          viewportMeta = document.createElement('meta');
          viewportMeta.name = 'viewport';
          document.head.appendChild(viewportMeta);
        }
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        
        // Set theme color for mobile browsers
        let themeColorMeta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement;
        if (!themeColorMeta) {
          themeColorMeta = document.createElement('meta');
          themeColorMeta.name = 'theme-color';
          document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.content = '#C084FC'; // neon-lilac
        
        // Set meta description
        let descriptionMeta = document.querySelector("meta[name='description']") as HTMLMetaElement;
        if (!descriptionMeta) {
          descriptionMeta = document.createElement('meta');
          descriptionMeta.name = 'description';
          document.head.appendChild(descriptionMeta);
        }
        descriptionMeta.content = 'Tribe Board - A vaporwave-aesthetic community platform for teens to connect, share, and discover content within their tribes.';
        
        console.log('Favicon and meta tags updated successfully');
        
      } catch (error) {
        console.warn('Failed to set favicon or meta tags:', error);
      }
    };
    
    // Set favicon immediately
    setFavicon();
    
    // Also set when document is ready, in case the head wasn't fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setFavicon);
      return () => document.removeEventListener('DOMContentLoaded', setFavicon);
    }
    
  }, [title]);
  
  return null; // This component doesn't render anything
}