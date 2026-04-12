import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  postId?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PostErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('PostErrorBoundary caught an error:', error, errorInfo);
    console.error('Post ID:', this.props.postId);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-6 bg-gradient-to-br from-muted-lavender/10 to-electric-blue/5 border border-muted-lavender/20 rounded-2xl mb-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-glitch-red/60 mx-auto" />
            <div>
              <p className="text-muted-lavender font-body">
                Something went wrong with this post
              </p>
              <p className="text-xs text-muted-lavender/60 font-body mt-1">
                Post ID: {this.props.postId || 'unknown'}
              </p>
            </div>
            {this.props.onRetry && (
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  this.props.onRetry!();
                }}
                className="bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 hover:from-neon-lilac/30 hover:to-electric-blue/30 border border-neon-lilac/30 text-pearl-white font-body rounded-xl px-4 py-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}