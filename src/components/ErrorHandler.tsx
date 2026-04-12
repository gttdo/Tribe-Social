import React from 'react';
import { AlertTriangle, RefreshCw, Camera, Wifi, Lock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { getCameraPermissionInstructions } from '../utils/camera-permission-helpers';
import { toast } from 'sonner@2.0.3';

interface ErrorInfo {
  type: 'network' | 'permission' | 'validation' | 'server' | 'camera' | 'media' | 'general';
  title: string;
  message: string;
  details?: string;
  recoverable: boolean;
  retryAction?: () => void;
  helpAction?: () => void;
}

interface ErrorHandlerProps {
  error: Error | string | null;
  context?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Parse error and determine error info
 */
function parseError(error: Error | string, context?: string): ErrorInfo {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? '' : error.stack || '';
  
  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to load')) {
    return {
      type: 'network',
      title: 'Connection Problem',
      message: 'Unable to connect to the server. Please check your internet connection.',
      recoverable: true
    };
  }
  
  // Camera permission errors
  if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
    return {
      type: 'camera',
      title: 'Camera Access Denied',
      message: 'Camera permission is required to take photos and videos.',
      details: 'Please enable camera access in your browser settings and try again.',
      recoverable: true
    };
  }
  
  // Camera device errors
  if (errorMessage.includes('NotFoundError') || errorMessage.includes('No camera found')) {
    return {
      type: 'camera',
      title: 'No Camera Found',
      message: 'No camera was detected on your device.',
      details: 'You can still upload media files from your device.',
      recoverable: false
    };
  }
  
  // Camera in use errors
  if (errorMessage.includes('NotReadableError') || errorMessage.includes('already in use')) {
    return {
      type: 'camera',
      title: 'Camera Unavailable',
      message: 'Your camera is being used by another application.',
      details: 'Please close other apps using the camera and try again.',
      recoverable: true
    };
  }
  
  // UUID validation errors
  if (errorMessage.includes('22P02') || errorMessage.includes('invalid input syntax for type uuid')) {
    return {
      type: 'validation',
      title: 'Invalid Data Format',
      message: 'There was a problem with the data format. Please refresh and try again.',
      recoverable: true
    };
  }
  
  // Route not found errors
  if (errorMessage.includes('Route not found') || errorMessage.includes('404')) {
    return {
      type: 'server',
      title: 'Feature Unavailable',
      message: 'This feature is temporarily unavailable.',
      details: 'Our team has been notified and is working on a fix.',
      recoverable: true
    };
  }
  
  // Authentication errors
  if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
    return {
      type: 'permission',
      title: 'Authentication Required',
      message: 'Please sign in to continue.',
      recoverable: true
    };
  }
  
  // Media validation errors
  if (errorMessage.includes('media file') || errorMessage.includes('file size') || errorMessage.includes('file type')) {
    return {
      type: 'media',
      title: 'Media Error',
      message: errorMessage,
      recoverable: true
    };
  }
  
  // Server errors
  if (errorMessage.includes('500') || errorMessage.includes('Internal server error')) {
    return {
      type: 'server',
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again in a moment.',
      recoverable: true
    };
  }
  
  // General validation errors
  if (errorMessage.includes('required') || errorMessage.includes('invalid') || errorMessage.includes('must be')) {
    return {
      type: 'validation',
      title: 'Invalid Input',
      message: errorMessage,
      recoverable: true
    };
  }
  
  // Default fallback
  return {
    type: 'general',
    title: 'Something Went Wrong',
    message: errorMessage || 'An unexpected error occurred.',
    details: context ? `Context: ${context}` : undefined,
    recoverable: true
  };
}

/**
 * Get icon for error type
 */
function getErrorIcon(type: ErrorInfo['type']) {
  switch (type) {
    case 'network':
      return <Wifi className="w-5 h-5 text-glitch-red" />;
    case 'camera':
      return <Camera className="w-5 h-5 text-glitch-red" />;
    case 'permission':
      return <Lock className="w-5 h-5 text-glitch-red" />;
    case 'validation':
    case 'media':
      return <AlertCircle className="w-5 h-5 text-glitch-red" />;
    case 'server':
      return <AlertTriangle className="w-5 h-5 text-glitch-red" />;
    default:
      return <AlertTriangle className="w-5 h-5 text-glitch-red" />;
  }
}

/**
 * Main Error Handler Component
 */
export function ErrorHandler({ error, context, onRetry, onDismiss, className }: ErrorHandlerProps) {
  if (!error) return null;
  
  const errorInfo = parseError(error, context);
  
  const handleRetry = () => {
    if (errorInfo.retryAction) {
      errorInfo.retryAction();
    } else if (onRetry) {
      onRetry();
    } else {
      // Default retry action
      window.location.reload();
    }
  };
  
  const handleHelp = () => {
    if (errorInfo.type === 'camera') {
      const instructions = getCameraPermissionInstructions();
      toast.info(instructions.title, {
        description: instructions.instructions.join(' '),
        duration: 10000
      });
    } else if (errorInfo.helpAction) {
      errorInfo.helpAction();
    }
  };
  
  return (
    <Alert className={`border-glitch-red/30 bg-glitch-red/5 ${className}`}>
      <div className="flex items-start space-x-3">
        {getErrorIcon(errorInfo.type)}
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-pearl-white font-medium">
            {errorInfo.title}
          </AlertTitle>
          <AlertDescription className="text-muted-lavender mt-1">
            {errorInfo.message}
            {errorInfo.details && (
              <div className="mt-2 text-xs opacity-75">
                {errorInfo.details}
              </div>
            )}
          </AlertDescription>
          
          {(errorInfo.recoverable || errorInfo.type === 'camera') && (
            <div className="flex items-center space-x-2 mt-3">
              {errorInfo.recoverable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  className="border-glitch-red/30 text-glitch-red hover:bg-glitch-red/10"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Try Again
                </Button>
              )}
              
              {errorInfo.type === 'camera' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleHelp}
                  className="text-electric-blue hover:bg-electric-blue/10"
                >
                  Help
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="text-muted-lavender hover:bg-muted/10"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}

/**
 * Compact Error Display for inline use
 */
interface CompactErrorProps {
  error: Error | string | null;
  onRetry?: () => void;
  className?: string;
}

export function CompactError({ error, onRetry, className }: CompactErrorProps) {
  if (!error) return null;
  
  const errorInfo = parseError(error);
  
  return (
    <div className={`flex items-center space-x-2 text-sm text-glitch-red ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 min-w-0 truncate">{errorInfo.message}</span>
      {errorInfo.recoverable && onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="h-6 px-2 text-xs text-glitch-red hover:bg-glitch-red/10"
        >
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Error Card for standalone error display
 */
interface ErrorCardProps {
  error: Error | string | null;
  context?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorCard({ error, context, onRetry, className }: ErrorCardProps) {
  if (!error) return null;
  
  const errorInfo = parseError(error, context);
  
  return (
    <Card className={`border-glitch-red/30 bg-glitch-red/5 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          {getErrorIcon(errorInfo.type)}
          <CardTitle className="text-pearl-white text-base">
            {errorInfo.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-muted-lavender">
          {errorInfo.message}
        </CardDescription>
        
        {errorInfo.details && (
          <div className="mt-2 p-2 bg-black/20 rounded text-xs text-muted-lavender/80">
            {errorInfo.details}
          </div>
        )}
        
        {errorInfo.recoverable && onRetry && (
          <Button
            onClick={onRetry}
            className="mt-4 w-full bg-glitch-red/20 hover:bg-glitch-red/30 border-glitch-red/30"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Error Toast Utility
 */
export function showErrorToast(error: Error | string, context?: string) {
  const errorInfo = parseError(error, context);
  
  toast.error(errorInfo.title, {
    description: errorInfo.message,
    duration: errorInfo.type === 'camera' ? 8000 : 5000,
    action: errorInfo.recoverable ? {
      label: 'Retry',
      onClick: () => window.location.reload()
    } : undefined
  });
}

export default ErrorHandler;