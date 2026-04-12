import { AspectRatio } from './post-creation-types';

export const ASPECT_RATIOS: { value: AspectRatio; label: string; ratio: number }[] = [
  { value: '1:1', label: 'Square', ratio: 1 },
  { value: '4:5', label: 'Portrait', ratio: 0.8 },
  { value: '3:4', label: 'Tall Portrait', ratio: 0.75 },
  { value: '16:9', label: 'Landscape', ratio: 16/9 },
  { value: '9:16', label: 'Vertical', ratio: 9/16 }
];

export const DEFAULT_ASPECT_RATIO: AspectRatio = '4:5';

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/mov'];

export const BLUR_STRENGTHS = [
  { value: 0, label: 'None' },
  { value: 5, label: 'Light' },
  { value: 10, label: 'Medium' },
  { value: 20, label: 'Strong' }
];

export const REALM_COLORS = {
  mirrorcore: { 
    primary: 'electric-blue', 
    secondary: 'soft-blush',
    gradient: 'from-electric-blue/20 to-soft-blush/20'
  },
  embercore: { 
    primary: 'glitch-red', 
    secondary: 'neon-lilac',
    gradient: 'from-glitch-red/20 to-neon-lilac/20'
  },
  shadowcore: { 
    primary: 'neon-lilac', 
    secondary: 'electric-blue',
    gradient: 'from-neon-lilac/20 to-electric-blue/20'
  }
};