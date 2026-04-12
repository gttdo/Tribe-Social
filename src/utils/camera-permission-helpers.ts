/**
 * Camera Permission and Media Access Helpers
 * 
 * Provides comprehensive camera permission handling with fallback options
 */

interface CameraPermissionResult {
  granted: boolean;
  error?: string;
  canUseCamera: boolean;
  canUseFileInput: boolean;
  permissionState?: PermissionState;
}

interface MediaConstraints {
  video: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

/**
 * Check camera permission status without requesting
 */
export async function checkCameraPermission(): Promise<CameraPermissionResult> {
  const result: CameraPermissionResult = {
    granted: false,
    canUseCamera: false,
    canUseFileInput: true // File input is always available
  };

  try {
    // Check if navigator.permissions is available
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      result.permissionState = permission.state;
      
      if (permission.state === 'granted') {
        result.granted = true;
        result.canUseCamera = true;
      } else if (permission.state === 'denied') {
        result.granted = false;
        result.canUseCamera = false;
        result.error = 'Camera access denied by user';
      } else if (permission.state === 'prompt') {
        result.granted = false;
        result.canUseCamera = true; // Can still request
      }
    } else {
      // Fallback for browsers without permissions API
      result.canUseCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    }
  } catch (error) {
    console.warn('Error checking camera permission:', error);
    result.error = 'Unable to check camera permission';
    result.canUseCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
  }

  return result;
}

/**
 * Request camera permission with comprehensive error handling
 */
export async function requestCameraPermission(
  constraints: MediaConstraints = { video: true }
): Promise<CameraPermissionResult & { stream?: MediaStream }> {
  const result: CameraPermissionResult & { stream?: MediaStream } = {
    granted: false,
    canUseCamera: false,
    canUseFileInput: true
  };

  try {
    // Check if getUserMedia is available
    if (!('mediaDevices' in navigator) || !('getUserMedia' in navigator.mediaDevices)) {
      result.error = 'Camera not supported by this browser';
      return result;
    }

    console.log('🎥 Requesting camera permission with constraints:', constraints);
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    result.granted = true;
    result.canUseCamera = true;
    result.stream = stream;
    
    console.log('✅ Camera permission granted successfully');
    return result;
    
  } catch (error) {
    console.error('❌ Camera permission error:', error);
    
    if (error instanceof Error) {
      switch (error.name) {
        case 'NotAllowedError':
          result.error = 'Camera access denied. Please enable camera permission in your browser settings.';
          break;
        case 'NotFoundError':
          result.error = 'No camera found on this device.';
          break;
        case 'NotReadableError':
          result.error = 'Camera is already in use by another application.';
          break;
        case 'OverconstrainedError':
          result.error = 'Camera does not support the requested settings.';
          break;
        case 'SecurityError':
          result.error = 'Camera access blocked due to security restrictions.';
          break;
        case 'AbortError':
          result.error = 'Camera access was aborted.';
          break;
        default:
          result.error = `Camera error: ${error.message}`;
      }
    } else {
      result.error = 'Unknown camera error occurred';
    }
    
    return result;
  }
}

/**
 * Get available camera devices
 */
export async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
  try {
    if (!('mediaDevices' in navigator) || !('enumerateDevices' in navigator.mediaDevices)) {
      return [];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error getting camera devices:', error);
    return [];
  }
}

/**
 * Clean up media stream and stop all tracks
 */
export function stopMediaStream(stream: MediaStream): void {
  try {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log(`Stopped ${track.kind} track`);
    });
  } catch (error) {
    console.error('Error stopping media stream:', error);
  }
}

/**
 * Create camera constraints with fallback options
 */
export function createCameraConstraints(
  preferredCamera?: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): MediaConstraints {
  const qualitySettings = {
    low: { width: 640, height: 480 },
    medium: { width: 1280, height: 720 },
    high: { width: 1920, height: 1080 }
  };

  const settings = qualitySettings[quality];
  
  const constraints: MediaConstraints = {
    video: {
      width: { ideal: settings.width },
      height: { ideal: settings.height },
      facingMode: preferredCamera === 'front' ? 'user' : 'environment'
    }
  };

  if (preferredCamera && preferredCamera !== 'front' && preferredCamera !== 'back') {
    // Specific device ID provided
    constraints.video = {
      ...constraints.video,
      deviceId: { exact: preferredCamera }
    };
  }

  return constraints;
}

/**
 * Capture image from video stream
 */
export function captureImageFromStream(
  videoElement: HTMLVideoElement,
  canvas?: HTMLCanvasElement
): string | null {
  try {
    const canvasElement = canvas || document.createElement('canvas');
    const context = canvasElement.getContext('2d');
    
    if (!context) {
      console.error('Unable to get canvas context');
      return null;
    }

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    context.drawImage(videoElement, 0, 0);
    
    return canvasElement.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Error capturing image from stream:', error);
    return null;
  }
}

/**
 * Handle file input as fallback for camera
 */
export function createFileInput(
  accept: string = 'image/*,video/*',
  multiple: boolean = false
): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    
    input.onchange = () => {
      resolve(input.files);
    };
    
    input.oncancel = () => {
      resolve(null);
    };
    
    // Auto-click to open file dialog
    input.click();
  });
}

/**
 * Convert File to data URL
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Check if device has camera capabilities
 */
export function hasCamera(): boolean {
  return (
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices
  );
}

/**
 * Get user-friendly permission instructions
 */
export function getCameraPermissionInstructions(): {
  title: string;
  instructions: string[];
  canRetry: boolean;
} {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome')) {
    return {
      title: 'Enable Camera in Chrome',
      instructions: [
        '1. Click the camera icon in the address bar',
        '2. Select "Always allow" for camera access',
        '3. Refresh the page',
        'Or go to Settings > Privacy and security > Site Settings > Camera'
      ],
      canRetry: true
    };
  } else if (userAgent.includes('safari')) {
    return {
      title: 'Enable Camera in Safari',
      instructions: [
        '1. Go to Safari > Preferences > Websites',
        '2. Click Camera in the left sidebar',
        '3. Set this website to "Allow"',
        '4. Refresh the page'
      ],
      canRetry: true
    };
  } else if (userAgent.includes('firefox')) {
    return {
      title: 'Enable Camera in Firefox',
      instructions: [
        '1. Click the shield icon in the address bar',
        '2. Turn off "Enhanced Tracking Protection" for this site',
        '3. Click the camera icon and select "Allow"',
        '4. Refresh the page'
      ],
      canRetry: true
    };
  } else {
    return {
      title: 'Enable Camera Access',
      instructions: [
        '1. Look for a camera icon in your browser\'s address bar',
        '2. Click it and select "Allow" or "Always Allow"',
        '3. Refresh the page if needed',
        '4. Check your browser\'s settings if the issue persists'
      ],
      canRetry: true
    };
  }
}

export default {
  checkCameraPermission,
  requestCameraPermission,
  getCameraDevices,
  stopMediaStream,
  createCameraConstraints,
  captureImageFromStream,
  createFileInput,
  fileToDataURL,
  hasCamera,
  getCameraPermissionInstructions
};