import { AspectRatio, CropData, ProcessedImage } from './post-creation-types';
import { ASPECT_RATIOS } from './post-creation-constants';

export const getAspectRatioValue = (aspectRatio: AspectRatio): number => {
  const found = ASPECT_RATIOS.find(ar => ar.value === aspectRatio);
  return found?.ratio || 1;
};

export const calculateCropDimensions = (
  imageWidth: number,
  imageHeight: number,
  targetAspectRatio: AspectRatio
): CropData => {
  const targetRatio = getAspectRatioValue(targetAspectRatio);
  const imageRatio = imageWidth / imageHeight;

  let cropWidth: number;
  let cropHeight: number;
  let x: number = 0;
  let y: number = 0;

  if (imageRatio > targetRatio) {
    // Image is wider than target - crop width
    cropHeight = imageHeight;
    cropWidth = imageHeight * targetRatio;
    x = (imageWidth - cropWidth) / 2;
  } else {
    // Image is taller than target - crop height
    cropWidth = imageWidth;
    cropHeight = imageWidth / targetRatio;
    y = (imageHeight - cropHeight) / 2;
  }

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.min(cropWidth, imageWidth),
    height: Math.min(cropHeight, imageHeight),
    zoom: 1
  };
};

export const doesImageNeedCropping = (
  imageWidth: number,
  imageHeight: number,
  targetAspectRatio: AspectRatio,
  tolerance: number = 0.05
): boolean => {
  const imageRatio = imageWidth / imageHeight;
  const targetRatio = getAspectRatioValue(targetAspectRatio);
  
  return Math.abs(imageRatio - targetRatio) > tolerance;
};

export const createCanvasFromImage = (
  image: HTMLImageElement,
  cropData: CropData,
  outputWidth: number,
  outputHeight: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  
  const ctx = canvas.getContext('2d')!;
  
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, outputWidth, outputHeight);
  
  // Apply zoom and crop
  const { x, y, width, height, zoom = 1 } = cropData;
  
  // Scale for zoom
  const scaledWidth = width * zoom;
  const scaledHeight = height * zoom;
  
  // Center the scaled image
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;
  
  ctx.drawImage(
    image,
    x - offsetX, y - offsetY, scaledWidth, scaledHeight,
    0, 0, outputWidth, outputHeight
  );
  
  return canvas;
};

export const canvasToFile = async (
  canvas: HTMLCanvasElement,
  filename: string,
  quality: number = 0.9
): Promise<File> => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], filename, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        resolve(file);
      }
    }, 'image/jpeg', quality);
  });
};

export const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' };
  }
  
  // Updated size limit to 5MB
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: 'Your image is too large. Please upload a file under 5 MB for faster loading and better performance.' 
    };
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Image must be JPEG, PNG, or WebP format' };
  }
  
  return { isValid: true };
};

// Check if image needs compression (between 3-5MB)
export const shouldCompressImage = (file: File): boolean => {
  const compressionThreshold = 3 * 1024 * 1024; // 3MB
  const maxSize = 5 * 1024 * 1024; // 5MB
  return file.size >= compressionThreshold && file.size <= maxSize;
};

// Compress image with quality adjustment
export const compressImage = async (
  file: File,
  maxSizeBytes: number = 5 * 1024 * 1024,
  initialQuality: number = 0.8
): Promise<File> => {
  return new Promise(async (resolve, reject) => {
    try {
      const img = await loadImageFromFile(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Set canvas dimensions to original image size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw the image on canvas
      ctx.drawImage(img, 0, 0);

      // Try different quality levels to achieve target size
      let quality = initialQuality;
      let compressedFile: File | null = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const blob = await new Promise<Blob | null>((resolveBlob) => {
          canvas.toBlob(resolveBlob, 'image/jpeg', quality);
        });

        if (blob) {
          const filename = file.name.replace(/\.[^/.]+$/, '.jpg'); // Convert to JPEG
          compressedFile = new File([blob], filename, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          // If size is acceptable or we've tried enough, break
          if (compressedFile.size <= maxSizeBytes || attempts === maxAttempts - 1) {
            break;
          }

          // Reduce quality for next attempt
          quality -= 0.1;
          if (quality < 0.3) quality = 0.3; // Don't go below 30% quality
        }

        attempts++;
      }

      if (compressedFile) {
        resolve(compressedFile);
      } else {
        reject(new Error('Failed to compress image'));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// Convert image to WebP format for better compression
export const convertToWebP = async (
  file: File,
  quality: number = 0.85
): Promise<File> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if browser supports WebP
      const canvas = document.createElement('canvas');
      const webpSupported = canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
      
      if (!webpSupported) {
        // Fallback to JPEG compression
        resolve(await compressImage(file, 5 * 1024 * 1024, quality));
        return;
      }

      const img = await loadImageFromFile(file);
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob | null>((resolveBlob) => {
        canvas.toBlob(resolveBlob, 'image/webp', quality);
      });

      if (blob) {
        const filename = file.name.replace(/\.[^/.]+$/, '.webp');
        const webpFile = new File([blob], filename, {
          type: 'image/webp',
          lastModified: Date.now()
        });
        resolve(webpFile);
      } else {
        reject(new Error('Failed to convert to WebP'));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// Enhanced image processing with compression and format optimization
export const processImageForUpload = async (file: File): Promise<File> => {
  // First validate the file
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // If file is already small enough, return as-is (unless it can benefit from WebP)
  if (file.size < 3 * 1024 * 1024) {
    // Try WebP conversion for smaller files to save even more space
    if (file.type !== 'image/webp') {
      try {
        const webpFile = await convertToWebP(file, 0.9);
        // Only use WebP if it's actually smaller
        return webpFile.size < file.size ? webpFile : file;
      } catch {
        return file;
      }
    }
    return file;
  }

  // For larger files (3-5MB), compress them
  if (shouldCompressImage(file)) {
    try {
      // Try WebP first for best compression
      if (file.type !== 'image/webp') {
        const webpFile = await convertToWebP(file, 0.8);
        if (webpFile.size <= 5 * 1024 * 1024) {
          return webpFile;
        }
      }
      
      // Fallback to JPEG compression
      return await compressImage(file);
    } catch (error) {
      console.warn('Image compression failed, using original file:', error);
      return file;
    }
  }

  return file;
};