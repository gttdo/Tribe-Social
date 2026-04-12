import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Database } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ensureStorageBuckets, checkStorageHealth } from '../utils/storage-setup';
import { supabase } from '../utils/supabase/client';
import { StorageSetupInstructions } from './StorageSetupInstructions';

interface DiagnosticResult {
  timestamp: string;
  storage_accessible: boolean;
  buckets_listed: boolean;
  bucket_count: number;
  has_avatars_bucket: boolean;
  has_media_bucket: boolean;
  server_endpoint_available: boolean;
  setup_attempt_result?: any;
  errors: string[];
}

export function StorageDiagnostic() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    
    const diagnostic: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      storage_accessible: false,
      buckets_listed: false,
      bucket_count: 0,
      has_avatars_bucket: false,
      has_media_bucket: false,
      server_endpoint_available: false,
      errors: []
    };

    try {
      // Test 1: Basic storage access
      console.log('🧪 Testing storage access...');
      try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          diagnostic.errors.push(`Storage list error: ${listError.message}`);
        } else {
          diagnostic.storage_accessible = true;
          diagnostic.buckets_listed = true;
          diagnostic.bucket_count = buckets?.length || 0;
          
          const bucketNames = buckets?.map(b => b.name) || [];
          diagnostic.has_avatars_bucket = bucketNames.includes('avatars');
          diagnostic.has_media_bucket = bucketNames.includes('make-70df0d6e-media');
          
          console.log('✅ Storage accessible, buckets:', bucketNames);
        }
      } catch (storageError) {
        diagnostic.errors.push(`Storage exception: ${storageError}`);
      }

      // Test 2: Server endpoint availability
      console.log('🧪 Testing server endpoint...');
      try {
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70df0d6e/storage/ensure-buckets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey
          }
        });

        if (response.ok) {
          diagnostic.server_endpoint_available = true;
          console.log('✅ Server endpoint available');
        } else {
          diagnostic.errors.push(`Server endpoint error: ${response.status} ${response.statusText}`);
        }
      } catch (serverError) {
        diagnostic.errors.push(`Server endpoint exception: ${serverError}`);
      }

      // Test 3: Health check
      console.log('🧪 Running health check...');
      const isHealthy = await checkStorageHealth();
      console.log('🏥 Storage health:', isHealthy);

      setResult(diagnostic);
      
      if (diagnostic.storage_accessible && diagnostic.has_avatars_bucket && diagnostic.has_media_bucket) {
        toast.success('Storage system is working correctly!');
      } else {
        toast.warning('Storage issues detected. Use "Fix Storage" to resolve.');
      }

    } catch (error) {
      console.error('💥 Diagnostic error:', error);
      diagnostic.errors.push(`Diagnostic error: ${error}`);
      setResult(diagnostic);
      toast.error('Diagnostic failed');
    } finally {
      setIsRunning(false);
    }
  };

  const fixStorage = async () => {
    setIsFixing(true);
    
    try {
      console.log('🔧 Starting storage fix...');
      const setup = await ensureStorageBuckets();
      
      if (result) {
        setResult({
          ...result,
          setup_attempt_result: setup
        });
      }
      
      if (setup.success) {
        toast.success('Storage fixed successfully!');
        // Re-run diagnostic
        setTimeout(runDiagnostic, 1000);
      } else {
        toast.error(`Storage fix failed: ${setup.errors.join('; ')}`);
      }
    } catch (error) {
      console.error('💥 Fix error:', error);
      toast.error('Storage fix failed');
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => {
    // Auto-run diagnostic on component mount
    runDiagnostic();
  }, []);

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="w-4 h-4 text-green-400" />
    ) : (
      <XCircle className="w-4 h-4 text-red-400" />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-gradient-to-br from-midnight-black/80 to-midnight-black/60 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="text-pearl-white font-headline flex items-center gap-2">
              <Database className="w-6 h-6 text-electric-blue" />
              Storage System Diagnostic
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Controls */}
            <div className="flex gap-3">
              <Button
                onClick={runDiagnostic}
                disabled={isRunning}
                className="bg-electric-blue hover:bg-electric-blue/80 text-midnight-black"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run Diagnostic
                  </>
                )}
              </Button>
              
              {result && !result.has_avatars_bucket && (
                <Button
                  onClick={() => window.open('/?storage-guide', '_blank')}
                  className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
                >
                  Manual Setup Guide
                </Button>
              )}
            </div>

            {/* Results */}
            {result && (
              <div className="space-y-4">
                <div className="bg-muted-lavender/5 border border-muted-lavender/20 rounded-lg p-4">
                  <h3 className="text-pearl-white font-medium mb-3">Diagnostic Results</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-lavender">Storage Accessible</span>
                      {getStatusIcon(result.storage_accessible)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-lavender">Buckets Listed</span>
                      {getStatusIcon(result.buckets_listed)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-lavender">Bucket Count</span>
                      <span className="text-pearl-white">{result.bucket_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-lavender">Avatars Bucket</span>
                      {getStatusIcon(result.has_avatars_bucket)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-lavender">Media Bucket</span>
                      {getStatusIcon(result.has_media_bucket)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-lavender">Server Endpoint</span>
                      {getStatusIcon(result.server_endpoint_available)}
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {result.errors.length > 0 && (
                  <div className="bg-glitch-red/10 border border-glitch-red/30 rounded-lg p-4">
                    <h3 className="text-glitch-red font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Issues Detected
                    </h3>
                    <ul className="space-y-1 text-xs text-muted-lavender">
                      {result.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Setup Results */}
                {result.setup_attempt_result && (
                  <div className="bg-electric-blue/10 border border-electric-blue/30 rounded-lg p-4">
                    <h3 className="text-electric-blue font-medium mb-2">Storage Fix Results</h3>
                    <pre className="text-xs text-muted-lavender overflow-auto">
                      {JSON.stringify(result.setup_attempt_result, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-muted-lavender text-center">
                  Last run: {new Date(result.timestamp).toLocaleString()}
                </div>
              </div>
            )}

            {/* Setup Instructions */}
            {result && !result.has_avatars_bucket && (
              <div className="mt-6">
                <StorageSetupInstructions compact={false} />
              </div>
            )}

            {/* Instructions */}
            <div className="bg-neon-lilac/5 border border-neon-lilac/20 rounded-lg p-4">
              <h3 className="text-neon-lilac font-medium mb-2">How to Use</h3>
              <ol className="text-xs text-muted-lavender space-y-1 list-decimal list-inside">
                <li>Click "Run Diagnostic" to check storage system status</li>
                <li>If buckets are missing, follow the manual setup instructions above</li>
                <li>Run diagnostic again to verify setup</li>
                <li>Check the Supabase documentation if you need additional help</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}