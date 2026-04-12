import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { RefreshCw, Home, Bug } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'route' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate error ID for tracking
    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    
    // Log error with context
    console.error(`🚨 Error Boundary (${level}):`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      retryCount: this.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Show toast notification
    toast.error(`Something went wrong`, {
      description: level === 'app' ? 'The app encountered an error' : 'This section failed to load',
      action: {
        label: 'Retry',
        onClick: () => this.handleRetry()
      }
    });

    // Report to error tracking service (if configured)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // This would integrate with services like Sentry, LogRocket, etc.
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      level: this.props.level,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      retryCount: this.retryCount
    };

    // For now, just log to console
    console.group('🔍 Error Report');
    console.table(errorData);
    console.groupEnd();

    // Could send to backend error tracking
    // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorData) });
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      });
      
      toast.success('Retrying...', {
        description: `Attempt ${this.retryCount} of ${this.maxRetries}`
      });
    } else {
      toast.error('Max retries reached', {
        description: 'Please refresh the page or contact support'
      });
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId, errorInfo } = this.state;
      const { level = 'component' } = this.props;

      // Different UI based on error level
      if (level === 'app') {
        return (
          <div className="min-h-screen bg-midnight-black flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-glitch-red/10 rounded-full flex items-center justify-center">
                  <Bug className="w-8 h-8 text-glitch-red" />
                </div>
                <div className="space-y-2">
                  <h1 className="font-headline text-pearl-white">Something went wrong</h1>
                  <p className="text-muted-lavender">
                    Tribe Board encountered an unexpected error. We've been notified and are working on a fix.
                  </p>
                  {errorId && (
                    <p className="text-xs text-muted-lavender/60 font-mono">
                      Error ID: {errorId}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {this.retryCount < this.maxRetries && (
                  <Button 
                    onClick={this.handleRetry}
                    className="w-full bg-neon-lilac hover:bg-neon-lilac/80"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - this.retryCount} attempts left)
                  </Button>
                )}
                
                <Button 
                  onClick={this.handleReload}
                  variant="outline" 
                  className="w-full border-muted-lavender/30"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>

                <Button 
                  onClick={this.handleGoHome}
                  variant="ghost"
                  className="w-full text-muted-lavender"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
              </div>

              {/* Debug info (only in development) */}
              {process.env.NODE_ENV === 'development' && error && (
                <details className="text-left bg-midnight-black/50 p-4 rounded-lg border border-muted-lavender/20">
                  <summary className="text-glitch-red cursor-pointer font-mono text-sm">
                    Debug Information
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="text-xs">
                      <strong>Error:</strong>
                      <pre className="mt-1 text-glitch-red whitespace-pre-wrap">{error.message}</pre>
                    </div>
                    {error.stack && (
                      <div className="text-xs">
                        <strong>Stack:</strong>
                        <pre className="mt-1 text-muted-lavender/60 whitespace-pre-wrap text-[10px]">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      }

      // Component-level error UI
      return (
        <div className="p-4 border border-glitch-red/30 rounded-lg bg-glitch-red/5">
          <div className="flex items-center space-x-2 mb-2">
            <Bug className="w-4 h-4 text-glitch-red" />
            <span className="text-sm text-pearl-white">Failed to load</span>
          </div>
          <p className="text-xs text-muted-lavender mb-3">
            This component encountered an error. 
            {errorId && ` (ID: ${errorId})`}
          </p>
          <div className="flex space-x-2">
            {this.retryCount < this.maxRetries && (
              <Button 
                size="sm" 
                onClick={this.handleRetry}
                className="text-xs bg-neon-lilac/20 hover:bg-neon-lilac/30"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience components for different error boundary levels
export const AppErrorBoundary = ({ children, ...props }: Omit<Props, 'level'>) => (
  <GlobalErrorBoundary level="app" {...props}>
    {children}
  </GlobalErrorBoundary>
);

export const RouteErrorBoundary = ({ children, ...props }: Omit<Props, 'level'>) => (
  <GlobalErrorBoundary level="route" {...props}>
    {children}
  </GlobalErrorBoundary>
);

export const ComponentErrorBoundary = ({ children, ...props }: Omit<Props, 'level'>) => (
  <GlobalErrorBoundary level="component" {...props}>
    {children}
  </GlobalErrorBoundary>
);

export default GlobalErrorBoundary;