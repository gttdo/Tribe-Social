import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, CheckCircle, ExternalLink, Copy, RefreshCw, Database, Settings } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import { STORAGE_BUCKETS } from '../utils/storage-constants';
import { manualStorageSetup, testStoragePermissions } from '../utils/storage-setup-manual';

interface StorageStatus {
  bucketsExist: boolean;
  permissionsWork: boolean;
  loading: boolean;
  error?: string;
  buckets?: string[];
}

export function StorageSetupHelper() {
  const [status, setStatus] = useState<StorageStatus>({
    bucketsExist: false,
    permissionsWork: false,
    loading: false
  });

  const checkStorageStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: undefined }));
    
    try {
      // Check if buckets exist
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      if (bucketError) {
        setStatus({
          bucketsExist: false,
          permissionsWork: false,
          loading: false,
          error: `Storage access error: ${bucketError.message}`
        });
        return;
      }

      const bucketNames = buckets?.map(b => b.name) || [];
      const avatarsBucketExists = bucketNames.includes(STORAGE_BUCKETS.AVATARS);
      const mediaBucketExists = bucketNames.includes(STORAGE_BUCKETS.MEDIA);
      const bucketsExist = avatarsBucketExists && mediaBucketExists;

      // Test permissions if buckets exist
      let permissionsWork = false;
      if (bucketsExist) {
        const permissionTest = await testStoragePermissions();
        permissionsWork = permissionTest.success;
      }

      setStatus({
        bucketsExist,
        permissionsWork,
        loading: false,
        buckets: bucketNames,
        error: bucketsExist && !permissionsWork ? 'Buckets exist but upload permissions blocked by RLS policies' : undefined
      });

    } catch (error) {
      setStatus({
        bucketsExist: false,
        permissionsWork: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const attemptAutoSetup = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await manualStorageSetup();
      
      if (result.success) {
        toast.success('Storage setup completed automatically!');
        await checkStorageStatus();
      } else {
        toast.error('Automatic setup failed');
        setStatus(prev => ({ 
          ...prev, 
          loading: false,
          error: result.error || 'Automatic setup failed'
        }));
      }
    } catch (error) {
      toast.error('Setup failed');
      setStatus(prev => ({ 
        ...prev, 
        loading: false,
        error: error instanceof Error ? error.message : 'Setup failed'
      }));
    }
  };

  const copyBucketName = (bucketName: string) => {
    navigator.clipboard.writeText(bucketName);
    toast.success(`Copied "${bucketName}" to clipboard`);
  };

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  React.useEffect(() => {
    checkStorageStatus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card className="bg-gradient-to-br from-midnight-black/95 to-midnight-black/90 border-muted-lavender/30">
        <CardHeader>
          <CardTitle className="text-pearl-white font-headline flex items-center gap-2">
            <Database className="w-5 h-5 text-electric-blue" />
            Storage Setup Helper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-muted-lavender/20 bg-midnight-black/50">
              <div className="flex items-center gap-2 mb-2">
                {status.bucketsExist ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                )}
                <span className="text-sm font-medium text-pearl-white">
                  Storage Buckets
                </span>
              </div>
              <p className="text-xs text-muted-lavender">
                {status.bucketsExist ? 'Required buckets exist' : 'Buckets need to be created'}
              </p>
              {status.buckets && (
                <p className="text-xs text-muted-lavender mt-1">
                  Found: {status.buckets.join(', ') || 'None'}
                </p>
              )}
            </div>

            <div className="p-4 rounded-lg border border-muted-lavender/20 bg-midnight-black/50">
              <div className="flex items-center gap-2 mb-2">
                {status.permissionsWork ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                )}
                <span className="text-sm font-medium text-pearl-white">
                  Upload Permissions
                </span>
              </div>
              <p className="text-xs text-muted-lavender">
                {status.permissionsWork ? 'Upload permissions working' : 'RLS policies blocking uploads'}
              </p>
            </div>
          </div>

          {/* Error Display */}
          {status.error && (
            <div className="p-4 rounded-lg border border-glitch-red/30 bg-glitch-red/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-glitch-red mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-glitch-red">Storage Issue Detected</p>
                  <p className="text-xs text-glitch-red/80 mt-1">{status.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={checkStorageStatus}
              disabled={status.loading}
              variant="outline"
              className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${status.loading ? 'animate-spin' : ''}`} />
              Check Status
            </Button>

            <Button
              onClick={attemptAutoSetup}
              disabled={status.loading}
              className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
            >
              <Settings className="w-4 h-4 mr-2" />
              Try Auto Setup
            </Button>

            <Button
              onClick={openSupabaseDashboard}
              variant="outline"
              className="border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Dashboard
            </Button>
          </div>

          {/* Manual Setup Instructions */}
          <div className="border-t border-muted-lavender/20 pt-6">
            <h3 className="text-lg font-medium text-pearl-white mb-4">Manual Setup Instructions</h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-soft-blush/30 bg-soft-blush/5">
                <h4 className="font-medium text-soft-blush mb-2">Step 1: Create Storage Buckets</h4>
                <ol className="text-sm text-muted-lavender space-y-2 list-decimal list-inside">
                  <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-electric-blue hover:underline">Supabase Dashboard</a></li>
                  <li>Go to <strong>Storage</strong> section</li>
                  <li>Click <strong>"New bucket"</strong></li>
                  <li>Create these buckets with <strong>Public access</strong>:</li>
                </ol>
                
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-midnight-black/50 rounded border border-muted-lavender/20">
                    <code className="text-electric-blue text-sm font-mono flex-1">{STORAGE_BUCKETS.AVATARS}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyBucketName(STORAGE_BUCKETS.AVATARS)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 bg-midnight-black/50 rounded border border-muted-lavender/20">
                    <code className="text-electric-blue text-sm font-mono flex-1">{STORAGE_BUCKETS.MEDIA}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyBucketName(STORAGE_BUCKETS.MEDIA)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-electric-blue/30 bg-electric-blue/5">
                <h4 className="font-medium text-electric-blue mb-2">Step 2: Configure RLS Policies (If Upload Fails)</h4>
                <p className="text-sm text-muted-lavender mb-3">
                  If uploads still fail after creating buckets, add these RLS policies in your Supabase SQL Editor:
                </p>
                
                <div className="p-3 bg-midnight-black/70 rounded border border-muted-lavender/20">
                  <code className="text-xs text-electric-blue whitespace-pre-wrap">
{`-- Allow authenticated users to upload files to their own folders
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id IN ('${STORAGE_BUCKETS.AVATARS}', '${STORAGE_BUCKETS.MEDIA}') AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to files in public buckets
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (
  bucket_id IN ('${STORAGE_BUCKETS.AVATARS}', '${STORAGE_BUCKETS.MEDIA}')
);`}
                  </code>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-neon-lilac/30 bg-neon-lilac/5">
                <h4 className="font-medium text-neon-lilac mb-2">Step 3: Test Your Setup</h4>
                <p className="text-sm text-muted-lavender">
                  After completing the manual setup, click "Check Status" above to verify everything is working.
                </p>
              </div>
            </div>
          </div>

          {/* Current Status Summary */}
          {(status.bucketsExist || status.permissionsWork) && (
            <div className="border-t border-muted-lavender/20 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-pearl-white">
                  {status.bucketsExist && status.permissionsWork 
                    ? 'Storage is fully configured and ready!'
                    : status.bucketsExist 
                    ? 'Buckets exist. Upload permissions need configuration.'
                    : 'Partial setup detected.'
                  }
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}