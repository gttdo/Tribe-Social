import React, { useState } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { RefreshCw, AlertTriangle, Shield, Database, Wifi, AlertCircle } from 'lucide-react';
import { 
  parseStoryError, 
  logStoryErrorTelemetry, 
  getStoryErrorMessage,
  shouldShowRetry,
  shouldShowAccessRequest,
  withStoryErrorHandling
} from '../utils/story-error-handlers';

/**
 * Test component for demonstrating story error handling
 * This component is for development/testing purposes only
 */
export function StoryErrorTest() {
  const [lastError, setLastError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Simulate different types of errors
  const simulateError = async (errorType: string) => {
    setIsLoading(true);
    setLastError(null);

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Throw different types of errors based on selection
      switch (errorType) {
        case 'policy':
          throw { code: '42501', message: 'insufficient_privilege on table "tribes"' };
        
        case 'recursion':
          throw { code: '42P17', message: 'infinite recursion detected in policy for table "tribes"' };
        
        case 'table_missing':
          throw { code: 'PGRST205', message: 'Could not find the table "stories" in the schema cache' };
        
        case 'network':
          throw new Error('fetch failed: network error');
        
        case 'unknown':
          throw new Error('Something unexpected happened');
        
        default:
          throw new Error('Test error');
      }
    } catch (error) {
      const errorInfo = parseStoryError(error, `test_${errorType}`);
      logStoryErrorTelemetry(errorInfo, 'StoryErrorTest');
      setLastError(errorInfo);
    } finally {
      setIsLoading(false);
    }
  };

  // Test the withStoryErrorHandling wrapper
  const testWithWrapper = async () => {
    setIsLoading(true);
    
    const result = await withStoryErrorHandling(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        throw { code: '42501', message: 'Policy error on tribes table' };
      },
      'wrapper_test',
      [] // fallback value
    );
    
    console.log('Wrapper result (should be empty array):', result);
    setIsLoading(false);
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'policy_error': return <Shield className="w-4 h-4" />;
      case 'recursion_error': return <RefreshCw className="w-4 h-4" />;
      case 'table_missing': return <Database className="w-4 h-4" />;
      case 'network_error': return <Wifi className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getErrorColor = (type: string) => {
    switch (type) {
      case 'policy_error': return 'destructive';
      case 'recursion_error': return 'default';
      case 'table_missing': return 'secondary';
      case 'network_error': return 'outline';
      default: return 'destructive';
    }
  };

  return (
    <div className="min-h-screen bg-midnight-black p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-midnight-black/80 border-muted-lavender/20">
          <CardHeader>
            <CardTitle className="text-pearl-white font-headline">
              Story Error Handler Test
            </CardTitle>
            <CardDescription className="text-muted-lavender">
              Test different types of story-related errors and their handling
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => simulateError('policy')}
                disabled={isLoading}
                variant="outline"
                className="border-glitch-red/30 text-glitch-red hover:bg-glitch-red/10"
              >
                <Shield className="w-4 h-4 mr-2" />
                Policy Error
              </Button>
              
              <Button
                onClick={() => simulateError('recursion')}
                disabled={isLoading}
                variant="outline"
                className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recursion Error
              </Button>
              
              <Button
                onClick={() => simulateError('table_missing')}
                disabled={isLoading}
                variant="outline"
                className="border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10"
              >
                <Database className="w-4 h-4 mr-2" />
                Table Missing
              </Button>
              
              <Button
                onClick={() => simulateError('network')}
                disabled={isLoading}
                variant="outline"
                className="border-soft-blush/30 text-soft-blush hover:bg-soft-blush/10"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Network Error
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => simulateError('unknown')}
                disabled={isLoading}
                variant="outline"
                className="border-neon-lilac/30 text-neon-lilac hover:bg-neon-lilac/10"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Unknown Error
              </Button>
              
              <Button
                onClick={testWithWrapper}
                disabled={isLoading}
                variant="outline"
                className="border-pearl-white/30 text-pearl-white hover:bg-pearl-white/10"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Test Wrapper
              </Button>
            </div>
            
            {isLoading && (
              <div className="text-center py-4">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-electric-blue" />
                <p className="text-muted-lavender mt-2 font-body">Simulating error...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {lastError && (
          <Card className="bg-midnight-black/80 border-muted-lavender/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-pearl-white font-headline flex items-center gap-2">
                  {getErrorIcon(lastError.type)}
                  Error Details
                </CardTitle>
                <Badge variant={getErrorColor(lastError.type) as any}>
                  {lastError.type.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-pearl-white">
                  <strong>User Message:</strong> {getStoryErrorMessage(lastError)}
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted-lavender/10 rounded-lg p-4 space-y-2">
                <div className="text-sm text-muted-lavender">
                  <strong>Error Code:</strong> {lastError.code || 'N/A'}
                </div>
                <div className="text-sm text-muted-lavender">
                  <strong>Table:</strong> {lastError.table || 'N/A'}
                </div>
                <div className="text-sm text-muted-lavender">
                  <strong>Recoverable:</strong> {lastError.recoverable ? 'Yes' : 'No'}
                </div>
                <div className="text-sm text-muted-lavender">
                  <strong>Timestamp:</strong> {new Date(lastError.timestamp).toLocaleString()}
                </div>
                <div className="text-sm text-muted-lavender break-all">
                  <strong>Technical Message:</strong> {lastError.message}
                </div>
              </div>
              
              <div className="flex gap-2">
                {shouldShowRetry(lastError) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                )}
                
                {shouldShowAccessRequest(lastError) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-soft-blush/30 text-soft-blush hover:bg-soft-blush/10"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Request Access
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLastError(null)}
                  className="text-muted-lavender hover:text-pearl-white"
                >
                  Clear Error
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-midnight-black/80 border-muted-lavender/20">
          <CardHeader>
            <CardTitle className="text-pearl-white font-headline">
              How It Works
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3 text-muted-lavender font-body text-sm">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 mt-0.5 text-glitch-red" />
              <div>
                <strong className="text-pearl-white">Policy Errors (42501):</strong> Access denied - shows locked state, no retry option
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <RefreshCw className="w-4 h-4 mt-0.5 text-electric-blue" />
              <div>
                <strong className="text-pearl-white">Recursion Errors (42P17):</strong> Database policy loops - shows retry option
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Database className="w-4 h-4 mt-0.5 text-muted-lavender" />
              <div>
                <strong className="text-pearl-white">Table Missing (PGRST205):</strong> Database not set up - graceful fallback
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Wifi className="w-4 h-4 mt-0.5 text-soft-blush" />
              <div>
                <strong className="text-pearl-white">Network Errors:</strong> Connection issues - shows retry option
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}