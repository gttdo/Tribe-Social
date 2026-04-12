import { ProfileTheme } from './tribe-types';

export const PROFILE_THEMES: ProfileTheme[] = [
  {
    id: 'cosmic-nebula',
    name: 'Cosmic Nebula',
    description: 'Deep purples and electric blues with ethereal glows',
    isPremium: false,
    colors: {
      primary: '#8B5CF6', // violet-500
      secondary: '#EC4899', // pink-500  
      accent: '#06B6D4', // cyan-500
      background: '#1E1B4B', // indigo-900
      text: '#F8FAFC' // slate-50
    },
    cssVars: {
      '--profile-primary': '#8B5CF6',
      '--profile-secondary': '#EC4899',
      '--profile-accent': '#06B6D4',
      '--profile-bg': '#1E1B4B',
      '--profile-text': '#F8FAFC'
    }
  },
  {
    id: 'midnight-aurora',
    name: 'Midnight Aurora',
    description: 'Dark greens and ice blues with mystical vibes',
    isPremium: false,
    colors: {
      primary: '#10B981', // emerald-500
      secondary: '#3B82F6', // blue-500
      accent: '#06B6D4', // cyan-500
      background: '#064E3B', // emerald-900
      text: '#F0FDF4' // green-50
    },
    cssVars: {
      '--profile-primary': '#10B981',
      '--profile-secondary': '#3B82F6',
      '--profile-accent': '#06B6D4',
      '--profile-bg': '#064E3B',
      '--profile-text': '#F0FDF4'
    }
  },
  {
    id: 'sunset-dream',
    name: 'Sunset Dream',
    description: 'Warm oranges and soft pinks with dreamy aesthetics',
    isPremium: false,
    colors: {
      primary: '#F97316', // orange-500
      secondary: '#EC4899', // pink-500
      accent: '#EAB308', // yellow-500
      background: '#9A3412', // orange-800
      text: '#FFF7ED' // orange-50
    },
    cssVars: {
      '--profile-primary': '#F97316',
      '--profile-secondary': '#EC4899',
      '--profile-accent': '#EAB308',
      '--profile-bg': '#9A3412',
      '--profile-text': '#FFF7ED'
    }
  },
  {
    id: 'forest-mystique',
    name: 'Forest Mystique',
    description: 'Deep greens and earth tones with natural magic',
    isPremium: false,
    colors: {
      primary: '#059669', // emerald-600
      secondary: '#7C3AED', // violet-600
      accent: '#DC2626', // red-600
      background: '#1F2937', // gray-800
      text: '#F9FAFB' // gray-50
    },
    cssVars: {
      '--profile-primary': '#059669',
      '--profile-secondary': '#7C3AED',
      '--profile-accent': '#DC2626',
      '--profile-bg': '#1F2937',
      '--profile-text': '#F9FAFB'
    }
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    description: 'Electric greens and hot pinks with futuristic vibes',
    isPremium: true,
    colors: {
      primary: '#00F5FF', // cyan
      secondary: '#FF1493', // deep pink
      accent: '#ADFF2F', // green yellow
      background: '#0F0F0F', // near black
      text: '#FFFFFF' // white
    },
    cssVars: {
      '--profile-primary': '#00F5FF',
      '--profile-secondary': '#FF1493',
      '--profile-accent': '#ADFF2F',
      '--profile-bg': '#0F0F0F',
      '--profile-text': '#FFFFFF'
    }
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    description: 'Rich purples and golden accents with regal elegance',
    isPremium: true,
    colors: {
      primary: '#6D28D9', // violet-800
      secondary: '#F59E0B', // amber-500
      accent: '#DC2626', // red-600
      background: '#3C1A78', // purple-900
      text: '#F3F4F6' // gray-100
    },
    cssVars: {
      '--profile-primary': '#6D28D9',
      '--profile-secondary': '#F59E0B',
      '--profile-accent': '#DC2626',
      '--profile-bg': '#3C1A78',
      '--profile-text': '#F3F4F6'
    }
  },
  {
    id: 'vaporwave-classic',
    name: 'Vaporwave Classic',
    description: 'Retro synthwave with authentic 80s aesthetics',
    isPremium: true,
    colors: {
      primary: '#FF00FF', // magenta
      secondary: '#00FFFF', // cyan
      accent: '#FF69B4', // hot pink
      background: '#2D1B69', // dark purple
      text: '#FFFFFF' // white
    },
    cssVars: {
      '--profile-primary': '#FF00FF',
      '--profile-secondary': '#00FFFF',
      '--profile-accent': '#FF69B4',
      '--profile-bg': '#2D1B69',
      '--profile-text': '#FFFFFF'
    }
  },
  {
    id: 'dark-matter',
    name: 'Dark Matter',
    description: 'Deep space blacks with ethereal purple accents',
    isPremium: true,
    colors: {
      primary: '#A855F7', // purple-500
      secondary: '#6366F1', // indigo-500
      accent: '#EF4444', // red-500
      background: '#000000', // pure black
      text: '#F1F5F9' // slate-100
    },
    cssVars: {
      '--profile-primary': '#A855F7',
      '--profile-secondary': '#6366F1',
      '--profile-accent': '#EF4444',
      '--profile-bg': '#000000',
      '--profile-text': '#F1F5F9'
    }
  }
];

export function getThemeById(themeId: string): ProfileTheme | null {
  return PROFILE_THEMES.find(theme => theme.id === themeId) || null;
}

export function getFreeThemes(): ProfileTheme[] {
  return PROFILE_THEMES.filter(theme => !theme.isPremium);
}

export function getPremiumThemes(): ProfileTheme[] {
  return PROFILE_THEMES.filter(theme => theme.isPremium);
}

export function applyProfileTheme(theme: ProfileTheme, element?: HTMLElement) {
  const targetElement = element || document.documentElement;
  
  Object.entries(theme.cssVars).forEach(([property, value]) => {
    targetElement.style.setProperty(property, value);
  });
}

export function removeProfileTheme(element?: HTMLElement) {
  const targetElement = element || document.documentElement;
  
  // Remove all profile theme variables
  PROFILE_THEMES.forEach(theme => {
    Object.keys(theme.cssVars).forEach(property => {
      targetElement.style.removeProperty(property);
    });
  });
}

export function generateThemePreview(theme: ProfileTheme): string {
  return `linear-gradient(135deg, ${theme.colors.primary}40, ${theme.colors.secondary}40, ${theme.colors.accent}40)`;
}