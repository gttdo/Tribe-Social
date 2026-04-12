import { 
  PostType, 
  Visibility, 
  TribeWithDetails, 
  MediaDimensions, 
  MAX_FILE_SIZE,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_AUDIO_TYPES,
  TEXT_CONTENT_LIMIT
} from './supabase/database-types'

export type AspectRatio = '1:1' | '4:5' | '16:9' | '3:4' | '9:16';

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zoom?: number;
}

export interface ProcessedMedia {
  files: File[];
  urls: string[];
  type: 'image' | 'video' | 'audio';
  aspectRatio?: AspectRatio;
  cropData?: CropData;
  hasBackgroundBlur?: boolean;
  thumbnailUrl?: string;
  dimensions?: MediaDimensions;
}

export interface MediaProcessingOptions {
  cropToFit: boolean;
  addBackgroundBlur: boolean;
  allowZoom: boolean;
  preferredAspectRatio: AspectRatio;
  maxFileSize: number;
  allowMultiple: boolean;
}

export interface PostCreationData {
  type: PostType;
  content?: string;
  caption?: string;
  processedMedia?: ProcessedMedia;
  selectedTribes: string[]; // Array of tribe IDs for multi-tribe posting
  visibility: Visibility;
  username: string;
  userAvatar?: string;
  selectedRealm?: string;
}

// Legacy interface for preview compatibility
export interface ProcessedImage {
  file: File;
  url: string;
  aspectRatio: AspectRatio;
  cropData?: any;
  hasBackgroundBlur?: boolean;
}

export interface PostPreviewData {
  type: PostType;
  content?: string;
  caption?: string;
  processedImage?: ProcessedImage;
  audioBlob?: Blob;
  username: string;
  userAvatar?: string;
  selectedTribes: string[];
  selectedRealm?: string;
}

export interface TribeSelectionData {
  selectedTribes: string[];
  availableTribes: TribeWithDetails[];
  visibility: Visibility;
  allowMultiSelect: boolean;
}

export interface MediaValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  fileSize?: number;
  fileSizeFormatted?: string;
}

export interface PostCreationError {
  type: 'validation' | 'upload' | 'network' | 'server';
  message: string;
  field?: 'content' | 'media' | 'tribes' | 'visibility';
  details?: any;
}

export type PostCreationStep = 
  | 'select-type' 
  | 'create-content' 
  | 'select-tribes'
  | 'process-media' 
  | 'preview-post' 
  | 'publishing' 
  | 'success'
  | 'error';

// File validation functions
export function validateFileSize(file: File): MediaValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size ${formatFileSize(file.size)} exceeds the maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`,
      fileSize: file.size,
      fileSizeFormatted: formatFileSize(file.size)
    };
  }
  
  return {
    isValid: true,
    fileSize: file.size,
    fileSizeFormatted: formatFileSize(file.size)
  };
}

export function validateFileType(file: File, expectedType: 'image' | 'video' | 'audio'): MediaValidationResult {
  let supportedTypes: string[];
  
  switch (expectedType) {
    case 'image':
      supportedTypes = SUPPORTED_IMAGE_TYPES;
      break;
    case 'video':
      supportedTypes = SUPPORTED_VIDEO_TYPES;
      break;
    case 'audio':
      supportedTypes = SUPPORTED_AUDIO_TYPES;
      break;
    default:
      return {
        isValid: false,
        error: 'Invalid media type specified'
      };
  }
  
  if (!supportedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not supported. Supported types: ${supportedTypes.join(', ')}`
    };
  }
  
  return { isValid: true };
}

export function validateTextContent(content: string): MediaValidationResult {
  if (content.length > TEXT_CONTENT_LIMIT) {
    return {
      isValid: false,
      error: `Text content exceeds the ${TEXT_CONTENT_LIMIT} character limit`,
    };
  }
  
  const warnings: string[] = [];
  if (content.length > TEXT_CONTENT_LIMIT * 0.9) {
    warnings.push(`Approaching character limit (${content.length}/${TEXT_CONTENT_LIMIT})`);
  }
  
  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

export function validatePostCreation(data: PostCreationData): MediaValidationResult {
  // Validate content based on post type
  if (data.type === 'thought') {
    if (!data.content || data.content.trim().length === 0) {
      return {
        isValid: false,
        error: 'Thought posts must have text content'
      };
    }
    return validateTextContent(data.content);
  }
  
  // For media posts, ensure media is provided
  if (['image', 'video', 'audio'].includes(data.type) && !data.processedMedia) {
    return {
      isValid: false,
      error: `${data.type} posts must include media content`
    };
  }
  
  // Validate tribe selection for tribe visibility
  if (data.visibility === 'tribe' && data.selectedTribes.length === 0) {
    return {
      isValid: false,
      error: 'Must select at least one tribe for tribe-visible posts'
    };
  }
  
  // Validate caption length if provided
  if (data.caption && data.caption.length > TEXT_CONTENT_LIMIT) {
    return {
      isValid: false,
      error: `Caption exceeds the ${TEXT_CONTENT_LIMIT} character limit`
    };
  }
  
  return { isValid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getPostTypeDisplayName(type: PostType): string {
  switch (type) {
    case 'thought':
      return 'Thought';
    case 'image':
      return 'Picture';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    default:
      return 'Post';
  }
}

export function getVisibilityDisplayName(visibility: Visibility): string {
  switch (visibility) {
    case 'public':
      return 'Public';
    case 'tribe':
      return 'Tribe Only';
    case 'private':
      return 'Private';
    default:
      return 'Public';
  }
}

// Default values
export const DEFAULT_MEDIA_PROCESSING_OPTIONS: MediaProcessingOptions = {
  cropToFit: true,
  addBackgroundBlur: false,
  allowZoom: true,
  preferredAspectRatio: '1:1',
  maxFileSize: MAX_FILE_SIZE,
  allowMultiple: false
};

export const DEFAULT_POST_CREATION_DATA: Partial<PostCreationData> = {
  visibility: 'public',
  selectedTribes: [],
  type: 'thought'
};