import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Wifi, WifiOff } from 'lucide-react';

interface QuickConnectivityTestProps {
  onTestComplete?: (connected: boolean) => void;
}

export function QuickConnectivityTest({ onTestComplete }: QuickConnectivityTestProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const runTest = async () => {
      try {
        setIsChecking(true);
        
        // First, test the current configuration
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        console.log('Testing with project ID:', projectId);
        
        // Test basic connectivity to Supabase functions
        const testUrl = `https://${projectId}.supabase.co/functions/v1/make-server-70df0d6e/health`;
        console.log('Testing URL:', testUrl);
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok || response.status === 404) { // 404 is acceptable, means server is running but route not found
          setIsConnected(true);
          setErrorDetails(null);
        } else {
          setIsConnected(false);
          setErrorDetails(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Connectivity test error:', error);
        setIsConnected(false);
        setErrorDetails(error instanceof Error ? error.message : String(error));
      } finally {
        setIsChecking(false);
        if (onTestComplete) {
          onTestComplete(isConnected);
        }
      }
    };

    runTest();
  }, [isConnected, onTestComplete]);

  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted-lavender/5 border border-muted-lavender/10">
      <div className="flex-shrink-0">
        {isChecking ? (
          <div className="w-4 h-4 animate-spin border-2 border-electric-blue/30 border-t-electric-blue rounded-full" />
        ) : isConnected ? (
          <Wifi className="w-4 h-4 text-green-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-400" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body text-pearl-white">
          {isChecking 
            ? 'Testing server connection...' 
            : isConnected 
              ? 'Connection successful'
              : 'Connection failed'
          }
        </p>
        {errorDetails && (
          <p className="text-xs text-red-400 mt-1 truncate">
            {errorDetails}
          </p>
        )}
      </div>
    </div>
  );
}